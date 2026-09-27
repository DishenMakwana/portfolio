import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import { db } from "@/db/db";
import { schemeCategoryRankings, watchlistSchemeNavHistory } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { isCacheFresh, parseToLocalMidnight } from "@/helpers/dates";
import {
  getBenchmarkCategoryRatios,
  syncBenchmarkCategoryRatios,
  clearCategoryBenchmarkCache,
} from "./benchmarkCategoryRatioService";
import {
  getSchemeHistoryForDbCode,
  getBenchmarkHistory,
  calculateVolatilityMeasures,
  getBenchmarkCodeForCategory,
} from "./alpha";
import type {
  SchemeCategoryRankingsData,
  ReturnsRankingsTableData,
  GrowwAdvancedRatiosData,
  SchemeRankingsMapItem,
} from "@/types/fund-details";

const execFileAsync = promisify(execFile);

// In-memory cache for single-scheme rankings and all rankings map
const schemeRankingsCache = new Map<string, SchemeCategoryRankingsData>();
let allRankingsMapCache: Record<string, SchemeRankingsMapItem> | null = null;

export function clearSchemeCategoryRankingsCache(): void {
  schemeRankingsCache.clear();
  allRankingsMapCache = null;
  clearCategoryBenchmarkCache();
}

/**
 * Parses a raw database record into SchemeCategoryRankingsData with parsed JSON and category ratios.
 */
async function parseRecordToRankingsData(
  record: typeof schemeCategoryRankings.$inferSelect
): Promise<SchemeCategoryRankingsData> {
  let annualised: ReturnsRankingsTableData | null = null;
  let absolute: ReturnsRankingsTableData | null = null;
  let advancedRatios = null;
  let marketCap = null;
  let assetAllocation = null;
  let exitLoadTax = null;

  if (record.annualisedData) {
    try {
      annualised = JSON.parse(
        record.annualisedData
      ) as ReturnsRankingsTableData;
      if (annualised && Array.isArray(annualised.horizons)) {
        annualised.horizons = Array.from(new Set(annualised.horizons));
      }
    } catch {
      annualised = null;
    }
  }

  if (record.absoluteData) {
    try {
      absolute = JSON.parse(record.absoluteData) as ReturnsRankingsTableData;
      if (absolute && Array.isArray(absolute.horizons)) {
        absolute.horizons = Array.from(new Set(absolute.horizons));
      }
    } catch {
      absolute = null;
    }
  }

  if (record.advancedRatiosData) {
    try {
      advancedRatios = JSON.parse(record.advancedRatiosData);
    } catch {
      advancedRatios = null;
    }
  }

  if (record.marketCapData) {
    try {
      marketCap = JSON.parse(record.marketCapData);
    } catch {
      marketCap = null;
    }
  }

  if (record.assetAllocationData) {
    try {
      assetAllocation = JSON.parse(record.assetAllocationData);
    } catch {
      assetAllocation = null;
    }
  }

  if (record.exitLoadTaxData) {
    try {
      exitLoadTax = JSON.parse(record.exitLoadTaxData);
    } catch {
      exitLoadTax = null;
    }
  }

  const categoryRatios = await getBenchmarkCategoryRatios(
    record.categoryName,
    record.schemeCode
  );

  const rankingsResult: SchemeCategoryRankingsData = {
    schemeCode: record.schemeCode,
    schemeName: record.schemeName,
    categoryName: record.categoryName,
    growwSlug: record.growwSlug,
    annualised,
    absolute,
    advancedRatios,
    categoryRatios,
    marketCap,
    assetAllocation,
    exitLoadTax,
    expenseRatio:
      record.expenseRatio !== null && record.expenseRatio !== undefined
        ? Number(record.expenseRatio)
        : null,
    lastScrapedAt: record.lastScrapedAt,
  };
  schemeRankingsCache.set(record.schemeCode, rankingsResult);
  return rankingsResult;
}

/**
 * Triggers real-time Playwright scraper to refresh Groww returns & rankings for a scheme,
 * and recalculates local volatility measures (StdDev, R-Squared, Alpha, Beta) from historical NAVs.
 */
