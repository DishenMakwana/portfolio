import { db } from "../db/db";
import {
  zerodhaReports,
  zerodhaHoldings,
  zerodhaSchemes,
  zerodhaSchemeNavCacheMeta,
  zerodhaSchemeNavHistory,
  zerodhaTransactions,
  zerodhaMembers,
  reports,
  stockFundamentals,
  schemeCategoryRankings,
} from "../db/schema";
import { eq, desc, asc, and, inArray } from "drizzle-orm";
import { normalizeSchemeName } from "@/helpers/schemeNormalize";
import { calculatePortfolioRiskMetrics } from "@/helpers/riskMetrics";
import {
  ZerodhaDashboardData,
  ZerodhaBenchmarkReturns,
  ZerodhaInsightsData,
  ZerodhaSectorBreakdownItem,
  ZerodhaMarketCapBreakdownItem,
  ZerodhaScheme,
  ZerodhaSchemeMemberHolding,
  ZerodhaMember,
  ZerodhaTransactionRow,
  AggregatedSchemeHolding,
  ZerodhaReportRow,
} from "@/types/zerodha";
import type {
  GrowwMarketCapData,
  GrowwAssetAllocationData,
} from "@/types/portfolio";
import {
  getBenchmarkHistory,
  findClosestNav,
  parseAndSortNavHistory,
  findSyntheticInvestmentEntry,
  calculateCagr,
  calculateXirrFromNav,
  calculateAlpha,
  getBenchmarkCodeForCategory,
  getBenchmarkFundNameForCode,
} from "./alpha";
import {
  fetchStockHistory,
  getNifty50IndexHistory,
  isUnlistedStock,
} from "./stockApi";
import {
  calculateAthCorrectionData,
  getNiftyAthAndCurrentPoints,
  getAllZerodhaSchemesAthMap,
  computeFundAthMetrics,
  clearAthCache,
} from "@/helpers/ath";
import {
  getZerodhaAuditData,
  clearZerodhaAuditCache,
} from "./zerodhaAuditService";
import { clearStockFundamentalsCache } from "./stockFundamentalsService";
import { buildPortfolioTaxHarvestingData } from "@/helpers/taxHarvesting";
import {
  ZERODHA_MEMBER_SHORT_NAMES,
  DEFAULT_ZERODHA_CLIENT_ID,
} from "@/constants/memberMeta";
import { formatZerodhaMemberShortName } from "@/helpers/formatters";
import { isIndianMarketOpen } from "@/helpers/tradingDays";
import { isBuyTransactionType } from "@/helpers/transactions";
import {
  autoMapScheme,
  fetchMfDetails,
  isSpecializedFundSchemeCode,
  fetchUpvalyMfDetails,
} from "./mfApi";
import { ZerodhaHoldingParsed } from "@/types/zerodha-parser";
import { MfDetailsResponse } from "@/types/mf-api";

function emptyZerodhaInsightsData(): ZerodhaInsightsData {
  return {
    reportDate: null,
    benchmarkReturns: {
      benchmarkCode: "120716",
      benchmarkName: "UTI Nifty 50 Index Fund Direct Growth",
      endDate: "N/A",
      endNav: 0,
      return1Y: null,
      cagr3Y: null,
      cagr5Y: null,
    },
    weightedCagr: null,
    stockWeight: 0,
    fundWeight: 0,
    concentration: {
      topHoldingPct: 0,
      top3Pct: 0,
      top5Pct: 0,
    },
    movers: {
      topGainers: [],
      laggards: [],
    },
    previousSnapshot: {
      date: null,
      investedChange: 0,
      currentValueChange: 0,
      gainChange: 0,
      returnPctChange: 0,
      stocksInvestedChange: 0,
      stocksCurrentValueChange: 0,
      stocksGainChange: 0,
      fundsInvestedChange: 0,
      fundsCurrentValueChange: 0,
      fundsGainChange: 0,
    },
  };
}

let zerodhaMembersCache: ZerodhaMember[] | null = null;
let zerodhaReportsCache: ZerodhaReportRow[] | null = null;

async function getZerodhaMembers(): Promise<ZerodhaMember[]> {
  if (zerodhaMembersCache) {
    return zerodhaMembersCache;
  }
  const rows = await db.query.zerodhaMembers.findMany({
    orderBy: [asc(zerodhaMembers.id)],
  });
  const result = rows.map((m) => ({
    id: m.id,
    clientId: m.clientId,
    name: m.name,
    pan: m.pan ?? null,
    email: m.email ?? null,
    phone: m.phone ?? null,
  }));
  zerodhaMembersCache = result;
  return result;
}

async function getZerodhaReports(accountFilter?: string) {
  if (!zerodhaReportsCache) {
    const rows = await db
      .select({
        id: zerodhaReports.id,
        asOfDate: zerodhaReports.asOfDate,
        filename: zerodhaReports.filename,
        uploadedAt: zerodhaReports.uploadedAt,
        clientId: zerodhaReports.clientId,
        memberId: zerodhaReports.memberId,
        memberName: zerodhaMembers.name,
      })
      .from(zerodhaReports)
      .leftJoin(zerodhaMembers, eq(zerodhaReports.memberId, zerodhaMembers.id))
      .orderBy(desc(zerodhaReports.asOfDate));
    zerodhaReportsCache = rows;
  }

  if (accountFilter && accountFilter !== "all") {
    return zerodhaReportsCache.filter((r) => r.clientId === accountFilter);
  }
  return zerodhaReportsCache;
}

export async function saveZerodhaHoldingsReport(
  asOfDate: string,
  filename: string,
  holdings: ZerodhaHoldingParsed[],
  clientId: string = DEFAULT_ZERODHA_CLIENT_ID
): Promise<number> {
  // Find or insert member in zerodhaMembers
  let member = await db.query.zerodhaMembers.findFirst({
    where: eq(zerodhaMembers.clientId, clientId),
  });

  if (!member) {
    const name = ZERODHA_MEMBER_SHORT_NAMES[clientId] || clientId;
    const [newMember] = await db
      .insert(zerodhaMembers)
      .values({
        clientId,
        name,
      })
      .returning();
    member = newMember;
  }

  // 1. Check if report for this date and client already exists. If yes, overwrite (delete old one)
  const existing = await db.query.zerodhaReports.findFirst({
    columns: { id: true },
    where: and(
      eq(zerodhaReports.asOfDate, asOfDate),
      eq(zerodhaReports.clientId, clientId)
    ),
  });

  if (existing) {
    await deleteZerodhaHoldingsReport(existing.id);
  }

  // 2. Insert new report metadata
  const [newReport] = await db
    .insert(zerodhaReports)
    .values({
      asOfDate,
      uploadedAt: new Date().toISOString(),
      filename,
      clientId,
      memberId: member.id,
    })
    .returning();

  // 3. Register mutual fund schemes and stocks in zerodhaSchemes if they don't exist
  const schemeMap = new Map<string, number>();

  if (holdings.length > 0) {
    for (const h of holdings) {
      const schemeName = h.symbol;
      const normalizedName = normalizeSchemeName(schemeName);
      let scheme = await db.query.zerodhaSchemes.findFirst({
        columns: {
          id: true,
          name: true,
          normalizedName: true,
          isin: true,
          holdingType: true,
          sector: true,
          instrumentType: true,
        },
        where: (table, { eq, or, and }) => {
          const isinCond = h.isin
            ? and(eq(table.isin, h.isin), eq(table.holdingType, h.holdingType))
            : undefined;

          if (isinCond) {
            return or(
              eq(table.name, schemeName),
              eq(table.normalizedName, normalizedName),
              isinCond
            );
          }

          return or(
            eq(table.name, schemeName),
            eq(table.normalizedName, normalizedName)
          );
        },
      });

      if (!scheme) {
        if (h.holdingType === "mutual_fund") {
          const apiMapping = await autoMapScheme(schemeName);
          const [inserted] = await db
            .insert(zerodhaSchemes)
            .values({
              name: schemeName,
              normalizedName,
              category: h.instrumentType || "Mutual Fund",
              isin: h.isin,
              holdingType: h.holdingType,
              sector: h.sector,
              instrumentType: h.instrumentType,
              schemeCodeApi: apiMapping ? apiMapping.schemeCode : null,
              mappedAt: apiMapping ? new Date().toISOString() : null,
            })
            .returning();
          scheme = inserted;
        } else {
          // For stock, default to symbol.NS, except map known edge cases
          let ticker: string | null = `${h.symbol}.NS`;
          if (h.symbol === "SCL-X" || isUnlistedStock(h.symbol)) ticker = null;
          else if (h.symbol === "TMCV") ticker = "TMCV.NS";
          else if (h.symbol === "TATACAP") ticker = "TATACAP.NS";

          const [inserted] = await db
            .insert(zerodhaSchemes)
            .values({
              name: schemeName,
              normalizedName,
              category: "Equity Stock",
              isin: h.isin,
              holdingType: h.holdingType,
              sector: h.sector,
              instrumentType: h.instrumentType,
              schemeCodeApi: ticker,
              mappedAt: new Date().toISOString(),
            })
            .returning();
          scheme = inserted;
        }
      } else {
        // If it exists, make sure the static fields are updated in case they were null
        await db
          .update(zerodhaSchemes)
          .set({
            normalizedName: scheme.normalizedName || normalizedName,
            isin: scheme.isin || h.isin,
            holdingType: scheme.holdingType || h.holdingType,
            sector: scheme.sector || h.sector,
            instrumentType: scheme.instrumentType || h.instrumentType,
          })
          .where(eq(zerodhaSchemes.id, scheme.id));
      }

      if (scheme) {
        schemeMap.set(schemeName, scheme.id);
        schemeMap.set(normalizedName, scheme.id);
      }
    }
  }

  await db.insert(zerodhaHoldings).values(
    holdings.map((h) => {
      const schemeId =
        schemeMap.get(h.symbol) || schemeMap.get(normalizeSchemeName(h.symbol));
      if (!schemeId) {
        throw new Error(`Scheme ID not found for symbol ${h.symbol}`);
      }
      return {
        reportId: newReport.id,
        schemeId,
        quantity: h.quantity,
        averagePrice: h.averagePrice,
        currentPrice: h.currentPrice,
        investedValue: h.investedValue,
        currentValue: h.currentValue,
        unrealizedPnl: h.unrealizedPnl,
        unrealizedPnlPct: h.unrealizedPnlPct,
        frozenQuantity: h.frozenQuantity,
        pledgedQuantity: h.pledgedQuantity,
        pledgeSetupQuantity: h.pledgeSetupQuantity,
        freeQuantity: h.freeQuantity,
        lockinQuantity: h.lockinQuantity,
        lockinDate: h.lockinDate,
        balanceDescription: h.balanceDescription,
      };
    })
  );

  return newReport.id;
}

export async function deleteZerodhaHoldingsReport(
  reportId: number
): Promise<void> {
  await db.delete(zerodhaReports).where(eq(zerodhaReports.id, reportId));
}

