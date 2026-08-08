import { calculateXIRR } from "./xirr";
import { db } from "@/db/db";
import {
  schemeNavCacheMeta,
  schemeNavHistory,
  benchmarkNavCacheMeta,
  benchmarkNavHistory,
  benchmarkRules,
  zerodhaSchemeNavCacheMeta,
  msflSchemeNavCacheMeta,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  PortfolioTransaction,
  VolatilityMeasures,
  FactsheetProfile,
  AssetAllocation,
  FactsheetChartPoint,
} from "@/types/portfolio";
import {
  DEFAULT_BENCHMARK_CODE,
  DEFAULT_BENCHMARK_NAME,
  DEFAULT_BENCHMARK_FUND_NAME,
  DEFAULT_CORPUS_CR,
  DEFAULT_EXPENSE_RATIO,
  DEFAULT_EXIT_LOAD,
  DEFAULT_ASSET_ALLOCATION,
} from "@/types/constants";
import { NavPoint, ParsedNavPoint } from "@/types/alpha";
import { CashFlow } from "@/types/xirr";
import { parseToLocalMidnight } from "@/helpers/dates";
import { MfDetailsResponse } from "@/types/mf-api";
import { BenchmarkRuleDetails } from "@/types/benchmark";
import {
  fetchMfDetails,
  isSpecializedFundSchemeCode,
  fetchUpvalyMfDetails,
} from "./mfApi";

function normaliseSchemeCode(
  schemeCode: string | number | null | undefined
): string {
  return String(schemeCode || "").trim();
}

// Cache for scheme histories to avoid duplicate DB queries within the same request lifecycle
const schemeHistoryCache = new Map<string, Promise<MfDetailsResponse | null>>();
const benchmarkNavRAMCache = new Map<
  string,
  Array<{ date: string; nav: number }>
>();

export function clearAllAlphaCaches() {
  schemeHistoryCache.clear();
  benchmarkHistoryCache.clear();
  benchmarkNavRAMCache.clear();
}

/**
 * Fetch scheme NAV history for the code passed from the database cache.
 */
async function triggerNavCacheUpdate(schemeCode: string, startDate?: string) {
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

      // Upsert scheme cache metadata
      await db
        .insert(schemeNavCacheMeta)
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
          target: schemeNavCacheMeta.schemeCode,
          set: {
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
          },
        });

      // Prepare history values for insertion
      const historyValues = data.data.map((p) => ({
        schemeCode,
        date: p.date,
        nav: parseFloat(p.nav) || 0,
        fetchedAt: new Date().toISOString(),
      }));

      // Batch insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < historyValues.length; i += chunkSize) {
        const chunk = historyValues.slice(i, i + chunkSize);
        await db.insert(schemeNavHistory).values(chunk).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.error(
      `Failed background cache update for family scheme ${schemeCode}:`,
      err
    );
  }
}

const benchmarkHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

async function saveBenchmarkCache(
  benchmarkCode: string,
  data: MfDetailsResponse
) {
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

  await db
    .insert(benchmarkNavCacheMeta)
    .values({
      benchmarkCode,
      benchmarkName: data.meta.scheme_name || "Unknown",
      fundHouse: data.meta.fund_house || null,
      schemeType: data.meta.scheme_type || null,
      schemeCategory: data.meta.scheme_category || null,
      isinGrowth: data.meta.isin_growth || null,
      isinDivReinvestment: data.meta.isin_div_reinvestment || null,
      lastFetchedAt: new Date().toISOString(),
      launchDate,
      corpusCr,
      expenseRatio,
      exitLoad,
    })
    .onConflictDoUpdate({
      target: benchmarkNavCacheMeta.benchmarkCode,
      set: {
        benchmarkName: data.meta.scheme_name || "Unknown",
        fundHouse: data.meta.fund_house || null,
        schemeType: data.meta.scheme_type || null,
        schemeCategory: data.meta.scheme_category || null,
        isinGrowth: data.meta.isin_growth || null,
        isinDivReinvestment: data.meta.isin_div_reinvestment || null,
        lastFetchedAt: new Date().toISOString(),
        launchDate,
        corpusCr,
        expenseRatio,
        exitLoad,
      },
    });

  const historyValues = data.data.map((p) => ({
    benchmarkCode,
    date: p.date,
    nav: parseFloat(p.nav) || 0,
    fetchedAt: new Date().toISOString(),
  }));

  const chunkSize = 500;
  for (let i = 0; i < historyValues.length; i += chunkSize) {
    const chunk = historyValues.slice(i, i + chunkSize);
    await db.insert(benchmarkNavHistory).values(chunk).onConflictDoNothing();
  }
}

async function triggerBenchmarkCacheUpdate(
  benchmarkCode: string,
  startDate?: string
) {
  try {
    const res = await fetchMfDetails(benchmarkCode, startDate);
    const data = res.data;
    if (res.success && data && data.meta && data.data && data.data.length > 0) {
      await saveBenchmarkCache(benchmarkCode, data);
    }
  } catch (err) {
    console.error(
      `Failed background cache update for benchmark ${benchmarkCode}:`,
      err
    );
  }
}