export async function syncSchemeCategoryRankings(
  schemeCode: string
): Promise<SchemeCategoryRankingsData | null> {
  if (!schemeCode) return null;
  const cleanCode = schemeCode
    .replace(/^w_/, "")
    .replace(/^sold_/, "")
    .trim();

  try {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "scrape_fund_rankings.py"
    );
    const pythonBin = "python3";

    try {
      await execFileAsync(pythonBin, [scriptPath, "--scheme-code", cleanCode], {
        timeout: 45000,
        cwd: process.cwd(),
        env: {
          ...process.env,
        },
      });
    } catch (scrapeErr) {
      console.warn(
        `[FundRankingService] Scraper failed/timed out for ${cleanCode}, falling back to local volatility calculation:`,
        scrapeErr
      );
    }

    schemeRankingsCache.delete(cleanCode);
    allRankingsMapCache = null;

    // Recalculate and persist local volatility stats (StdDev & R-Squared)
    const updatedData = await recalculateSchemeVolatilityAndSave(cleanCode);
    if (updatedData) {
      schemeRankingsCache.set(cleanCode, updatedData);
      return updatedData;
    }
  } catch (error) {
    console.error(
      `[FundRankingService] Error during sync for ${cleanCode}:`,
      error
    );
  }

  return null;
}

/**
 * Retrieves cached scheme category rankings and returns from the database using 24-hour TTL
 * and day-change detection. If data is missing or stale, automatically triggers a fresh sync.
 */
export async function getSchemeCategoryRankings(
  schemeCode: string,
  options?: { forceRefresh?: boolean }
): Promise<SchemeCategoryRankingsData | null> {
  if (!schemeCode) return null;

  if (!options?.forceRefresh) {
    const cached = schemeRankingsCache.get(schemeCode);
    if (cached && isCacheFresh(cached.lastScrapedAt)) return cached;
  }

  try {
    const record = await db.query.schemeCategoryRankings.findFirst({
      where: eq(schemeCategoryRankings.schemeCode, schemeCode),
    });

    const isFresh =
      !options?.forceRefresh &&
      Boolean(record && isCacheFresh(record.lastScrapedAt));

    if (record && isFresh) {
      return await parseRecordToRankingsData(record);
    }

    // If record exists and forceRefresh wasn't requested, return existing data immediately
    // and trigger background sync so the user does not wait on a 45s Python Playwright scraper.
    if (record && !options?.forceRefresh) {
      void syncSchemeCategoryRankings(schemeCode).catch((err) =>
        console.warn(
          `[FundRankingService] Background auto-sync failed for ${schemeCode}:`,
          err
        )
      );
      return await parseRecordToRankingsData(record);
    }

    // Record is missing or forceRefresh requested: trigger sync
    try {
      const synced = await syncSchemeCategoryRankings(schemeCode);
      if (synced) return synced;
    } catch (err) {
      console.warn(
        `[FundRankingService] Auto-sync failed for ${schemeCode}:`,
        err
      );
    }

    if (record) {
      return await parseRecordToRankingsData(record);
    }

    return null;
  } catch (error) {
    console.error(
      `[FundRankingService] Error fetching rankings for ${schemeCode}:`,
      error
    );
    return null;
  }
}

/**
 * Retrieves all cached scheme category rankings mapped by AMFI scheme code.
 */
