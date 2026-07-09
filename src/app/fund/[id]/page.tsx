import { notFound } from "next/navigation";
import { db } from "@/db/db";
import {
  holdingsSnapshot,
  schemes,
  familyMembers,
  reports,
  transactions,
  zerodhaHoldings,
  zerodhaReports,
  zerodhaSchemes,
} from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import {
  calculateAlpha,
  getSchemeHistoryForDbCode,
  getBenchmarkHistory,
  calculateVolatilityMeasures,
  getFactsheetMetadata,
  generateFactsheetChartData,
  calculateXirrFromNav,
  getBenchmarkCodeForCategory,
  getBenchmarkNameForCode,
  getBenchmarkFundNameForCode,
} from "@/lib/alpha";
import {
  getZerodhaSchemeHistoryForDbCode,
  getZerodhaStockHistoryForSymbol,
} from "@/lib/zerodhaService";
import FundDetailsClient from "./FundDetailsClient";

export const dynamic = "force-dynamic";

interface FundPageProps {
  params: Promise<{ id: string }>;
}

export default async function FundDetailsPage({ params }: FundPageProps) {
  const { id } = await params;
  const isZerodha = id.startsWith("z_");
  const holdingId = isZerodha
    ? parseInt(id.substring(2), 10)
    : parseInt(id, 10);

  if (isNaN(holdingId)) {
    notFound();
  }

  let holding: any = null;

  if (isZerodha) {
    // Fetch personal Zerodha mutual fund holding snapshot
    const zHolding = await db
      .select({
        id: zerodhaHoldings.id,
        schemeName: zerodhaHoldings.symbol,
        isin: zerodhaHoldings.isin,
        category: zerodhaHoldings.instrumentType,
        balanceUnits: zerodhaHoldings.quantity,
        purchaseNav: zerodhaHoldings.averagePrice,
        purchaseValue: zerodhaHoldings.investedValue,
        currentNav: zerodhaHoldings.currentPrice,
        currentValue: zerodhaHoldings.currentValue,
        gain: zerodhaHoldings.unrealizedPnl,
        absoluteReturn: zerodhaHoldings.unrealizedPnlPct,
        asOfDate: zerodhaReports.asOfDate,
        reportId: zerodhaReports.id,
        holdingType: zerodhaHoldings.holdingType,
      })
      .from(zerodhaHoldings)
      .leftJoin(zerodhaReports, eq(zerodhaHoldings.reportId, zerodhaReports.id))
      .where(eq(zerodhaHoldings.id, holdingId))
      .then((res) => res[0]);

    if (zHolding) {
      if (zHolding.holdingType === "equity") {
        const scheme = await db.query.zerodhaSchemes.findFirst({
          where: eq(zerodhaSchemes.name, zHolding.schemeName),
        });

        holding = {
          ...zHolding,
          schemeId: scheme ? scheme.id : null,
          memberId: null,
          dividend: 0,
          holdingDays: 0,
          cagr: 0,
          comments: null,
          memberName: "Zerodha Account",
          memberPan: null,
          schemeCodeApi: scheme ? scheme.schemeCodeApi : zHolding.schemeName,
          category: scheme ? scheme.category : "Equity Stock",
        };
      } else {
        // Find matching scheme in DB to fetch API mapping code
        const scheme = await db.query.zerodhaSchemes.findFirst({
          where: eq(zerodhaSchemes.name, zHolding.schemeName),
        });

        holding = {
          ...zHolding,
          schemeId: scheme ? scheme.id : null,
          memberId: null,
          dividend: 0,
          holdingDays: 0,
          cagr: 0,
          comments: null,
          memberName: "Zerodha Account",
          memberPan: null,
          schemeCodeApi: scheme ? scheme.schemeCodeApi : null,
        };
      }
    }
  } else {
    // Fetch standard family holdings snapshot details
    holding = await db
      .select({
        id: holdingsSnapshot.id,
        schemeId: holdingsSnapshot.schemeId,
        memberId: holdingsSnapshot.memberId,
        schemeName: schemes.name,
        category: schemes.category,
        schemeCodeApi: schemes.schemeCodeApi,
        folioNo: holdingsSnapshot.folioNo,
        balanceUnits: holdingsSnapshot.balanceUnits,
        purchaseNav: holdingsSnapshot.purchaseNav,
        purchaseValue: holdingsSnapshot.purchaseValue,
        currentNav: holdingsSnapshot.currentNav,
        currentValue: holdingsSnapshot.currentValue,
        dividend: holdingsSnapshot.dividend,
        gain: holdingsSnapshot.gain,
        holdingDays: holdingsSnapshot.holdingDays,
        absoluteReturn: holdingsSnapshot.absoluteReturn,
        cagr: holdingsSnapshot.cagr,
        comments: holdingsSnapshot.comments,
        memberName: familyMembers.name,
        memberPan: familyMembers.pan,
        asOfDate: reports.asOfDate,
        reportId: reports.id,
      })
      .from(holdingsSnapshot)
      .leftJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
      .leftJoin(familyMembers, eq(holdingsSnapshot.memberId, familyMembers.id))
      .leftJoin(reports, eq(holdingsSnapshot.reportId, reports.id))
      .where(eq(holdingsSnapshot.id, holdingId))
      .then((res) => res[0]);
  }

  if (!holding || !holding.asOfDate) {
    notFound();
  }

  const benchmarkCode = getBenchmarkCodeForCategory(holding.category);
  const benchmarkName = getBenchmarkFundNameForCode(benchmarkCode);

  // 2. Fetch transaction history and NAV histories in parallel
  const [fundTxs, fundDetails, benchDetails] = await Promise.all([
    isZerodha || !holding.schemeId || !holding.memberId
      ? Promise.resolve([])
      : db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.schemeId, holding.schemeId),
              eq(transactions.memberId, holding.memberId),
              lte(transactions.date, holding.asOfDate)
            )
          )
          .orderBy(asc(transactions.date)),
    holding.schemeCodeApi
      ? isZerodha
        ? holding.holdingType === "equity"
          ? getZerodhaStockHistoryForSymbol(holding.schemeCodeApi)
          : getZerodhaSchemeHistoryForDbCode(holding.schemeCodeApi)
        : getSchemeHistoryForDbCode(holding.schemeCodeApi)
      : Promise.resolve(null),
    getBenchmarkHistory(benchmarkCode),
  ]);

  // 3. Format transactions for XIRR/Alpha calculation
  const mappedTxs = fundTxs.map((tx) => ({
    date: tx.date,
    type: tx.type as "BUY" | "SELL",
    amount: tx.amount,
    units: tx.units,
  }));

  // 4. Calculate dynamic XIRR and Alpha
  let metrics = { portfolioXirr: 0, benchmarkXirr: 0, alpha: 0 };
  if (!isZerodha && mappedTxs.length > 0) {
    metrics = await calculateAlpha(
      mappedTxs,
      holding.asOfDate,
      holding.currentValue,
      benchmarkCode
    );
  } else if (isZerodha && fundDetails?.data && benchDetails?.data) {
    // For Zerodha funds: compute NAV-based XIRR using purchase/current NAV
    metrics = calculateXirrFromNav(
      holding.purchaseNav,
      holding.currentNav,
      holding.asOfDate,
      fundDetails.data,
      benchDetails.data
    );
  }

  const fundNavHistory = fundDetails?.data || [];
  const benchNavHistory = benchDetails?.data || [];

  // 6. Calculate Volatility Stats
  const oldestFundNavDate =
    fundNavHistory.length > 0
      ? fundNavHistory[fundNavHistory.length - 1].date
      : null;
  let formattedLaunchDate = "";
  if (oldestFundNavDate) {
    const [d, m, y] = oldestFundNavDate.split("-");
    const dateObj = new Date(`${y}-${m}-${d}`);
    formattedLaunchDate = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const factsheetMeta =
    holding.holdingType === "equity"
      ? {
          profile: {
            launchDate: formattedLaunchDate || "N/A",
            corpusCr: 0,
            expenseRatio: 0,
            exitLoad: "Nil",
            benchmarkName: `${benchmarkName} TRI`,
          },
          allocation: {
            equity: 100,
            debt: 0,
            gold: 0,
            globalEquity: 0,
            other: 0,
          },
        }
      : getFactsheetMetadata(holding.category, formattedLaunchDate);

  const volatilityStats =
    fundNavHistory.length > 0 && benchNavHistory.length > 0
      ? calculateVolatilityMeasures(
          fundNavHistory,
          benchNavHistory,
          holding.asOfDate,
          holding.category
        )
      : {
          alpha: metrics.alpha,
          sharpe: 0,
          mean: 0,
          beta: 1.0,
          stdDev: 0,
          ytm: 0,
          modifiedDuration: 0,
          avgMaturity: 0,
        };

  // 7. Generate comparison chart data
  const chartData =
    fundNavHistory.length > 0 && benchNavHistory.length > 0
      ? generateFactsheetChartData(
          fundNavHistory,
          benchNavHistory,
          holding.asOfDate,
          mappedTxs
        )
      : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500/30 selection:text-teal-200">
      <FundDetailsClient
        holding={holding}
        transactions={fundTxs}
        metrics={metrics}
        factsheetMeta={factsheetMeta}
        volatilityStats={volatilityStats}
        chartData={chartData}
      />
    </main>
  );
}
