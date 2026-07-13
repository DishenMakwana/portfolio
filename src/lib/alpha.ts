import { calculateXIRR, CashFlow } from "./xirr";
import {
  fetchMfDetails,
  isSpecializedFundSchemeCode,
  MfDetailsResponse,
} from "./mfApi";
import { db } from "@/db/db";
import {
  schemeNavCacheMeta,
  schemeNavHistory,
  benchmarkNavCacheMeta,
  benchmarkNavHistory,
} from "@/db/schema";
import { eq } from "drizzle-orm";

function normaliseSchemeCode(
  schemeCode: string | number | null | undefined
): string {
  return String(schemeCode || "").trim();
}

// Cache for scheme histories to avoid duplicate DB queries within the same request lifecycle
const schemeHistoryCache = new Map<string, Promise<MfDetailsResponse | null>>();

export function clearSchemeCache(schemeCode: string) {
  schemeHistoryCache.delete(schemeCode);
}

export function clearAllAlphaCaches() {
  schemeHistoryCache.clear();
  benchmarkHistoryCache.clear();
}

/**
 * Fetch scheme NAV history for the code passed from the database cache.
 */
async function triggerNavCacheUpdate(schemeCode: string, startDate?: string) {
  try {
    const data = await fetchMfDetails(schemeCode, startDate);
    if (data && data.meta && data.data && data.data.length > 0) {
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

export function clearBenchmarkCache(benchmarkCode: string) {
  benchmarkHistoryCache.delete(benchmarkCode);
}

async function triggerBenchmarkCacheUpdate(
  benchmarkCode: string,
  startDate?: string
) {
  try {
    const data = await fetchMfDetails(benchmarkCode, startDate);
    if (data && data.meta && data.data && data.data.length > 0) {
      await db
        .insert(benchmarkNavCacheMeta)
        .values({
          benchmarkCode,
          benchmarkName: data.meta.scheme_name || "Unknown",
          lastFetchedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: benchmarkNavCacheMeta.benchmarkCode,
          set: {
            benchmarkName: data.meta.scheme_name || "Unknown",
            lastFetchedAt: new Date().toISOString(),
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
        await db
          .insert(benchmarkNavHistory)
          .values(chunk)
          .onConflictDoNothing();
      }
    }
  } catch (err) {
    console.error(
      `Failed background cache update for benchmark ${benchmarkCode}:`,
      err
    );
  }
}

export function getBenchmarkHistory(
  dbBenchmarkCode: string
): Promise<MfDetailsResponse | null> {
  const benchmarkCode = normaliseSchemeCode(dbBenchmarkCode);
  if (!benchmarkCode || isSpecializedFundSchemeCode(benchmarkCode))
    return Promise.resolve(null);

  let cachedPromise = benchmarkHistoryCache.get(benchmarkCode);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      const cachedMeta = await db.query.benchmarkNavCacheMeta.findFirst({
        where: eq(benchmarkNavCacheMeta.benchmarkCode, benchmarkCode),
      });

      const now = new Date();
      const cacheAgeLimit = 24 * 60 * 60 * 1000; // 24 hours
      const isFresh =
        cachedMeta &&
        now.getTime() - new Date(cachedMeta.lastFetchedAt).getTime() <
          cacheAgeLimit;

      if (cachedMeta) {
        const history = await db.query.benchmarkNavHistory.findMany({
          where: eq(benchmarkNavHistory.benchmarkCode, benchmarkCode),
        });

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
          triggerBenchmarkCacheUpdate(benchmarkCode, latestDateStr).catch((e) =>
            console.error("[SWR BACKGROUND ERROR]", e)
          );
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
      const data = await fetchMfDetails(benchmarkCode);
      if (data && data.meta && data.data && data.data.length > 0) {
        try {
          await db
            .insert(benchmarkNavCacheMeta)
            .values({
              benchmarkCode,
              benchmarkName: data.meta.scheme_name || "Unknown",
              lastFetchedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: benchmarkNavCacheMeta.benchmarkCode,
              set: {
                benchmarkName: data.meta.scheme_name || "Unknown",
                lastFetchedAt: new Date().toISOString(),
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
            await db
              .insert(benchmarkNavHistory)
              .values(chunk)
              .onConflictDoNothing();
          }
        } catch (e) {
          console.error("Error writing benchmark NAV cache:", e);
        }
        return data;
      }
      return null;
    })();
    benchmarkHistoryCache.set(benchmarkCode, cachedPromise);
  }
  return cachedPromise;
}

export function getSchemeHistoryForDbCode(
  dbSchemeCode: string
): Promise<MfDetailsResponse | null> {
  const schemeCode = normaliseSchemeCode(dbSchemeCode);
  if (!schemeCode || isSpecializedFundSchemeCode(schemeCode))
    return Promise.resolve(null);

  let cachedPromise = schemeHistoryCache.get(schemeCode);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      // 1. Check if we have cached metadata in PostgreSQL
      const cachedMeta = await db.query.schemeNavCacheMeta.findFirst({
        where: eq(schemeNavCacheMeta.schemeCode, schemeCode),
      });

      const now = new Date();
      const cacheAgeLimit = 24 * 60 * 60 * 1000; // 24 hours
      const isFresh =
        cachedMeta &&
        now.getTime() - new Date(cachedMeta.lastFetchedAt).getTime() <
          cacheAgeLimit;

      if (cachedMeta) {
        const history = await db.query.schemeNavHistory.findMany({
          where: eq(schemeNavHistory.schemeCode, schemeCode),
        });

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

        // If cache is stale, trigger background update
        if (!isFresh) {
          triggerNavCacheUpdate(schemeCode, latestDateStr).catch((e) =>
            console.error("[SWR BACKGROUND ERROR]", e)
          );
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
      const data = await fetchMfDetails(schemeCode);
      if (data && data.meta && data.data && data.data.length > 0) {
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
    schemeHistoryCache.set(schemeCode, cachedPromise);
  }
  return cachedPromise;
}

/**
 * Find the closest NAV on or before a given date
 * dateStr format: YYYY-MM-DD
 */
export function findClosestNav(
  navHistory: { date: string; nav: string }[],
  targetDateStr: string
): number {
  const targetDate = new Date(targetDateStr);

  // Sort NAV history from oldest to newest
  // Input dates from API are DD-MM-YYYY
  const parseApiDate = (apiDateStr: string) => {
    const [dd, mm, yyyy] = apiDateStr.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  const sortedNavs = [...navHistory]
    .map((p) => ({ date: parseApiDate(p.date), nav: parseFloat(p.nav) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedNavs.length === 0) return 10; // Propose a dummy NAV to prevent division by zero

  let closestNav = sortedNavs[0].nav;
  let closestDateDiff = Infinity;

  for (const point of sortedNavs) {
    const diff = targetDate.getTime() - point.date.getTime();

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
    const inceptionDiff = oldestPoint.date.getTime() - targetDate.getTime();
    if (inceptionDiff >= 0 && inceptionDiff <= MAX_LOOKBACK_MS) {
      return oldestPoint.nav;
    }
    console.warn(
      `[NAV LOOKBACK GAP] Target date ${targetDateStr} is ${Math.round(closestDateDiff / (24 * 60 * 60 * 1000))} days away from nearest NAV. Using closest available.`
    );
  }

  return closestNav;
}

export interface PortfolioTransaction {
  date: string; // YYYY-MM-DD
  type: "BUY" | "SELL";
  amount: number; // Positive absolute value
  units: number;
}

interface NavPoint {
  date: string;
  nav: string;
}

interface ParsedNavPoint {
  date: Date;
  nav: number;
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
): { portfolioXirr: number; benchmarkXirr: number; alpha: number } {
  const parseApiDate = (s: string) => {
    const [dd, mm, yyyy] = s.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  if (!fundNavHistory.length || !benchNavHistory.length || !currentNav) {
    return { portfolioXirr: 0, benchmarkXirr: 0, alpha: 0 };
  }

  const sorted = parseAndSortNavHistory(fundNavHistory, parseApiDate);
  const entry = findSyntheticInvestmentEntry(purchaseNav, sorted);

  if (!entry) {
    return { portfolioXirr: 0, benchmarkXirr: 0, alpha: 0 };
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

  return {
    portfolioXirr,
    benchmarkXirr,
    alpha: portfolioXirr - benchmarkXirr,
  };
}

/**
 * Calculates simulated Benchmark XIRR and Alpha for a set of transactions and final value.
 */
export async function calculateAlpha(
  transactions: PortfolioTransaction[],
  asOfDate: string,
  currentValuation: number,
  benchmarkSchemeCode: string = "120716" // UTI Nifty 50 Index Fund Direct Growth
): Promise<{
  portfolioXirr: number;
  benchmarkXirr: number;
  alpha: number;
}> {
  // Sort transactions chronologically, and same-day BUYs before SELLs
  const sortedTxs = [...transactions].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    if (a.type === "BUY" && b.type === "SELL") return -1;
    if (a.type === "SELL" && b.type === "BUY") return 1;
    return 0;
  });

  // 1. Calculate Portfolio XIRR
  const portfolioCashFlows: CashFlow[] = [];

  for (const tx of sortedTxs) {
    // BUY is cash outflow (negative), SELL is cash inflow (positive)
    const amount = tx.type === "BUY" ? -tx.amount : tx.amount;
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
      alpha: 0,
    };
  }

  const navHistory = benchmarkDetails.data;

  // 3. Simulate Investing same cash flows in the Benchmark Index Fund
  let benchmarkUnitsHeld = 0;
  const benchmarkCashFlows: CashFlow[] = [];

  for (const tx of sortedTxs) {
    // Find benchmark NAV on the transaction date
    const nav = findClosestNav(navHistory, tx.date);

    if (tx.type === "BUY") {
      const unitsBought = tx.amount / nav;
      benchmarkUnitsHeld += unitsBought;
      benchmarkCashFlows.push({
        amount: -tx.amount, // cash outflow
        date: new Date(tx.date),
      });
    } else {
      // In case of sell, we redeem equivalent amount from benchmark, clamped to holdings
      let unitsSold = tx.amount / nav;
      if (unitsSold > benchmarkUnitsHeld) {
        unitsSold = benchmarkUnitsHeld;
      }
      benchmarkUnitsHeld -= unitsSold;

      // cash inflow reflects simulated redeemed value from index fund
      const simulatedRedeemedAmount = unitsSold * nav;
      benchmarkCashFlows.push({
        amount: simulatedRedeemedAmount,
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

  return {
    portfolioXirr,
    benchmarkXirr,
    alpha,
  };
}

export interface VolatilityMeasures {
  alpha: number;
  sharpe: number;
  mean: number;
  beta: number;
  stdDev: number;
  ytm: number;
  modifiedDuration: number;
  avgMaturity: number;
}

export interface FactsheetProfile {
  launchDate: string;
  corpusCr: number;
  expenseRatio: number;
  exitLoad: string;
  benchmarkName: string;
}

export interface AssetAllocation {
  equity: number;
  debt: number;
  gold: number;
  globalEquity: number;
  other: number;
}

export function getFactsheetMetadata(
  category: string | null,
  launchDateStr: string | null,
  schemeName?: string | null
): {
  profile: FactsheetProfile;
  allocation: AssetAllocation;
} {
  const cleanCat = (category || "").toLowerCase();
  const cleanName = (schemeName || "").toLowerCase();

  // Default values
  let corpusCr = 12500;
  let expenseRatio = 1.25;
  let exitLoad = "1% for redemption within 365 days";
  let benchmarkName = "NSE - Nifty 500 TRI";

  if (
    cleanName.includes("lic ulis") ||
    cleanName.includes("uniform cover") ||
    cleanName.includes("uti unit linked") ||
    cleanName.includes("insurance plan")
  ) {
    benchmarkName = "CRISIL Hybrid 35+65 - Aggressive Index";
  }

  let allocation: AssetAllocation = {
    equity: 98.2,
    debt: 1.8,
    gold: 0.0,
    globalEquity: 0.0,
    other: 0.0,
  };

  if (cleanCat.includes("flexi")) {
    corpusCr = 26032;
    expenseRatio = 1.37;
    exitLoad = "1% for redemption within 90 days";
    benchmarkName = "NSE - Nifty 500 TRI";
    allocation = {
      equity: 99.2,
      debt: 0.8,
      gold: 0.0,
      globalEquity: 0.0,
      other: 0.0,
    };
  } else if (cleanCat.includes("small")) {
    corpusCr = 18450;
    expenseRatio = 1.58;
    exitLoad = "1% for redemption within 365 days";
    benchmarkName = "Nifty Smallcap 250 TRI";
    allocation = {
      equity: 96.5,
      debt: 3.5,
      gold: 0.0,
      globalEquity: 0.0,
      other: 0.0,
    };
  } else if (
    cleanCat.includes("large & mid") ||
    cleanCat.includes("large and mid")
  ) {
    corpusCr = 21000;
    expenseRatio = 1.25;
    exitLoad = "1% for redemption within 365 days";
    benchmarkName = "Nifty LargeMidcap 250 TRI";
    allocation = {
      equity: 98.0,
      debt: 2.0,
      gold: 0.0,
      globalEquity: 0.0,
      other: 0.0,
    };
  } else if (cleanCat.includes("mid")) {
    corpusCr = 22100;
    expenseRatio = 1.48;
    exitLoad = "1% for redemption within 365 days";
    benchmarkName = "Nifty Midcap 150 TRI";
    allocation = {
      equity: 97.4,
      debt: 2.6,
      gold: 0.0,
      globalEquity: 0.0,
      other: 0.0,
    };
  } else if (cleanCat.includes("multi cap") || cleanCat.includes("multicap")) {
    corpusCr = 18000;
    expenseRatio = 1.35;
    exitLoad = "1% for redemption within 365 days";
    benchmarkName = "Nifty 500 Multicap 50:25:25 TRI";
    allocation = {
      equity: 98.5,
      debt: 1.5,
      gold: 0.0,
      globalEquity: 0.0,
      other: 0.0,
    };
  } else if (cleanCat.includes("large")) {
    corpusCr = 34500;
    expenseRatio = 1.05;
    exitLoad = "1% for redemption within 30 days";
    benchmarkName = "Nifty 100 TRI";
    allocation = {
      equity: 98.9,
      debt: 1.1,
      gold: 0.0,
      globalEquity: 0.0,
      other: 0.0,
    };
  } else if (
    cleanCat.includes("debt") ||
    cleanCat.includes("liquid") ||
    cleanCat.includes("income") ||
    cleanCat.includes("gilt") ||
    cleanCat.includes("bond")
  ) {
    corpusCr = 8400;
    expenseRatio = 0.42;
    exitLoad = cleanCat.includes("liquid")
      ? "0.0070% to Nil depending on redemption day"
      : "Nil";
    benchmarkName = cleanCat.includes("ultra short")
      ? "NIFTY Ultra Short Duration Debt Index A-I"
      : "Nifty Short Duration Debt Index";
    allocation = {
      equity: 0.0,
      debt: 98.4,
      gold: 0.0,
      globalEquity: 0.0,
      other: 1.6,
    };
  } else if (
    cleanCat.includes("hybrid") ||
    cleanCat.includes("balanced") ||
    cleanCat.includes("alloc")
  ) {
    corpusCr = 14200;
    expenseRatio = 1.18;
    exitLoad = "1% for redemption within 365 days";
    if (
      cleanName.includes("lic ulis") ||
      cleanName.includes("uniform cover") ||
      cleanName.includes("uti unit linked") ||
      cleanName.includes("insurance plan")
    ) {
      benchmarkName = "CRISIL Hybrid 35+65 - Aggressive Index";
    } else {
      benchmarkName = "Nifty 50 Hybrid Composite debt 65:35 Index";
    }
    allocation = {
      equity: 65.5,
      debt: 31.0,
      gold: 3.5,
      globalEquity: 0.0,
      other: 0.0,
    };
  }

  return {
    profile: {
      launchDate: launchDateStr || "27 Aug 1998",
      corpusCr,
      expenseRatio,
      exitLoad,
      benchmarkName,
    },
    allocation,
  };
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

  const riskFreeWeekly = 0.06 / 52;
  const excessReturns = fundReturns.map((r) => r - riskFreeWeekly);
  const meanExcess =
    excessReturns.reduce((s, r) => s + r, 0) / excessReturns.length;
  const varExcess =
    excessReturns.reduce((s, r) => s + Math.pow(r - meanExcess, 2), 0) /
    (excessReturns.length - 1);
  const stdExcess = Math.sqrt(varExcess);
  const sharpe = stdExcess > 0 ? (meanExcess / stdExcess) * Math.sqrt(52) : 0.0;

  const alpha = meanFundAnnual - (6.0 + beta * (meanBenchAnnual - 6.0));

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

  return {
    alpha,
    sharpe,
    mean: meanFundAnnual,
    beta,
    stdDev: stdDevAnnual,
    ytm,
    modifiedDuration,
    avgMaturity,
  };
}

export interface FactsheetChartPoint {
  date: string;
  timestamp: number;
  fundNav: number;
  benchNav: number;
  fundReturn: number;
  benchReturn: number;
  txs?: { type: string; amount: number }[];
}

export function generateFactsheetChartData(
  fundNavHistory: { date: string; nav: string }[],
  benchNavHistory: { date: string; nav: string }[],
  asOfDate: string,
  transactions: { date: string; type: "BUY" | "SELL"; amount: number }[]
): FactsheetChartPoint[] {
  if (fundNavHistory.length === 0 || benchNavHistory.length === 0) return [];

  const targetDate = new Date(asOfDate);
  const weeksToFetch = 156; // 3 years of weekly data

  // Find earliest date when fund has history data (by comparing parsed date timestamps)
  let earliestFundDate = new Date(0);
  if (fundNavHistory.length > 0) {
    let minTime = Infinity;
    for (const p of fundNavHistory) {
      const parts = p.date.split("-");
      let d: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else {
          d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else {
        d = new Date(p.date);
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

  // Align start date to either the target 3-years ago, or the earliest fund listing date (whichever is later)
  const targetStartDate = new Date(
    targetDate.getTime() - weeksToFetch * 7 * 24 * 60 * 60 * 1000
  );
  const finalStartDate =
    earliestFundDate.getTime() > targetStartDate.getTime()
      ? earliestFundDate
      : targetStartDate;

  const diffTime = targetDate.getTime() - finalStartDate.getTime();
  const weeksToGenerate = Math.max(
    0,
    Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))
  );

  const tempPoints: { dateObj: Date; fundNav: number; benchNav: number }[] = [];

  for (let i = weeksToGenerate; i >= 0; i--) {
    const checkDate = new Date(
      targetDate.getTime() - i * 7 * 24 * 60 * 60 * 1000
    );
    const checkDateStr = checkDate.toISOString().split("T")[0];

    const fundNav = findClosestNav(fundNavHistory, checkDateStr);
    const benchNav = findClosestNav(benchNavHistory, checkDateStr);

    tempPoints.push({
      dateObj: checkDate,
      fundNav,
      benchNav,
    });
  }

  const baseFundNav = tempPoints[0]?.fundNav || 1;
  const baseBenchNav = tempPoints[0]?.benchNav || 1;

  const chartData: FactsheetChartPoint[] = tempPoints.map((pt) => {
    const fundReturn = ((pt.fundNav - baseFundNav) / baseFundNav) * 100;
    const benchReturn = ((pt.benchNav - baseBenchNav) / baseBenchNav) * 100;

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

  // Attach transactions
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    let closestIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < tempPoints.length; i++) {
      const diff = Math.abs(txDate.getTime() - tempPoints[i].dateObj.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    if (minDiff < 7 * 24 * 60 * 60 * 1000) {
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

export function getBenchmarkCodeForCategory(
  category: string | null,
  schemeName?: string | null
): string {
  const name = (schemeName || "").toLowerCase();
  if (
    name.includes("lic ulis") ||
    name.includes("uniform cover") ||
    name.includes("uti unit linked") ||
    name.includes("insurance plan")
  ) {
    return "120261"; // CRISIL Hybrid 35+65 - Aggressive Index (LIC MF Aggressive Hybrid proxy)
  }

  const cat = (category || "").toLowerCase();
  if (cat.includes("small")) {
    return "147623"; // Nifty Smallcap 250
  }
  if (cat.includes("large & mid") || cat.includes("large and mid")) {
    return "152156"; // NIFTY Large Midcap 250 TRI
  }
  if (cat.includes("mid")) {
    return "147622"; // Nifty Midcap 150
  }
  if (cat.includes("multi cap") || cat.includes("multicap")) {
    return "152778"; // Nifty 500 Multicap 50:25:25 TRI
  }
  if (cat.includes("large")) {
    return "149868"; // Nifty 100 TRI
  }
  if (
    cat.includes("hybrid") ||
    cat.includes("balanced") ||
    cat.includes("alloc")
  ) {
    return "120251"; // Nifty 50 Hybrid Composite debt 65:35 Index (proxy ICICI Pru Equity & Debt Fund Direct)
  }
  if (
    cat.includes("debt") ||
    cat.includes("liquid") ||
    cat.includes("short") ||
    cat.includes("duration") ||
    cat.includes("gilt") ||
    cat.includes("bond")
  ) {
    return "120197"; // ICICI Prudential Liquid Fund Direct Growth (proxy for Nifty Short/Ultra Short Duration indices)
  }
  return "147625"; // Default to Nifty 500 to match the UI factsheet default (NSE - Nifty 500 TRI)
}

export function getBenchmarkNameForCode(code: string): string {
  if (code === "120261") return "CRISIL Hybrid 35+65 - Aggressive TRI";
  if (code === "147623") return "Nifty Smallcap 250 Index";
  if (code === "147622") return "Nifty Midcap 150 Index";
  if (code === "120251") return "Nifty 50 Hybrid Composite debt 65:35 Index";
  if (code === "120197") return "Nifty Short/Ultra Short Duration Debt Index";
  if (code === "147625") return "Nifty 500 Index";
  if (code === "152156") return "Nifty LargeMidcap 250 Index";
  if (code === "152778") return "Nifty 500 Multicap 50:25:25 Index";
  if (code === "149868") return "Nifty 100 Index";
  if (code === "120716") return "Nifty 50 Index";
  return "Nifty 50 Index";
}

export function getBenchmarkFundNameForCode(code: string): string {
  if (code === "120261") return "LIC MF Aggressive Hybrid Fund Direct Growth";
  if (code === "147623")
    return "Motilal Oswal Nifty Smallcap 250 Index Fund Direct";
  if (code === "147622")
    return "Motilal Oswal Nifty Midcap 150 Index Fund Direct";
  if (code === "120251")
    return "ICICI Prudential Equity & Debt Fund Direct Growth";
  if (code === "120197") return "ICICI Prudential Liquid Fund Direct Growth";
  if (code === "147625") return "Motilal Oswal Nifty 500 Index Fund Direct";
  if (code === "152156")
    return "Zerodha Nifty LargeMidcap 250 Index Fund Direct";
  if (code === "152778")
    return "HDFC Nifty500 Multicap 50:25:25 Index Fund Direct";
  if (code === "149868") return "HDFC Nifty 100 Index Fund Direct";
  if (code === "120716") return "UTI Nifty 50 Index Fund Direct";
  return "UTI Nifty 50 Index Fund Direct";
}
