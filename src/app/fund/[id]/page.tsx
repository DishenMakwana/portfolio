import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { parseHistoryDate, parseToLocalMidnight } from "@/helpers/dates";
import {
  holdingsSnapshot,
  schemes,
  familyMembers,
  reports,
  transactions,
  zerodhaHoldings,
  zerodhaReports,
  zerodhaSchemes,
  zerodhaTransactions,
  msflHoldings,
  msflReports,
  msflSchemes,
  schemeNavCacheMeta,
} from "@/db/schema";
import { eq, and, lte, desc, inArray } from "drizzle-orm";
import {
  calculateAlpha,
  isBuyTransactionType,
  getSchemeHistoryForDbCode,
  getBenchmarkHistory,
  calculateVolatilityMeasures,
  getFactsheetMetadata,
  generateFactsheetChartData,
  calculateXirrFromNav,
  getBenchmarkCodeForCategory,
  getBenchmarkFundNameForCode,
  getBenchmarkNameForCode,
} from "@/lib/alpha";
import {
  getZerodhaSchemeHistoryForDbCode,
  getZerodhaStockHistoryForSymbol,
} from "@/lib/zerodhaService";
import { getMsflStockHistoryForSymbol } from "@/lib/msflService";
import FundDetailsClient from "@/components/mutual-fund/fund-details/FundDetailsClient";
import { FundPageProps, HoldingDetails } from "@/types/fund-details";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fund Details" };