function calculateFundMetrics(
  purchaseNav: number,
  currentNav: number,
  asOfDate: string,
  fundNavHistory: { date: string; nav: string }[],
  benchNavHistory: { date: string; nav: string }[] = []
): {
  xirr: number;
  cagr: number;
  holdingDays: number;
  benchmarkXirr: number;
  benchmarkCagr: number;
  alpha: number;
} {
  if (!fundNavHistory.length || !currentNav || currentNav <= 0) {
    return {
      xirr: 0,
      cagr: 0,
      holdingDays: 0,
      benchmarkXirr: 0,
      benchmarkCagr: 0,
      alpha: 0,
    };
  }

  const parseApiDate = (s: string) => {
    const [dd, mm, yyyy] = s.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  const sorted = parseAndSortNavHistory(fundNavHistory, parseApiDate);
  const entry = findSyntheticInvestmentEntry(purchaseNav, sorted);

  if (!entry) {
    return {
      xirr: 0,
      cagr: 0,
      holdingDays: 0,
      benchmarkXirr: 0,
      benchmarkCagr: 0,
      alpha: 0,
    };
  }

  const investDate = entry.date;
  const exitDate = new Date(asOfDate);
  const msDiff = exitDate.getTime() - investDate.getTime();
  const holdingDays = Math.max(0, Math.round(msDiff / (24 * 60 * 60 * 1000)));

  if (benchNavHistory.length > 0) {
    const metrics = calculateXirrFromNav(
      purchaseNav,
      currentNav,
      asOfDate,
      fundNavHistory,
      benchNavHistory
    );
    return {
      xirr: metrics.portfolioXirr,
      cagr: metrics.portfolioXirr,
      holdingDays,
      benchmarkXirr: metrics.benchmarkXirr,
      benchmarkCagr: metrics.benchmarkCagrSinceInception,
      alpha: metrics.alpha,
    };
  }
  const actualPurchaseNav = entry.nav;
  const years = msDiff / (365.25 * 24 * 60 * 60 * 1000);

  if (years <= 0) {
    return {
      xirr: 0,
      cagr: 0,
      holdingDays,
      benchmarkXirr: 0,
      benchmarkCagr: 0,
      alpha: 0,
    };
  }

  const cagrValue = calculateCagr(currentNav, actualPurchaseNav, years);
  return {
    xirr: cagrValue,
    cagr: cagrValue,
    holdingDays,
    benchmarkXirr: 0,
    benchmarkCagr: 0,
    alpha: 0,
  };
}

function parseApiDate(s: string): Date {
  const [dd, mm, yyyy] = s.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseIsoDate(s: string): Date {
  const [yyyy, mm, dd] = s.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateBenchmarkReturns(
  reportDate: string,
  history: { date: string; nav: string }[]
): ZerodhaBenchmarkReturns {
  const benchmarkCode = "120716";
  const benchmarkName = "UTI Nifty 50 Index Fund Direct Growth";
  const rows = history
    .map((point) => ({ date: point.date, nav: Number(point.nav) }))
    .filter((point) => Number.isFinite(point.nav) && point.nav > 0)
    .sort(
      (a, b) => parseApiDate(a.date).getTime() - parseApiDate(b.date).getTime()
    );

  if (rows.length === 0) {
    return {
      benchmarkCode,
      benchmarkName,
      endDate: "N/A",
      endNav: 0,
      return1Y: null,
      cagr3Y: null,
      cagr5Y: null,
    };
  }

  const reportEndDate = parseIsoDate(reportDate);
  const end =
    [...rows]
      .reverse()
      .find((point) => parseApiDate(point.date) <= reportEndDate) ??
    rows[rows.length - 1];
  const endDate = parseApiDate(end.date);

  function navAtYearsAgo(years: number) {
    const cutoff = new Date(endDate);
    cutoff.setFullYear(cutoff.getFullYear() - years);
    for (let i = rows.length - 1; i >= 0; i--) {
      if (parseApiDate(rows[i].date) <= cutoff) return rows[i];
    }
    return null;
  }

  function cagrPct(oldNav: number, newNav: number, years: number) {
    return (Math.pow(newNav / oldNav, 1 / years) - 1) * 100;
  }

  const y1 = navAtYearsAgo(1);
  const y3 = navAtYearsAgo(3);
  const y5 = navAtYearsAgo(5);

  return {
    benchmarkCode,
    benchmarkName,
    endDate: end.date,
    endNav: end.nav,
    return1Y: y1 ? round2(((end.nav - y1.nav) / y1.nav) * 100) : null,
    cagr3Y: y3 ? round2(cagrPct(y3.nav, end.nav, 3)) : null,
    cagr5Y: y5 ? round2(cagrPct(y5.nav, end.nav, 5)) : null,
  };
}

async function getZerodhaSnapshotTotals(reportIds: number | number[]) {
  const ids = Array.isArray(reportIds) ? reportIds : [reportIds];
  if (ids.length === 0) {
    return {
      invested: 0,
      currentValue: 0,
      gain: 0,
      absoluteReturn: 0,
      stocksInvested: 0,
      stocksCurrentValue: 0,
      fundsInvested: 0,
      fundsCurrentValue: 0,
    };
  }

  const rows = await db
    .select({
      investedValue: zerodhaHoldings.investedValue,
      currentValue: zerodhaHoldings.currentValue,
      holdingType: zerodhaSchemes.holdingType,
    })
    .from(zerodhaHoldings)
    .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id))
    .where(
      ids.length === 1
        ? eq(zerodhaHoldings.reportId, ids[0])
        : inArray(zerodhaHoldings.reportId, ids)
    );

  let invested = 0;
  let currentValue = 0;
  let stocksInvested = 0;
  let stocksCurrentValue = 0;
  let fundsInvested = 0;
  let fundsCurrentValue = 0;

  for (const row of rows) {
    invested += row.investedValue;
    currentValue += row.currentValue;
    if (row.holdingType === "equity") {
      stocksInvested += row.investedValue;
      stocksCurrentValue += row.currentValue;
    } else {
      fundsInvested += row.investedValue;
      fundsCurrentValue += row.currentValue;
    }
  }

  const gain = currentValue - invested;
  const absoluteReturn = invested > 0 ? (gain / invested) * 100 : 0;

  return {
    invested,
    currentValue,
    gain,
    absoluteReturn,
    stocksInvested,
    stocksCurrentValue,
    fundsInvested,
    fundsCurrentValue,
  };
}

async function getZerodhaReportWeightedMetrics(
  reportIds: number | number[],
  asOfDate: string,
  schemesList: {
    name: string;
    category: string;
    schemeCodeApi: string | null;
  }[]
): Promise<{
  portfolioXirr: number;
  benchmarkXirr: number;
  alpha: number;
  cagr: number | null;
  stocksXirr: number;
  stocksBenchmarkXirr: number;
  stocksAlpha: number;
  fundsXirr: number;
  fundsBenchmarkXirr: number;
  fundsAlpha: number;
}> {
  const ids = Array.isArray(reportIds) ? reportIds : [reportIds];
  if (ids.length === 0) {
    return {
      portfolioXirr: 0,
      benchmarkXirr: 0,
      alpha: 0,
      cagr: null,
      stocksXirr: 0,
      stocksBenchmarkXirr: 0,
      stocksAlpha: 0,
      fundsXirr: 0,
      fundsBenchmarkXirr: 0,
      fundsAlpha: 0,
    };
  }

  const rawHoldings = await db
    .select({
      id: zerodhaHoldings.id,
      reportId: zerodhaHoldings.reportId,
      schemeId: zerodhaHoldings.schemeId,
      quantity: zerodhaHoldings.quantity,
      averagePrice: zerodhaHoldings.averagePrice,
      currentPrice: zerodhaHoldings.currentPrice,
      investedValue: zerodhaHoldings.investedValue,
      currentValue: zerodhaHoldings.currentValue,
      unrealizedPnl: zerodhaHoldings.unrealizedPnl,
      unrealizedPnlPct: zerodhaHoldings.unrealizedPnlPct,
      symbol: zerodhaSchemes.name,
      holdingType: zerodhaSchemes.holdingType,
      isin: zerodhaSchemes.isin,
      sector: zerodhaSchemes.sector,
      instrumentType: zerodhaSchemes.instrumentType,
      frozenQuantity: zerodhaHoldings.frozenQuantity,
      pledgedQuantity: zerodhaHoldings.pledgedQuantity,
      pledgeSetupQuantity: zerodhaHoldings.pledgeSetupQuantity,
      freeQuantity: zerodhaHoldings.freeQuantity,
      lockinQuantity: zerodhaHoldings.lockinQuantity,
      lockinDate: zerodhaHoldings.lockinDate,
      balanceDescription: zerodhaHoldings.balanceDescription,
    })
    .from(zerodhaHoldings)
    .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id))
    .where(
      ids.length === 1
        ? eq(zerodhaHoldings.reportId, ids[0])
        : inArray(zerodhaHoldings.reportId, ids)
    );

  const enrichedHoldings = await Promise.all(
    rawHoldings.map(async (h) => {
      const scheme = schemesList.find((s) => s.name === h.symbol);
      const category =
        scheme?.category ||
        h.instrumentType ||
        (h.holdingType === "equity" ? "Equity Stock" : "Mutual Fund");
      const benchmarkCode = await getBenchmarkCodeForCategory(category);

      if (h.holdingType === "mutual_fund") {
        if (scheme && scheme.schemeCodeApi) {
          const [fundDetails, benchDetails] = await Promise.all([
            getZerodhaSchemeHistoryForDbCode(scheme.schemeCodeApi),
            getBenchmarkHistory(benchmarkCode),
          ]);
          if (fundDetails && fundDetails.data && fundDetails.data.length > 0) {
            const metrics = calculateFundMetrics(
              h.averagePrice,
              h.currentPrice,
              asOfDate,
              fundDetails.data,
              benchDetails?.data || []
            );
            return {
              holdingType: h.holdingType,
              currentValue: h.currentValue,
              xirr: metrics.xirr,
              benchmarkXirr: metrics.benchmarkXirr,
              benchmarkCagr: metrics.benchmarkCagr,
            };
          }
        }
      } else if (h.holdingType === "equity") {
        const ticker =
          isUnlistedStock(h.symbol) ||
          (scheme?.schemeCodeApi && isUnlistedStock(scheme.schemeCodeApi))
            ? null
            : scheme?.schemeCodeApi || `${h.symbol}.NS`;
        const [stockDetails, benchDetails] = await Promise.all([
          ticker
            ? getZerodhaStockHistoryForSymbol(ticker)
            : Promise.resolve(null),
          getBenchmarkHistory(benchmarkCode),
        ]);
        if (stockDetails && stockDetails.data && stockDetails.data.length > 0) {
          const metrics = calculateFundMetrics(
            h.averagePrice,
            h.currentPrice,
            asOfDate,
            stockDetails.data,
            benchDetails?.data || []
          );
          return {
            holdingType: h.holdingType,
            currentValue: h.currentValue,
            xirr: metrics.xirr,
            benchmarkXirr: metrics.benchmarkXirr,
            benchmarkCagr: metrics.benchmarkCagr,
          };
        }
      }
      return {
        holdingType: h.holdingType,
        currentValue: h.currentValue,
        xirr: null,
        benchmarkXirr: null,
        benchmarkCagr: null,
      };
    })
  );

  const validXirrHoldings = enrichedHoldings.filter(
    (h) => typeof h.xirr === "number" && h.currentValue > 0
  );
  const portfolioXirr =
    validXirrHoldings.length > 0
      ? validXirrHoldings.reduce(
          (sum, h) => sum + (h.xirr ?? 0) * h.currentValue,
          0
        ) / validXirrHoldings.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const validBenchXirrHoldings = enrichedHoldings.filter(
    (h) => typeof h.benchmarkXirr === "number" && h.currentValue > 0
  );
  const benchmarkXirr =
    validBenchXirrHoldings.length > 0
      ? validBenchXirrHoldings.reduce(
          (sum, h) => sum + (h.benchmarkXirr ?? 0) * h.currentValue,
          0
        ) / validBenchXirrHoldings.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const alpha = portfolioXirr - benchmarkXirr;

  const stockHoldings = enrichedHoldings.filter(
    (h) => h.holdingType === "equity"
  );
  const fundHoldings = enrichedHoldings.filter(
    (h) => h.holdingType === "mutual_fund"
  );

  const validStockXirr = stockHoldings.filter(
    (h) => typeof h.xirr === "number" && h.currentValue > 0
  );
  const stocksXirr =
    validStockXirr.length > 0
      ? validStockXirr.reduce(
          (sum, h) => sum + (h.xirr ?? 0) * h.currentValue,
          0
        ) / validStockXirr.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const validStockBench = stockHoldings.filter(
    (h) => typeof h.benchmarkXirr === "number" && h.currentValue > 0
  );
  const stocksBenchmarkXirr =
    validStockBench.length > 0
      ? validStockBench.reduce(
          (sum, h) => sum + (h.benchmarkXirr ?? 0) * h.currentValue,
          0
        ) / validStockBench.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const stocksAlpha = stocksXirr - stocksBenchmarkXirr;

  const validFundXirr = fundHoldings.filter(
    (h) => typeof h.xirr === "number" && h.currentValue > 0
  );
  const fundsXirr =
    validFundXirr.length > 0
      ? validFundXirr.reduce(
          (sum, h) => sum + (h.xirr ?? 0) * h.currentValue,
          0
        ) / validFundXirr.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const validFundBench = fundHoldings.filter(
    (h) => typeof h.benchmarkXirr === "number" && h.currentValue > 0
  );
  const fundsBenchmarkXirr =
    validFundBench.length > 0
      ? validFundBench.reduce(
          (sum, h) => sum + (h.benchmarkXirr ?? 0) * h.currentValue,
          0
        ) / validFundBench.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const fundsAlpha = fundsXirr - fundsBenchmarkXirr;

  const validCagrHoldings = enrichedHoldings.filter(
    (h) => typeof h.xirr === "number" && h.currentValue > 0
  );
  const weightedCagr =
    validCagrHoldings.length > 0
      ? validCagrHoldings.reduce(
          (sum, h) => sum + (h.xirr ?? 0) * h.currentValue,
          0
        ) / validCagrHoldings.reduce((sum, h) => sum + h.currentValue, 0)
      : null;

  return {
    portfolioXirr,
    benchmarkXirr,
    alpha,
    cagr: weightedCagr,
    stocksXirr,
    stocksBenchmarkXirr,
    stocksAlpha,
    fundsXirr,
    fundsBenchmarkXirr,
    fundsAlpha,
  };
}

