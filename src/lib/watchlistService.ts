import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { cache } from "react";
import { db } from "@/db/db";
import {
  watchlistSchemes,
  watchlistSchemeNavCacheMeta,
  watchlistSchemeNavHistory,
  watchlistFundAnalytics,
  schemeCategoryRankings,
} from "@/db/schema";
import { asc, eq, inArray, or, sql } from "drizzle-orm";
import { fetchMfDetails } from "@/lib/mfApi";
import { syncSchemeCategoryRankings } from "@/lib/fundRankingService";
import { computeFundAthMetrics } from "@/helpers/ath";
import { normalizeWatchlistCategory } from "@/helpers/watchlist";
import { parseHistoryDate } from "@/helpers/dates";
import {
  getBenchmarkCodeForCategory,
  getBenchmarkNameForCode,
  getBenchmarkFundNameForCode,
  getBenchmarkHistory,
  generateFactsheetChartData,
} from "@/lib/alpha";
import { getBenchmarkCategoryRatios } from "@/lib/benchmarkCategoryRatioService";
import { calculateRollingReturnsSummary } from "@/helpers/rollingReturns";
import type {
  WatchlistAddFundInput,
  WatchlistAdvancedRatios,
  WatchlistAssetAllocation,
  WatchlistCategoryRanking,
  WatchlistDashboardData,
  WatchlistExitLoad,
  WatchlistFundDetails,
  WatchlistItem,
  WatchlistLumpsumSignal,
  WatchlistMarketCapSplit,
  WatchlistReturns,
  WatchlistTopHolding,
  WatchlistVroPortfolioData,
  WatchlistVroReturnsData,
  WatchlistVroRiskData,
} from "@/types/watchlist";

const execFileAsync = promisify(execFile);

// Fast in-memory cache for instant page loads
let watchlistCache: { data: WatchlistDashboardData; timestamp: number } | null =
  null;
const watchlistDetailsCache = new Map<
  string,
  { data: WatchlistFundDetails; timestamp: number }
>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function clearWatchlistCache(): void {
  watchlistCache = null;
  watchlistDetailsCache.clear();
}

let tablesEnsured = false;

/**
 * Ensures all watchlist_ tables exist in PostgreSQL portfolio schema
 */