export async function getAllSchemeCategoryRankingsMap() {
  if (allRankingsMapCache) {
    return allRankingsMapCache;
  }

  try {
    const records = await db.query.schemeCategoryRankings.findMany();
    const map: Record<
      string,
      {
        schemeCode: string;
        schemeName: string;
        categoryName: string;
        expenseRatio: number | null;
        rank1Y: number | null;
        rank3Y: number | null;
        rank5Y: number | null;
        rank6M: number | null;
        rank3M: number | null;
        rank1M: number | null;
        rank10Y: number | null;
        fundReturn5Y: number | null;
        categoryAvg5Y: number | null;
        alpha5Y: number | null;
        fundReturn3Y: number | null;
        categoryAvg3Y: number | null;
        alpha3Y: number | null;
        fundReturn1Y: number | null;
        categoryAvg1Y: number | null;
        alpha1Y: number | null;
        fundReturn6M: number | null;
        categoryAvg6M: number | null;
        alpha6M: number | null;
        fundReturn3M: number | null;
        categoryAvg3M: number | null;
        alpha3M: number | null;
        fundReturn1M: number | null;
        categoryAvg1M: number | null;
        alpha1M: number | null;
        fundReturn10Y: number | null;
        categoryAvg10Y: number | null;
        alpha10Y: number | null;
        bestRank: { rank: number; horizon: string } | null;
        primaryRank: { rank: number; horizon: string } | null;
        allRanks: Record<string, string>;
      }
    > = {};

    for (const record of records) {
      if (!record.schemeCode) continue;

      let allRanks: Record<string, string> = {};
      let fundReturns: Record<string, string> = {};
      let categoryAvg: Record<string, string> = {};

      if (record.absoluteData) {
        try {
          const parsedAbs = JSON.parse(record.absoluteData);
          if (parsedAbs?.categoryRank)
            allRanks = { ...parsedAbs.categoryRank, ...allRanks };
          if (parsedAbs?.fundReturns)
            fundReturns = { ...parsedAbs.fundReturns, ...fundReturns };
          if (parsedAbs?.categoryAvg)
            categoryAvg = { ...parsedAbs.categoryAvg, ...categoryAvg };
        } catch {
          // ignore
        }
      }

      if (record.annualisedData) {
        try {
          const parsedAnn = JSON.parse(record.annualisedData);
          if (parsedAnn?.categoryRank)
            allRanks = { ...allRanks, ...parsedAnn.categoryRank };
          if (parsedAnn?.fundReturns)
            fundReturns = { ...fundReturns, ...parsedAnn.fundReturns };
          if (parsedAnn?.categoryAvg)
            categoryAvg = { ...categoryAvg, ...parsedAnn.categoryAvg };
        } catch {
          allRanks = {};
        }
      }

      const parseRank = (val: string | undefined): number | null => {
        if (!val || val === "--") return null;
        const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
        return isNaN(num) ? null : num;
      };

      const parsePercent = (val: string | undefined): number | null => {
        if (!val || val === "--" || val === "N/A") return null;
        const clean = val.replace(/[^0-9.-]/g, "");
        const num = parseFloat(clean);
        return isNaN(num) ? null : num;
      };

      const rank5Y = parseRank(allRanks["5Y"]);
      const rank3Y = parseRank(allRanks["3Y"]);
      const rank1Y = parseRank(allRanks["1Y"]);
      const rank6M = parseRank(allRanks["6M"]);
      const rank3M = parseRank(allRanks["3M"]);
      const rank1M = parseRank(allRanks["1M"]);
      const rank10Y = parseRank(allRanks["10Y"]);
      const rankAll = parseRank(allRanks["All"]);

      const calcAlpha = (ret: number | null, avg: number | null) =>
        ret !== null && avg !== null
          ? Math.round((ret - avg) * 100) / 100
          : null;

      const fundReturn5Y = parsePercent(fundReturns["5Y"]);
      const categoryAvg5Y = parsePercent(categoryAvg["5Y"]);
      const alpha5Y = calcAlpha(fundReturn5Y, categoryAvg5Y);

      const fundReturn3Y = parsePercent(fundReturns["3Y"]);
      const categoryAvg3Y = parsePercent(categoryAvg["3Y"]);
      const alpha3Y = calcAlpha(fundReturn3Y, categoryAvg3Y);

      const fundReturn1Y = parsePercent(fundReturns["1Y"]);
      const categoryAvg1Y = parsePercent(categoryAvg["1Y"]);
      const alpha1Y = calcAlpha(fundReturn1Y, categoryAvg1Y);

      const fundReturn6M = parsePercent(fundReturns["6M"]);
      const categoryAvg6M = parsePercent(categoryAvg["6M"]);
      const alpha6M = calcAlpha(fundReturn6M, categoryAvg6M);

      const fundReturn3M = parsePercent(fundReturns["3M"]);
      const categoryAvg3M = parsePercent(categoryAvg["3M"]);
      const alpha3M = calcAlpha(fundReturn3M, categoryAvg3M);

      const fundReturn1M = parsePercent(fundReturns["1M"]);
      const categoryAvg1M = parsePercent(categoryAvg["1M"]);
      const alpha1M = calcAlpha(fundReturn1M, categoryAvg1M);

      const fundReturn10Y = parsePercent(fundReturns["10Y"]);
      const categoryAvg10Y = parsePercent(categoryAvg["10Y"]);
      const alpha10Y = calcAlpha(fundReturn10Y, categoryAvg10Y);

      // Preferred primary horizon fallback: 5Y -> 3Y -> 1Y -> 10Y -> 6M -> 3M -> 1M -> All
      let primaryRank: { rank: number; horizon: string } | null = null;
      if (rank5Y !== null) {
        primaryRank = { rank: rank5Y, horizon: "5Y" };
      } else if (rank3Y !== null) {
        primaryRank = { rank: rank3Y, horizon: "3Y" };
      } else if (rank1Y !== null) {
        primaryRank = { rank: rank1Y, horizon: "1Y" };
      } else if (rank10Y !== null) {
        primaryRank = { rank: rank10Y, horizon: "10Y" };
      } else if (rank6M !== null) {
        primaryRank = { rank: rank6M, horizon: "6M" };
      } else if (rank3M !== null) {
        primaryRank = { rank: rank3M, horizon: "3M" };
      } else if (rank1M !== null) {
        primaryRank = { rank: rank1M, horizon: "1M" };
      } else if (rankAll !== null) {
        primaryRank = { rank: rankAll, horizon: "All" };
      }

      // Best rank calculation across horizons
      let bestRank: { rank: number; horizon: string } | null = null;
      const candidates: Array<{ rank: number; horizon: string }> = [];
      if (rank5Y !== null) candidates.push({ rank: rank5Y, horizon: "5Y" });
      if (rank3Y !== null) candidates.push({ rank: rank3Y, horizon: "3Y" });
      if (rank1Y !== null) candidates.push({ rank: rank1Y, horizon: "1Y" });
      if (rank6M !== null) candidates.push({ rank: rank6M, horizon: "6M" });
      if (rank3M !== null) candidates.push({ rank: rank3M, horizon: "3M" });
      if (rank1M !== null) candidates.push({ rank: rank1M, horizon: "1M" });
      if (rank10Y !== null) candidates.push({ rank: rank10Y, horizon: "10Y" });

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.rank - b.rank);
        bestRank = candidates[0];
      }

      map[record.schemeCode] = {
        schemeCode: record.schemeCode,
        schemeName: record.schemeName,
        categoryName: record.categoryName,
        expenseRatio:
          record.expenseRatio !== null && record.expenseRatio !== undefined
            ? Number(record.expenseRatio)
            : null,
        rank1Y,
        rank3Y,
        rank5Y,
        rank6M,
        rank3M,
        rank1M,
        rank10Y,
        fundReturn5Y,
        categoryAvg5Y,
        alpha5Y,
        fundReturn3Y,
        categoryAvg3Y,
        alpha3Y,
        fundReturn1Y,
        categoryAvg1Y,
        alpha1Y,
        fundReturn6M,
        categoryAvg6M,
        alpha6M,
        fundReturn3M,
        categoryAvg3M,
        alpha3M,
        fundReturn1M,
        categoryAvg1M,
        alpha1M,
        fundReturn10Y,
        categoryAvg10Y,
        alpha10Y,
        bestRank,
        primaryRank,
        allRanks,
      };
    }

    allRankingsMapCache = map;
    return map;
  } catch (error) {
    console.error("[FundRankingService] Error fetching all rankings:", error);
    return {};
  }
}