const zerodhaDashboardCache = new Map<
  string,
  { data: ZerodhaDashboardData; timestamp: number }
>();

export async function getZerodhaDashboardData(
  reportId?: number,
  accountFilter: string = "all"
): Promise<ZerodhaDashboardData> {
  const [members, allReports] = await Promise.all([
    getZerodhaMembers(),
    getZerodhaReports(),
  ]);

  const filteredReports =
    accountFilter !== "all"
      ? allReports.filter((r) => r.clientId === accountFilter)
      : allReports;

  const reportsList = filteredReports;

  if (reportsList.length === 0) {
    return {
      firstCasReportDate: null,
      members,
      selectedAccount: accountFilter,
      reportsList: [],
      selectedReport: null,
      holdings: [],
      totals: {
        invested: 0,
        currentValue: 0,
        gain: 0,
        absoluteReturn: 0,
        stocksInvested: 0,
        stocksCurrentValue: 0,
        stocksGain: 0,
        fundsInvested: 0,
        fundsCurrentValue: 0,
        fundsGain: 0,
        portfolioXirr: 0,
        benchmarkXirr: 0,
        alpha: 0,
        stocksXirr: 0,
        stocksBenchmarkXirr: 0,
        stocksAlpha: 0,
        fundsXirr: 0,
        fundsBenchmarkXirr: 0,
        fundsAlpha: 0,
      },
      metricDeltas: {
        previousDate: null,
        portfolioXirr: null,
        benchmarkXirr: null,
        alpha: null,
        stocksXirr: null,
        stocksBenchmarkXirr: null,
        stocksAlpha: null,
        fundsXirr: null,
        fundsBenchmarkXirr: null,
        fundsAlpha: null,
      },
      sectorAllocation: [],
      categoryAllocation: [],
      sectorBreakdown: [],
      marketCapBreakdown: [],
      assetSplit: [],
      timelineData: [],
      insights: emptyZerodhaInsightsData(),
    };
  }

  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0];

  let targetReports = [selectedReport];
  let previousTargetReports: typeof allReports = [];
  let prevDateForMetrics: string = "";
  let previousReport: (typeof allReports)[0] | null = null;

  if (accountFilter === "all") {
    const latestPerMember: typeof allReports = [];
    for (const m of members) {
      const rep = allReports.find(
        (r) =>
          r.clientId === m.clientId && r.asOfDate <= selectedReport.asOfDate
      );
      if (rep) latestPerMember.push(rep);
    }
    if (latestPerMember.length > 0) {
      targetReports = latestPerMember;
    }

    const distinctDatesDesc = Array.from(
      new Set(allReports.map((r) => r.asOfDate))
    ).sort((a, b) => b.localeCompare(a));
    const curDateIdx = distinctDatesDesc.indexOf(selectedReport.asOfDate);
    const prevDate =
      curDateIdx !== -1 && curDateIdx + 1 < distinctDatesDesc.length
        ? distinctDatesDesc[curDateIdx + 1]
        : null;

    if (prevDate) {
      prevDateForMetrics = prevDate;
      for (const m of members) {
        const prevRep = allReports.find(
          (r) => r.clientId === m.clientId && r.asOfDate <= prevDate
        );
        if (prevRep) previousTargetReports.push(prevRep);
      }
      previousReport = previousTargetReports[0] || null;
    }
  } else {
    const chronologicalReports = [...reportsList].reverse();
    const selectedReportIndex = chronologicalReports.findIndex(
      (report) => report.id === selectedReport.id
    );
    previousReport =
      selectedReportIndex > 0
        ? chronologicalReports[selectedReportIndex - 1]
        : null;
    if (previousReport) {
      previousTargetReports = [previousReport];
      prevDateForMetrics = previousReport.asOfDate;
    }
  }

  const targetReportIds = targetReports.map((r) => r.id);

  const marketOpen = isIndianMarketOpen();
  const cacheKey = `zerodha:${selectedReport.id}:${selectedReport.asOfDate}:${reportsList.length}:${accountFilter}`;
  const cached = zerodhaDashboardCache.get(cacheKey);
  const cacheTtl = marketOpen ? 30000 : 24 * 60 * 60 * 1000;
  if (cached && Date.now() - cached.timestamp < cacheTtl) {
    return cached.data;
  }

  // Build timeline snapshots before queries so all independent queries can run in a single Promise.all batch
  let timelineSnapshots: Array<{ date: string; reportIds: number[] }> = [];
  if (accountFilter === "all") {
    const distinctDatesAsc = Array.from(
      new Set(allReports.map((r) => r.asOfDate))
    ).sort((a, b) => a.localeCompare(b));
    timelineSnapshots = distinctDatesAsc.map((d) => {
      const repIds: number[] = [];
      for (const m of members) {
        const mr = allReports.find(
          (r) => r.clientId === m.clientId && r.asOfDate <= d
        );
        if (mr && !repIds.includes(mr.id)) repIds.push(mr.id);
      }
      return { date: d, reportIds: repIds };
    });
  } else {
    const chronologicalReports = [...reportsList].reverse();
    timelineSnapshots = chronologicalReports.map((r) => ({
      date: r.asOfDate,
      reportIds: [r.id],
    }));
  }

  const allTimelineReportIds = Array.from(
    new Set(timelineSnapshots.flatMap((s) => s.reportIds))
  );

  const [
    oldestCasReport,
    schemesList,
    niftyDetails,
    stockFundamentalsRows,
    rankingsRows,
    earliestTx,
    niftyIndexDetails,
    zAthMap,
    auditData,
    rawHoldings,
    allRelevantTransactions,
    allTimelineHoldings,
    previousTotals,
    familyMembersList,
  ] = await Promise.all([
    db.query.reports.findFirst({
      orderBy: [asc(reports.asOfDate)],
    }),
    db
      .select({
        id: zerodhaSchemes.id,
        name: zerodhaSchemes.name,
        category: zerodhaSchemes.category,
        schemeCodeApi: zerodhaSchemes.schemeCodeApi,
        isin: zerodhaSchemes.isin,
      })
      .from(zerodhaSchemes),
    getBenchmarkHistory("120716"),
    db.select().from(stockFundamentals),
    db.select().from(schemeCategoryRankings),
    db
      .select({ date: zerodhaTransactions.date })
      .from(zerodhaTransactions)
      .orderBy(asc(zerodhaTransactions.date))
      .limit(1),
    getNifty50IndexHistory("5y"),
    getAllZerodhaSchemesAthMap(),
    getZerodhaAuditData(accountFilter),
    db
      .select({
        id: zerodhaHoldings.id,
        reportId: zerodhaHoldings.reportId,
        schemeId: zerodhaHoldings.schemeId,
        quantity: zerodhaHoldings.quantity,
        averagePrice: zerodhaHoldings.averagePrice,
        currentPrice: zerodhaHoldings.currentPrice,
        investedValue: zerodhaHoldings.investedValue,
        currentValue: zerodhaHoldings.currentValue,
        unrealizedPnl: zerodhaHoldings.unrealizedPnl,
        unrealizedPnlPct: zerodhaHoldings.unrealizedPnlPct,
        symbol: zerodhaSchemes.name,
        holdingType: zerodhaSchemes.holdingType,
        isin: zerodhaSchemes.isin,
        sector: zerodhaSchemes.sector,
        marketCapCategory: zerodhaSchemes.marketCapCategory,
        instrumentType: zerodhaSchemes.instrumentType,
        frozenQuantity: zerodhaHoldings.frozenQuantity,
        pledgedQuantity: zerodhaHoldings.pledgedQuantity,
        pledgeSetupQuantity: zerodhaHoldings.pledgeSetupQuantity,
        freeQuantity: zerodhaHoldings.freeQuantity,
        lockinQuantity: zerodhaHoldings.lockinQuantity,
        lockinDate: zerodhaHoldings.lockinDate,
        balanceDescription: zerodhaHoldings.balanceDescription,
      })
      .from(zerodhaHoldings)
      .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id))
      .where(
        targetReportIds.length === 1
          ? eq(zerodhaHoldings.reportId, targetReportIds[0])
          : inArray(zerodhaHoldings.reportId, targetReportIds)
      ),
    db
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
        uploadedAt: zerodhaTransactions.uploadedAt,
      })
      .from(zerodhaTransactions)
      .orderBy(asc(zerodhaTransactions.date)),
    allTimelineReportIds.length > 0
      ? db
          .select({
            reportId: zerodhaHoldings.reportId,
            investedValue: zerodhaHoldings.investedValue,
            currentValue: zerodhaHoldings.currentValue,
            holdingType: zerodhaSchemes.holdingType,
          })
          .from(zerodhaHoldings)
          .leftJoin(
            zerodhaSchemes,
            eq(zerodhaHoldings.schemeId, zerodhaSchemes.id)
          )
          .where(inArray(zerodhaHoldings.reportId, allTimelineReportIds))
      : Promise.resolve([]),
    previousTargetReports.length > 0
      ? getZerodhaSnapshotTotals(previousTargetReports.map((r) => r.id))
      : null,
    db.query.familyMembers.findMany(),
  ]);
  const firstCasReportDate = oldestCasReport?.asOfDate ?? null;

  const prevMetrics =
    previousTargetReports.length > 0
      ? await getZerodhaReportWeightedMetrics(
          previousTargetReports.map((r) => r.id),
          prevDateForMetrics,
          schemesList
        )
      : null;

  const reportMetaMap = new Map<
    number,
    { clientId?: string | null; memberName?: string | null }
  >();
  for (const r of allReports) {
    reportMetaMap.set(r.id, {
      clientId: r.clientId,
      memberName: r.memberName,
    });
  }

  const clientToMemberIdMap = new Map<string, number>();
  for (const fm of familyMembersList) {
    if (fm.clientId) clientToMemberIdMap.set(fm.clientId, fm.id);
    if (fm.pan) clientToMemberIdMap.set(fm.pan, fm.id);
    const shortName = formatZerodhaMemberShortName(fm.name);
    if (shortName === "Dishen") {
      clientToMemberIdMap.set("SQY316", fm.id);
    } else if (shortName === "Nency") {
      clientToMemberIdMap.set("QIJ676", fm.id);
    }
  }

  const rankMap = new Map(rankingsRows.map((r) => [r.schemeCode, r]));

  const enrichedHoldings = await Promise.all(
    rawHoldings.map(async (h) => {
      const reportMeta = reportMetaMap.get(h.reportId || 0);
      const symbol = h.symbol || "";
      const holdingType = h.holdingType || "";
      const isin = h.isin || "";
      const sector = h.sector || "";

      const scheme = schemesList.find((s) => s.name === symbol);
      const category =
        scheme?.category ||
        h.instrumentType ||
        (holdingType === "equity" ? "Equity Stock" : "Mutual Fund");
      const benchmarkCode = await getBenchmarkCodeForCategory(category);
      const benchmarkName = await getBenchmarkFundNameForCode(benchmarkCode);

      // In-memory transaction filtering matching schemeId or ISIN & member (O(1) lookups)
      const matchingSchemeIds = isin
        ? schemesList.filter((s) => s.isin === isin).map((s) => s.id)
        : scheme?.id
          ? [scheme.id]
          : [];

      const targetMemberId = reportMeta?.clientId
        ? clientToMemberIdMap.get(reportMeta.clientId)
        : undefined;

      const matchingIdsSet = new Set(matchingSchemeIds);
      const zTxs =
        matchingIdsSet.size > 0
          ? allRelevantTransactions.filter(
              (tx) =>
                tx.schemeId !== null &&
                matchingIdsSet.has(tx.schemeId) &&
                (targetMemberId === undefined || tx.memberId === targetMemberId)
            )
          : [];

      const ticker =
        isUnlistedStock(symbol) ||
        (scheme?.schemeCodeApi && isUnlistedStock(scheme.schemeCodeApi))
          ? null
          : scheme?.schemeCodeApi ||
            (holdingType === "equity" ? `${symbol}.NS` : null);
      const [historyDetails, benchDetails] = await Promise.all([
        ticker
          ? holdingType === "equity"
            ? getZerodhaStockHistoryForSymbol(ticker)
            : getZerodhaSchemeHistoryForDbCode(ticker)
          : Promise.resolve(null),
        getBenchmarkHistory(benchmarkCode),
      ]);

      const fundNavHistory = historyDetails?.data || [];
      const benchNavHistory = benchDetails?.data || [];

      const fundTxs = [...zTxs];
      const hasBuyTx = fundTxs.some((tx) => isBuyTransactionType(tx.type));

      let resolvedQuantity = h.quantity;
      let resolvedInvestedValue = h.investedValue;
      let resolvedAvgPrice = h.averagePrice;

      if (hasBuyTx) {
        const totalBuyUnits = fundTxs
          .filter((t) => isBuyTransactionType(t.type))
          .reduce((s, t) => s + (t.units || 0), 0);
        const totalSellUnits = fundTxs
          .filter((t) => t.type === "SELL")
          .reduce((s, t) => s + (t.units || 0), 0);
        const netUnits = totalBuyUnits - totalSellUnits;

        const totalBuyAmount = fundTxs
          .filter((t) => isBuyTransactionType(t.type))
          .reduce((s, t) => s + (t.amount || 0), 0);
        const totalSellAmount = fundTxs
          .filter((t) => t.type === "SELL")
          .reduce((s, t) => s + (t.amount || 0), 0);
        const netInvested = totalBuyAmount - totalSellAmount;

        if (netUnits > 0) {
          resolvedQuantity = netUnits;
          resolvedInvestedValue = Math.round(netInvested * 100) / 100;
          resolvedAvgPrice =
            Math.round((netInvested / netUnits) * 10000) / 10000;
        }
      } else if (h.averagePrice > 0) {
        let ipoDate = selectedReport.asOfDate;
        if (fundNavHistory.length > 0) {
          const parseApiDate = (s: string) => {
            const [dd, mm, yyyy] = s.split("-");
            return new Date(`${yyyy}-${mm}-${dd}`);
          };
          const sorted = [...fundNavHistory].sort(
            (a, b) =>
              parseApiDate(a.date).getTime() - parseApiDate(b.date).getTime()
          );
          const oldest = sorted[0];
          const [dd, mm, yyyy] = oldest.date.split("-");
          ipoDate = `${yyyy}-${mm}-${dd}`;
        }

        const totalSoldUnits = fundTxs
          .filter((t) => t.type === "SELL")
          .reduce((s, t) => s + (t.units || 0), 0);
        const ipoUnits = h.quantity + totalSoldUnits;
        const ipoAmount = Math.round(ipoUnits * h.averagePrice * 100) / 100;

        fundTxs.unshift({
          id: -1,
          memberId: null,
          schemeId: scheme?.id || null,
          folioNo: null,
          date: ipoDate,
          type: "BUY",
          rawTransactionType: "ipo_allotment",
          units: ipoUnits,
          nav: h.averagePrice,
          amount: ipoAmount,
          stampDuty: 0,
          broker: "Zerodha (IPO Allotment)",
          assetType: holdingType || "equity",
          uploadedAt: new Date().toISOString(),
        });
      }

      let resolvedCurrentPrice = h.currentPrice;
      if (fundNavHistory.length > 0) {
        const parseApiDate = (s: string) => {
          const [dd, mm, yyyy] = s.split("-");
          return new Date(`${yyyy}-${mm}-${dd}`);
        };
        const sorted = [...fundNavHistory].sort(
          (a, b) =>
            parseApiDate(b.date).getTime() - parseApiDate(a.date).getTime()
        );
        const latestNav = parseFloat(sorted[0].nav);
        if (latestNav > 0) {
          resolvedCurrentPrice = latestNav;
        }
      } else if (resolvedCurrentPrice <= 0) {
        resolvedCurrentPrice = resolvedAvgPrice;
      }

      const resolvedCurrentValue =
        Math.round(resolvedQuantity * resolvedCurrentPrice * 100) / 100;
      const resolvedPnl =
        Math.round((resolvedCurrentValue - resolvedInvestedValue) * 100) / 100;

      const mappedTxs = fundTxs.map((tx) => ({
        date: tx.date,
        type: tx.type as "BUY" | "SELL",
        amount: tx.amount,
        units: tx.units ?? undefined,
      }));

      const latestTxDate = mappedTxs.reduce(
        (max, t) => (t.date > max ? t.date : max),
        selectedReport.asOfDate
      );
      const effectiveAsOfDate =
        latestTxDate > selectedReport.asOfDate
          ? latestTxDate
          : selectedReport.asOfDate;

      let metrics = await calculateAlpha(
        mappedTxs,
        effectiveAsOfDate,
        resolvedCurrentValue,
        benchmarkCode
      );

      if (
        (metrics.portfolioXirr === 0 || isNaN(metrics.portfolioXirr)) &&
        fundNavHistory.length > 0 &&
        benchNavHistory.length > 0
      ) {
        metrics = calculateXirrFromNav(
          resolvedAvgPrice,
          resolvedCurrentPrice,
          effectiveAsOfDate,
          fundNavHistory,
          benchNavHistory
        );
      }

      let holdingDays = 0;
      if (mappedTxs.length > 0) {
        const isLatestReport = selectedReport.id === reportsList[0]?.id;
        const targetDateStr = isLatestReport
          ? new Date().toISOString().split("T")[0]
          : effectiveAsOfDate;
        const targetTime = new Date(targetDateStr).getTime();

        const buyTxs = fundTxs.filter(
          (t) => isBuyTransactionType(t.type) && t.amount > 0
        );

        if (buyTxs.length > 0) {
          let sumCostDays = 0;
          let sumCost = 0;
          for (const bt of buyTxs) {
            const txTime = new Date(bt.date).getTime();
            const days = Math.max(
              1,
              Math.round((targetTime - txTime) / (24 * 60 * 60 * 1000))
            );
            sumCostDays += bt.amount * days;
            sumCost += bt.amount;
          }
          holdingDays = sumCost > 0 ? Math.round(sumCostDays / sumCost) : 1;
        } else {
          const oldestTxTime = new Date(mappedTxs[0].date).getTime();
          holdingDays = Math.max(
            1,
            Math.round((targetTime - oldestTxTime) / (24 * 60 * 60 * 1000))
          );
        }
      }

      const matchedTxWithFolio = fundTxs.find((tx) => tx.folioNo);
      const folioNo = matchedTxWithFolio?.folioNo || null;

      let athNav: number | null = null;
      let athDate: string | null = null;
      let athCorrectionPct: number | null = null;
      let athDaysDiff: number | null = null;
      let isLumpsumOpportunity = false;

      const athItem = ticker ? zAthMap.get(ticker) : null;
      if (athItem && athItem.athNav > 0 && resolvedCurrentPrice > 0) {
        const athMetrics = computeFundAthMetrics(
          resolvedCurrentPrice,
          athItem.athNav,
          athItem.athDate,
          effectiveAsOfDate
        );
        athNav = athMetrics.athNav;
        athDate = athMetrics.athDate;
        athCorrectionPct = athMetrics.correctionPct;
        athDaysDiff = athMetrics.daysSinceAth;
        isLumpsumOpportunity = athMetrics.isLumpsumOpportunity;
      } else if (fundNavHistory.length > 0 && resolvedCurrentPrice > 0) {
        let maxPoint = { nav: 0, date: effectiveAsOfDate };
        for (const pt of fundNavHistory) {
          const v = parseFloat(pt.nav);
          if (v > maxPoint.nav) {
            maxPoint = { nav: v, date: pt.date };
          }
        }
        if (maxPoint.nav > 0) {
          const athMetrics = computeFundAthMetrics(
            resolvedCurrentPrice,
            maxPoint.nav,
            maxPoint.date,
            effectiveAsOfDate
          );
          athNav = athMetrics.athNav;
          athDate = athMetrics.athDate;
          athCorrectionPct = athMetrics.correctionPct;
          athDaysDiff = athMetrics.daysSinceAth;
          isLumpsumOpportunity = athMetrics.isLumpsumOpportunity;
        }
      }

      const absReturn =
        resolvedInvestedValue > 0
          ? ((resolvedCurrentValue - resolvedInvestedValue) /
              resolvedInvestedValue) *
            100
          : 0;

      let cagr = metrics.portfolioXirr;
      let xirr = metrics.portfolioXirr;

      if (
        holdingDays > 0 &&
        resolvedCurrentValue > 0 &&
        resolvedInvestedValue > 0
      ) {
        if (holdingDays < 30) {
          // For short-term holdings under 30 days, annualization causes mathematical distortion.
          // Standard industry practice (AMFI/SEBI/Zerodha) is to use Absolute Return.
          cagr = absReturn;
          xirr = absReturn;
        } else if (holdingDays <= 365) {
          cagr = (absReturn * 365) / holdingDays;
        } else {
          cagr =
            (Math.pow(
              resolvedCurrentValue / resolvedInvestedValue,
              365 / holdingDays
            ) -
              1) *
            100;
        }
      }

      const rankRecord = ticker ? rankMap.get(ticker) : null;

      return {
        ...h,
        quantity: resolvedQuantity,
        investedValue: resolvedInvestedValue,
        averagePrice: resolvedAvgPrice,
        currentPrice: resolvedCurrentPrice,
        currentValue: resolvedCurrentValue,
        pnl: resolvedPnl,
        folioNo,
        clientId: reportMeta?.clientId ?? null,
        memberName:
          formatZerodhaMemberShortName(
            reportMeta?.clientId || reportMeta?.memberName
          ) || null,
        symbol,
        holdingType,
        isin,
        sector,
        instrumentType: category,
        schemeCodeApi: ticker,
        xirr: Math.round(xirr * 100) / 100,
        cagr: Math.round(cagr * 100) / 100,
        holdingDays,
        benchmarkXirr: metrics.benchmarkXirr,
        benchmarkCagr: metrics.benchmarkCagrSinceInception,
        alpha: metrics.alpha,
        benchmarkCode,
        benchmarkName,
        fundNavHistory,
        athNav,
        athDate,
        athCorrectionPct,
        athDaysDiff,
        isLumpsumOpportunity,
        marketCap: rankRecord?.marketCapData
          ? (() => {
              try {
                return JSON.parse(
                  rankRecord.marketCapData
                ) as GrowwMarketCapData;
              } catch {
                return null;
              }
            })()
          : null,
        assetAllocation: rankRecord?.assetAllocationData
          ? (() => {
              try {
                return JSON.parse(
                  rankRecord.assetAllocationData
                ) as GrowwAssetAllocationData;
              } catch {
                return null;
              }
            })()
          : null,
      };
    })
  );

  const holdings = enrichedHoldings;

  // Compute totals
  let stocksInvested = 0;
  let stocksCurrentValue = 0;
  let fundsInvested = 0;
  let fundsCurrentValue = 0;

  const sectorMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();

  for (const h of holdings) {
    if (h.holdingType === "equity") {
      stocksInvested += h.investedValue;
      stocksCurrentValue += h.currentValue;
      const sector = h.sector || "Other";
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + h.currentValue);
    } else {
      fundsInvested += h.investedValue;
      fundsCurrentValue += h.currentValue;
      const category = h.instrumentType || "Mutual Fund";
      categoryMap.set(
        category,
        (categoryMap.get(category) || 0) + h.currentValue
      );
    }
  }

  const totalInvested = stocksInvested + fundsInvested;
  const totalCurrentValue = stocksCurrentValue + fundsCurrentValue;
  const totalGain = totalCurrentValue - totalInvested;
  const totalAbsoluteReturn =
    totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const stocksGain = stocksCurrentValue - stocksInvested;
  const fundsGain = fundsCurrentValue - fundsInvested;

  const sectorAllocation = Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const categoryAllocation = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const assetSplit = [
    { name: "Stocks", value: stocksCurrentValue },
    { name: "Mutual Funds", value: fundsCurrentValue },
  ].filter((item) => item.value > 0);

  // Detailed Sector Breakdown for Equity Stocks
  const stockHoldings = holdings.filter((h) => h.holdingType === "equity");
  const sectorGroupMap = new Map<
    string,
    { invested: number; current: number; count: number }
  >();

  for (const h of stockHoldings) {
    const sec = h.sector || "General";
    const existing = sectorGroupMap.get(sec) || {
      invested: 0,
      current: 0,
      count: 0,
    };
    existing.invested += h.investedValue;
    existing.current += h.currentValue;
    existing.count += 1;
    sectorGroupMap.set(sec, existing);
  }

  const totalStockCurrentValuation = stocksCurrentValue || 1;
  const sectorBreakdown: ZerodhaSectorBreakdownItem[] = Array.from(
    sectorGroupMap.entries()
  )
    .map(([secName, data]) => {
      const gain = data.current - data.invested;
      const gainPct = data.invested > 0 ? (gain / data.invested) * 100 : 0;
      const allocationPct = (data.current / totalStockCurrentValuation) * 100;
      return {
        sector: secName,
        investedValue: data.invested,
        currentValue: data.current,
        gain,
        gainPct,
        allocationPct,
        stockCount: data.count,
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue);

  // Market Cap Risk Breakdown for Equity Stocks
  const capCategories: Array<
    "Large Cap" | "Mid Cap" | "Small Cap" | "Micro Cap"
  > = ["Large Cap", "Mid Cap", "Small Cap", "Micro Cap"];

  const capGroupMap = new Map<
    string,
    { invested: number; current: number; count: number }
  >();

  for (const cat of capCategories) {
    capGroupMap.set(cat, { invested: 0, current: 0, count: 0 });
  }

  for (const h of stockHoldings) {
    const cat =
      (h.marketCapCategory as
        "Large Cap" | "Mid Cap" | "Small Cap" | "Micro Cap") || "Large Cap";
    const existing = capGroupMap.get(cat) || {
      invested: 0,
      current: 0,
      count: 0,
    };
    existing.invested += h.investedValue;
    existing.current += h.currentValue;
    existing.count += 1;
    capGroupMap.set(cat, existing);
  }

  const marketCapBreakdown: ZerodhaMarketCapBreakdownItem[] = capCategories.map(
    (cat) => {
      const data = capGroupMap.get(cat) || {
        invested: 0,
        current: 0,
        count: 0,
      };
      const allocationPct = (data.current / totalStockCurrentValuation) * 100;
      return {
        category: cat,
        investedValue: data.invested,
        currentValue: data.current,
        allocationPct,
        stockCount: data.count,
      };
    }
  );

  // Compute timeline data
  const timelineData: Array<{
    date: string;
    equity: number;
    mutualFunds: number;
    nifty50: number;
    equityReturn: number;
    fundsReturn: number;
    niftyReturn: number;
  }> = [];
  const niftyHistory = niftyDetails?.data || [];

  let niftyStartNav = 0;
  let niftyBase = 1000;

  let maxInvested = { value: 0, date: selectedReport.asOfDate };
  let maxValue = { value: 0, date: selectedReport.asOfDate };
  let maxGain = { value: 0, date: selectedReport.asOfDate };

  const holdingsByReportId = new Map<
    number,
    Array<{
      investedValue: number;
      currentValue: number;
      holdingType: string | null;
    }>
  >();
  for (const h of allTimelineHoldings) {
    if (!h.reportId) continue;
    let list = holdingsByReportId.get(h.reportId);
    if (!list) {
      list = [];
      holdingsByReportId.set(h.reportId, list);
    }
    list.push(h);
  }

  timelineSnapshots.forEach((snap) => {
    let snapStocksInvested = 0;
    let snapStocksCurrentValue = 0;
    let snapFundsInvested = 0;
    let snapFundsCurrentValue = 0;

    for (const repId of snap.reportIds) {
      const snapHoldings = holdingsByReportId.get(repId) || [];
      for (const h of snapHoldings) {
        if (h.holdingType === "equity") {
          snapStocksInvested += h.investedValue;
          snapStocksCurrentValue += h.currentValue;
        } else {
          snapFundsInvested += h.investedValue;
          snapFundsCurrentValue += h.currentValue;
        }
      }
    }

    const eqReturn =
      snapStocksInvested > 0
        ? ((snapStocksCurrentValue - snapStocksInvested) / snapStocksInvested) *
          100
        : 0;
    const mfReturn =
      snapFundsInvested > 0
        ? ((snapFundsCurrentValue - snapFundsInvested) / snapFundsInvested) *
          100
        : 0;

    const totalVal = snapStocksCurrentValue + snapFundsCurrentValue;
    const totalInv = snapStocksInvested + snapFundsInvested;
    const totalSnapGain = totalVal - totalInv;
    const totalReturn =
      totalInv > 0 ? ((totalVal - totalInv) / totalInv) * 105 : 0;

    if (totalInv > maxInvested.value) {
      maxInvested = { value: totalInv, date: snap.date };
    }
    if (totalVal > maxValue.value) {
      maxValue = { value: totalVal, date: snap.date };
    }
    if (totalSnapGain > maxGain.value) {
      maxGain = { value: totalSnapGain, date: snap.date };
    }

    const eqIndex = 1000 * (1 + eqReturn / 100);
    const mfIndex = 1000 * (1 + mfReturn / 100);

    let niftyNav = 10;
    if (niftyHistory.length > 0) {
      niftyNav = findClosestNav(niftyHistory, snap.date);
    }

    if (niftyStartNav === 0 && niftyHistory.length > 0) {
      niftyStartNav = niftyNav;
      // Align start level with the baseline return index of the portfolio
      niftyBase = 1000 * (1 + totalReturn / 100);
    }

    const niftyIndex =
      niftyStartNav > 0 ? niftyBase * (niftyNav / niftyStartNav) : niftyBase;
    const niftyRetPercent =
      niftyStartNav > 0
        ? ((niftyNav - niftyStartNav) / niftyStartNav) * 100
        : 0;

    const formattedDate = new Date(snap.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    timelineData.push({
      date: formattedDate,
      equity: Math.round(eqIndex * 10) / 10,
      mutualFunds: Math.round(mfIndex * 10) / 10,
      nifty50: Math.round(niftyIndex * 10) / 10,
      equityReturn: Math.round(eqReturn * 10) / 10,
      fundsReturn: Math.round(mfReturn * 10) / 10,
      niftyReturn: Math.round(niftyRetPercent * 10) / 10,
    });
  });

  const holdingsByValue = [...holdings].sort(
    (a, b) => b.currentValue - a.currentValue
  );
  const topHoldingPct =
    totalCurrentValue > 0
      ? ((holdingsByValue[0]?.currentValue ?? 0) / totalCurrentValue) * 100
      : 0;
  const top3Pct =
    totalCurrentValue > 0
      ? (holdingsByValue
          .slice(0, 3)
          .reduce((sum, holding) => sum + holding.currentValue, 0) /
          totalCurrentValue) *
        100
      : 0;
  const top5Pct =
    totalCurrentValue > 0
      ? (holdingsByValue
          .slice(0, 5)
          .reduce((sum, holding) => sum + holding.currentValue, 0) /
          totalCurrentValue) *
        100
      : 0;

  const cagrHoldings = holdings.filter(
    (holding) => typeof holding.cagr === "number" && holding.currentValue > 0
  );
  const weightedCagr =
    cagrHoldings.length > 0
      ? cagrHoldings.reduce(
          (sum, holding) => sum + (holding.cagr ?? 0) * holding.currentValue,
          0
        ) / cagrHoldings.reduce((sum, holding) => sum + holding.currentValue, 0)
      : null;

  // Preloaded institutional risk and volatility metrics across All, Stocks, and Funds
  const stockFundMap = new Map(
    stockFundamentalsRows.map((s) => [s.symbol.toUpperCase(), s])
  );
  const navHistoryByCode = new Map<
    string,
    Array<{ date: string; nav: string }>
  >();

  for (const eh of enrichedHoldings) {
    if (eh.schemeCodeApi && eh.fundNavHistory && eh.fundNavHistory.length > 0) {
      navHistoryByCode.set(eh.schemeCodeApi, eh.fundNavHistory);
    }
  }

  const inceptionDate = earliestTx?.[0]?.date || "2020-01-01";

  const activeHoldingsForRisk = enrichedHoldings.map((eh) => {
    const isStock = eh.holdingType === "equity";
    const ticker = eh.schemeCodeApi || (isStock ? `${eh.symbol}.NS` : "");
    const cleanSym = ticker.replace(/\.NS$|\.BO$/, "").toUpperCase();

    let advancedRatiosData: string | null = null;
    if (isStock) {
      const sf =
        stockFundMap.get(ticker.toUpperCase()) || stockFundMap.get(cleanSym);
      if (sf && (sf.peRatio || sf.pbRatio)) {
        advancedRatiosData = JSON.stringify({
          peRatio: sf.peRatio,
          pbRatio: sf.pbRatio,
          top5: "0%",
          top20: "0%",
        });
      }
    } else {
      const r = rankMap.get(ticker);
      if (r?.advancedRatiosData) {
        advancedRatiosData = r.advancedRatiosData;
      }
    }

    return {
      schemeCodeApi: ticker,
      currentValue: eh.currentValue,
      cagr: eh.cagr,
      holdingType: eh.holdingType,
      advancedRatiosData,
      assetAllocationData: isStock
        ? JSON.stringify({ equity: 100, debt: 0, cash: 0 })
        : null,
    };
  });

  const riskMetrics = calculatePortfolioRiskMetrics({
    activeHoldings: activeHoldingsForRisk,
    schemeNavMap: navHistoryByCode,
    benchNavHistory: niftyDetails?.data || [],
    asOfDate: selectedReport.asOfDate,
    inceptionDate,
    benchmarkCagrSinceInception: 12.0,
  });

  const stocksRiskMetrics = calculatePortfolioRiskMetrics({
    activeHoldings: activeHoldingsForRisk.filter(
      (h) => h.holdingType === "equity"
    ),
    schemeNavMap: navHistoryByCode,
    benchNavHistory: niftyDetails?.data || [],
    asOfDate: selectedReport.asOfDate,
    inceptionDate,
    benchmarkCagrSinceInception: 12.0,
  });

  const fundsRiskMetrics = calculatePortfolioRiskMetrics({
    activeHoldings: activeHoldingsForRisk.filter(
      (h) => h.holdingType === "mutual_fund"
    ),
    schemeNavMap: navHistoryByCode,
    benchNavHistory: niftyDetails?.data || [],
    asOfDate: selectedReport.asOfDate,
    inceptionDate,
    benchmarkCagrSinceInception: 12.0,
  });

  const insights: ZerodhaInsightsData = {
    reportDate: selectedReport.asOfDate,
    benchmarkReturns: calculateBenchmarkReturns(
      selectedReport.asOfDate,
      niftyHistory
    ),
    weightedCagr: weightedCagr !== null ? round2(weightedCagr) : null,
    riskMetrics,
    stocksRiskMetrics,
    fundsRiskMetrics,
    stockWeight:
      totalCurrentValue > 0
        ? round2((stocksCurrentValue / totalCurrentValue) * 100)
        : 0,
    fundWeight:
      totalCurrentValue > 0
        ? round2((fundsCurrentValue / totalCurrentValue) * 100)
        : 0,
    concentration: {
      topHoldingPct: round2(topHoldingPct),
      top3Pct: round2(top3Pct),
      top5Pct: round2(top5Pct),
    },
    movers: {
      topGainers: [...holdings]
        .sort((a, b) => b.unrealizedPnlPct - a.unrealizedPnlPct)
        .slice(0, 5)
        .map((holding) => ({
          symbol: holding.symbol,
          returnPct: round2(holding.unrealizedPnlPct),
          gain: Math.round(holding.unrealizedPnl),
        })),
      laggards: [...holdings]
        .sort((a, b) => a.unrealizedPnlPct - b.unrealizedPnlPct)
        .slice(0, 5)
        .map((holding) => ({
          symbol: holding.symbol,
          returnPct: round2(holding.unrealizedPnlPct),
          gain: Math.round(holding.unrealizedPnl),
        })),
    },
    previousSnapshot: {
      date: previousReport?.asOfDate ?? null,
      investedChange: previousTotals
        ? Math.round(totalInvested - previousTotals.invested)
        : 0,
      currentValueChange: previousTotals
        ? Math.round(totalCurrentValue - previousTotals.currentValue)
        : 0,
      gainChange: previousTotals
        ? Math.round(totalGain - previousTotals.gain)
        : 0,
      returnPctChange: previousTotals
        ? round2(totalAbsoluteReturn - previousTotals.absoluteReturn)
        : 0,
      stocksInvestedChange: previousTotals
        ? Math.round(stocksInvested - previousTotals.stocksInvested)
        : 0,
      stocksCurrentValueChange: previousTotals
        ? Math.round(stocksCurrentValue - previousTotals.stocksCurrentValue)
        : 0,
      stocksGainChange: previousTotals
        ? Math.round(
            stocksGain -
              (previousTotals.stocksCurrentValue -
                previousTotals.stocksInvested)
          )
        : 0,
      fundsInvestedChange: previousTotals
        ? Math.round(fundsInvested - previousTotals.fundsInvested)
        : 0,
      fundsCurrentValueChange: previousTotals
        ? Math.round(fundsCurrentValue - previousTotals.fundsCurrentValue)
        : 0,
      fundsGainChange: previousTotals
        ? Math.round(
            fundsGain -
              (previousTotals.fundsCurrentValue - previousTotals.fundsInvested)
          )
        : 0,
    },
  };

  // Calculate weighted XIRR, benchmark XIRR, and Alpha for current snapshot
  const validXirrHoldings = holdings.filter(
    (h) => typeof h.xirr === "number" && h.currentValue > 0
  );
  const portfolioXirr =
    validXirrHoldings.length > 0
      ? validXirrHoldings.reduce(
          (sum, h) => sum + (h.xirr ?? 0) * h.currentValue,
          0
        ) / validXirrHoldings.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const validBenchXirrHoldings = holdings.filter(
    (h) => typeof h.benchmarkXirr === "number" && h.currentValue > 0
  );
  const benchmarkXirr =
    validBenchXirrHoldings.length > 0
      ? validBenchXirrHoldings.reduce(
          (sum, h) => sum + (h.benchmarkXirr ?? 0) * h.currentValue,
          0
        ) / validBenchXirrHoldings.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const alpha = portfolioXirr - benchmarkXirr;

  const currentStockHoldings = holdings.filter(
    (h) => h.holdingType === "equity"
  );
  const currentFundHoldings = holdings.filter(
    (h) => h.holdingType === "mutual_fund"
  );

  const validStockXirr = currentStockHoldings.filter(
    (h) => typeof h.xirr === "number" && h.currentValue > 0
  );
  const stocksXirr =
    validStockXirr.length > 0
      ? validStockXirr.reduce(
          (sum, h) => sum + (h.xirr ?? 0) * h.currentValue,
          0
        ) / validStockXirr.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const validStockBench = currentStockHoldings.filter(
    (h) => typeof h.benchmarkXirr === "number" && h.currentValue > 0
  );
  const stocksBenchmarkXirr =
    validStockBench.length > 0
      ? validStockBench.reduce(
          (sum, h) => sum + (h.benchmarkXirr ?? 0) * h.currentValue,
          0
        ) / validStockBench.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const stocksAlpha = stocksXirr - stocksBenchmarkXirr;

  const validFundXirr = currentFundHoldings.filter(
    (h) => typeof h.xirr === "number" && h.currentValue > 0
  );
  const fundsXirr =
    validFundXirr.length > 0
      ? validFundXirr.reduce(
          (sum, h) => sum + (h.xirr ?? 0) * h.currentValue,
          0
        ) / validFundXirr.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const validFundBench = currentFundHoldings.filter(
    (h) => typeof h.benchmarkXirr === "number" && h.currentValue > 0
  );
  const fundsBenchmarkXirr =
    validFundBench.length > 0
      ? validFundBench.reduce(
          (sum, h) => sum + (h.benchmarkXirr ?? 0) * h.currentValue,
          0
        ) / validFundBench.reduce((sum, h) => sum + h.currentValue, 0)
      : 0;

  const fundsAlpha = fundsXirr - fundsBenchmarkXirr;

  let metricDeltas = {
    previousDate: previousReport?.asOfDate ?? null,
    portfolioXirr: null as number | null,
    benchmarkXirr: null as number | null,
    alpha: null as number | null,
    stocksXirr: null as number | null,
    stocksBenchmarkXirr: null as number | null,
    stocksAlpha: null as number | null,
    fundsXirr: null as number | null,
    fundsBenchmarkXirr: null as number | null,
    fundsAlpha: null as number | null,
    cagr: null as number | null,
  };

  if (previousReport && prevMetrics) {
    metricDeltas = {
      previousDate: previousReport.asOfDate,
      portfolioXirr: portfolioXirr - prevMetrics.portfolioXirr,
      benchmarkXirr: benchmarkXirr - prevMetrics.benchmarkXirr,
      alpha: alpha - prevMetrics.alpha,
      stocksXirr: stocksXirr - prevMetrics.stocksXirr,
      stocksBenchmarkXirr:
        stocksBenchmarkXirr - prevMetrics.stocksBenchmarkXirr,
      stocksAlpha: stocksAlpha - prevMetrics.stocksAlpha,
      fundsXirr: fundsXirr - prevMetrics.fundsXirr,
      fundsBenchmarkXirr: fundsBenchmarkXirr - prevMetrics.fundsBenchmarkXirr,
      fundsAlpha: fundsAlpha - prevMetrics.fundsAlpha,
      cagr:
        weightedCagr !== null && prevMetrics.cagr !== null
          ? weightedCagr - prevMetrics.cagr
          : null,
    };
  }

  // Benchmark Nifty 50 Spot Index ATH & Current Points
  const bmData = niftyIndexDetails?.data || [];
  const { maxNifty, currentNifty } = getNiftyAthAndCurrentPoints(
    selectedReport.asOfDate,
    bmData
  );

  const athData = calculateAthCorrectionData({
    currentInvested: totalInvested,
    currentValue: totalCurrentValue,
    currentGain: totalGain,
    currentDate: selectedReport.asOfDate,
    maxInvested,
    maxValue,
    maxGain,
    currentNifty,
    maxNifty,
  });

  const taxHarvesting = buildPortfolioTaxHarvestingData(
    holdings.map((h) => ({
      id: h.id,
      schemeId: h.schemeId,
      schemeName: h.symbol,
      category:
        h.instrumentType ||
        (h.holdingType === "equity" ? "Equity Stock" : "Mutual Fund"),
      memberName:
        h.memberName || (h.clientId ? `Account ${h.clientId}` : "Zerodha"),
      folioNo: h.clientId || "Zerodha Demat",
      purchaseValue: h.investedValue,
      currentValue: h.currentValue,
      gain: h.unrealizedPnl,
      cagr: h.cagr ?? 0,
      holdingDays: h.holdingDays ?? 0,
      balanceUnits: h.quantity,
      purchaseNav: h.averagePrice,
      currentNav: h.currentPrice,
      holdingType: h.holdingType,
      clientId: h.clientId,
      symbol: h.symbol,
      isin: h.isin,
    })),
    allRelevantTransactions.map((t) => ({
      id: t.id,
      date: t.date,
      schemeName: schemesList.find((s) => s.id === t.schemeId)?.name || null,
      schemeCategory: t.assetType || null,
      folioNo: t.folioNo || null,
      memberName: members.find((m) => m.id === t.memberId)?.name || null,
      type: t.type,
      transactionType: t.rawTransactionType,
      units: t.units || 0,
      nav: t.nav || 0,
      amount: t.amount,
      schemeId: t.schemeId,
    })),
    selectedReport.asOfDate,
    members.map((m) => m.name)
  );

  const memberIdToMetaMap = new Map<
    number,
    { name: string; clientId: string | null }
  >();
  for (const fm of familyMembersList) {
    memberIdToMetaMap.set(fm.id, { name: fm.name, clientId: fm.clientId });
  }

  const targetMemberIdForFilter =
    accountFilter !== "all"
      ? clientToMemberIdMap.get(accountFilter)
      : undefined;

  const filteredTransactions =
    targetMemberIdForFilter !== undefined
      ? allRelevantTransactions.filter(
          (t) => t.memberId === targetMemberIdForFilter
        )
      : allRelevantTransactions;

  const transactionsList: ZerodhaTransactionRow[] = filteredTransactions.map(
    (t) => {
      const s = schemesList.find((scheme) => scheme.id === t.schemeId);
      const mMeta = t.memberId ? memberIdToMetaMap.get(t.memberId) : null;
      const matchingHolding = holdings.find(
        (h) =>
          h.schemeId === t.schemeId || (h.isin && s?.isin && h.isin === s.isin)
      );

      return {
        id: t.id,
        date: t.date,
        schemeName: s?.name || `Scheme #${t.schemeId || "Unknown"}`,
        category: s?.category || "Mutual Fund",
        folioNo: t.folioNo || matchingHolding?.folioNo || null,
        memberName: mMeta?.name || "Zerodha Client",
        clientId: mMeta?.clientId || null,
        type: t.type,
        rawTransactionType: t.rawTransactionType || t.type,
        units: t.units || 0,
        nav: t.nav || 0,
        amount: t.amount,
        stampDuty: t.stampDuty ?? null,
        broker: t.broker ?? "Zerodha Coin",
        assetType: t.assetType ?? "mutual_fund",
        schemeId: t.schemeId,
        holdingId: matchingHolding?.id ?? null,
      };
    }
  );

  const result: ZerodhaDashboardData = {
    firstCasReportDate,
    members,
    selectedAccount: accountFilter,
    reportsList,
    selectedReport,
    holdings,
    transactions: transactionsList,
    totals: {
      invested: totalInvested,
      currentValue: totalCurrentValue,
      gain: totalGain,
      absoluteReturn: totalAbsoluteReturn,
      stocksInvested,
      stocksCurrentValue,
      stocksGain,
      fundsInvested,
      fundsCurrentValue,
      fundsGain,
      portfolioXirr,
      benchmarkXirr,
      alpha,
      stocksXirr,
      stocksBenchmarkXirr,
      stocksAlpha,
      fundsXirr,
      fundsBenchmarkXirr,
      fundsAlpha,
    },
    metricDeltas,
    sectorAllocation,
    categoryAllocation,
    sectorBreakdown,
    marketCapBreakdown,
    assetSplit,
    timelineData,
    insights,
    athData,
    taxHarvesting,
    auditData,
  };

  zerodhaDashboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

const zerodhaSchemeHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

function normaliseSchemeCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const match = code.match(/\d+/);
  return match ? match[0] : null;
}

async function triggerZerodhaNavCacheUpdate(
  schemeCode: string,
  startDate?: string
) {
  try {
    const res = await fetchMfDetails(schemeCode, startDate);
    const data = res.data;
    if (res.success && data && data.meta && data.data && data.data.length > 0) {
      let launchDate: string | null = null;
      let corpusCr: number | null = null;
      let expenseRatio: number | null = null;
      let exitLoad: string | null = null;

      const isin = data.meta.isin_growth || data.meta.isin_div_reinvestment;
      if (isin) {
        const factsheet = await fetchUpvalyMfDetails(isin);
        if (factsheet) {
          launchDate = factsheet.inceptionDate || null;
          corpusCr = factsheet.aum || null;
          expenseRatio = factsheet.expenseRatio || null;
          exitLoad = factsheet.exitLoadMessage || null;
        }
      }

      const updateSet: Record<string, unknown> = {
        fundHouse: data.meta.fund_house || "Unknown",
        schemeType: data.meta.scheme_type || "Unknown",
        schemeCategory: data.meta.scheme_category || "Unknown",
        schemeName: data.meta.scheme_name || "Unknown",
        isinGrowth: data.meta.isin_growth || null,
        isinDivReinvestment: data.meta.isin_div_reinvestment || null,
        lastFetchedAt: new Date().toISOString(),
      };
      if (launchDate !== null) updateSet.launchDate = launchDate;
      if (corpusCr !== null) updateSet.corpusCr = corpusCr;
      if (expenseRatio !== null) updateSet.expenseRatio = expenseRatio;
      if (exitLoad !== null) updateSet.exitLoad = exitLoad;

      await db
        .insert(zerodhaSchemeNavCacheMeta)
        .values({
          schemeCode,
          fundHouse: data.meta.fund_house || "Unknown",
          schemeType: data.meta.scheme_type || "Unknown",
          schemeCategory: data.meta.scheme_category || "Unknown",
          schemeName: data.meta.scheme_name || "Unknown",
          isinGrowth: data.meta.isin_growth || null,
          isinDivReinvestment: data.meta.isin_div_reinvestment || null,
          lastFetchedAt: new Date().toISOString(),
          launchDate,
          corpusCr,
          expenseRatio,
          exitLoad,
        })
        .onConflictDoUpdate({
          target: zerodhaSchemeNavCacheMeta.schemeCode,
          set: updateSet,
        });

      const historyValues = data.data.map((p) => ({
        schemeCode,
        date: p.date,
        nav: parseFloat(p.nav) || 0,
        fetchedAt: new Date().toISOString(),
      }));

      const chunkSize = 100;
      for (let i = 0; i < historyValues.length; i += chunkSize) {
        const chunk = historyValues.slice(i, i + chunkSize);
        await db
          .insert(zerodhaSchemeNavHistory)
          .values(chunk)
          .onConflictDoNothing();
      }
    }
  } catch (err) {
    console.error(`Failed background cache update for ${schemeCode}:`, err);
  }
}

export function getZerodhaSchemeHistoryForDbCode(
  dbSchemeCode: string,
  startDate?: string
): Promise<MfDetailsResponse | null> {
  const schemeCode = normaliseSchemeCode(dbSchemeCode);
  if (!schemeCode || isSpecializedFundSchemeCode(schemeCode))
    return Promise.resolve(null);

  const cacheKey = `${schemeCode}:${startDate ?? "all"}`;
  let cachedPromise = zerodhaSchemeHistoryCache.get(cacheKey);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      // 1. Check if we have cached metadata and history in PostgreSQL concurrently
      const [cachedMeta, rawHistory] = await Promise.all([
        db.query.zerodhaSchemeNavCacheMeta.findFirst({
          where: eq(zerodhaSchemeNavCacheMeta.schemeCode, schemeCode),
        }),
        db.query.zerodhaSchemeNavHistory.findMany({
          where: eq(zerodhaSchemeNavHistory.schemeCode, schemeCode),
        }),
      ]);

      const now = new Date();
      const cacheAgeLimit = 24 * 60 * 60 * 1000; // 24 hours
      const isFresh =
        cachedMeta &&
        now.getTime() - new Date(cachedMeta.lastFetchedAt).getTime() <
          cacheAgeLimit;

      if (cachedMeta) {
        const history = startDate
          ? rawHistory.filter((h) => {
              const [d, m, y] = h.date.split("-");
              return `${y}-${m}-${d}` >= startDate;
            })
          : rawHistory;

        // Find latest date in cache to fetch from that date onwards
        let latestDateStr: string | undefined = undefined;
        if (history.length > 0) {
          let latest = new Date(0);
          for (const pt of history) {
            const [d, m, y] = pt.date.split("-");
            const date = new Date(`${y}-${m}-${d}`);
            if (date.getTime() > latest.getTime()) {
              latest = date;
              latestDateStr = `${y}-${m}-${d}`;
            }
          }
        }

        // If not fresh, trigger SWR fetch
        if (!isFresh) {
          try {
            await triggerZerodhaNavCacheUpdate(schemeCode, latestDateStr);
            const rawUpdated = await db.query.zerodhaSchemeNavHistory.findMany({
              where: eq(zerodhaSchemeNavHistory.schemeCode, schemeCode),
            });
            const updatedHistory = startDate
              ? rawUpdated.filter((h) => {
                  const [d, m, y] = h.date.split("-");
                  return `${y}-${m}-${d}` >= startDate;
                })
              : rawUpdated;
            if (updatedHistory.length > 0) {
              return {
                meta: {
                  fund_house: cachedMeta.fundHouse,
                  scheme_type: cachedMeta.schemeType,
                  scheme_category: cachedMeta.schemeCategory,
                  scheme_code: parseInt(cachedMeta.schemeCode),
                  scheme_name: cachedMeta.schemeName,
                },
                data: updatedHistory.map((h) => ({
                  date: h.date,
                  nav: String(h.nav),
                })),
              };
            }
          } catch (e) {
            console.error("[SYNC ZERODHA CACHE UPDATE ERROR]", e);
          }
        }

        if (history.length > 0) {
          return {
            meta: {
              fund_house: cachedMeta.fundHouse,
              scheme_type: cachedMeta.schemeType,
              scheme_category: cachedMeta.schemeCategory,
              scheme_code: parseInt(cachedMeta.schemeCode),
              scheme_name: cachedMeta.schemeName,
            },
            data: history.map((h) => ({
              date: h.date,
              nav: String(h.nav),
            })),
          };
        }
      }

      // 2. Fetch fresh details from API (Sync fallback because no cache exists)
      // Fetch full history to ensure returns graphs work correctly for long-term/insurance portfolios
      const res = await fetchMfDetails(schemeCode);
      const data = res.data;
      if (
        res.success &&
        data &&
        data.meta &&
        data.data &&
        data.data.length > 0
      ) {
        try {
          // Upsert scheme cache metadata starting with zerodha_
          await db
            .insert(zerodhaSchemeNavCacheMeta)
            .values({
              schemeCode,
              fundHouse: data.meta.fund_house || "Unknown",
              schemeType: data.meta.scheme_type || "Unknown",
              schemeCategory: data.meta.scheme_category || "Unknown",
              schemeName: data.meta.scheme_name || "Unknown",
              isinGrowth: data.meta.isin_growth || null,
              isinDivReinvestment: data.meta.isin_div_reinvestment || null,
              lastFetchedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: zerodhaSchemeNavCacheMeta.schemeCode,
              set: {
                fundHouse: data.meta.fund_house || "Unknown",
                schemeType: data.meta.scheme_type || "Unknown",
                schemeCategory: data.meta.scheme_category || "Unknown",
                schemeName: data.meta.scheme_name || "Unknown",
                isinGrowth: data.meta.isin_growth || null,
                isinDivReinvestment: data.meta.isin_div_reinvestment || null,
                lastFetchedAt: new Date().toISOString(),
              },
            });

          // Prepare history values for insertion
          const historyValues = data.data.map((p) => ({
            schemeCode,
            date: p.date,
            nav: parseFloat(p.nav) || 0,
            fetchedAt: new Date().toISOString(),
          }));

          const chunkSize = 100;
          for (let i = 0; i < historyValues.length; i += chunkSize) {
            const chunk = historyValues.slice(i, i + chunkSize);
            await db
              .insert(zerodhaSchemeNavHistory)
              .values(chunk)
              .onConflictDoNothing();
          }

          return data;
        } catch (dbErr) {
          console.error(
            `Failed to cache Zerodha NAV for ${schemeCode} in DB:`,
            dbErr
          );
          return data; // Return fetched data even if caching failed
        }
      }

      return null;
    })();

    zerodhaSchemeHistoryCache.set(cacheKey, cachedPromise);
  }

  return cachedPromise;
}