async function ensureWatchlistTables(): Promise<void> {
  if (tablesEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portfolio.watchlist_schemes (
        id SERIAL PRIMARY KEY,
        scheme_code TEXT NOT NULL UNIQUE,
        scheme_name TEXT NOT NULL,
        fund_house TEXT,
        category TEXT,
        scheme_type TEXT,
        isin TEXT,
        launch_date TEXT,
        aum_cr DOUBLE PRECISION,
        expense_ratio DOUBLE PRECISION,
        exit_load TEXT,
        fund_manager TEXT,
        benchmark_code TEXT,
        benchmark_name TEXT,
        groww_slug TEXT,
        risk_rating INTEGER,
        min_lumpsum DOUBLE PRECISION,
        min_sip DOUBLE PRECISION,
        target_dip_pct DOUBLE PRECISION,
        target_nav DOUBLE PRECISION,
        notes TEXT,
        tags TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portfolio.watchlist_scheme_nav_cache_meta (
        scheme_code TEXT PRIMARY KEY,
        scheme_name TEXT NOT NULL,
        fund_house TEXT,
        category TEXT,
        last_fetched_at TEXT NOT NULL,
        first_nav_date TEXT,
        last_nav_date TEXT,
        last_nav DOUBLE PRECISION,
        prev_nav DOUBLE PRECISION,
        one_day_change_pct DOUBLE PRECISION,
        ath_nav DOUBLE PRECISION,
        ath_date TEXT,
        drawdown_pct DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portfolio.watchlist_scheme_nav_history (
        id SERIAL PRIMARY KEY,
        scheme_code TEXT NOT NULL,
        date TEXT NOT NULL,
        nav DOUBLE PRECISION NOT NULL,
        fetched_at TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        CONSTRAINT watchlist_scheme_nav_history_code_date_uq UNIQUE (scheme_code, date)
      );

      CREATE TABLE IF NOT EXISTS portfolio.watchlist_fund_analytics (
        scheme_code TEXT PRIMARY KEY,
        scheme_name TEXT NOT NULL,
        category_name TEXT,
        groww_slug TEXT,
        annualised_data TEXT,
        absolute_data TEXT,
        advanced_ratios_data TEXT,
        market_cap_data TEXT,
        asset_allocation_data TEXT,
        exit_load_tax_data TEXT,
        top_holdings_data TEXT,
        last_synced_at TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS watchlist_schemes_code_idx ON portfolio.watchlist_schemes (scheme_code);
      CREATE INDEX IF NOT EXISTS watchlist_schemes_cat_idx ON portfolio.watchlist_schemes (category);
      CREATE INDEX IF NOT EXISTS watchlist_nav_hist_code_idx ON portfolio.watchlist_scheme_nav_history (scheme_code);
      CREATE INDEX IF NOT EXISTS watchlist_nav_hist_date_idx ON portfolio.watchlist_scheme_nav_history (date);
    `);
    tablesEnsured = true;
  } catch (err) {
    console.warn(
      "[WatchlistService] Notice during ensureWatchlistTables:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Calculates returns over different time horizons given sorted NAV history
 */
function calculateHistoricalReturns(
  navHistory: Array<{ date: string; nav: number }>
): WatchlistReturns {
  if (!navHistory || navHistory.length === 0) {
    return {
      return1M: null,
      return3M: null,
      return6M: null,
      return1Y: null,
      return3Y: null,
      return5Y: null,
      sinceInception: null,
    };
  }

  const latest = navHistory[navHistory.length - 1];
  const latestDate = new Date(latest.date).getTime();
  const latestNav = latest.nav;

  if (latestNav <= 0) {
    return {
      return1M: null,
      return3M: null,
      return6M: null,
      return1Y: null,
      return3Y: null,
      return5Y: null,
      sinceInception: null,
    };
  }

  function getNavClosestTo(targetDaysAgo: number): number | null {
    const targetTime = latestDate - targetDaysAgo * 24 * 60 * 60 * 1000;
    let closestPoint: (typeof navHistory)[0] | null = null;
    let minDiff = Infinity;

    for (let i = navHistory.length - 1; i >= 0; i--) {
      const p = navHistory[i];
      const pTime = new Date(p.date).getTime();
      const diff = Math.abs(pTime - targetTime);

      // We accept a point within +/- 10 days of target
      if (diff < minDiff && diff <= 12 * 24 * 60 * 60 * 1000) {
        minDiff = diff;
        closestPoint = p;
      }
      if (pTime < targetTime - 12 * 24 * 60 * 60 * 1000) break;
    }

    return closestPoint ? closestPoint.nav : null;
  }

  function calcReturn(pastNav: number | null, years: number): number | null {
    if (!pastNav || pastNav <= 0) return null;
    if (years <= 1) {
      return Math.round(((latestNav - pastNav) / pastNav) * 10000) / 100;
    }
    const cagr = (Math.pow(latestNav / pastNav, 1 / years) - 1) * 100;
    return Math.round(cagr * 100) / 100;
  }

  const nav1M = getNavClosestTo(30);
  const nav3M = getNavClosestTo(90);
  const nav6M = getNavClosestTo(182);
  const nav1Y = getNavClosestTo(365);
  const nav3Y = getNavClosestTo(365 * 3);
  const nav5Y = getNavClosestTo(365 * 5);

  const oldest = navHistory[0];
  const oldestTime = new Date(oldest.date).getTime();
  const totalYears = Math.max(
    0.1,
    (latestDate - oldestTime) / (1000 * 60 * 60 * 24 * 365.25)
  );

  return {
    return1M: calcReturn(nav1M, 30 / 365),
    return3M: calcReturn(nav3M, 90 / 365),
    return6M: calcReturn(nav6M, 182 / 365),
    return1Y: calcReturn(nav1Y, 1),
    return3Y: calcReturn(nav3Y, 3),
    return5Y: calcReturn(nav5Y, 5),
    sinceInception: calcReturn(oldest.nav, totalYears),
  };
}

/**
 * Computes ATH drawdown and Lumpsum Dip buying signal
 */
function resolveLumpsumSignal(drawdownPct: number): WatchlistLumpsumSignal {
  if (drawdownPct >= 10.0) return "DEEP_DIP";
  if (drawdownPct >= 5.0) return "CORRECTION";
  if (drawdownPct > 0.05) return "NEAR_PEAK";
  return "AT_ATH";
}

/**
 * Fetch full dashboard data for Watchlist tab with parallel DB execution and in-memory caching
 */
export async function getWatchlistDashboardData(): Promise<WatchlistDashboardData> {
  if (watchlistCache && Date.now() - watchlistCache.timestamp < CACHE_TTL_MS) {
    return watchlistCache.data;
  }

  await ensureWatchlistTables();

  // Concurrent Promise.all batch query to eliminate sequential roundtrips
  const [dbSchemes, dbNavMeta, dbAnalytics, dbRankings, navRows] =
    await Promise.all([
      db
        .select()
        .from(watchlistSchemes)
        .orderBy(asc(watchlistSchemes.schemeName)),
      db.select().from(watchlistSchemeNavCacheMeta),
      db.select().from(watchlistFundAnalytics),
      db.select().from(schemeCategoryRankings),
      db
        .select({
          schemeCode: watchlistSchemeNavHistory.schemeCode,
          date: watchlistSchemeNavHistory.date,
          nav: watchlistSchemeNavHistory.nav,
        })
        .from(watchlistSchemeNavHistory)
        .orderBy(
          asc(watchlistSchemeNavHistory.schemeCode),
          asc(watchlistSchemeNavHistory.date)
        ),
    ]);

  if (dbSchemes.length === 0) {
    const emptyResult: WatchlistDashboardData = {
      summary: {
        totalFunds: 0,
        top1YFund: null,
        lowestExpenseFund: null,
        deepDipsCount: 0,
        correctionsCount: 0,
        average3YReturn: null,
      },
      items: [],
      categories: [],
      asOfDate: new Date().toISOString().slice(0, 10),
    };
    watchlistCache = { data: emptyResult, timestamp: Date.now() };
    return emptyResult;
  }

  const navMap = new Map<string, Array<{ date: string; nav: number }>>();
  for (const row of navRows) {
    let list = navMap.get(row.schemeCode);
    if (!list) {
      list = [];
      navMap.set(row.schemeCode, list);
    }
    list.push({ date: row.date, nav: row.nav });
  }

  const metaMap = new Map<string, (typeof dbNavMeta)[0]>();
  for (const m of dbNavMeta) {
    metaMap.set(m.schemeCode, m);
  }

  const analyticsMap = new Map<string, (typeof dbAnalytics)[0]>();
  for (const a of dbAnalytics) {
    analyticsMap.set(a.schemeCode, a);
  }

  const rankingsMap = new Map<string, (typeof dbRankings)[0]>();
  for (const r of dbRankings) {
    rankingsMap.set(r.schemeCode, r);
  }

  const categoriesSet = new Set<string>();
  const items: WatchlistItem[] = [];

  let top1Y: {
    schemeCode: string;
    schemeName: string;
    return1Y: number;
  } | null = null;
  let lowestExp: {
    schemeCode: string;
    schemeName: string;
    expenseRatio: number;
  } | null = null;
  let deepDipsCount = 0;
  let correctionsCount = 0;
  let total3YReturnSum = 0;
  let countWith3Y = 0;

  for (const s of dbSchemes) {
    const meta = metaMap.get(s.schemeCode);
    const analytics = analyticsMap.get(s.schemeCode);
    const fallbackRankings = rankingsMap.get(s.schemeCode);
    const history = navMap.get(s.schemeCode) || [];

    const normalizedCat = normalizeWatchlistCategory(s.category);
    if (normalizedCat) categoriesSet.add(normalizedCat);

    const currentNav =
      meta?.lastNav ||
      (history.length > 0 ? history[history.length - 1].nav : 0);
    const prevNav = meta?.prevNav || null;
    const oneDayChangePct =
      meta?.oneDayChangePct !== null && meta?.oneDayChangePct !== undefined
        ? meta.oneDayChangePct
        : prevNav && prevNav > 0
          ? Math.round(((currentNav - prevNav) / prevNav) * 10000) / 100
          : null;

    const athNav = meta?.athNav || currentNav;
    const athDate = meta?.athDate || meta?.lastNavDate || "";
    const athMetrics = computeFundAthMetrics(currentNav, athNav, athDate);
    const drawdownPct = Math.abs(athMetrics.correctionPct);
    const lumpsumSignal = resolveLumpsumSignal(drawdownPct);

    if (lumpsumSignal === "DEEP_DIP") deepDipsCount++;
    else if (lumpsumSignal === "CORRECTION") correctionsCount++;

    // Calculate historical returns from NAV points
    const returns = calculateHistoricalReturns(history);

    // Parse Groww Analytics
    let rankings: WatchlistCategoryRanking[] = [];
    const annualisedRaw =
      analytics?.annualisedData || fallbackRankings?.annualisedData;
    if (annualisedRaw) {
      try {
        const parsed = JSON.parse(annualisedRaw) as {
          horizons?: string[];
          fundReturns?: Record<string, string>;
          categoryAvg?: Record<string, string>;
          categoryRank?: Record<string, string>;
        };
        const horizons = parsed.horizons || ["1Y", "3Y", "5Y"];
        rankings = horizons.map((h) => ({
          horizon: h,
          fundReturn: parsed.fundReturns?.[h] || "--",
          categoryAvg: parsed.categoryAvg?.[h] || "--",
          categoryRank: parsed.categoryRank?.[h] || "--",
        }));
      } catch {
        rankings = [];
      }
    }

    let advancedRatios: WatchlistAdvancedRatios | null = null;
    const ratiosRaw =
      analytics?.advancedRatiosData || fallbackRankings?.advancedRatiosData;
    if (ratiosRaw) {
      try {
        advancedRatios = JSON.parse(ratiosRaw) as WatchlistAdvancedRatios;
      } catch {
        advancedRatios = null;
      }
    }

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

    let marketCap: WatchlistMarketCapSplit | null = null;
    // Prioritize Value Research Online for market cap split (exact SEBI categorization & avg market cap)
    if (
      vroPortfolio?.marketCap &&
      ((vroPortfolio.marketCap.largeCap ?? 0) > 0 ||
        (vroPortfolio.marketCap.midCap ?? 0) > 0 ||
        (vroPortfolio.marketCap.smallCap ?? 0) > 0)
    ) {
      marketCap = {
        largeCap: vroPortfolio.marketCap.largeCap ?? 0,
        midCap: vroPortfolio.marketCap.midCap ?? 0,
        smallCap: vroPortfolio.marketCap.smallCap ?? 0,
        avgMktCapCr: vroPortfolio.marketCap.avgMktCapCr ?? null,
      };
    } else {
      const capRaw =
        analytics?.marketCapData || fallbackRankings?.marketCapData;
      if (capRaw) {
        try {
          marketCap = JSON.parse(capRaw) as WatchlistMarketCapSplit;
        } catch {
          marketCap = null;
        }
      }
    }

    let assetAllocation: WatchlistAssetAllocation | null = null;
    const allocRaw =
      analytics?.assetAllocationData || fallbackRankings?.assetAllocationData;
    if (allocRaw) {
      try {
        assetAllocation = JSON.parse(allocRaw) as WatchlistAssetAllocation;
      } catch {
        assetAllocation = null;
      }
    }

    let topHoldings: WatchlistTopHolding[] | null = null;
    if (analytics?.topHoldingsData) {
      try {
        topHoldings = JSON.parse(
          analytics.topHoldingsData
        ) as WatchlistTopHolding[];
      } catch {
        topHoldings = null;
      }
    }

    let exitLoadTax: WatchlistExitLoad | null = null;
    const exitRaw =
      analytics?.exitLoadTaxData || fallbackRankings?.exitLoadTaxData;
    if (exitRaw) {
      try {
        exitLoadTax = JSON.parse(exitRaw) as WatchlistExitLoad;
      } catch {
        exitLoadTax = null;
      }
    }

    const expenseRatio =
      s.expenseRatio !== null && s.expenseRatio !== undefined
        ? s.expenseRatio
        : fallbackRankings?.expenseRatio !== null &&
            fallbackRankings?.expenseRatio !== undefined
          ? Number(fallbackRankings.expenseRatio)
          : null;

    // Track KPI metrics
    if (
      returns.return1Y !== null &&
      (!top1Y || returns.return1Y > top1Y.return1Y)
    ) {
      top1Y = {
        schemeCode: s.schemeCode,
        schemeName: s.schemeName,
        return1Y: returns.return1Y,
      };
    }

    if (
      expenseRatio !== null &&
      expenseRatio > 0 &&
      (!lowestExp || expenseRatio < lowestExp.expenseRatio)
    ) {
      lowestExp = {
        schemeCode: s.schemeCode,
        schemeName: s.schemeName,
        expenseRatio,
      };
    }

    if (returns.return3Y !== null) {
      total3YReturnSum += returns.return3Y;
      countWith3Y++;
    }

    items.push({
      id: s.id,
      schemeCode: s.schemeCode,
      schemeName: s.schemeName,
      fundHouse: s.fundHouse || null,
      category: normalizeWatchlistCategory(s.category) || null,
      schemeType: s.schemeType || null,
      isin: s.isin || null,
      launchDate: s.launchDate || null,
      aumCr: s.aumCr || null,
      expenseRatio,
      exitLoad: s.exitLoad || exitLoadTax?.exitLoad || null,
      fundManager: s.fundManager || null,
      benchmarkCode: s.benchmarkCode || null,
      benchmarkName: s.benchmarkName || null,
      growwSlug: s.growwSlug || fallbackRankings?.growwSlug || null,
      riskRating: s.riskRating || null,
      minLumpsum: s.minLumpsum || null,
      minSip: s.minSip || null,
      targetDipPct: s.targetDipPct || null,
      targetNav: s.targetNav || null,
      notes: s.notes || null,
      lastFetchedAt: meta?.lastFetchedAt || null,
      currentNav,
      prevNav,
      oneDayChangePct,
      athNav,
      athDate,
      drawdownPct,
      daysSinceAth: athMetrics.daysSinceAth,
      lumpsumSignal,
      returns,
      rankings,
      advancedRatios,
      marketCap,
      assetAllocation,
      topHoldings,
      exitLoadTax,
      vroRisk,
      vroReturns,
      vroPortfolio,
    });
  }

  const average3YReturn =
    countWith3Y > 0
      ? Math.round((total3YReturnSum / countWith3Y) * 100) / 100
      : null;

  const result: WatchlistDashboardData = {
    summary: {
      totalFunds: items.length,
      top1YFund: top1Y,
      lowestExpenseFund: lowestExp,
      deepDipsCount,
      correctionsCount,
      average3YReturn,
    },
    items,
    categories: Array.from(categoriesSet).sort(),
    asOfDate:
      dbNavMeta[0]?.lastNavDate || new Date().toISOString().slice(0, 10),
  };

  watchlistCache = { data: result, timestamp: Date.now() };
  return result;
}

/**
 * Adds a fund to the watchlist by scheme code:
 * 1. Fetches scheme details and daily NAV from MFAPI
 * 2. Computes ATH and stores into watchlist_schemes & watchlist_scheme_nav_cache_meta
 * 3. Batch inserts historical NAVs into watchlist_scheme_nav_history
 * 4. Triggers Groww rankings sync asynchronously
 */
export async function addFundToWatchlist(
  input: WatchlistAddFundInput
): Promise<{ success: boolean; error?: string }> {
  await ensureWatchlistTables();
  clearWatchlistCache();

  const code = input.schemeCode.trim();
  if (!code) {
    return { success: false, error: "AMFI Scheme Code is required" };
  }

  try {
    // 1. Fetch full scheme details and historical NAVs from MFAPI
    const mfRes = await fetchMfDetails(code);
    if (!mfRes.success || !mfRes.data) {
      return {
        success: false,
        error:
          mfRes.error ||
          `Failed to fetch details for AMFI scheme code ${code}. Please verify the code.`,
      };
    }

    const { meta: mfMeta, data: navPoints } = mfRes.data;
    const resolvedName =
      input.schemeName || mfMeta.scheme_name || `Scheme ${code}`;
    const fundHouse = input.fundHouse || mfMeta.fund_house || null;
    const category =
      normalizeWatchlistCategory(input.category || mfMeta.scheme_category) ||
      null;
    const schemeType = input.schemeType || mfMeta.scheme_type || null;
    const isin = mfMeta.isin_growth || mfMeta.isin_div_reinvestment || null;

    // 2. Parse and compute ATH and drawdown from historical NAVs
    const sortedNavs: Array<{ date: string; nav: number }> = [];
    let athNav = 0;
    let athDate = "";

    for (const p of navPoints) {
      const navVal = parseFloat(p.nav);
      if (isNaN(navVal) || navVal <= 0) continue;

      // Date format from MFAPI is "DD-MM-YYYY"
      const parts = p.date.split("-");
      const isoDate =
        parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.date;

      sortedNavs.push({ date: isoDate, nav: navVal });

      if (navVal > athNav) {
        athNav = navVal;
        athDate = isoDate;
      }
    }

    // Sort chronologically ascending
    sortedNavs.sort((a, b) => a.date.localeCompare(b.date));

    const latestNavPoint =
      sortedNavs.length > 0 ? sortedNavs[sortedNavs.length - 1] : null;
    const prevNavPoint =
      sortedNavs.length > 1 ? sortedNavs[sortedNavs.length - 2] : null;

    const currentNav = latestNavPoint ? latestNavPoint.nav : 0;
    const prevNav = prevNavPoint ? prevNavPoint.nav : null;
    const oneDayChangePct =
      prevNav && prevNav > 0
        ? Math.round(((currentNav - prevNav) / prevNav) * 10000) / 100
        : null;

    const drawdownPct =
      athNav > 0
        ? Math.round(((athNav - currentNav) / athNav) * 10000) / 100
        : 0;

    const firstNavDate = sortedNavs[0]?.date || null;
    const lastNavDate = latestNavPoint?.date || null;
    const nowIso = new Date().toISOString();

    // 3. Upsert scheme in watchlist_schemes
    await db
      .insert(watchlistSchemes)
      .values({
        schemeCode: code,
        schemeName: resolvedName,
        fundHouse,
        category,
        schemeType,
        isin,
        launchDate: firstNavDate,
        targetDipPct: input.targetDipPct || 10.0,
        targetNav: input.targetNav || null,
        notes: input.notes || null,
      })
      .onConflictDoUpdate({
        target: watchlistSchemes.schemeCode,
        set: {
          schemeName: resolvedName,
          fundHouse,
          category,
          schemeType,
          isin,
          launchDate: sql`COALESCE(${watchlistSchemes.launchDate}, ${firstNavDate})`,
          targetDipPct: input.targetDipPct || 10.0,
          targetNav: input.targetNav || null,
          notes: input.notes || null,
          updatedAt: new Date(),
        },
      });

    // 4. Upsert watchlist_scheme_nav_cache_meta
    await db
      .insert(watchlistSchemeNavCacheMeta)
      .values({
        schemeCode: code,
        schemeName: resolvedName,
        fundHouse,
        category,
        lastFetchedAt: nowIso,
        firstNavDate,
        lastNavDate,
        lastNav: currentNav,
        prevNav,
        oneDayChangePct,
        athNav,
        athDate,
        drawdownPct,
      })
      .onConflictDoUpdate({
        target: watchlistSchemeNavCacheMeta.schemeCode,
        set: {
          schemeName: resolvedName,
          fundHouse,
          category,
          lastFetchedAt: nowIso,
          firstNavDate,
          lastNavDate,
          lastNav: currentNav,
          prevNav,
          oneDayChangePct,
          athNav,
          athDate,
          drawdownPct,
          updatedAt: new Date(),
        },
      });

    // 5. Batch insert historical NAV points
    if (sortedNavs.length > 0) {
      // Chunk inserts in batches of 500
      const CHUNK_SIZE = 500;
      for (let i = 0; i < sortedNavs.length; i += CHUNK_SIZE) {
        const chunk = sortedNavs.slice(i, i + CHUNK_SIZE).map((p) => ({
          schemeCode: code,
          date: p.date,
          nav: p.nav,
          fetchedAt: nowIso,
        }));

        await db
          .insert(watchlistSchemeNavHistory)
          .values(chunk)
          .onConflictDoUpdate({
            target: [
              watchlistSchemeNavHistory.schemeCode,
              watchlistSchemeNavHistory.date,
            ],
            set: {
              nav: sql`EXCLUDED.nav`,
              fetchedAt: nowIso,
              updatedAt: new Date(),
            },
          });
      }
    }

    // 6. Concurrently trigger Groww rankings & Value Research Online auto-discovery & sync
    let syncError: string | undefined;
    try {
      const [growwRes, vroRes] = await Promise.allSettled([
        syncSchemeCategoryRankings(code),
        syncVroFundData(code),
      ]);
      await populateWatchlistSchemeMetadata(code);

      const syncErrors: string[] = [];
      if (growwRes.status === "rejected") {
        syncErrors.push(
          `Groww: ${growwRes.reason instanceof Error ? growwRes.reason.message : String(growwRes.reason)}`
        );
      }

      if (vroRes.status === "rejected") {
        syncErrors.push(
          `VRO: ${vroRes.reason instanceof Error ? vroRes.reason.message : String(vroRes.reason)}`
        );
      } else if (vroRes.value && !vroRes.value.success && vroRes.value.error) {
        syncErrors.push(`VRO: ${vroRes.value.error}`);
      }

      if (syncErrors.length > 0) {
        syncError = syncErrors.join("; ");
      }
    } catch (syncErr) {
      console.warn(
        `[WatchlistService] Analytics sync warning for ${code}:`,
        syncErr
      );
      syncError = syncErr instanceof Error ? syncErr.message : String(syncErr);
    }

    return { success: true, error: syncError };
  } catch (err) {
    console.error(`[WatchlistService] Error adding fund ${code}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Removes a fund from the watchlist and cleans up associated tables
 */
export async function removeFundFromWatchlist(
  schemeCode: string
): Promise<{ success: boolean; error?: string }> {
  await ensureWatchlistTables();
  clearWatchlistCache();

  const cleanCode = schemeCode
    .replace(/^w_/, "")
    .replace(/^sold_/, "")
    .trim();
  const codes = Array.from(new Set([schemeCode.trim(), cleanCode]));

  try {
    await Promise.all([
      db
        .delete(watchlistSchemes)
        .where(inArray(watchlistSchemes.schemeCode, codes)),
      db
        .delete(watchlistSchemeNavCacheMeta)
        .where(inArray(watchlistSchemeNavCacheMeta.schemeCode, codes)),
      db
        .delete(watchlistSchemeNavHistory)
        .where(inArray(watchlistSchemeNavHistory.schemeCode, codes)),
      db
        .delete(watchlistFundAnalytics)
        .where(inArray(watchlistFundAnalytics.schemeCode, codes)),
    ]);
    return { success: true };
  } catch (err) {
    console.error(`[WatchlistService] Error removing fund ${schemeCode}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Refreshes live NAV and Groww analytics for a single watchlist fund
 */
export async function refreshWatchlistFund(
  schemeCode: string
): Promise<{ success: boolean; error?: string }> {
  clearWatchlistCache();
  try {
    const existing = await db.query.watchlistSchemes.findFirst({
      where: eq(watchlistSchemes.schemeCode, schemeCode),
    });
    if (!existing) {
      return { success: false, error: "Fund not found in watchlist" };
    }

    return await addFundToWatchlist({
      schemeCode,
      schemeName: existing.schemeName,
      fundHouse: existing.fundHouse,
      category: existing.category,
      targetDipPct: existing.targetDipPct,
      targetNav: existing.targetNav,
      notes: existing.notes,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Synchronizes and backfills metadata in watchlist_schemes from cache and analytics tables
 */
async function populateWatchlistSchemeMetadata(
  targetSchemeCode?: string
): Promise<void> {
  const schemes = targetSchemeCode
    ? await db
        .select()
        .from(watchlistSchemes)
        .where(eq(watchlistSchemes.schemeCode, targetSchemeCode))
    : await db.select().from(watchlistSchemes);

  for (const s of schemes) {
    const code = s.schemeCode;

    const [navMeta, rankings] = await Promise.all([
      db.query.watchlistSchemeNavCacheMeta.findFirst({
        where: eq(watchlistSchemeNavCacheMeta.schemeCode, code),
      }),
      db.query.schemeCategoryRankings.findFirst({
        where: eq(schemeCategoryRankings.schemeCode, code),
      }),
    ]);

    const updates: Partial<typeof watchlistSchemes.$inferInsert> = {};

    if (!s.launchDate && navMeta?.firstNavDate) {
      updates.launchDate = navMeta.firstNavDate;
    }

    if (rankings) {
      if (!s.growwSlug && rankings.growwSlug)
        updates.growwSlug = rankings.growwSlug;
      if (s.expenseRatio === null && rankings.expenseRatio !== null) {
        updates.expenseRatio = rankings.expenseRatio;
      }

      if (rankings.exitLoadTaxData) {
        try {
          const parsed = JSON.parse(rankings.exitLoadTaxData);
          if (!s.exitLoad && parsed.exitLoad)
            updates.exitLoad = parsed.exitLoad;
        } catch {}
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db
        .update(watchlistSchemes)
        .set(updates)
        .where(eq(watchlistSchemes.schemeCode, code));
    }
  }
}

/**
 * Fetches single watchlist fund details for the unified `/fund/w_[id]` view
 */
export async function getWatchlistSchemeDetails(identifier: string): Promise<{
  scheme: (typeof watchlistSchemes)["$inferSelect"];
  navHistory: Array<{ date: string; nav: number }>;
  navMeta: (typeof watchlistSchemeNavCacheMeta)["$inferSelect"] | null;
  analytics: (typeof watchlistFundAnalytics)["$inferSelect"] | null;
} | null> {
  await ensureWatchlistTables();

  const cleanId = identifier.replace(/^w_/, "").trim();
  const numericId = parseInt(cleanId, 10);
  const whereClause = !isNaN(numericId)
    ? or(
        eq(watchlistSchemes.schemeCode, cleanId),
        eq(watchlistSchemes.id, numericId)
      )
    : eq(watchlistSchemes.schemeCode, cleanId);

  // If cleanId is likely the AMFI scheme code (or string identifier), we parallelize scheme lookup,
  // historical NAV rows, nav metadata, and fund analytics into a single concurrent Promise.all batch!
  const isLikelySchemeCode = /^\d{5,7}$/.test(cleanId) || isNaN(numericId);

  if (isLikelySchemeCode) {
    const [scheme, navRows, navMeta, analytics] = await Promise.all([
      db.query.watchlistSchemes.findFirst({
        where: whereClause,
      }),
      db
        .select({
          date: watchlistSchemeNavHistory.date,
          nav: watchlistSchemeNavHistory.nav,
        })
        .from(watchlistSchemeNavHistory)
        .where(eq(watchlistSchemeNavHistory.schemeCode, cleanId))
        .orderBy(asc(watchlistSchemeNavHistory.date)),
      db.query.watchlistSchemeNavCacheMeta.findFirst({
        where: eq(watchlistSchemeNavCacheMeta.schemeCode, cleanId),
      }),
      db.query.watchlistFundAnalytics.findFirst({
        where: eq(watchlistFundAnalytics.schemeCode, cleanId),
      }),
    ]);

    if (!scheme) return null;

    if (scheme.schemeCode === cleanId) {
      return {
        scheme,
        navHistory: navRows,
        navMeta: navMeta || null,
        analytics: analytics || null,
      };
    }

    // Rare fallback if cleanId was numeric ID and differed from scheme.schemeCode
    const schemeCode = scheme.schemeCode;
    const [fallbackNavRows, fallbackNavMeta, fallbackAnalytics] =
      await Promise.all([
        db
          .select({
            date: watchlistSchemeNavHistory.date,
            nav: watchlistSchemeNavHistory.nav,
          })
          .from(watchlistSchemeNavHistory)
          .where(eq(watchlistSchemeNavHistory.schemeCode, schemeCode))
          .orderBy(asc(watchlistSchemeNavHistory.date)),
        db.query.watchlistSchemeNavCacheMeta.findFirst({
          where: eq(watchlistSchemeNavCacheMeta.schemeCode, schemeCode),
        }),
        db.query.watchlistFundAnalytics.findFirst({
          where: eq(watchlistFundAnalytics.schemeCode, schemeCode),
        }),
      ]);

    return {
      scheme,
      navHistory: fallbackNavRows,
      navMeta: fallbackNavMeta || null,
      analytics: fallbackAnalytics || null,
    };
  }

  // Fallback for short internal integer IDs (e.g. "1")
  const scheme = await db.query.watchlistSchemes.findFirst({
    where: whereClause,
  });

  if (!scheme) return null;
  const schemeCode = scheme.schemeCode;

  const [navRows, navMeta, analytics] = await Promise.all([
    db
      .select({
        date: watchlistSchemeNavHistory.date,
        nav: watchlistSchemeNavHistory.nav,
      })
      .from(watchlistSchemeNavHistory)
      .where(eq(watchlistSchemeNavHistory.schemeCode, schemeCode))
      .orderBy(asc(watchlistSchemeNavHistory.date)),
    db.query.watchlistSchemeNavCacheMeta.findFirst({
      where: eq(watchlistSchemeNavCacheMeta.schemeCode, schemeCode),
    }),
    db.query.watchlistFundAnalytics.findFirst({
      where: eq(watchlistFundAnalytics.schemeCode, schemeCode),
    }),
  ]);

  return {
    scheme,
    navHistory: navRows,
    navMeta: navMeta || null,
    analytics: analytics || null,
  };
}

/**
 * Retrieves complete details for the dedicated Watchlist Fund Details page (/watchlist/[id]).
 * Wrapped in React cache() for request deduplication between generateMetadata and Page rendering.
 */
export const getWatchlistFullDetails = cache(
  async (identifier: string): Promise<WatchlistFundDetails | null> => {
    const cleanId = identifier.replace(/^w_/, "").trim();
    const cached =
      watchlistDetailsCache.get(cleanId) ||
      watchlistDetailsCache.get(identifier);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const details = await getWatchlistSchemeDetails(identifier);
    if (!details) return null;

    const { scheme, navHistory, navMeta, analytics } = details;
    const schemeCode = scheme.schemeCode;

    // Compute returns and ATH drawdown metrics from NAV history
    const returns = calculateHistoricalReturns(navHistory);

    const currentNav =
      navMeta?.lastNav ??
      (navHistory.length > 0 ? navHistory[navHistory.length - 1].nav : 0);
    const prevNav =
      navMeta?.prevNav ??
      (navHistory.length > 1 ? navHistory[navHistory.length - 2].nav : null);
    const oneDayChangePct =
      navMeta?.oneDayChangePct ??
      (prevNav && prevNav > 0
        ? Math.round(((currentNav - prevNav) / prevNav) * 10000) / 100
        : null);

    let rawAthNav = navMeta?.athNav ?? 0;
    let rawAthDate = navMeta?.athDate ?? "";
    if (rawAthNav === 0 && navHistory.length > 0) {
      for (const h of navHistory) {
        if (h.nav > rawAthNav) {
          rawAthNav = h.nav;
          rawAthDate = h.date;
        }
      }
    }
    const athNav = rawAthNav > 0 ? rawAthNav : currentNav;
    const athDate = rawAthDate || navMeta?.lastNavDate || "";
    const athMetrics = computeFundAthMetrics(currentNav, athNav, athDate);
    const drawdownPct =
      navMeta?.drawdownPct ??
      (athNav > 0
        ? Math.round(((athNav - currentNav) / athNav) * 10000) / 100
        : 0);
    const lumpsumSignal = resolveLumpsumSignal(drawdownPct);

    // Parse Groww Analytics JSON
    let rankings: WatchlistCategoryRanking[] = [];
    let advancedRatios: WatchlistAdvancedRatios | null = null;
    let marketCap: WatchlistMarketCapSplit | null = null;
    let assetAllocation: WatchlistAssetAllocation | null = null;
    let topHoldings: WatchlistTopHolding[] | null = null;
    let exitLoadTax: WatchlistExitLoad | null = null;

    if (analytics) {
      if (analytics.annualisedData) {
        try {
          const parsed = JSON.parse(analytics.annualisedData);
          if (parsed.horizons && Array.isArray(parsed.horizons)) {
            rankings = parsed.horizons.map((h: string) => ({
              horizon: h,
              fundReturn: parsed.fundReturns?.[h] ?? "--",
              categoryAvg: parsed.categoryAvg?.[h] ?? "--",
              categoryRank: parsed.categoryRank?.[h] ?? "--",
            }));
          }
        } catch {}
      }

      if (analytics.advancedRatiosData) {
        try {
          advancedRatios = JSON.parse(analytics.advancedRatiosData);
        } catch {}
      }

      if (analytics.assetAllocationData) {
        try {
          assetAllocation = JSON.parse(analytics.assetAllocationData);
        } catch {}
      }

      if (analytics.topHoldingsData) {
        try {
          topHoldings = JSON.parse(analytics.topHoldingsData);
        } catch {}
      }

      if (analytics.exitLoadTaxData) {
        try {
          exitLoadTax = JSON.parse(analytics.exitLoadTaxData);
        } catch {}
      }
    }

    // Parse Value Research Online JSON
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

    // Prioritize Value Research Online for Market Cap Split (exact SEBI categorization & avg market cap); fallback to Groww
    if (
      vroPortfolio?.marketCap &&
      ((vroPortfolio.marketCap.largeCap ?? 0) > 0 ||
        (vroPortfolio.marketCap.midCap ?? 0) > 0 ||
        (vroPortfolio.marketCap.smallCap ?? 0) > 0)
    ) {
      marketCap = {
        largeCap: vroPortfolio.marketCap.largeCap ?? 0,
        midCap: vroPortfolio.marketCap.midCap ?? 0,
        smallCap: vroPortfolio.marketCap.smallCap ?? 0,
        avgMktCapCr: vroPortfolio.marketCap.avgMktCapCr ?? null,
      };
    } else if (analytics?.marketCapData) {
      try {
        marketCap = JSON.parse(analytics.marketCapData);
      } catch {}
    }

    // Resolve Benchmark & generate initial chart data (1Y)
    const benchmarkCode =
      scheme.benchmarkCode ||
      (await getBenchmarkCodeForCategory(scheme.category, scheme.schemeName));

    const [benchmarkName, benchmarkFundName, benchRes, categoryRatios] =
      await Promise.all([
        scheme.benchmarkName
          ? Promise.resolve(scheme.benchmarkName)
          : getBenchmarkNameForCode(benchmarkCode),
        getBenchmarkFundNameForCode(benchmarkCode),
        getBenchmarkHistory(benchmarkCode),
        scheme.category
          ? getBenchmarkCategoryRatios(scheme.category, schemeCode)
          : Promise.resolve(null),
      ]);
    const benchNavHistory = benchRes?.data || [];

    const earliestFundDateStr =
      navHistory.length > 0 ? navHistory[0].date : null;
    let earliestBenchDateStr: string | null = null;
    if (benchNavHistory.length > 0) {
      const sortedBench = [...benchNavHistory].sort(
        (a, b) =>
          parseHistoryDate(a.date).getTime() -
          parseHistoryDate(b.date).getTime()
      );
      earliestBenchDateStr = sortedBench[0].date;
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const asOfDate =
      navMeta?.lastNavDate ||
      (navHistory.length > 0
        ? navHistory[navHistory.length - 1].date
        : new Date().toISOString().slice(0, 10));

    const fundNavFormatted = navHistory.map((h) => ({
      date: h.date,
      nav: String(h.nav),
    }));

    const benchNavFormatted = benchNavHistory.map((h) => ({
      date: h.date,
      nav: String(h.nav),
    }));

    const initialChartData = generateFactsheetChartData(
      fundNavFormatted,
      benchNavHistory,
      asOfDate,
      [],
      oneYearAgo
    );

    const rollingReturns =
      navHistory.length > 0
        ? calculateRollingReturnsSummary(
            fundNavFormatted,
            benchNavFormatted,
            benchmarkName || "Benchmark",
            returns.sinceInception
          )
        : null;

    const result: WatchlistFundDetails = {
      schemeCode,
      schemeName: scheme.schemeName,
      fundHouse: scheme.fundHouse || null,
      category: normalizeWatchlistCategory(scheme.category) || null,
      schemeType: scheme.schemeType || null,
      isin: scheme.isin || null,
      launchDate: scheme.launchDate || null,
      aumCr: scheme.aumCr || null,
      expenseRatio: scheme.expenseRatio || null,
      exitLoad: scheme.exitLoad || exitLoadTax?.exitLoad || null,
      fundManager: scheme.fundManager || null,
      benchmarkCode,
      benchmarkName,
      benchmarkFundName,
      earliestFundDateStr,
      earliestBenchDateStr,
      initialChartData,
      asOfDate,
      growwSlug: scheme.growwSlug || null,
      vroUrl: scheme.vroUrl || null,
      currentNav,
      prevNav,
      oneDayChangePct,
      athNav,
      athDate,
      drawdownPct,
      daysSinceAth: athMetrics.daysSinceAth,
      lumpsumSignal,
      returns,
      rankings,
      advancedRatios,
      marketCap,
      assetAllocation,
      topHoldings,
      exitLoadTax,
      vroRisk,
      vroReturns,
      vroPortfolio,
      lastGrowwSyncedAt: analytics?.lastSyncedAt || null,
      lastVroSyncedAt: analytics?.lastVroSyncedAt || null,
      navHistory: fundNavFormatted,
      benchNavHistory: benchNavFormatted,
      categoryRatios: categoryRatios || null,
      rollingReturns,
    };

    watchlistDetailsCache.set(cleanId, { data: result, timestamp: Date.now() });
    watchlistDetailsCache.set(schemeCode, {
      data: result,
      timestamp: Date.now(),
    });
    return result;
  }
);

/**
 * Triggers real-time Playwright scraper to refresh Value Research Online analytics
 */
export async function syncVroFundData(
  schemeCode: string,
  vroUrl?: string
): Promise<{ success: boolean; error?: string }> {
  if (!schemeCode) return { success: false, error: "Scheme code is required" };
  const cleanCode = schemeCode
    .replace(/^w_/, "")
    .replace(/^sold_/, "")
    .trim();

  try {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "scrape_vro_fund.py"
    );
    const pythonBin = "python3";
    const args = [scriptPath, "--scheme-code", cleanCode];
    if (vroUrl && vroUrl.trim()) {
      args.push("--vro-url", vroUrl.trim());
    }

    const { stdout, stderr } = await execFileAsync(pythonBin, args, {
      timeout: 60000,
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    if (stderr) {
      console.warn(`[syncVroFundData] stderr for ${cleanCode}:`, stderr);
    }

    try {
      const output = JSON.parse(stdout.trim().split("\n").pop() || "{}");
      if (!output.success) {
        return {
          success: false,
          error: output.error || "Failed to parse Value Research Online data.",
        };
      }
    } catch {
      // stdout may have log lines before json
    }

    clearWatchlistCache();
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[syncVroFundData] Execution error for ${cleanCode}:`, err);
    return {
      success: false,
      error: `Failed to scrape Value Research Online: ${message}`,
    };
  }
}

/**
 * Updates the stored Value Research Online URL for a watchlist scheme
 */
export async function updateWatchlistVroUrl(
  schemeCode: string,
  vroUrl: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = schemeCode.replace(/^w_/, "").trim();
  try {
    await db
      .update(watchlistSchemes)
      .set({ vroUrl: vroUrl.trim(), updatedAt: new Date() })
      .where(eq(watchlistSchemes.schemeCode, cleanCode));
    clearWatchlistCache();
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