export function getBenchmarkHistory(
  dbBenchmarkCode: string,
  startDate?: string
): Promise<MfDetailsResponse | null> {
  const benchmarkCode = normaliseSchemeCode(dbBenchmarkCode);
  if (!benchmarkCode || isSpecializedFundSchemeCode(benchmarkCode))
    return Promise.resolve(null);

  const cacheKey = `${benchmarkCode}:${startDate ?? "all"}`;
  let cachedPromise = benchmarkHistoryCache.get(cacheKey);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      const [cachedMeta, rawHistory] = await Promise.all([
        db.query.benchmarkNavCacheMeta.findFirst({
          where: eq(benchmarkNavCacheMeta.benchmarkCode, benchmarkCode),
        }),
        db.query.benchmarkNavHistory.findMany({
          where: eq(benchmarkNavHistory.benchmarkCode, benchmarkCode),
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

        if (!isFresh) {
          try {
            await triggerBenchmarkCacheUpdate(benchmarkCode, latestDateStr);
            const rawUpdated = await db.query.benchmarkNavHistory.findMany({
              where: eq(benchmarkNavHistory.benchmarkCode, benchmarkCode),
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
                  fund_house: "Benchmark",
                  scheme_type: "Index",
                  scheme_category: "Benchmark Index",
                  scheme_code: parseInt(cachedMeta.benchmarkCode),
                  scheme_name: cachedMeta.benchmarkName,
                },
                data: updatedHistory.map((h) => ({
                  date: h.date,
                  nav: String(h.nav),
                })),
              };
            }
          } catch (e) {
            console.error("[SYNC BENCHMARK CACHE UPDATE ERROR]", e);
          }
        }

        if (history.length > 0) {
          return {
            meta: {
              fund_house: "Benchmark",
              scheme_type: "Index",
              scheme_category: "Benchmark Index",
              scheme_code: parseInt(cachedMeta.benchmarkCode),
              scheme_name: cachedMeta.benchmarkName,
            },
            data: history.map((h) => ({
              date: h.date,
              nav: String(h.nav),
            })),
          };
        }
      }

      // Fetch full history for benchmark comparison
      const res = await fetchMfDetails(benchmarkCode);
      const data = res.data;
      if (
        res.success &&
        data &&
        data.meta &&
        data.data &&
        data.data.length > 0
      ) {
        try {
          await saveBenchmarkCache(benchmarkCode, data);
        } catch (e) {
          console.error("Error writing benchmark NAV cache:", e);
        }
        return data;
      }
      return null;
    })();
    benchmarkHistoryCache.set(cacheKey, cachedPromise);
  }
  return cachedPromise;
}

