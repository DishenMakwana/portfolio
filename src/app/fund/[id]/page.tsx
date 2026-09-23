import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/db";
import { parseHistoryDate, parseToLocalMidnight } from "@/helpers/dates";
import { formatZerodhaAccountName } from "@/helpers/formatters";
import {
  holdingsSnapshot,
  schemes,
  familyMembers,
  reports,
  transactions,
  zerodhaHoldings,
  zerodhaMembers,
  zerodhaReports,
  zerodhaSchemes,
  zerodhaTransactions,
  msflHoldings,
  msflReports,
  msflSchemes,
  schemeNavCacheMeta,
  watchlistFundAnalytics,
  watchlistSchemes,
} from "@/db/schema";
import { eq, and, or, lte, desc, inArray, isNotNull } from "drizzle-orm";
import type {
  WatchlistVroRiskData,
  WatchlistVroReturnsData,
  WatchlistVroPortfolioData,
} from "@/types/watchlist";
import {
  calculateAlpha,
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
import { isBuyTransactionType } from "@/helpers/transactions";
import {
  getZerodhaSchemeHistoryForDbCode,
  getZerodhaStockHistoryForSymbol,
} from "@/lib/zerodhaService";
import { getMsflStockHistoryForSymbol } from "@/lib/msflService";
import { getSchemeCategoryRankings } from "@/lib/fundRankingService";
import { getCachedStockFundamentals } from "@/lib/stockFundamentalsService";
import { calculateRollingReturnsSummary } from "@/helpers/rollingReturns";
import { computeFundAthMetrics } from "@/helpers/ath";
import { getWatchlistSchemeDetails } from "@/lib/watchlistService";
import { getReports, getFamilyMembers } from "@/lib/portfolioService";
import type { MfDetailsResponse } from "@/types/mf-api";
import FundDetailsClient from "@/components/mutual-fund/fund-details/FundDetailsClient";
import {
  FundPageProps,
  HoldingDetails,
  FundTransactionItem,
  FundAthMetrics,
} from "@/types/fund-details";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fund Details" };

export default async function FundDetailsPage({ params }: FundPageProps) {
  const { id } = await params;

  // If accessed by folio number directly (e.g. /fund/folio_1036251952)
  if (id.startsWith("folio_")) {
    const rawFolio = decodeURIComponent(id.replace(/^folio_/, "").trim());
    const [snap, tx] = await Promise.all([
      db.query.holdingsSnapshot.findFirst({
        where: eq(holdingsSnapshot.folioNo, rawFolio),
        orderBy: [desc(holdingsSnapshot.reportId), desc(holdingsSnapshot.id)],
      }),
      db.query.transactions.findFirst({
        where: eq(transactions.folioNo, rawFolio),
        orderBy: [desc(transactions.date), desc(transactions.id)],
      }),
    ]);
    if (snap) {
      redirect(`/fund/${snap.id}`);
    }
    if (tx) {
      redirect(`/fund/sold_${tx.id}`);
    }
    notFound();
  }

  // If a negative ID is directly accessed (e.g. /fund/-8341), canonicalize redirect to /fund/sold_8341
  if (id.startsWith("-") || id.startsWith("sold_-")) {
    const rawDigits = id.replace(/^(sold_)?-/, "");
    const cleanNum = parseInt(rawDigits, 10);
    if (!isNaN(cleanNum)) {
      redirect(`/fund/sold_${cleanNum}`);
    }
  }

  // If accessed by watchlist prefix directly (e.g. /fund/w_151751), redirect to dedicated /watchlist/[id]
  if (id.startsWith("w_")) {
    const cleanSchemeCode = id.replace(/^w_/, "").trim();
    redirect(`/watchlist/${cleanSchemeCode}`);
  }

  const isWatchlist = false;
  const isMsfl = id.startsWith("msfl_");
  const isZerodha = id.startsWith("z_");
  const isSold = id.startsWith("sold_");

  let holding: HoldingDetails | null = null;
  let watchlistMfDetails: MfDetailsResponse | null = null;

  if (isWatchlist) {
    const cleanId = id.substring(2);
    const wDetails = await getWatchlistSchemeDetails(cleanId);
    if (!wDetails) {
      notFound();
    }
    const { scheme, navHistory: wNavHistory, navMeta: wNavMeta } = wDetails;
    const latestNavPoint = wNavHistory[wNavHistory.length - 1];
    const currentNavVal = latestNavPoint?.nav ?? Number(wNavMeta?.lastNav ?? 0);
    const asOfDateVal =
      latestNavPoint?.date ??
      wNavMeta?.lastNavDate ??
      new Date().toISOString().split("T")[0];

    holding = {
      id: scheme.id,
      schemeId: scheme.id,
      schemeName: scheme.schemeName,
      category: scheme.category || "Mutual Fund",
      balanceUnits: 0,
      purchaseNav: 0,
      purchaseValue: 0,
      currentNav: currentNavVal,
      currentValue: 0,
      gain: 0,
      dividend: 0,
      holdingDays: 0,
      absoluteReturn: 0,
      cagr: 0,
      asOfDate: asOfDateVal,
      reportId: 0,
      memberId: null,
      memberName: "Watchlist Radar",
      memberPan: null,
      schemeCodeApi: scheme.schemeCode,
      holdingType: "mutual_fund",
      isin: scheme.isin || undefined,
      comments: scheme.notes || null,
    };

    watchlistMfDetails = {
      meta: {
        fund_house: scheme.fundHouse || "",
        scheme_type: scheme.schemeType || "",
        scheme_category: scheme.category || "",
        scheme_code: Number(scheme.schemeCode) || 0,
        scheme_name: scheme.schemeName,
        isin_growth: scheme.isin || null,
      },
      data: wNavHistory.map((h) => ({
        date: h.date,
        nav: String(h.nav),
      })),
    };
  } else {
    const rawId = isMsfl
      ? id.substring(5)
      : isZerodha
        ? id.substring(2)
        : isSold
          ? id.substring(5).replace(/^-/, "")
          : id;
    const holdingId = Math.abs(parseInt(rawId, 10));

    if (isNaN(holdingId)) {
      notFound();
    }

    if (isMsfl) {
      const mHolding = await db
        .select({
          id: msflHoldings.id,
          schemeId: msflSchemes.id,
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
          sector: msflSchemes.sector,
          marketCapCategory: msflSchemes.marketCapCategory,
          schemeCodeApi: msflSchemes.schemeCodeApi,
        })
        .from(msflHoldings)
        .leftJoin(msflReports, eq(msflHoldings.reportId, msflReports.id))
        .leftJoin(msflSchemes, eq(msflHoldings.schemeId, msflSchemes.id))
        .where(eq(msflHoldings.id, holdingId))
        .then((res) => res[0]);

      if (mHolding) {
        holding = {
          ...mHolding,
          memberId: null,
          dividend: 0,
          holdingDays: 0,
          cagr: 0,
          comments: null,
          memberName: "MSFL Stock Portfolio",
          memberPan: null,
          schemeCodeApi: mHolding.schemeCodeApi
            ? mHolding.schemeCodeApi
            : mHolding.schemeName
              ? `${mHolding.schemeName}.NS`
              : null,
          category: "Stock",
          holdingType: "equity",
          sector: mHolding.sector || undefined,
          marketCapCategory: mHolding.marketCapCategory || undefined,
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
          clientId: zerodhaReports.clientId,
          memberId: zerodhaReports.memberId,
          memberName: zerodhaMembers.name,
          memberPan: zerodhaMembers.pan,
          holdingType: zerodhaSchemes.holdingType,
          sector: zerodhaSchemes.sector,
          marketCapCategory: zerodhaSchemes.marketCapCategory,
          frozenQuantity: zerodhaHoldings.frozenQuantity,
          pledgedQuantity: zerodhaHoldings.pledgedQuantity,
          pledgeSetupQuantity: zerodhaHoldings.pledgeSetupQuantity,
          freeQuantity: zerodhaHoldings.freeQuantity,
          lockinQuantity: zerodhaHoldings.lockinQuantity,
          lockinDate: zerodhaHoldings.lockinDate,
          balanceDescription: zerodhaHoldings.balanceDescription,
        })
        .from(zerodhaHoldings)
        .leftJoin(
          zerodhaReports,
          eq(zerodhaHoldings.reportId, zerodhaReports.id)
        )
        .leftJoin(
          zerodhaMembers,
          eq(zerodhaReports.memberId, zerodhaMembers.id)
        )
        .leftJoin(
          zerodhaSchemes,
          eq(zerodhaHoldings.schemeId, zerodhaSchemes.id)
        )
        .where(eq(zerodhaHoldings.id, holdingId))
        .then((res) => res[0]);

      if (zHolding) {
        const resolvedMemberName = formatZerodhaAccountName(
          zHolding.clientId,
          zHolding.memberName
        );

        if (zHolding.holdingType === "equity") {
          const scheme = await db.query.zerodhaSchemes.findFirst({
            columns: {
              id: true,
              schemeCodeApi: true,
              category: true,
              sector: true,
              marketCapCategory: true,
            },
            where: eq(zerodhaSchemes.name, zHolding.schemeName || ""),
          });

          holding = {
            ...zHolding,
            holdingType: zHolding.holdingType || undefined,
            isin: zHolding.isin || undefined,
            schemeId: scheme ? scheme.id : null,
            memberId: zHolding.memberId || null,
            dividend: 0,
            holdingDays: 0,
            cagr: 0,
            comments: null,
            memberName: resolvedMemberName,
            memberPan: zHolding.memberPan || null,
            schemeCodeApi: scheme ? scheme.schemeCodeApi : zHolding.schemeName,
            category: scheme ? scheme.category : "Equity Stock",
            sector: scheme?.sector || zHolding.sector || undefined,
            marketCapCategory:
              scheme?.marketCapCategory ||
              zHolding.marketCapCategory ||
              undefined,
          };
        } else {
          const isinCondition = zHolding.isin
            ? eq(zerodhaSchemes.isin, zHolding.isin)
            : undefined;
          const nameCondition = zHolding.schemeName
            ? eq(zerodhaSchemes.name, zHolding.schemeName)
            : undefined;

          const [matchingSchemes, navMeta] = await Promise.all([
            db.query.zerodhaSchemes.findMany({
              columns: {
                id: true,
                schemeCodeApi: true,
                category: true,
                sector: true,
                marketCapCategory: true,
                name: true,
                isin: true,
              },
              where:
                nameCondition && isinCondition
                  ? or(nameCondition, isinCondition)
                  : nameCondition || isinCondition,
            }),
            zHolding.isin
              ? db.query.schemeNavCacheMeta.findFirst({
                  columns: { schemeCode: true },
                  where: or(
                    eq(schemeNavCacheMeta.isinGrowth, zHolding.isin),
                    eq(schemeNavCacheMeta.isinDivReinvestment, zHolding.isin)
                  ),
                })
              : Promise.resolve(null),
          ]);

          const scheme =
            matchingSchemes.find((s) => s.name === zHolding.schemeName) ||
            matchingSchemes.find((s) => s.isin === zHolding.isin) ||
            matchingSchemes[0] ||
            null;

          const resolvedSchemeCodeApi =
            scheme?.schemeCodeApi || navMeta?.schemeCode || null;

          const matchingSchemeIds =
            matchingSchemes.length > 0
              ? matchingSchemes.map((s) => s.id)
              : scheme?.id
                ? [scheme.id]
                : [];

          let resolvedFolioNo: string | null = null;
          if (matchingSchemeIds.length > 0) {
            const txWithFolio = await db.query.zerodhaTransactions.findFirst({
              columns: { folioNo: true },
              where: and(
                inArray(zerodhaTransactions.schemeId, matchingSchemeIds),
                isNotNull(zerodhaTransactions.folioNo)
              ),
              orderBy: [desc(zerodhaTransactions.date)],
            });
            if (txWithFolio?.folioNo) {
              resolvedFolioNo = txWithFolio.folioNo;
            }
          }

          holding = {
            ...zHolding,
            folioNo: resolvedFolioNo || undefined,
            holdingType: zHolding.holdingType || undefined,
            isin: zHolding.isin || undefined,
            schemeId: scheme ? scheme.id : null,
            memberId: zHolding.memberId || null,
            dividend: 0,
            holdingDays: 0,
            cagr: 0,
            comments: null,
            memberName: resolvedMemberName,
            memberPan: zHolding.memberPan || null,
            schemeCodeApi: resolvedSchemeCodeApi,
            category: scheme ? scheme.category : zHolding.category,
            sector: scheme?.sector || zHolding.sector || undefined,
            marketCapCategory:
              scheme?.marketCapCategory ||
              zHolding.marketCapCategory ||
              undefined,
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
        .leftJoin(
          familyMembers,
          eq(holdingsSnapshot.memberId, familyMembers.id)
        )
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
          const scheme = targetTx.schemeId
            ? await db.query.schemes.findFirst({
                where: eq(schemes.id, targetTx.schemeId),
              })
            : null;

          const [member, reportsList, navMeta] = await Promise.all([
            targetTx.memberId
              ? db.query.familyMembers.findFirst({
                  where: eq(familyMembers.id, targetTx.memberId),
                })
              : Promise.resolve(null),
            getReports(),
            scheme?.schemeCodeApi
              ? db.query.schemeNavCacheMeta.findFirst({
                  where: eq(
                    schemeNavCacheMeta.schemeCode,
                    scheme.schemeCodeApi
                  ),
                })
              : Promise.resolve(null),
          ]);

          const latestReport = reportsList[0] || null;

          if (scheme && latestReport) {
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
            const [tx, reportsList, navMeta, familyMembersList] =
              await Promise.all([
                db.query.transactions.findFirst({
                  where: eq(transactions.schemeId, targetScheme.id),
                  orderBy: [desc(transactions.date)],
                }),
                getReports(),
                targetScheme.schemeCodeApi
                  ? db.query.schemeNavCacheMeta.findFirst({
                      where: eq(
                        schemeNavCacheMeta.schemeCode,
                        targetScheme.schemeCodeApi
                      ),
                    })
                  : Promise.resolve(null),
                getFamilyMembers(),
              ]);

            const member =
              tx && tx.memberId
                ? familyMembersList.find((m) => m.id === tx.memberId) || null
                : null;

            const latestReport = reportsList[0] || null;

            if (latestReport) {
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
  }

  if (!holding || !holding.asOfDate) {
    notFound();
  }

  // 2. Fetch transaction history, scheme history, benchmark code, and category rankings in parallel
  const benchmarkCodePromise =
    isMsfl && holding.holdingType !== "equity"
      ? Promise.resolve("120716")
      : getBenchmarkCodeForCategory(holding.category, holding.schemeName);

  const categoryRankingsPromise =
    holding.schemeCodeApi && holding.holdingType !== "equity" && !isMsfl
      ? getSchemeCategoryRankings(holding.schemeCodeApi)
      : Promise.resolve(null);

  const fundDetailsPromise =
    isWatchlist && watchlistMfDetails
      ? Promise.resolve(watchlistMfDetails)
      : holding.schemeCodeApi
        ? isMsfl
          ? getMsflStockHistoryForSymbol(holding.schemeCodeApi)
          : isZerodha
            ? holding.holdingType === "equity"
              ? getZerodhaStockHistoryForSymbol(holding.schemeCodeApi)
              : getZerodhaSchemeHistoryForDbCode(holding.schemeCodeApi)
            : getSchemeHistoryForDbCode(holding.schemeCodeApi)
        : Promise.resolve(null);

  let zTxsPromise = Promise.resolve<FundTransactionItem[]>([]);
  if (isZerodha && holding.schemeId) {
    zTxsPromise = (async () => {
      const [matchingSchemesList, member] = await Promise.all([
        holding.isin
          ? db
              .select({ id: zerodhaSchemes.id })
              .from(zerodhaSchemes)
              .where(eq(zerodhaSchemes.isin, holding.isin))
          : Promise.resolve(null),
        holding.memberPan
          ? db.query.familyMembers.findFirst({
              where: eq(familyMembers.pan, holding.memberPan),
            })
          : holding.clientId
            ? db.query.familyMembers.findFirst({
                where: eq(familyMembers.clientId, holding.clientId),
              })
            : Promise.resolve(null),
      ]);

      const matchingSchemeIds = matchingSchemesList
        ? matchingSchemesList.map((s) => s.id)
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
            member ? eq(zerodhaTransactions.memberId, member.id) : undefined
          )
        )
        .orderBy(desc(zerodhaTransactions.date), desc(zerodhaTransactions.id));
    })();
  }

  const fundTxsPromise = isMsfl
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
          })();

  const stockFundamentalsPromise =
    holding.holdingType === "equity" && holding.schemeCodeApi
      ? getCachedStockFundamentals(holding.schemeCodeApi)
      : Promise.resolve(null);

  const factsheetMetaPromise =
    holding.holdingType === "equity"
      ? Promise.resolve(null)
      : getFactsheetMetadata(
          holding.category,
          null,
          holding.schemeName,
          holding.schemeCodeApi,
          isZerodha,
          isMsfl
        );

  const benchmarkDataPromise = benchmarkCodePromise.then(
    async (benchmarkCode) => {
      const [benchDetails, benchmarkFundName, benchmarkName] =
        await Promise.all([
          getBenchmarkHistory(benchmarkCode),
          getBenchmarkFundNameForCode(benchmarkCode),
          getBenchmarkNameForCode(benchmarkCode),
        ]);
      return { benchmarkCode, benchDetails, benchmarkFundName, benchmarkName };
    }
  );

  const isStock = holding.holdingType === "equity";
  const vroDataPromise =
    !isStock && holding.schemeCodeApi
      ? Promise.all([
          db.query.watchlistFundAnalytics.findFirst({
            where: eq(watchlistFundAnalytics.schemeCode, holding.schemeCodeApi),
          }),
          db.query.watchlistSchemes.findFirst({
            where: eq(watchlistSchemes.schemeCode, holding.schemeCodeApi),
            columns: { vroUrl: true },
          }),
        ]).then(([analytics, ws]) => {
          let vroRisk: WatchlistVroRiskData | null = null;
          let vroReturns: WatchlistVroReturnsData | null = null;
          let vroPortfolio: WatchlistVroPortfolioData | null = null;
          if (analytics) {
            if (analytics.vroRiskData) {
              try {
                vroRisk = JSON.parse(analytics.vroRiskData);
              } catch {}
            }
            if (analytics.vroReturnsData) {
              try {
                vroReturns = JSON.parse(analytics.vroReturnsData);
              } catch {}
            }
            if (analytics.vroPortfolioData) {
              try {
                vroPortfolio = JSON.parse(analytics.vroPortfolioData);
              } catch {}
            }
          }
          return {
            vroRisk,
            vroReturns,
            vroPortfolio,
            lastVroSyncedAt: analytics?.lastVroSyncedAt ?? null,
            vroUrl: analytics?.vroUrl ?? ws?.vroUrl ?? null,
          };
        })
      : Promise.resolve({
          vroRisk: null,
          vroReturns: null,
          vroPortfolio: null,
          lastVroSyncedAt: null,
          vroUrl: null,
        });

  const [
    benchmarkData,
    categoryRankingsData,
    fundDetails,
    fundTxs,
    stockFundamentalsData,
    preloadedFactsheetMeta,
    vroData,
  ] = await Promise.all([
    benchmarkDataPromise,
    categoryRankingsPromise,
    fundDetailsPromise,
    fundTxsPromise,
    stockFundamentalsPromise,
    factsheetMetaPromise,
    vroDataPromise,
  ]);

  const { benchmarkCode, benchDetails, benchmarkFundName, benchmarkName } =
    benchmarkData;

  // 3. Format transactions for XIRR/Alpha calculation
  // For Zerodha or MSFL holdings where no BUY transaction exists (e.g., IPO Allotments),
  // generate a synthetic BUY transaction from average purchase price and quantity.
  const hasBuyTx = fundTxs.some((tx: FundTransactionItem) =>
    isBuyTransactionType(tx.type)
  );

  if ((isZerodha || isMsfl) && hasBuyTx) {
    const totalBuyUnits = fundTxs
      .filter((t: FundTransactionItem) => isBuyTransactionType(t.type))
      .reduce((s: number, t: FundTransactionItem) => s + (t.units || 0), 0);
    const totalSellUnits = fundTxs
      .filter((t: FundTransactionItem) => t.type === "SELL")
      .reduce((s: number, t: FundTransactionItem) => s + (t.units || 0), 0);
    const netUnits = totalBuyUnits - totalSellUnits;

    const totalBuyAmount = fundTxs
      .filter((t: FundTransactionItem) => isBuyTransactionType(t.type))
      .reduce((s: number, t: FundTransactionItem) => s + (t.amount || 0), 0);
    const totalSellAmount = fundTxs
      .filter((t: FundTransactionItem) => t.type === "SELL")
      .reduce((s: number, t: FundTransactionItem) => s + (t.amount || 0), 0);
    const netInvested = totalBuyAmount - totalSellAmount;

    if (netUnits > 0) {
      holding.balanceUnits = netUnits;
      holding.purchaseValue = Math.round(netInvested * 100) / 100;
      holding.purchaseNav =
        Math.round((netInvested / netUnits) * 10000) / 10000;
    }
  } else if ((isZerodha || isMsfl) && !hasBuyTx && holding.purchaseNav > 0) {
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
      .filter((t: FundTransactionItem) => t.type === "SELL")
      .reduce((s: number, t: FundTransactionItem) => s + (t.units || 0), 0);
    const ipoUnits = holding.balanceUnits + totalSoldUnits;
    const ipoAmount = Math.round(ipoUnits * holding.purchaseNav * 100) / 100;

    fundTxs.unshift({
      id: -1,
      memberId: holding.memberId || null,
      schemeId: holding.schemeId || null,
      folioNo: holding.folioNo || null,
      date: ipoDate,
      type: "BUY",
      transactionType: "BUY",
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

  const mappedTxs = fundTxs.map((tx: FundTransactionItem) => ({
    date: tx.date,
    type: tx.type as "BUY" | "SELL",
    transactionType: tx.transactionType || tx.type,
    amount: tx.amount,
    units: tx.units ?? undefined,
  }));

  // Dynamically update holding latest NAV and asOfDate from history cache
  const fundNavHistory = fundDetails?.data || [];
  const benchNavHistory = benchDetails?.data || [];

  if ((isMsfl || isZerodha) && fundNavHistory.length > 0) {
    const parseApiDate = (s: string) => {
      const [dd, mm, yyyy] = s.split("-");
      return new Date(`${yyyy}-${mm}-${dd}`);
    };
    const sorted = [...fundNavHistory].sort(
      (a, b) => parseApiDate(b.date).getTime() - parseApiDate(a.date).getTime()
    );
    const latest = sorted[0];
    const resolvedNav = parseFloat(latest.nav);
    if (resolvedNav > 0) {
      holding.currentNav = resolvedNav;
    }
    holding.currentValue =
      Math.round(holding.balanceUnits * holding.currentNav * 100) / 100;
    holding.gain =
      Math.round((holding.currentValue - holding.purchaseValue) * 100) / 100;
    if (holding.purchaseValue > 0) {
      holding.absoluteReturn = (holding.gain / holding.purchaseValue) * 100;
    }

    const d = parseApiDate(latest.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    holding.asOfDate = `${yyyy}-${mm}-${dd}`;
  } else if ((isMsfl || isZerodha) && holding.currentNav <= 0) {
    holding.currentNav = holding.purchaseNav;
    holding.currentValue =
      Math.round(holding.balanceUnits * holding.currentNav * 100) / 100;
    holding.gain =
      Math.round((holding.currentValue - holding.purchaseValue) * 100) / 100;
    if (holding.purchaseValue > 0) {
      holding.absoluteReturn = (holding.gain / holding.purchaseValue) * 100;
    }
  }

  // Ensure effective asOfDate is not earlier than the latest transaction
  const maxTxDate = mappedTxs.reduce(
    (max, tx) => (tx.date > max ? tx.date : max),
    holding.asOfDate
  );
  if (maxTxDate > holding.asOfDate) {
    holding.asOfDate = maxTxDate;
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
    if (mappedTxs.length > 0) {
      const oldestTxTime = new Date(mappedTxs[0].date).getTime();
      const asOfTime = new Date(holding.asOfDate).getTime();
      const diffDays =
        Math.round((asOfTime - oldestTxTime) / (24 * 60 * 60 * 1000)) + 1;
      if (diffDays > 0) {
        holding.holdingDays = diffDays;
      }
    }
    if (holding.holdingDays && holding.holdingDays < 30) {
      holding.cagr = holding.absoluteReturn;
      metrics.portfolioXirr = holding.absoluteReturn;
    } else {
      holding.cagr = metrics.portfolioXirr;
    }
  } else if (holding.holdingDays && holding.holdingDays < 30) {
    holding.cagr = holding.absoluteReturn;
    metrics.portfolioXirr = holding.absoluteReturn;
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
      : preloadedFactsheetMeta
        ? {
            ...preloadedFactsheetMeta,
            profile: {
              ...preloadedFactsheetMeta.profile,
              launchDate:
                preloadedFactsheetMeta.profile.launchDate &&
                preloadedFactsheetMeta.profile.launchDate !== "27 Aug 1998"
                  ? preloadedFactsheetMeta.profile.launchDate
                  : formattedLaunchDate ||
                    preloadedFactsheetMeta.profile.launchDate,
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

  const rollingReturns =
    fundNavHistory.length > 0
      ? calculateRollingReturnsSummary(
          fundNavHistory,
          benchNavHistory,
          benchmarkName,
          holding.cagr
        )
      : null;

  let athMetrics: FundAthMetrics | null = null;
  if (fundNavHistory.length > 0 && holding.currentNav > 0) {
    let maxPoint = { nav: 0, date: holding.asOfDate || "" };
    for (const pt of fundNavHistory) {
      const v = parseFloat(pt.nav);
      if (v > maxPoint.nav) {
        maxPoint = { nav: v, date: pt.date };
      }
    }
    if (maxPoint.nav > 0) {
      athMetrics = computeFundAthMetrics(
        holding.currentNav,
        maxPoint.nav,
        maxPoint.date,
        holding.asOfDate || undefined
      );
    }
  }

  // Determine the data source for the Server Action
  const source = isWatchlist
    ? "watchlist"
    : isMsfl
      ? "msfl"
      : isZerodha
        ? "zerodha"
        : "standard";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500/30 selection:text-teal-200">
      <Suspense fallback={null}>
        <FundDetailsClient
          holding={holding}
          transactions={fundTxs}
          metrics={metrics}
          athMetrics={athMetrics}
          factsheetMeta={factsheetMeta}
          volatilityStats={volatilityStats}
          chartData={chartData}
          fundNavHistory={fundNavHistory}
          benchNavHistory={benchNavHistory}
          earliestFundDateStr={earliestFundDateStr}
          earliestBenchDateStr={earliestBenchDateStr}
          schemeCodeApi={holding.schemeCodeApi || ""}
          benchmarkCode={benchmarkCode}
          holdingType={holding.holdingType}
          source={source}
          categoryRankingsData={categoryRankingsData}
          stockFundamentalsData={stockFundamentalsData}
          rollingReturns={rollingReturns}
          vroRisk={vroData.vroRisk}
          vroReturns={vroData.vroReturns}
          vroPortfolio={vroData.vroPortfolio}
          vroUrl={vroData.vroUrl}
          lastVroSyncedAt={vroData.lastVroSyncedAt}
        />
      </Suspense>
    </main>
  );
}