const zerodhaSchemesCache = new Map<string, ZerodhaScheme[]>();

export async function getZerodhaSchemes(
  accountFilter: string = "all"
): Promise<ZerodhaScheme[]> {
  const cacheKey = `schemes_${accountFilter}`;
  const cached = zerodhaSchemesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const whereReport =
    accountFilter && accountFilter !== "all"
      ? eq(zerodhaReports.clientId, accountFilter)
      : undefined;

  const [allSchemes, latestReports] = await Promise.all([
    db.query.zerodhaSchemes.findMany({
      orderBy: [asc(zerodhaSchemes.name)],
    }),
    db.query.zerodhaReports.findMany({
      where: whereReport,
      orderBy: [desc(zerodhaReports.asOfDate)],
      limit: accountFilter === "all" ? 5 : 1,
    }),
  ]);

  if (latestReports.length === 0) {
    const result = allSchemes.map((s) => ({
      ...s,
      holdingStatus: "none" as const,
      holdingId: null,
      url: null,
      quantity: 0,
      currentValue: 0,
    }));
    zerodhaSchemesCache.set(cacheKey, result);
    return result;
  }

  // If "all", take the latest report for each distinct member/client
  const targetReportIds: number[] = [];
  if (accountFilter === "all") {
    const seenClients = new Set<string>();
    for (const r of latestReports) {
      const c = r.clientId || "default";
      if (!seenClients.has(c)) {
        seenClients.add(c);
        targetReportIds.push(r.id);
      }
    }
  } else {
    targetReportIds.push(latestReports[0].id);
  }

  const holdings = await db
    .select({
      id: zerodhaHoldings.id,
      schemeId: zerodhaHoldings.schemeId,
      quantity: zerodhaHoldings.quantity,
      currentValue: zerodhaHoldings.currentValue,
      reportId: zerodhaHoldings.reportId,
      clientId: zerodhaReports.clientId,
      memberId: zerodhaReports.memberId,
      memberName: zerodhaMembers.name,
    })
    .from(zerodhaHoldings)
    .leftJoin(zerodhaReports, eq(zerodhaHoldings.reportId, zerodhaReports.id))
    .leftJoin(zerodhaMembers, eq(zerodhaReports.memberId, zerodhaMembers.id))
    .where(inArray(zerodhaHoldings.reportId, targetReportIds));

  const holdingMap = new Map<number, AggregatedSchemeHolding>();
  for (const h of holdings) {
    if (!h.schemeId || h.quantity <= 0.0001) continue;

    const clientId = h.clientId || DEFAULT_ZERODHA_CLIENT_ID;
    const memberName =
      formatZerodhaMemberShortName(h.clientId || h.memberName) || clientId;

    const memberHolding: ZerodhaSchemeMemberHolding = {
      memberId: h.memberId || null,
      clientId,
      memberName,
      holdingId: h.id,
      quantity: Math.round(h.quantity * 10000) / 10000,
      currentValue: Math.round(h.currentValue * 100) / 100,
      url: `/fund/z_${h.id}`,
    };

    const existing = holdingMap.get(h.schemeId);
    if (!existing) {
      holdingMap.set(h.schemeId, {
        schemeId: h.schemeId,
        primaryHoldingId: h.id,
        totalQuantity: h.quantity,
        totalCurrentValue: h.currentValue,
        memberHoldings: [memberHolding],
      });
    } else {
      existing.totalQuantity += h.quantity;
      existing.totalCurrentValue += h.currentValue;
      existing.memberHoldings.push(memberHolding);
    }
  }

  const result = allSchemes.map((s) => {
    const agg = holdingMap.get(s.id);
    const isActive = !!(agg && agg.totalQuantity > 0.0001);

    return {
      ...s,
      isin: s.isin || null,
      holdingStatus: isActive ? ("active" as const) : ("none" as const),
      holdingId: agg ? agg.primaryHoldingId : null,
      url: agg ? `/fund/z_${agg.primaryHoldingId}` : null,
      quantity: agg ? agg.totalQuantity : 0,
      currentValue: agg ? agg.totalCurrentValue : 0,
      memberHoldings: agg
        ? agg.memberHoldings.sort(
            (a, b) => (a.memberId ?? 0) - (b.memberId ?? 0)
          )
        : [],
    };
  });

  zerodhaSchemesCache.set(cacheKey, result);
  return result;
}