export default async function FundDetailsPage({ params }: FundPageProps) {
  const { id } = await params;
  const isMsfl = id.startsWith("msfl_");
  const isZerodha = id.startsWith("z_");
  const isSold = id.startsWith("sold_");
  const isNegative = id.startsWith("-");
  const rawId = isMsfl
    ? id.substring(5)
    : isZerodha
      ? id.substring(2)
      : isSold
        ? id.substring(5).replace(/^-/, "")
        : isNegative
          ? id.substring(1)
          : id;
  const holdingId = Math.abs(parseInt(rawId, 10));

  if (isNaN(holdingId)) {
    notFound();
  }

  let holding: HoldingDetails | null = null;

  if (isMsfl) {
    const mHolding = await db
      .select({
        id: msflHoldings.id,
        schemeName: msflSchemes.name,
        category: msflSchemes.category,
        balanceUnits: msflHoldings.quantity,
        purchaseNav: msflHoldings.averagePrice,
        purchaseValue: msflHoldings.investedValue,
        currentNav: msflHoldings.currentPrice,
        currentValue: msflHoldings.currentValue,
        gain: msflHoldings.unrealizedPnl,
        absoluteReturn: msflHoldings.unrealizedPnlPct,
        asOfDate: msflReports.asOfDate,
        reportId: msflReports.id,
        isin: msflSchemes.isin,
      })
      .from(msflHoldings)
      .leftJoin(msflReports, eq(msflHoldings.reportId, msflReports.id))
      .leftJoin(msflSchemes, eq(msflHoldings.schemeId, msflSchemes.id))
      .where(eq(msflHoldings.id, holdingId))
      .then((res) => res[0]);

    if (mHolding) {
      const scheme = await db.query.msflSchemes.findFirst({
        columns: {
          id: true,
          schemeCodeApi: true,
        },
        where: eq(msflSchemes.name, mHolding.schemeName || ""),
      });

      holding = {
        ...mHolding,
        schemeId: scheme ? scheme.id : null,
        memberId: null,
        dividend: 0,
        holdingDays: 0,
        cagr: 0,
        comments: null,
        memberName: "MSFL Stock Portfolio",
        memberPan: null,
        schemeCodeApi: scheme
          ? scheme.schemeCodeApi
          : mHolding.schemeName
            ? `${mHolding.schemeName}.NS`
            : null,
        category: "Stock",
        holdingType: "equity",
      };
    }
  } else if (isZerodha) {
    // Fetch personal Zerodha mutual fund holding snapshot
    const zHolding = await db
      .select({
        id: zerodhaHoldings.id,
        schemeName: zerodhaSchemes.name,
        isin: zerodhaSchemes.isin,
        category: zerodhaSchemes.instrumentType,
        balanceUnits: zerodhaHoldings.quantity,
        purchaseNav: zerodhaHoldings.averagePrice,
        purchaseValue: zerodhaHoldings.investedValue,
        currentNav: zerodhaHoldings.currentPrice,
        currentValue: zerodhaHoldings.currentValue,
        gain: zerodhaHoldings.unrealizedPnl,
        absoluteReturn: zerodhaHoldings.unrealizedPnlPct,
        asOfDate: zerodhaReports.asOfDate,
        reportId: zerodhaReports.id,
        holdingType: zerodhaSchemes.holdingType,
        sector: zerodhaSchemes.sector,
        frozenQuantity: zerodhaHoldings.frozenQuantity,
        pledgedQuantity: zerodhaHoldings.pledgedQuantity,
        pledgeSetupQuantity: zerodhaHoldings.pledgeSetupQuantity,
        freeQuantity: zerodhaHoldings.freeQuantity,
        lockinQuantity: zerodhaHoldings.lockinQuantity,
        lockinDate: zerodhaHoldings.lockinDate,
        balanceDescription: zerodhaHoldings.balanceDescription,
      })
      .from(zerodhaHoldings)
      .leftJoin(zerodhaReports, eq(zerodhaHoldings.reportId, zerodhaReports.id))
      .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id))
      .where(eq(zerodhaHoldings.id, holdingId))
      .then((res) => res[0]);

    if (zHolding) {
      if (zHolding.holdingType === "equity") {
        const scheme = await db.query.zerodhaSchemes.findFirst({
          columns: {
            id: true,
            schemeCodeApi: true,
            category: true,
          },
          where: eq(zerodhaSchemes.name, zHolding.schemeName || ""),
        });

        holding = {
          ...zHolding,
          holdingType: zHolding.holdingType || undefined,
          isin: zHolding.isin || undefined,
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
          sector: zHolding.sector,
        };
      } else {
        // Find matching scheme in DB to fetch API mapping code
        const scheme = await db.query.zerodhaSchemes.findFirst({
          columns: {
            id: true,
            schemeCodeApi: true,
            category: true,
          },
          where: eq(zerodhaSchemes.name, zHolding.schemeName || ""),
        });

        holding = {
          ...zHolding,
          holdingType: zHolding.holdingType || undefined,
          isin: zHolding.isin || undefined,
          schemeId: scheme ? scheme.id : null,
          memberId: null,
          dividend: 0,
          holdingDays: 0,
          cagr: 0,
          comments: null,
          memberName: "Zerodha Account",
          memberPan: null,
          schemeCodeApi: scheme ? scheme.schemeCodeApi : null,
          category: scheme ? scheme.category : zHolding.category,
          sector: zHolding.sector,
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
        isin: schemeNavCacheMeta.isinGrowth,
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
      .leftJoin(
        schemeNavCacheMeta,
        eq(schemes.schemeCodeApi, schemeNavCacheMeta.schemeCode)
      )
      .where(eq(holdingsSnapshot.id, holdingId))
      .then((res) => res[0]);

    if (!holding) {
      const targetTx = await db.query.transactions.findFirst({
        where: eq(transactions.id, Math.abs(holdingId)),
      });

      if (targetTx) {
        const [scheme, member, latestReport] = await Promise.all([
          targetTx.schemeId
            ? db.query.schemes.findFirst({
                where: eq(schemes.id, targetTx.schemeId),
              })
            : Promise.resolve(null),
          targetTx.memberId
            ? db.query.familyMembers.findFirst({
                where: eq(familyMembers.id, targetTx.memberId),
              })
            : null,
          db.query.reports.findFirst({
            orderBy: [desc(reports.asOfDate)],
          }),
        ]);

        if (scheme && latestReport) {
          const navMeta = scheme.schemeCodeApi
            ? await db.query.schemeNavCacheMeta.findFirst({
                where: eq(schemeNavCacheMeta.schemeCode, scheme.schemeCodeApi),
              })
            : null;

          holding = {
            id: holdingId,
            schemeId: scheme.id,
            memberId: member ? member.id : null,
            schemeName: scheme.name,
            category: scheme.category,
            schemeCodeApi: scheme.schemeCodeApi,
            isin: navMeta?.isinGrowth || null,
            folioNo: targetTx.folioNo || "",
            balanceUnits: 0,
            purchaseNav: 0,
            purchaseValue: 0,
            currentNav: 0,
            currentValue: 0,
            dividend: 0,
            gain: 0,
            holdingDays: 0,
            absoluteReturn: 0,
            cagr: 0,
            comments: null,
            memberName: member ? member.name : "Family Member",
            memberPan: member ? member.pan : null,
            asOfDate: latestReport.asOfDate,
            reportId: latestReport.id,
          };
        }
      } else {
        // Fallback: Check if holdingId is a direct scheme ID (e.g. /fund/sold_13 or /fund/sold_22)
        const targetScheme = await db.query.schemes.findFirst({
          where: eq(schemes.id, Math.abs(holdingId)),
        });

        if (targetScheme) {
          const tx = await db.query.transactions.findFirst({
            where: eq(transactions.schemeId, targetScheme.id),
            orderBy: [desc(transactions.date)],
          });

          const member =
            tx && tx.memberId
              ? await db.query.familyMembers.findFirst({
                  where: eq(familyMembers.id, tx.memberId),
                })
              : null;

          const latestReport = await db.query.reports.findFirst({
            orderBy: [desc(reports.asOfDate)],
          });

          if (latestReport) {
            const navMeta = targetScheme.schemeCodeApi
              ? await db.query.schemeNavCacheMeta.findFirst({
                  where: eq(
                    schemeNavCacheMeta.schemeCode,
                    targetScheme.schemeCodeApi
                  ),
                })
              : null;

            holding = {
              id: holdingId,
              schemeId: targetScheme.id,
              memberId: member ? member.id : null,
              schemeName: targetScheme.name,
              category: targetScheme.category,
              schemeCodeApi: targetScheme.schemeCodeApi,
              isin: navMeta?.isinGrowth || null,
              folioNo: tx?.folioNo || "",
              balanceUnits: 0,
              purchaseNav: 0,
              purchaseValue: 0,
              currentNav: 0,
              currentValue: 0,
              dividend: 0,
              gain: 0,
              holdingDays: 0,
              absoluteReturn: 0,
              cagr: 0,
              comments: null,
              memberName: member ? member.name : "Family Member",
              memberPan: member ? member.pan : null,
              asOfDate: latestReport.asOfDate,
              reportId: latestReport.id,
            };
          }
        }
      }
    }
  }

  if (!holding || !holding.asOfDate) {
    notFound();
  }

  const benchmarkCode =
    isMsfl && holding.holdingType !== "equity"
      ? "120716"
      : await getBenchmarkCodeForCategory(holding.category, holding.schemeName);

  const [benchmarkFundName, benchmarkName] = await Promise.all([
    getBenchmarkFundNameForCode(benchmarkCode),
    getBenchmarkNameForCode(benchmarkCode),
  ]);

  // 2. Fetch transaction history and NAV histories in parallel
  let zTxsPromise = Promise.resolve<any[]>([]);
  if (isZerodha && holding.schemeId) {
    zTxsPromise = (async () => {
      const matchingSchemeIds = holding.isin
        ? (
            await db
              .select({ id: zerodhaSchemes.id })
              .from(zerodhaSchemes)
              .where(eq(zerodhaSchemes.isin, holding.isin))
          ).map((s) => s.id)
        : [holding.schemeId!];

      return db
        .select({
          id: zerodhaTransactions.id,
          memberId: zerodhaTransactions.memberId,
          schemeId: zerodhaTransactions.schemeId,
          folioNo: zerodhaTransactions.folioNo,
          date: zerodhaTransactions.date,
          type: zerodhaTransactions.type,
          rawTransactionType: zerodhaTransactions.rawTransactionType,
          units: zerodhaTransactions.units,
          nav: zerodhaTransactions.nav,
          amount: zerodhaTransactions.amount,
          stampDuty: zerodhaTransactions.stampDuty,
          assetType: zerodhaTransactions.assetType,
          broker: zerodhaTransactions.broker,
        })
        .from(zerodhaTransactions)
        .where(
          and(
            inArray(zerodhaTransactions.schemeId, matchingSchemeIds),
            lte(zerodhaTransactions.date, holding.asOfDate!)
          )
        )
        .orderBy(desc(zerodhaTransactions.date), desc(zerodhaTransactions.id));
    })();
  }

  const [fundTxs, fundDetails, benchDetails] = await Promise.all([
    isMsfl
      ? Promise.resolve([])
      : isZerodha
        ? zTxsPromise
        : !holding.schemeId || !holding.memberId || !holding.asOfDate
          ? Promise.resolve([])
          : (async () => {
              const schemeId = holding.schemeId!;
              const memberId = holding.memberId!;
              const asOfDate = holding.asOfDate!;
              const allSchemeTxs = await db
                .select({
                  id: transactions.id,
                  memberId: transactions.memberId,
                  schemeId: transactions.schemeId,
                  folioNo: transactions.folioNo,
                  date: transactions.date,
                  type: transactions.type,
                  transactionType: transactions.transactionType,
                  units: transactions.units,
                  nav: transactions.nav,
                  amount: transactions.amount,
                  stampDuty: transactions.stampDuty,
                })
                .from(transactions)
                .where(
                  and(
                    eq(transactions.schemeId, schemeId),
                    eq(transactions.memberId, memberId),
                    lte(transactions.date, asOfDate)
                  )
                )
                .orderBy(desc(transactions.date), desc(transactions.id));

              let filteredTxs = holding.folioNo
                ? allSchemeTxs.filter(
                    (tx) =>
                      !tx.folioNo ||
                      tx.folioNo === holding.folioNo ||
                      holding.folioNo!.includes(tx.folioNo)
                  )
                : allSchemeTxs;

              if (filteredTxs.length === 0) {
                filteredTxs = allSchemeTxs;
              }

              return filteredTxs;
            })(),
    holding.schemeCodeApi
      ? isMsfl
        ? getMsflStockHistoryForSymbol(holding.schemeCodeApi)
        : isZerodha
          ? holding.holdingType === "equity"
            ? getZerodhaStockHistoryForSymbol(holding.schemeCodeApi)
            : getZerodhaSchemeHistoryForDbCode(holding.schemeCodeApi)
          : getSchemeHistoryForDbCode(holding.schemeCodeApi)
      : Promise.resolve(null),
    getBenchmarkHistory(benchmarkCode),
  ]);

  // 3. Format transactions for XIRR/Alpha calculation
  // For Zerodha or MSFL holdings where no BUY transaction exists (e.g., IPO Allotments),
  // generate a synthetic BUY transaction from average purchase price and quantity.
  const hasBuyTx = fundTxs.some((tx: any) => isBuyTransactionType(tx.type));
  if ((isZerodha || isMsfl) && !hasBuyTx && holding.purchaseNav > 0) {
    let ipoDate = holding.asOfDate;
    if (fundDetails?.data && fundDetails.data.length > 0) {
      const parseApiDate = (s: string) => {
        const [dd, mm, yyyy] = s.split("-");
        return new Date(`${yyyy}-${mm}-${dd}`);
      };
      const sorted = [...fundDetails.data].sort(
        (a, b) =>
          parseApiDate(a.date).getTime() - parseApiDate(b.date).getTime()
      );
      const oldest = sorted[0];
      const [dd, mm, yyyy] = oldest.date.split("-");
      ipoDate = `${yyyy}-${mm}-${dd}`;
    }

    const totalSoldUnits = fundTxs
      .filter((t: any) => t.type === "SELL")
      .reduce((s: number, t: any) => s + (t.units || 0), 0);
    const ipoUnits = holding.balanceUnits + totalSoldUnits;
    const ipoAmount = Math.round(ipoUnits * holding.purchaseNav * 100) / 100;

    fundTxs.unshift({
      id: -1,
      memberId: holding.memberId || null,
      schemeId: holding.schemeId || null,
      folioNo: holding.folioNo || null,
      date: ipoDate,
      type: "BUY",
      rawTransactionType: "ipo_allotment",
      units: ipoUnits,
      nav: holding.purchaseNav,
      amount: ipoAmount,
      stampDuty: 0,
      broker: isZerodha ? "Zerodha (IPO Allotment)" : "MSFL (IPO Allotment)",
      assetType: holding.holdingType || "equity",
      uploadedAt: new Date().toISOString(),
    });
  }

  const mappedTxs = fundTxs.map(
    (tx: {
      date: string;
      type: string;
      transactionType?: string | null;
      amount: number;
      units: number | null;
    }) => ({
      date: tx.date,
      type: tx.type as "BUY" | "SELL",
      transactionType: tx.transactionType || tx.type,
      amount: tx.amount,
      units: tx.units ?? undefined,
    })
  );

  // Dynamically update stock holding latest NAV and asOfDate from Yahoo Finance history cache
  const fundNavHistory = fundDetails?.data || [];
  const benchNavHistory = benchDetails?.data || [];

  if (
    (isMsfl || isZerodha) &&
    holding.holdingType === "equity" &&
    fundNavHistory.length > 0
  ) {
    const parseApiDate = (s: string) => {
      const [dd, mm, yyyy] = s.split("-");
      return new Date(`${yyyy}-${mm}-${dd}`);
    };
    const sorted = [...fundNavHistory].sort(
      (a, b) => parseApiDate(b.date).getTime() - parseApiDate(a.date).getTime()
    );
    const latest = sorted[0];
    holding.currentNav = parseFloat(latest.nav);
    holding.currentValue = holding.balanceUnits * holding.currentNav;
    holding.gain = holding.currentValue - holding.purchaseValue;
    if (holding.purchaseValue > 0) {
      holding.absoluteReturn = (holding.gain / holding.purchaseValue) * 100;
    }

    const d = parseApiDate(latest.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    holding.asOfDate = `${yyyy}-${mm}-${dd}`;
  }

  // 4. Calculate dynamic XIRR and Alpha
  let metrics = { portfolioXirr: 0, benchmarkXirr: 0, alpha: 0 };
  if (!isMsfl && mappedTxs.length > 0) {
    metrics = await calculateAlpha(
      mappedTxs,
      holding.asOfDate,
      holding.currentValue,
      benchmarkCode
    );
  }

  if (
    (isMsfl || isZerodha) &&
    (metrics.portfolioXirr === 0 || isNaN(metrics.portfolioXirr)) &&
    fundDetails?.data &&
    benchDetails?.data
  ) {
    // For MSFL/Zerodha: compute NAV-based XIRR using purchase/current NAV as fallback
    metrics = calculateXirrFromNav(
      holding.purchaseNav,
      holding.currentNav,
      holding.asOfDate,
      fundDetails.data,
      benchDetails.data
    );
  }

  if (isMsfl || isZerodha) {
    holding.cagr = metrics.portfolioXirr;
    if (mappedTxs.length > 0) {
      const oldestTxTime = new Date(mappedTxs[0].date).getTime();
      const asOfTime = new Date(holding.asOfDate).getTime();
      const diffDays = Math.round(
        (asOfTime - oldestTxTime) / (24 * 60 * 60 * 1000)
      );
      if (diffDays > 0) {
        holding.holdingDays = diffDays;
      }
    }
  }

  // 6. Calculate Volatility Stats
  // Find the true oldest date from the NAV history points
  let oldestDateObj: Date | null = null;
  if (fundNavHistory.length > 0) {
    let minTime = Infinity;
    for (const p of fundNavHistory) {
      const parts = p.date.split("-");
      let dObj: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          dObj = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else {
          dObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else {
        dObj = new Date(p.date);
      }
      const t = dObj.getTime();
      if (!isNaN(t) && t < minTime) {
        minTime = t;
        oldestDateObj = dObj;
      }
    }
  }

  let formattedLaunchDate = "";
  if (oldestDateObj) {
    formattedLaunchDate = oldestDateObj.toLocaleDateString("en-IN", {
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
            benchmarkName: benchmarkName,
            benchmarkCode,
            benchmarkFundName: benchmarkFundName,
          },
          allocation: {
            equity: 100,
            debt: 0,
            gold: 0,
            globalEquity: 0,
            other: 0,
          },
        }
      : await getFactsheetMetadata(
          holding.category,
          formattedLaunchDate,
          holding.schemeName,
          holding.schemeCodeApi,
          isZerodha,
          isMsfl
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
          sortino: 0,
          mean: 0,
          beta: 1.0,
          stdDev: 0,
          ytm: 0,
          modifiedDuration: 0,
          avgMaturity: 0,
        };

  // 7. Generate comparison chart data (only 1Y for initial load; wider ranges fetched lazily)
  const asOfLocal = parseToLocalMidnight(holding.asOfDate);
  const oneYearAgo = new Date(
    Date.UTC(
      asOfLocal.getUTCFullYear(),
      asOfLocal.getUTCMonth() - 12,
      asOfLocal.getUTCDate(),
      12,
      0,
      0,
      0
    )
  );

  const chartData =
    fundNavHistory.length > 0
      ? generateFactsheetChartData(
          fundNavHistory,
          benchNavHistory,
          holding.asOfDate,
          mappedTxs,
          oneYearAgo
        )
      : [];

  let earliestFundDateStr: string | null = null;
  if (fundNavHistory.length > 0) {
    const sorted = [...fundNavHistory].sort(
      (a, b) =>
        parseHistoryDate(a.date).getTime() - parseHistoryDate(b.date).getTime()
    );
    earliestFundDateStr = sorted[0].date;
  }

  let earliestBenchDateStr: string | null = null;
  if (benchNavHistory.length > 0) {
    const sorted = [...benchNavHistory].sort(
      (a, b) =>
        parseHistoryDate(a.date).getTime() - parseHistoryDate(b.date).getTime()
    );
    earliestBenchDateStr = sorted[0].date;
  }

  // Determine the data source for the Server Action
  const source = isMsfl ? "msfl" : isZerodha ? "zerodha" : "standard";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500/30 selection:text-teal-200">
      <FundDetailsClient
        holding={holding}
        transactions={fundTxs}
        metrics={metrics}
        factsheetMeta={factsheetMeta}
        volatilityStats={volatilityStats}
        chartData={chartData}
        earliestFundDateStr={earliestFundDateStr}
        earliestBenchDateStr={earliestBenchDateStr}
        schemeCodeApi={holding.schemeCodeApi || ""}
        benchmarkCode={benchmarkCode}
        holdingType={holding.holdingType}
        source={source}
      />
    </main>
  );
}