export function getSchemeHistoryForDbCode(
  dbSchemeCode: string,
  startDate?: string
): Promise<MfDetailsResponse | null> {
  const schemeCode = normaliseSchemeCode(dbSchemeCode);
  if (!schemeCode) return Promise.resolve(null);

  const cacheKey = `${schemeCode}:${startDate ?? "all"}`;
  let cachedPromise = schemeHistoryCache.get(cacheKey);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      // 1. Check if we have cached metadata and history in PostgreSQL concurrently
      const [cachedMeta, rawHistory] = await Promise.all([
        db.query.schemeNavCacheMeta.findFirst({
          where: eq(schemeNavCacheMeta.schemeCode, schemeCode),
        }),
        db.query.schemeNavHistory.findMany({
          where: eq(schemeNavHistory.schemeCode, schemeCode),
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

        // If cache is stale, trigger update (only for non-specialized funds)
        if (!isFresh && !isSpecializedFundSchemeCode(schemeCode)) {
          try {
            await triggerNavCacheUpdate(schemeCode, latestDateStr);
            const rawUpdated = await db.query.schemeNavHistory.findMany({
              where: eq(schemeNavHistory.schemeCode, schemeCode),
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
                  scheme_code: parseInt(cachedMeta.schemeCode) || 0,
                  scheme_name: cachedMeta.schemeName,
                },
                data: updatedHistory.map((h) => ({
                  date: h.date,
                  nav: String(h.nav),
                })),
              };
            }
          } catch (e) {
            console.error("[SYNC CACHE UPDATE ERROR]", e);
          }
        }

        if (history.length > 0) {
          return {
            meta: {
              fund_house: cachedMeta.fundHouse,
              scheme_type: cachedMeta.schemeType,
              scheme_category: cachedMeta.schemeCategory,
              scheme_code: parseInt(cachedMeta.schemeCode) || 0,
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
      // Skip API fetch for specialized funds
      if (isSpecializedFundSchemeCode(schemeCode)) return null;

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
          // Upsert scheme cache metadata
          await db
            .insert(schemeNavCacheMeta)
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
              target: schemeNavCacheMeta.schemeCode,
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

          // Batch insert in chunks of 500
          const chunkSize = 500;
          for (let i = 0; i < historyValues.length; i += chunkSize) {
            const chunk = historyValues.slice(i, i + chunkSize);
            await db
              .insert(schemeNavHistory)
              .values(chunk)
              .onConflictDoNothing();
          }
        } catch (e) {
          console.error("Error writing database NAV cache:", e);
        }
        return data;
      }

      return null;
    })();
    schemeHistoryCache.set(cacheKey, cachedPromise);
  }
  return cachedPromise;
}

/**
 * Find the closest NAV on or before a given date
 * dateStr format: YYYY-MM-DD
 */
export function findClosestNav(
  navHistory: { date: string; nav: string }[],
  targetDateStr: string,
  preParsedNavs?: { time: number; nav: number }[]
): number {
  const targetTime = new Date(targetDateStr).getTime();

  const parseApiDate = (apiDateStr: string) => {
    const [dd, mm, yyyy] = apiDateStr.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`).getTime();
  };

  const sortedNavs =
    preParsedNavs ||
    [...navHistory]
      .map((p) => ({ time: parseApiDate(p.date), nav: parseFloat(p.nav) }))
      .sort((a, b) => a.time - b.time);

  if (sortedNavs.length === 0) return 10;

  let closestNav = sortedNavs[0].nav;
  let closestDateDiff = Infinity;

  for (const point of sortedNavs) {
    const diff = targetTime - point.time;

    // We want the closest date that is on or before the target date
    if (diff >= 0 && diff < closestDateDiff) {
      closestDateDiff = diff;
      closestNav = point.nav;
    }
  }

  const MAX_LOOKBACK_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
  if (closestDateDiff === Infinity) {
    // Target date is before fund inception. Use oldest available NAV.
    return sortedNavs[0].nav;
  }
  if (closestDateDiff > MAX_LOOKBACK_MS) {
    // Check if targetDate is slightly before first NAV (inception fallback)
    const oldestPoint = sortedNavs[0];
    const inceptionDiff = oldestPoint.time - targetTime;
    if (inceptionDiff >= 0 && inceptionDiff <= MAX_LOOKBACK_MS) {
      return oldestPoint.nav;
    }
  }

  return closestNav;
}

/**
 * Parses and sorts the raw NAV history data ascending by date.
 */
export function parseAndSortNavHistory(
  navHistory: NavPoint[],
  parseDateFn: (s: string) => Date
): ParsedNavPoint[] {
  return [...navHistory]
    .map((p) => ({ date: parseDateFn(p.date), nav: parseFloat(p.nav) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Finds the closest date and NAV entry in historical data for a given purchase price.
 * If purchaseNav is 0 or missing, falls back to the earliest listing entry.
 */
export function findSyntheticInvestmentEntry(
  purchaseNav: number,
  sortedHistory: ParsedNavPoint[]
): ParsedNavPoint | null {
  if (!sortedHistory.length) return null;

  const actualPurchaseNav = purchaseNav;
  if (!actualPurchaseNav || actualPurchaseNav <= 0) {
    const earliestEntry = sortedHistory[0];
    return earliestEntry && earliestEntry.nav > 0 ? earliestEntry : null;
  }

  let bestEntry = sortedHistory[0];
  let bestDiff = Math.abs(sortedHistory[0].nav - actualPurchaseNav);
  for (const entry of sortedHistory) {
    const diff = Math.abs(entry.nav - actualPurchaseNav);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestEntry = entry;
    }
  }
  return bestEntry;
}

/**
 * Calculates the Compound Annual Growth Rate (CAGR) as a percentage.
 * Formula: ((current / purchase) ^ (1 / years) - 1) * 100
 */
export function calculateCagr(
  current: number,
  purchase: number,
  years: number
): number {
  if (years <= 0 || purchase <= 0 || current <= 0) return 0;
  return (Math.pow(current / purchase, 1 / years) - 1) * 100;
}

/**
 * Computes NAV-based XIRR and benchmark XIRR for Zerodha holdings that have
 * no explicit transaction history. Uses the date in the fund's own NAV history
 * that is closest to the purchase NAV as the synthetic investment date.
 */
export function calculateXirrFromNav(
  purchaseNav: number,
  currentNav: number,
  asOfDate: string,
  fundNavHistory: { date: string; nav: string }[],
  benchNavHistory: { date: string; nav: string }[]
): {
  portfolioXirr: number;
  benchmarkXirr: number;
  benchmarkCagrSinceInception: number;
  alpha: number;
} {
  const parseApiDate = (s: string) => {
    const [dd, mm, yyyy] = s.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  if (!fundNavHistory.length || !benchNavHistory.length || !currentNav) {
    return {
      portfolioXirr: 0,
      benchmarkXirr: 0,
      benchmarkCagrSinceInception: 0,
      alpha: 0,
    };
  }

  const sorted = parseAndSortNavHistory(fundNavHistory, parseApiDate);
  const entry = findSyntheticInvestmentEntry(purchaseNav, sorted);

  if (!entry) {
    return {
      portfolioXirr: 0,
      benchmarkXirr: 0,
      benchmarkCagrSinceInception: 0,
      alpha: 0,
    };
  }

  const investDate = entry.date;
  const actualPurchaseNav = entry.nav;
  const exitDate = new Date(asOfDate);

  // Synthetic cash flows: -₹100 invested, +₹100*(currentNav/actualPurchaseNav) redeemed
  const invested = 100;
  const redeemed = invested * (currentNav / actualPurchaseNav);
  const portfolioXirr = calculateXIRR([
    { amount: -invested, date: investDate },
    { amount: redeemed, date: exitDate },
  ]);

  // Benchmark: how much would ₹100 grow in UTI Nifty 50 over same period?
  const benchSorted = parseAndSortNavHistory(benchNavHistory, parseApiDate);

  const benchAtBuy = benchSorted.reduce((prev, cur) =>
    Math.abs(cur.date.getTime() - investDate.getTime()) <
    Math.abs(prev.date.getTime() - investDate.getTime())
      ? cur
      : prev
  );
  const benchAtSell = benchSorted.reduce((prev, cur) =>
    Math.abs(cur.date.getTime() - exitDate.getTime()) <
    Math.abs(prev.date.getTime() - exitDate.getTime())
      ? cur
      : prev
  );

  const benchRedeemed =
    benchAtBuy.nav > 0
      ? invested * (benchAtSell.nav / benchAtBuy.nav)
      : invested;

  const benchmarkXirr = calculateXIRR([
    { amount: -invested, date: investDate },
    { amount: benchRedeemed, date: exitDate },
  ]);

  // Point-to-point Nifty CAGR from synthetic invest date to exit date
  const years =
    (exitDate.getTime() - investDate.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  const benchmarkCagrSinceInception =
    years > 0 && benchAtBuy.nav > 0
      ? (Math.pow(benchAtSell.nav / benchAtBuy.nav, 1 / years) - 1) * 100
      : benchmarkXirr;

  return {
    portfolioXirr,
    benchmarkXirr,
    benchmarkCagrSinceInception,
    alpha: portfolioXirr - benchmarkXirr,
  };
}

/**
 * Calculates simulated Benchmark XIRR and Alpha
 */
export function isBuyTransactionType(type: string): boolean {
  const t = (type || "").toUpperCase().trim();
  return (
    t === "BUY" ||
    t === "PURCHASE" ||
    t === "SIP" ||
    t.includes("SWITCH IN") ||
    t.includes("SWITCH_IN") ||
    t.includes("STP IN") ||
    t.includes("STP_IN") ||
    t.includes("SYSTEMATIC TRANSFER IN") ||
    t.includes("SYSTEMATIC_TRANSFER_IN") ||
    t.includes("REINVEST")
  );
}

export function isSellTransactionType(type: string): boolean {
  const t = (type || "").toUpperCase().trim();
  return (
    t === "SELL" ||
    t === "REDEMPTION" ||
    t.includes("SWITCH OUT") ||
    t.includes("SWITCH_OUT") ||
    t.includes("SWP") ||
    t.includes("STP OUT") ||
    t.includes("STP_OUT") ||
    t.includes("SYSTEMATIC TRANSFER OUT") ||
    t.includes("SYSTEMATIC_TRANSFER_OUT")
  );
}

/**
 * Calculates portfolio XIRR and benchmark XIRR for a given set of transactions.
 */
export async function calculateAlpha(
  transactions: PortfolioTransaction[],
  asOfDate: string,
  currentValuation: number,
  benchmarkSchemeCode: string = "120716" // UTI Nifty 50 Index Fund Direct Growth
): Promise<{
  portfolioXirr: number;
  benchmarkXirr: number;
  benchmarkCagrSinceInception: number;
  alpha: number;
}> {
  // Sort transactions chronologically, and same-day BUYs before SELLs
  const sortedTxs = [...transactions].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    const aIsBuy = isBuyTransactionType(a.transactionType || a.type);
    const bIsBuy = isBuyTransactionType(b.transactionType || b.type);
    if (aIsBuy && !bIsBuy) return -1;
    if (!aIsBuy && bIsBuy) return 1;
    return 0;
  });

  // 1. Calculate Portfolio XIRR
  const portfolioCashFlows: CashFlow[] = [];

  for (const tx of sortedTxs) {
    // BUY is cash outflow (negative), SELL is cash inflow (positive)
    const absAmount = Math.abs(tx.amount);
    const amount = isBuyTransactionType(tx.transactionType || tx.type)
      ? -absAmount
      : absAmount;
    portfolioCashFlows.push({
      amount,
      date: new Date(tx.date),
    });
  }

  // Add the final valuation as a positive cash flow at the report date
  portfolioCashFlows.push({
    amount: currentValuation,
    date: new Date(asOfDate),
  });

  const portfolioXirr = calculateXIRR(portfolioCashFlows);

  if (isSpecializedFundSchemeCode(benchmarkSchemeCode)) {
    return {
      portfolioXirr,
      benchmarkXirr: 0,
      benchmarkCagrSinceInception: 0,
      alpha: 0,
    };
  }

  // 2. Fetch Benchmark NAV History
  const benchmarkDetails = await getBenchmarkHistory(benchmarkSchemeCode);
  if (
    !benchmarkDetails ||
    !benchmarkDetails.data ||
    benchmarkDetails.data.length === 0
  ) {
    return {
      portfolioXirr,
      benchmarkXirr: 0,
      benchmarkCagrSinceInception: 0,
      alpha: 0,
    };
  }

  const navHistory = benchmarkDetails.data;
  const preParsedNavs = [...navHistory]
    .map((p) => {
      const [dd, mm, yyyy] = p.date.split("-");
      return {
        time: new Date(`${yyyy}-${mm}-${dd}`).getTime(),
        nav: parseFloat(p.nav) || 0,
      };
    })
    .sort((a, b) => a.time - b.time);

  // 3. Simulate Investing same cash flows in the Benchmark Index Fund
  let benchmarkUnitsHeld = 0;
  const benchmarkCashFlows: CashFlow[] = [];

  for (const tx of sortedTxs) {
    // Find benchmark NAV on the transaction date
    const nav = findClosestNav(navHistory, tx.date, preParsedNavs);
    const txAmount = Math.abs(tx.amount);

    if (isBuyTransactionType(tx.type)) {
      const unitsBought = txAmount / nav;
      benchmarkUnitsHeld += unitsBought;
      benchmarkCashFlows.push({
        amount: -txAmount, // cash outflow
        date: new Date(tx.date),
      });
    } else {
      // In case of sell, we redeem equivalent amount from benchmark, clamped to holdings
      let unitsSold = txAmount / nav;
      if (unitsSold > benchmarkUnitsHeld) {
        unitsSold = benchmarkUnitsHeld;
      }
      benchmarkUnitsHeld -= unitsSold;

      // cash inflow reflects simulated redeemed value from index fund
      const simulatedRedeemedAmount = unitsSold * nav;
      benchmarkCashFlows.push({
        amount: Math.abs(simulatedRedeemedAmount),
        date: new Date(tx.date),
      });
    }
  }

  // Get current benchmark NAV as of valuation date
  const finalBenchmarkNav = findClosestNav(navHistory, asOfDate);
  const simulatedBenchmarkValue = benchmarkUnitsHeld * finalBenchmarkNav;

  // Add the final simulated valuation
  benchmarkCashFlows.push({
    amount: simulatedBenchmarkValue,
    date: new Date(asOfDate),
  });

  const benchmarkXirr = calculateXIRR(benchmarkCashFlows);
  const alpha = portfolioXirr - benchmarkXirr;

  // Point-to-point Nifty CAGR from first investment date to report date
  const firstTxDate = sortedTxs[0].date;
  const firstBenchmarkNav = findClosestNav(
    navHistory,
    firstTxDate,
    preParsedNavs
  );
  const years =
    (new Date(asOfDate).getTime() - new Date(firstTxDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  const benchmarkCagrSinceInception =
    years > 0 && firstBenchmarkNav > 0 && finalBenchmarkNav > 0
      ? (Math.pow(finalBenchmarkNav / firstBenchmarkNav, 1 / years) - 1) * 100
      : benchmarkXirr;

  return {
    portfolioXirr,
    benchmarkXirr,
    benchmarkCagrSinceInception,
    alpha,
  };
}

export async function getBenchmarkRule(
  category: string | null,
  schemeName?: string | null
): Promise<BenchmarkRuleDetails> {
  try {
    const rules = await db
      .select({
        id: benchmarkRules.id,
        categoryPattern: benchmarkRules.categoryPattern,
        schemeNamePattern: benchmarkRules.schemeNamePattern,
        benchmarkCode: benchmarkRules.benchmarkCode,
        benchmarkName: benchmarkRules.benchmarkName,
        benchmarkFundName: benchmarkRules.benchmarkFundName,
        corpusCr: benchmarkRules.corpusCr,
        expenseRatio: benchmarkRules.expenseRatio,
        exitLoad: benchmarkRules.exitLoad,
        allocationEquity: benchmarkRules.allocationEquity,
        allocationDebt: benchmarkRules.allocationDebt,
        allocationGold: benchmarkRules.allocationGold,
        allocationGlobalEquity: benchmarkRules.allocationGlobalEquity,
        allocationOther: benchmarkRules.allocationOther,
        priority: benchmarkRules.priority,
      })
      .from(benchmarkRules)
      .orderBy(desc(benchmarkRules.priority));

    const cleanCat = (category || "").toLowerCase().trim();
    const cleanName = (schemeName || "").toLowerCase().trim();

    for (const r of rules) {
      const catPattern = r.categoryPattern
        ? r.categoryPattern.toLowerCase().trim()
        : null;
      const namePattern = r.schemeNamePattern
        ? r.schemeNamePattern.toLowerCase().trim()
        : null;

      if (namePattern && !cleanName.includes(namePattern)) {
        continue;
      }
      if (catPattern && !cleanCat.includes(catPattern)) {
        continue;
      }
      return {
        benchmarkCode: r.benchmarkCode,
        benchmarkName: r.benchmarkName,
        benchmarkFundName: r.benchmarkFundName,
        corpusCr: r.corpusCr,
        expenseRatio: r.expenseRatio,
        exitLoad: r.exitLoad,
        allocationEquity: r.allocationEquity,
        allocationDebt: r.allocationDebt,
        allocationGold: r.allocationGold,
        allocationGlobalEquity: r.allocationGlobalEquity,
        allocationOther: r.allocationOther,
      };
    }
  } catch (e) {
    console.error("Error reading benchmark_rules from DB:", e);
  }

  // Fallback default in case DB query fails or table is empty
  return {
    benchmarkCode: DEFAULT_BENCHMARK_CODE,
    benchmarkName: DEFAULT_BENCHMARK_NAME,
    benchmarkFundName: DEFAULT_BENCHMARK_FUND_NAME,
    corpusCr: DEFAULT_CORPUS_CR,
    expenseRatio: DEFAULT_EXPENSE_RATIO,
    exitLoad: DEFAULT_EXIT_LOAD,
    allocationEquity: DEFAULT_ASSET_ALLOCATION.equity,
    allocationDebt: DEFAULT_ASSET_ALLOCATION.debt,
    allocationGold: DEFAULT_ASSET_ALLOCATION.gold,
    allocationGlobalEquity: DEFAULT_ASSET_ALLOCATION.globalEquity,
    allocationOther: DEFAULT_ASSET_ALLOCATION.other,
  };
}

export async function getFactsheetMetadata(
  category: string | null,
  launchDateStr: string | null,
  schemeName?: string | null,
  schemeCodeApi?: string | null,
  isZerodha = false,
  isMsfl = false
): Promise<{
  profile: FactsheetProfile;
  allocation: AssetAllocation;
}> {
  const rule = await getBenchmarkRule(category, schemeName);

  let dbLaunchDate: string | null = null;
  let dbCorpusCr: number | null = null;
  let dbExpenseRatio: number | null = null;
  let dbExitLoad: string | null = null;

  if (schemeCodeApi) {
    try {
      let metaRecord;
      if (isMsfl) {
        metaRecord = await db.query.msflSchemeNavCacheMeta.findFirst({
          where: eq(msflSchemeNavCacheMeta.schemeCode, schemeCodeApi),
        });
      } else if (isZerodha) {
        metaRecord = await db.query.zerodhaSchemeNavCacheMeta.findFirst({
          where: eq(zerodhaSchemeNavCacheMeta.schemeCode, schemeCodeApi),
        });
      } else {
        metaRecord = await db.query.schemeNavCacheMeta.findFirst({
          where: eq(schemeNavCacheMeta.schemeCode, schemeCodeApi),
        });
      }

      if (metaRecord) {
        dbLaunchDate = metaRecord.launchDate || null;
        dbCorpusCr = metaRecord.corpusCr || null;
        dbExpenseRatio = metaRecord.expenseRatio || null;
        dbExitLoad = metaRecord.exitLoad || null;
      }
    } catch (err) {
      console.error("Error reading factsheet metadata from cache table:", err);
    }
  }

  return {
    profile: {
      launchDate: dbLaunchDate || launchDateStr || "27 Aug 1998",
      corpusCr: dbCorpusCr ?? rule.corpusCr ?? 12500,
      expenseRatio: dbExpenseRatio ?? rule.expenseRatio ?? 1.25,
      exitLoad:
        dbExitLoad ?? rule.exitLoad ?? "1% for redemption within 365 days",
      benchmarkName: rule.benchmarkName,
      benchmarkCode: rule.benchmarkCode,
      benchmarkFundName: rule.benchmarkFundName,
    },
    allocation: {
      equity: rule.allocationEquity,
      debt: rule.allocationDebt,
      gold: rule.allocationGold,
      globalEquity: rule.allocationGlobalEquity,
      other: rule.allocationOther,
    },
  };
}

export async function getBenchmarkCodeForCategory(
  category: string | null,
  schemeName?: string | null
): Promise<string> {
  const rule = await getBenchmarkRule(category, schemeName);
  return rule.benchmarkCode;
}

export async function getBenchmarkFundNameForCode(
  code: string
): Promise<string> {
  try {
    const rule = await db
      .select({ benchmarkFundName: benchmarkRules.benchmarkFundName })
      .from(benchmarkRules)
      .where(eq(benchmarkRules.benchmarkCode, code))
      .limit(1);
    if (rule.length > 0) {
      return rule[0].benchmarkFundName;
    }
  } catch (e) {
    console.error("Error querying benchmarkFundName from DB:", e);
  }
  return "UTI Nifty 50 Index Fund Direct Growth";
}

export async function getBenchmarkNameForCode(code: string): Promise<string> {
  try {
    const rule = await db
      .select({ benchmarkName: benchmarkRules.benchmarkName })
      .from(benchmarkRules)
      .where(eq(benchmarkRules.benchmarkCode, code))
      .limit(1);
    if (rule.length > 0) {
      return rule[0].benchmarkName;
    }
  } catch (e) {
    console.error("Error querying benchmarkName from DB:", e);
  }
  return "Nifty 50 Index";
}

export function calculateVolatilityMeasures(
  fundNavHistory: { date: string; nav: string }[],
  benchNavHistory: { date: string; nav: string }[],
  asOfDate: string,
  category: string | null
): VolatilityMeasures {
  const targetDate = new Date(asOfDate);
  const weeklyFundNavs: number[] = [];
  const weeklyBenchNavs: number[] = [];

  // Step back weekly for 104 weeks (approx 2 years) to compute stats
  for (let i = 0; i <= 104; i++) {
    const checkDate = new Date(
      targetDate.getTime() - i * 7 * 24 * 60 * 60 * 1000
    );
    const checkDateStr = checkDate.toISOString().split("T")[0];

    const fundNav = findClosestNav(fundNavHistory, checkDateStr);
    const benchNav = findClosestNav(benchNavHistory, checkDateStr);

    weeklyFundNavs.push(fundNav);
    weeklyBenchNavs.push(benchNav);
  }

  const fundNavs = weeklyFundNavs.reverse();
  const benchNavs = weeklyBenchNavs.reverse();

  const fundReturns: number[] = [];
  const benchReturns: number[] = [];

  for (let i = 1; i < fundNavs.length; i++) {
    const prevFund = fundNavs[i - 1] || 1;
    const prevBench = benchNavs[i - 1] || 1;
    fundReturns.push((fundNavs[i] - prevFund) / prevFund);
    benchReturns.push((benchNavs[i] - prevBench) / prevBench);
  }

  if (fundReturns.length < 2) {
    return {
      alpha: 0,
      sharpe: 0,
      sortino: 0,
      mean: 0,
      beta: 0,
      stdDev: 0,
      ytm: 0,
      modifiedDuration: 0,
      avgMaturity: 0,
    };
  }

  const meanFund = fundReturns.reduce((s, r) => s + r, 0) / fundReturns.length;
  const meanBench =
    benchReturns.reduce((s, r) => s + r, 0) / benchReturns.length;

  const meanFundAnnual = meanFund * 52 * 100;
  const meanBenchAnnual = meanBench * 52 * 100;

  const varFund =
    fundReturns.reduce((s, r) => s + Math.pow(r - meanFund, 2), 0) /
    (fundReturns.length - 1);
  const stdDevWeekly = Math.sqrt(varFund);
  const stdDevAnnual = stdDevWeekly * Math.sqrt(52) * 100;

  const varBench =
    benchReturns.reduce((s, r) => s + Math.pow(r - meanBench, 2), 0) /
    (benchReturns.length - 1);
  let cov = 0;
  for (let i = 0; i < fundReturns.length; i++) {
    cov += (fundReturns[i] - meanFund) * (benchReturns[i] - meanBench);
  }
  cov = cov / (fundReturns.length - 1);
  const beta = varBench > 0 ? cov / varBench : 1.0;

  // Industry Standard Benchmark Risk-Free Rate in India = 6.5% p.a. (364-day T-Bill / RBI Repo rate)
  const riskFreeRateAnnual = 6.5;
  const riskFreeWeekly = riskFreeRateAnnual / 100 / 52;

  // Sharpe Ratio = (Annualized Mean Return - Risk-Free Rate) / Annualized Standard Deviation
  const sharpe =
    stdDevAnnual > 0
      ? (meanFundAnnual - riskFreeRateAnnual) / stdDevAnnual
      : 0.0;

  // Downside Deviation (only negative excess returns relative to risk-free rate)
  const downsideSquareDiffs = fundReturns.map((r) => {
    const diff = r - riskFreeWeekly;
    return diff < 0 ? Math.pow(diff, 2) : 0;
  });
  const varDownside =
    downsideSquareDiffs.reduce((s, d) => s + d, 0) / (fundReturns.length - 1);
  const stdDevDownsideAnnual = Math.sqrt(varDownside) * Math.sqrt(52) * 100;

  // Sortino Ratio = (Annualized Mean Return - Risk-Free Rate) / Annualized Downside Deviation
  const sortino =
    stdDevDownsideAnnual > 0
      ? (meanFundAnnual - riskFreeRateAnnual) / stdDevDownsideAnnual
      : 0.0;

  const alpha =
    meanFundAnnual -
    (riskFreeRateAnnual + beta * (meanBenchAnnual - riskFreeRateAnnual));

  const cleanCat = (category || "").toLowerCase();
  const isDebt =
    cleanCat.includes("debt") ||
    cleanCat.includes("liquid") ||
    cleanCat.includes("income") ||
    cleanCat.includes("gilt") ||
    cleanCat.includes("bond");

  let ytm = 0;
  let modifiedDuration = 0;
  let avgMaturity = 0;

  if (isDebt) {
    ytm = 7.15;
    if (cleanCat.includes("liquid")) {
      modifiedDuration = 0.15;
      avgMaturity = 0.18;
    } else if (cleanCat.includes("short")) {
      modifiedDuration = 1.8;
      avgMaturity = 2.2;
    } else {
      modifiedDuration = 4.2;
      avgMaturity = 5.5;
    }
  }

  let peRatio: number | undefined = undefined;
  let pbRatio: number | undefined = undefined;

  if (isDebt) {
    peRatio = undefined;
    pbRatio = undefined;
  } else {
    let basePE = 22.5;
    let baseROE = 0.15;

    if (cleanCat.includes("small")) {
      basePE = 26.8;
      baseROE = 0.14;
    } else if (cleanCat.includes("mid")) {
      basePE = 28.5;
      baseROE = 0.145;
    } else if (cleanCat.includes("large") || cleanCat.includes("bluechip")) {
      basePE = 21.8;
      baseROE = 0.165;
    } else if (cleanCat.includes("flexi") || cleanCat.includes("multi")) {
      basePE = 23.5;
      baseROE = 0.155;
    } else if (cleanCat.includes("elss") || cleanCat.includes("tax")) {
      basePE = 22.0;
      baseROE = 0.15;
    } else if (cleanCat.includes("tech") || cleanCat.includes("it")) {
      basePE = 31.2;
      baseROE = 0.22;
    } else if (cleanCat.includes("bank") || cleanCat.includes("finance")) {
      basePE = 16.5;
      baseROE = 0.14;
    }

    // Dynamic valuation calibration: P/E adjusted for Beta sensitivity and Alpha outperformance
    const peCalculated = basePE + (beta - 1.0) * 2.5 + alpha * 0.25;
    peRatio = Math.max(8.0, Math.min(75.0, Number(peCalculated.toFixed(2))));

    // P/B Ratio = P/E * ROE
    const pbCalculated = peRatio * baseROE;
    pbRatio = Math.max(1.0, Math.min(15.0, Number(pbCalculated.toFixed(2))));
  }

  return {
    alpha,
    sharpe,
    sortino,
    mean: meanFundAnnual,
    beta,
    stdDev: stdDevAnnual,
    ytm,
    modifiedDuration,
    avgMaturity,
    peRatio,
    pbRatio,
  };
}

export function calculateFactsheetPeriodReturns(
  fundNavHistory: { date: string; nav: string }[],
  benchNavHistory: { date: string; nav: string }[]
) {
  const parseHistoryDate = (dStr: string) => {
    const parts = dStr.split("-");
    if (parts.length === 3) {
      return parts[0].length === 4
        ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
        : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dStr);
  };

  const getSeriesReturns = (history: { date: string; nav: string }[]) => {
    if (!history || history.length === 0) {
      return {
        annualised: { r3Y: null, r5Y: null, r10Y: null, rAll: null },
        absolute: { r3Y: null, r5Y: null, r10Y: null, rAll: null },
      };
    }

    const sorted = [...history].sort(
      (a, b) =>
        parseHistoryDate(a.date).getTime() - parseHistoryDate(b.date).getTime()
    );
    const latestObj = sorted[sorted.length - 1];
    const latestNav = parseFloat(latestObj.nav);
    const latestTime = parseHistoryDate(latestObj.date).getTime();

    const getPastNav = (years: number) => {
      const targetTime = latestTime - years * 365.25 * 24 * 60 * 60 * 1000;
      let closestNav = 0;
      let minDiff = Infinity;
      for (const item of sorted) {
        const t = parseHistoryDate(item.date).getTime();
        const diff = Math.abs(t - targetTime);
        if (diff < minDiff && t <= latestTime) {
          minDiff = diff;
          closestNav = parseFloat(item.nav);
        }
      }
      return minDiff <= 45 * 24 * 60 * 60 * 1000 ? closestNav : null;
    };

    const nav3Y = getPastNav(3);
    const nav5Y = getPastNav(5);
    const nav10Y = getPastNav(10);
    const startNav = parseFloat(sorted[0].nav);
    const startTime = parseHistoryDate(sorted[0].date).getTime();
    const totalYears =
      (latestTime - startTime) / (365.25 * 24 * 60 * 60 * 1000);

    const cagr = (pastNav: number | null, yrs: number) => {
      if (!pastNav || pastNav <= 0 || yrs <= 0 || latestNav <= 0) return null;
      return (Math.pow(latestNav / pastNav, 1 / yrs) - 1) * 100;
    };

    const abs = (pastNav: number | null) => {
      if (!pastNav || pastNav <= 0 || latestNav <= 0) return null;
      return ((latestNav - pastNav) / pastNav) * 100;
    };

    return {
      annualised: {
        r3Y: cagr(nav3Y, 3),
        r5Y: cagr(nav5Y, 5),
        r10Y: cagr(nav10Y, 10),
        rAll: totalYears >= 0.5 ? cagr(startNav, totalYears) : null,
      },
      absolute: {
        r3Y: abs(nav3Y),
        r5Y: abs(nav5Y),
        r10Y: abs(nav10Y),
        rAll: abs(startNav),
      },
    };
  };

  const fundRet = getSeriesReturns(fundNavHistory);
  const catRet = getSeriesReturns(benchNavHistory);

  return {
    annualised: fundRet.annualised,
    absolute: fundRet.absolute,
    catAnnualised: catRet.annualised,
    catAbsolute: catRet.absolute,
  };
}

export function generateFactsheetChartData(
  fundNavHistory: { date: string; nav: string }[],
  benchNavHistory: { date: string; nav: string }[],
  asOfDate: string,
  transactions: { date: string; type: "BUY" | "SELL"; amount: number }[],
  startDateOverride?: Date
): FactsheetChartPoint[] {
  if (fundNavHistory.length === 0) return [];

  const cleanAsOf = asOfDate.slice(0, 10);
  const asOfParts = cleanAsOf.split("-").map(Number);
  const targetDate =
    asOfParts.length === 3
      ? new Date(asOfParts[0], asOfParts[1] - 1, asOfParts[2], 0, 0, 0, 0)
      : new Date(asOfDate);

  // Find earliest date when fund has history data (by comparing parsed date timestamps)
  let earliestFundDate = new Date(0);
  if (fundNavHistory.length > 0) {
    let minTime = Infinity;
    for (const p of fundNavHistory) {
      const parts = p.date.split("-");
      let d: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]),
            0,
            0,
            0,
            0
          );
        } else {
          d = new Date(
            Number(parts[2]),
            Number(parts[1]) - 1,
            Number(parts[0]),
            0,
            0,
            0,
            0
          );
        }
      } else {
        d = new Date(p.date);
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      }
      const t = d.getTime();
      if (!isNaN(t) && t < minTime) {
        minTime = t;
      }
    }
    if (minTime !== Infinity) {
      earliestFundDate = new Date(minTime);
    }
  }

  // Find earliest date when benchmark has history data
  let earliestBenchDate = new Date(0);
  if (benchNavHistory.length > 0) {
    let minTime = Infinity;
    for (const p of benchNavHistory) {
      const parts = p.date.split("-");
      let d: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]),
            0,
            0,
            0,
            0
          );
        } else {
          d = new Date(
            Number(parts[2]),
            Number(parts[1]) - 1,
            Number(parts[0]),
            0,
            0,
            0,
            0
          );
        }
      } else {
        d = new Date(p.date);
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      }
      const t = d.getTime();
      if (!isNaN(t) && t < minTime) {
        minTime = t;
      }
    }
    if (minTime !== Infinity) {
      earliestBenchDate = new Date(minTime);
    }
  }

  // When startDateOverride is provided (e.g. 1Y/3Y/5Y slice), use the later
  // of the override and the fund's inception so we don't go before inception.
  let overrideLocal: Date | undefined;
  if (startDateOverride) {
    overrideLocal = new Date(
      startDateOverride.getFullYear(),
      startDateOverride.getMonth(),
      startDateOverride.getDate(),
      0,
      0,
      0,
      0
    );
  }

  const finalStartDate = overrideLocal
    ? new Date(Math.max(overrideLocal.getTime(), earliestFundDate.getTime()))
    : earliestFundDate;

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const diffTime = targetDate.getTime() - finalStartDate.getTime();
  const daysToGenerate = Math.max(0, Math.floor(diffTime / ONE_DAY_MS));

  const pointDates = new Set<number>();

  for (let i = daysToGenerate; i >= 0; i--) {
    const d = new Date(targetDate.getTime() - i * ONE_DAY_MS);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const checkDate = new Date(`${y}-${m}-${day}T12:00:00.000Z`);
    pointDates.add(checkDate.getTime());
  }

  // Explicitly add transaction date timestamps so the exact BUY/SELL date is always a point in the chart data
  for (const tx of transactions) {
    if (tx.date) {
      const txD = parseToLocalMidnight(tx.date);
      if (
        !isNaN(txD.getTime()) &&
        txD.getTime() >= finalStartDate.getTime() &&
        txD.getTime() <= targetDate.getTime()
      ) {
        pointDates.add(txD.getTime());
      }
    }
  }

  // Preserve inception points only for the full-history view. Adding these to
  // a selected range (such as 1Y) incorrectly stretches the x-axis back to
  // the fund or benchmark inception date.
  if (!startDateOverride) {
    pointDates.add(earliestFundDate.getTime());
    if (earliestBenchDate.getTime() > 0) {
      pointDates.add(earliestBenchDate.getTime());
    }
  }

  const tempPoints = [...pointDates]
    .sort((a, b) => a - b)
    .map((timestamp) => {
      const dateObj = new Date(timestamp);
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getUTCDate()).padStart(2, "0");
      const checkDateStr = `${year}-${month}-${day}`;
      const fundNav = findClosestNav(fundNavHistory, checkDateStr);

      // Only plot benchmark from its actual first NAV within the displayed
      // period. This avoids fabricating benchmark values before inception.
      const benchStartTime = Math.max(
        earliestBenchDate.getTime(),
        finalStartDate.getTime()
      );
      const benchNav =
        earliestBenchDate.getTime() > 0 && timestamp >= benchStartTime
          ? findClosestNav(benchNavHistory, checkDateStr)
          : null;
      return { dateObj, fundNav, benchNav };
    });

  const baseFundNav = tempPoints[0]?.fundNav || 1;
  const baseBenchNav =
    tempPoints.find((pt) => pt.benchNav !== null)?.benchNav || 1;

  const chartData: FactsheetChartPoint[] = tempPoints.map((pt) => {
    const fundReturn = ((pt.fundNav - baseFundNav) / baseFundNav) * 100;
    const benchReturn =
      pt.benchNav === null
        ? null
        : ((pt.benchNav - baseBenchNav) / baseBenchNav) * 100;

    return {
      date: pt.dateObj.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
      timestamp: pt.dateObj.getTime(),
      fundNav: pt.fundNav,
      benchNav: pt.benchNav,
      fundReturn,
      benchReturn,
    };
  });

  // Attach transactions using exact local timestamp matching
  for (const tx of transactions) {
    if (!tx.date) continue;
    const txD = parseToLocalMidnight(tx.date);
    if (!txD) continue;
    const txTime = txD.getTime();

    let closestIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < tempPoints.length; i++) {
      const diff = Math.abs(txTime - tempPoints[i].dateObj.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    if (minDiff < 3 * ONE_DAY_MS) {
      if (!chartData[closestIdx].txs) {
        chartData[closestIdx].txs = [];
      }
      chartData[closestIdx].txs!.push({
        type: tx.type,
        amount: tx.amount,
      });
    }
  }

  return chartData;
}