export async function updateZerodhaSchemeCode(
  schemeId: number,
  code: string | null
) {
  await db
    .update(zerodhaSchemes)
    .set({
      schemeCodeApi: code,
      mappedAt: code ? new Date().toISOString() : null,
    })
    .where(eq(zerodhaSchemes.id, schemeId));
}

const zerodhaStockHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

export function clearAllZerodhaCaches() {
  zerodhaSchemeHistoryCache.clear();
  zerodhaStockHistoryCache.clear();
  zerodhaDashboardCache.clear();
  zerodhaSchemesCache.clear();
  zerodhaMembersCache = null;
  zerodhaReportsCache = null;
  clearAthCache();
  clearZerodhaAuditCache();
  clearStockFundamentalsCache();
}

async function saveZerodhaStockCacheAndMapping(
  ticker: string,
  data: MfDetailsResponse
) {
  const resolvedTicker = data.resolvedTicker || ticker;

  // 1. Update the scheme mapping in database if the resolved ticker is different (e.g. from .BO)
  if (resolvedTicker !== ticker) {
    console.log(
      `[BSE/NSE Mapping] Updating Zerodha scheme mapping for name/ticker ${ticker} to resolved: ${resolvedTicker}`
    );
    const baseSymbol = ticker.includes(".") ? ticker.split(".")[0] : ticker;
    await db
      .update(zerodhaSchemes)
      .set({
        schemeCodeApi: resolvedTicker,
        mappedAt: new Date().toISOString(),
      })
      .where(eq(zerodhaSchemes.schemeCodeApi, ticker));

    await db
      .update(zerodhaSchemes)
      .set({
        schemeCodeApi: resolvedTicker,
        mappedAt: new Date().toISOString(),
      })
      .where(eq(zerodhaSchemes.name, baseSymbol));
  }

  // 2. Save the cache for the resolved ticker and the original ticker
  const tickersToCache = Array.from(new Set([ticker, resolvedTicker]));
  for (const t of tickersToCache) {
    await db
      .insert(zerodhaSchemeNavCacheMeta)
      .values({
        schemeCode: t,
        fundHouse: "Equity",
        schemeType: "Equity",
        schemeCategory: "Stock",
        schemeName: t,
        lastFetchedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: zerodhaSchemeNavCacheMeta.schemeCode,
        set: {
          fundHouse: "Equity",
          schemeType: "Equity",
          schemeCategory: "Stock",
          schemeName: t,
          lastFetchedAt: new Date().toISOString(),
        },
      });

    const seenDates = new Set<string>();
    const uniqueHistoryValues: {
      schemeCode: string;
      date: string;
      nav: number;
      fetchedAt: string;
    }[] = [];

    for (const p of data.data) {
      if (p.date && !seenDates.has(p.date)) {
        seenDates.add(p.date);
        uniqueHistoryValues.push({
          schemeCode: t,
          date: p.date,
          nav: parseFloat(p.nav) || 0,
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    await db
      .delete(zerodhaSchemeNavHistory)
      .where(eq(zerodhaSchemeNavHistory.schemeCode, t));

    const chunkSize = 100;
    for (let i = 0; i < uniqueHistoryValues.length; i += chunkSize) {
      const chunk = uniqueHistoryValues.slice(i, i + chunkSize);
      await db
        .insert(zerodhaSchemeNavHistory)
        .values(chunk)
        .onConflictDoNothing();
    }
  }
}

async function triggerZerodhaStockNavCacheUpdate(
  ticker: string,
  range = "max"
) {
  if (!ticker || isUnlistedStock(ticker)) return;
  try {
    const res = await fetchStockHistory(ticker, range);
    const data = res.data;
    if (res.success && data && data.meta && data.data && data.data.length > 0) {
      await saveZerodhaStockCacheAndMapping(ticker, data);
    }
  } catch (err) {
    console.error(`Failed background cache update for stock ${ticker}:`, err);
  }
}

export async function getZerodhaStockHistoryForSymbol(
  ticker: string,
  range = "10y",
  startDate?: string
): Promise<MfDetailsResponse | null> {
  if (!ticker || isUnlistedStock(ticker)) return null;

  // 1. Check if we have cached metadata and history in PostgreSQL concurrently
  const [cachedMeta, rawHistory] = await Promise.all([
    db.query.zerodhaSchemeNavCacheMeta.findFirst({
      where: eq(zerodhaSchemeNavCacheMeta.schemeCode, ticker),
    }),
    db.query.zerodhaSchemeNavHistory.findMany({
      where: eq(zerodhaSchemeNavHistory.schemeCode, ticker),
    }),
  ]);

  const now = new Date();
  const cacheAgeLimit = 24 * 60 * 60 * 1000; // 24 hours
  const isFresh =
    cachedMeta &&
    now.getTime() - new Date(cachedMeta.lastFetchedAt).getTime() <
      cacheAgeLimit;

  if (cachedMeta) {
    if (!isFresh) {
      try {
        await triggerZerodhaStockNavCacheUpdate(ticker, range);
      } catch (e) {
        console.error("[SYNC ZERODHA STOCK CACHE UPDATE ERROR]", e);
      }
    }

    const history = startDate
      ? rawHistory.filter((h) => {
          const [d, m, y] = h.date.split("-");
          return `${y}-${m}-${d}` >= startDate;
        })
      : rawHistory;

    if (history.length > 0) {
      return {
        meta: {
          fund_house: cachedMeta.fundHouse,
          scheme_type: cachedMeta.schemeType,
          scheme_category: cachedMeta.schemeCategory,
          scheme_code: 0,
          scheme_name: cachedMeta.schemeName,
        },
        data: history.map((h) => ({
          date: h.date,
          nav: String(h.nav),
        })),
      };
    }
  }

  // 2. Fetch fresh details from API (Sync fallback because no cache exists)
  try {
    const res = await fetchStockHistory(ticker, range);
    const data = res.data;
    if (res.success && data && data.meta && data.data && data.data.length > 0) {
      await saveZerodhaStockCacheAndMapping(ticker, data);
      return data;
    }
  } catch (err) {
    console.error(`Failed first-time fetch for stock ${ticker}:`, err);
  }

  return null;
}
