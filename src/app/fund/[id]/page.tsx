import { notFound } from "next/navigation";
import { db } from "@/db/db";
import {
  holdingsSnapshot,
  schemes,
  familyMembers,
  reports,
  transactions,
} from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import {
  calculateAlpha,
  getSchemeHistoryForDbCode,
  calculateVolatilityMeasures,
  getFactsheetMetadata,
  generateFactsheetChartData,
} from "@/lib/alpha";
import FundDetailsClient from "./FundDetailsClient";

export const dynamic = "force-dynamic";

interface FundPageProps {
  params: Promise<{ id: string }>;
}

export default async function FundDetailsPage({ params }: FundPageProps) {
  const { id } = await params;
  const holdingId = parseInt(id, 10);

  if (isNaN(holdingId)) {
    notFound();
  }

  // 1. Fetch holding snapshot details
  const holding = await db
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

  if (!holding || !holding.schemeId || !holding.memberId || !holding.asOfDate) {
    notFound();
  }

  // 2. Fetch transaction history and NAV histories in parallel
  const [fundTxs, fundDetails, benchDetails] = await Promise.all([
    db
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
      ? getSchemeHistoryForDbCode(holding.schemeCodeApi)
      : Promise.resolve(null),
    getSchemeHistoryForDbCode("120716"),
  ]);

  // 3. Format transactions for XIRR/Alpha calculation
  const mappedTxs = fundTxs.map((tx) => ({
    date: tx.date,
    type: tx.type as "BUY" | "SELL",
    amount: tx.amount,
    units: tx.units,
  }));

  // 4. Calculate dynamic XIRR and Alpha
  const metrics = await calculateAlpha(
    mappedTxs,
    holding.asOfDate,
    holding.currentValue
  );

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

  const factsheetMeta = getFactsheetMetadata(
    holding.category,
    formattedLaunchDate
  );

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