/**
 * Calculates Standard Deviation and R-Squared (and other risk measures)
 * from local database NAV data and persists them in scheme_category_rankings.
 * Also updates category benchmark ratios.
 */
async function recalculateSchemeVolatilityAndSave(
  schemeCode: string
): Promise<SchemeCategoryRankingsData | null> {
  if (!schemeCode) return null;

  try {
    const record = await db.query.schemeCategoryRankings.findFirst({
      where: eq(schemeCategoryRankings.schemeCode, schemeCode),
    });

    if (!record) return null;

    const benchmarkCode = await getBenchmarkCodeForCategory(
      record.categoryName,
      record.schemeName
    );

    const [fundHistory, benchHistory] = await Promise.all([
      getSchemeHistoryForDbCode(schemeCode),
      getBenchmarkHistory(benchmarkCode || "120716"),
    ]);

    let fundNavPoints = fundHistory?.data;
    if (!fundNavPoints || fundNavPoints.length === 0) {
      const wNavs = await db
        .select({
          date: watchlistSchemeNavHistory.date,
          nav: watchlistSchemeNavHistory.nav,
        })
        .from(watchlistSchemeNavHistory)
        .where(eq(watchlistSchemeNavHistory.schemeCode, schemeCode))
        .orderBy(asc(watchlistSchemeNavHistory.date));
      wNavs.sort(
        (a, b) =>
          parseToLocalMidnight(a.date).getTime() -
          parseToLocalMidnight(b.date).getTime()
      );
      if (wNavs.length > 0) {
        fundNavPoints = wNavs.map((n) => ({
          date: n.date,
          nav: String(n.nav),
        }));
      }
    }

    let advData: GrowwAdvancedRatiosData = {};
    if (record.advancedRatiosData) {
      try {
        advData = JSON.parse(record.advancedRatiosData);
      } catch {
        advData = {};
      }
    }

    if (
      fundNavPoints &&
      fundNavPoints.length > 0 &&
      benchHistory?.data &&
      benchHistory.data.length > 0
    ) {
      const vol = calculateVolatilityMeasures(
        fundNavPoints,
        benchHistory.data,
        new Date().toISOString(),
        record.categoryName
      );

      advData.stdDev = Number(vol.stdDev.toFixed(2));
      advData.rSquared = Number((vol.rSquared || 0).toFixed(2));

      // If alpha/beta/sharpe/sortino were missing, fallback to computed
      if (advData.alpha === undefined || advData.alpha === null) {
        advData.alpha = Number(vol.alpha.toFixed(2));
      }
      if (advData.beta === undefined || advData.beta === null) {
        advData.beta = Number(vol.beta.toFixed(2));
      }
      if (advData.sharpe === undefined || advData.sharpe === null) {
        advData.sharpe = Number(vol.sharpe.toFixed(2));
      }
      if (advData.sortino === undefined || advData.sortino === null) {
        advData.sortino = Number(vol.sortino.toFixed(2));
      }

      await db
        .update(schemeCategoryRankings)
        .set({
          advancedRatiosData: JSON.stringify(advData),
          updatedAt: new Date(),
        })
        .where(eq(schemeCategoryRankings.schemeCode, schemeCode));

      if (record.categoryName) {
        await syncBenchmarkCategoryRatios(record.categoryName);
      }
    }

    clearSchemeCategoryRankingsCache();
    return await getSchemeCategoryRankings(schemeCode);
  } catch (error) {
    console.error(
      `[FundRankingService] Error calculating volatility stats for ${schemeCode}:`,
      error
    );
    return null;
  }
}

/**
 * Triggers batch scraping of all active mutual fund schemes in parallel (concurrency: 5)
 * to update Market Cap Splits (Large, Mid, Small Cap) and asset allocation in the database.
 */
export async function syncActiveFundsMarketCap(
  concurrency: number = 5
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "scrape_fund_rankings.py"
    );
    const pythonBin = "python3";

    await execFileAsync(
      pythonBin,
      [scriptPath, "--active-only", "--concurrency", String(concurrency)],
      {
        timeout: 300000,
        cwd: process.cwd(),
        env: {
          ...process.env,
        },
      }
    );

    clearSchemeCategoryRankingsCache();

    return {
      success: true,
      count: 58,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[FundRankingService] Batch sync failed:", message);
    return {
      success: false,
      count: 0,
      error: message,
    };
  }
}
