import { db } from "../db/db";
import {
  zerodhaReports,
  zerodhaHoldings,
  zerodhaSchemes,
  zerodhaSchemeNavCacheMeta,
  zerodhaSchemeNavHistory,
} from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { ZerodhaHoldingParsed } from "./zerodhaParser";
import {
  getSchemeHistoryForDbCode,
  getBenchmarkHistory,
  findClosestNav,
} from "./alpha";
import { fetchStockHistory } from "./stockApi";

import {
  autoMapScheme,
  fetchMfDetails,
  MfDetailsResponse,
  isSpecializedFundSchemeCode,
} from "./mfApi";

export interface ZerodhaDashboardData {
  reportsList: {
    id: number;
    asOfDate: string;
    filename: string;
    uploadedAt: string;
  }[];
  selectedReport: {
    id: number;
    asOfDate: string;
    filename: string;
    uploadedAt: string;
  } | null;
  holdings: {
    id: number;
    reportId: number | null;
    holdingType: string;
    symbol: string;
    isin: string;
    sector: string | null;
    instrumentType: string | null;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    investedValue: number;
    currentValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
  }[];
  totals: {
    invested: number;
    currentValue: number;
    gain: number;
    absoluteReturn: number;
    stocksInvested: number;
    stocksCurrentValue: number;
    stocksGain: number;
    fundsInvested: number;
    fundsCurrentValue: number;
    fundsGain: number;
  };
  sectorAllocation: { name: string; value: number }[];
  categoryAllocation: { name: string; value: number }[];
  assetSplit: { name: string; value: number }[];
  timelineData: {
    date: string;
    equity: number;
    mutualFunds: number;
    nifty50: number;
    equityReturn: number;
    fundsReturn: number;
    niftyReturn: number;
  }[];
}

export async function saveZerodhaHoldingsReport(
  asOfDate: string,
  filename: string,
  holdings: ZerodhaHoldingParsed[]
): Promise<number> {
  // 1. Check if report for this date already exists. If yes, overwrite (delete old one)
  const existing = await db.query.zerodhaReports.findFirst({
    where: eq(zerodhaReports.asOfDate, asOfDate),
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
    })
    .returning();

  // 3. Register mutual fund schemes and stocks in zerodhaSchemes if they don't exist
  if (holdings.length > 0) {
    for (const h of holdings) {
      const schemeName = h.symbol;
      let scheme = await db.query.zerodhaSchemes.findFirst({
        where: eq(zerodhaSchemes.name, schemeName),
      });

      if (!scheme) {
        if (h.holdingType === "mutual_fund") {
          const apiMapping = await autoMapScheme(schemeName);
          await db.insert(zerodhaSchemes).values({
            name: schemeName,
            category: h.instrumentType || "Mutual Fund",
            schemeCodeApi: apiMapping ? apiMapping.schemeCode : null,
            mappedAt: apiMapping ? new Date().toISOString() : null,
          });
        } else {
          // For stock, default to symbol.NS, except map known edge cases
          let ticker = `${h.symbol}.NS`;
          if (h.symbol === "SCL-X") ticker = "539574.BO";
          else if (h.symbol === "TMCV") ticker = "TMCV.NS";
          else if (h.symbol === "TATACAP") ticker = "TATACAP.NS";

          await db.insert(zerodhaSchemes).values({
            name: schemeName,
            category: "Equity Stock",
            schemeCodeApi: ticker,
            mappedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  await db.insert(zerodhaHoldings).values(
    holdings.map((h) => ({
      reportId: newReport.id,
      holdingType: h.holdingType,
      symbol: h.symbol,
      isin: h.isin,
      sector: h.sector,
      instrumentType: h.instrumentType,
      quantity: h.quantity,
      averagePrice: h.averagePrice,
      currentPrice: h.currentPrice,
      investedValue: h.investedValue,
      currentValue: h.currentValue,
      unrealizedPnl: h.unrealizedPnl,
      unrealizedPnlPct: h.unrealizedPnlPct,
    }))
  );

  return newReport.id;
}

export async function deleteZerodhaHoldingsReport(
  reportId: number
): Promise<void> {
  await db.delete(zerodhaReports).where(eq(zerodhaReports.id, reportId));
}

export async function getZerodhaReports() {
  return await db.query.zerodhaReports.findMany({
    orderBy: [desc(zerodhaReports.asOfDate)],
  });
}

function calculateFundMetrics(
  purchaseNav: number,
  currentNav: number,
  asOfDate: string,
  fundNavHistory: { date: string; nav: string }[]
): { xirr: number; cagr: number } {
  if (
    !fundNavHistory.length ||
    !purchaseNav ||
    !currentNav ||
    purchaseNav <= 0 ||
    currentNav <= 0
  ) {
    return { xirr: 0, cagr: 0 };
  }

  const parseApiDate = (s: string) => {
    const [dd, mm, yyyy] = s.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  const sorted = [...fundNavHistory]
    .map((p) => ({ date: parseApiDate(p.date), nav: parseFloat(p.nav) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let bestEntry = sorted[0];
  let bestDiff = Math.abs(sorted[0].nav - purchaseNav);
  for (const entry of sorted) {
    const diff = Math.abs(entry.nav - purchaseNav);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestEntry = entry;
    }
  }

  const investDate = bestEntry.date;
  const exitDate = new Date(asOfDate);
  const msDiff = exitDate.getTime() - investDate.getTime();
  const years = msDiff / (365.25 * 24 * 60 * 60 * 1000);

  if (years <= 0) {
    return { xirr: 0, cagr: 0 };
  }

  const cagrValue = (Math.pow(currentNav / purchaseNav, 1 / years) - 1) * 100;
  return {
    xirr: cagrValue,
    cagr: cagrValue,
  };
}

export async function getZerodhaDashboardData(
  reportId?: number
): Promise<ZerodhaDashboardData> {
  const reportsList = await getZerodhaReports();
  if (reportsList.length === 0) {
    return {
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
      },
      sectorAllocation: [],
      categoryAllocation: [],
      assetSplit: [],
      timelineData: [],
    };
  }

  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0];

  const rawHoldings = await db
    .select()
    .from(zerodhaHoldings)
    .where(eq(zerodhaHoldings.reportId, selectedReport.id));

  const schemesList = await db.select().from(zerodhaSchemes);

  const enrichedHoldings = await Promise.all(
    rawHoldings.map(async (h) => {
      if (h.holdingType === "mutual_fund") {
        const scheme = schemesList.find((s) => s.name === h.symbol);
        if (scheme && scheme.schemeCodeApi) {
          const fundDetails = await getZerodhaSchemeHistoryForDbCode(
            scheme.schemeCodeApi
          );
          if (fundDetails && fundDetails.data && fundDetails.data.length > 0) {
            const metrics = calculateFundMetrics(
              h.averagePrice,
              h.currentPrice,
              selectedReport.asOfDate,
              fundDetails.data
            );
            return {
              ...h,
              xirr: metrics.xirr,
              cagr: metrics.cagr,
            };
          }
        }
      } else if (h.holdingType === "equity") {
        const scheme = schemesList.find((s) => s.name === h.symbol);
        const ticker = scheme?.schemeCodeApi || `${h.symbol}.NS`;
        const stockDetails = await getZerodhaStockHistoryForSymbol(ticker);
        if (stockDetails && stockDetails.data && stockDetails.data.length > 0) {
          const metrics = calculateFundMetrics(
            h.averagePrice,
            h.currentPrice,
            selectedReport.asOfDate,
            stockDetails.data
          );
          return {
            ...h,
            xirr: metrics.xirr,
            cagr: metrics.cagr,
          };
        }
      }
      return { ...h, xirr: null, cagr: null };
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

  // Compute timeline data
  const timelineData = [];
  const chronologicalReports = [...reportsList].reverse();

  // Fetch Nifty 50 history (use main db code)
  const niftyDetails = await getBenchmarkHistory("120716");
  const niftyHistory = niftyDetails?.data || [];

  let niftyStartNav = 0;
  let niftyBase = 1000;

  for (const r of chronologicalReports) {
    const snapHoldings = await db
      .select()
      .from(zerodhaHoldings)
      .where(eq(zerodhaHoldings.reportId, r.id));

    let snapStocksInvested = 0;
    let snapStocksCurrentValue = 0;
    let snapFundsInvested = 0;
    let snapFundsCurrentValue = 0;

    for (const h of snapHoldings) {
      if (h.holdingType === "equity") {
        snapStocksInvested += h.investedValue;
        snapStocksCurrentValue += h.currentValue;
      } else {
        snapFundsInvested += h.investedValue;
        snapFundsCurrentValue += h.currentValue;
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
    const totalReturn =
      totalInv > 0 ? ((totalVal - totalInv) / totalInv) * 105 : 0;

    const eqIndex = 1000 * (1 + eqReturn / 100);
    const mfIndex = 1000 * (1 + mfReturn / 100);

    let niftyNav = 10;
    if (niftyHistory.length > 0) {
      niftyNav = findClosestNav(niftyHistory, r.asOfDate);
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

    const formattedDate = new Date(r.asOfDate).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
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
  }

  return {
    reportsList,
    selectedReport,
    holdings,
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
    },
    sectorAllocation,
    categoryAllocation,
    assetSplit,
    timelineData,
  };
}

// In-memory cache for Zerodha scheme history
const zerodhaSchemeHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

export function normaliseSchemeCode(
  code: string | null | undefined
): string | null {
  if (!code) return null;
  const match = code.match(/\d+/);
  return match ? match[0] : null;
}

async function triggerZerodhaNavCacheUpdate(
  schemeCode: string,
  startDate?: string
) {
  try {
    const data = await fetchMfDetails(schemeCode, startDate);
    if (data && data.meta && data.data && data.data.length > 0) {
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
  dbSchemeCode: string
): Promise<MfDetailsResponse | null> {
  const schemeCode = normaliseSchemeCode(dbSchemeCode);
  if (!schemeCode || isSpecializedFundSchemeCode(schemeCode))
    return Promise.resolve(null);

  let cachedPromise = zerodhaSchemeHistoryCache.get(schemeCode);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      // 1. Check if we have cached metadata in PostgreSQL starting with zerodha_
      const cachedMeta = await db.query.zerodhaSchemeNavCacheMeta.findFirst({
        where: eq(zerodhaSchemeNavCacheMeta.schemeCode, schemeCode),
      });

      const now = new Date();
      const cacheAgeLimit = 24 * 60 * 60 * 1000; // 24 hours
      const isFresh =
        cachedMeta &&
        now.getTime() - new Date(cachedMeta.lastFetchedAt).getTime() <
          cacheAgeLimit;

      if (cachedMeta) {
        const history = await db.query.zerodhaSchemeNavHistory.findMany({
          where: eq(zerodhaSchemeNavHistory.schemeCode, schemeCode),
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

        // If not fresh, trigger background SWR fetch
        if (!isFresh) {
          triggerZerodhaNavCacheUpdate(schemeCode, latestDateStr).catch((e) =>
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
      // If no data exists, fetch only the last 3 years to keep payload fast and prevent timeouts
      const nowTime = new Date();
      const threeYearsAgo = new Date(
        nowTime.getFullYear() - 3,
        nowTime.getMonth(),
        nowTime.getDate()
      );
      const threeYearsAgoStr = threeYearsAgo.toISOString().split("T")[0];

      const data = await fetchMfDetails(schemeCode, threeYearsAgoStr);
      if (data && data.meta && data.data && data.data.length > 0) {
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

    zerodhaSchemeHistoryCache.set(schemeCode, cachedPromise);
  }

  return cachedPromise;
}

export async function getZerodhaSchemes() {
  return await db.query.zerodhaSchemes.findMany({
    orderBy: [asc(zerodhaSchemes.name)],
  });
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

// In-memory cache for Zerodha stock history
const zerodhaStockHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

async function triggerZerodhaStockNavCacheUpdate(ticker: string) {
  try {
    const data = await fetchStockHistory(ticker);
    if (data && data.meta && data.data && data.data.length > 0) {
      await db
        .insert(zerodhaSchemeNavCacheMeta)
        .values({
          schemeCode: ticker,
          fundHouse: "Equity",
          schemeType: "Equity",
          schemeCategory: "Stock",
          schemeName: ticker,
          lastFetchedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: zerodhaSchemeNavCacheMeta.schemeCode,
          set: {
            fundHouse: "Equity",
            schemeType: "Equity",
            schemeCategory: "Stock",
            schemeName: ticker,
            lastFetchedAt: new Date().toISOString(),
          },
        });

      const historyValues = data.data.map((p) => ({
        schemeCode: ticker,
        date: p.date,
        nav: parseFloat(p.nav) || 0,
        fetchedAt: new Date().toISOString(),
      }));

      await db
        .delete(zerodhaSchemeNavHistory)
        .where(eq(zerodhaSchemeNavHistory.schemeCode, ticker));

      const chunkSize = 100;
      for (let i = 0; i < historyValues.length; i += chunkSize) {
        const chunk = historyValues.slice(i, i + chunkSize);
        await db.insert(zerodhaSchemeNavHistory).values(chunk);
      }
    }
  } catch (err) {
    console.error(`Failed background cache update for stock ${ticker}:`, err);
  }
}

export function getZerodhaStockHistoryForSymbol(
  ticker: string
): Promise<MfDetailsResponse | null> {
  if (!ticker) return Promise.resolve(null);

  let cachedPromise = zerodhaStockHistoryCache.get(ticker);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      // 1. Check if we have cached metadata in PostgreSQL
      const cachedMeta = await db.query.zerodhaSchemeNavCacheMeta.findFirst({
        where: eq(zerodhaSchemeNavCacheMeta.schemeCode, ticker),
      });

      const now = new Date();
      const cacheAgeLimit = 24 * 60 * 60 * 1000; // 24 hours
      const isFresh =
        cachedMeta &&
        now.getTime() - new Date(cachedMeta.lastFetchedAt).getTime() <
          cacheAgeLimit;

      if (cachedMeta) {
        if (!isFresh) {
          triggerZerodhaStockNavCacheUpdate(ticker).catch((e) =>
            console.error("[SWR BACKGROUND STOCK ERROR]", e)
          );
        }

        const history = await db.query.zerodhaSchemeNavHistory.findMany({
          where: eq(zerodhaSchemeNavHistory.schemeCode, ticker),
        });

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
      const data = await fetchStockHistory(ticker);
      if (data && data.meta && data.data && data.data.length > 0) {
        try {
          await db
            .insert(zerodhaSchemeNavCacheMeta)
            .values({
              schemeCode: ticker,
              fundHouse: "Equity",
              schemeType: "Equity",
              schemeCategory: "Stock",
              schemeName: ticker,
              lastFetchedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: zerodhaSchemeNavCacheMeta.schemeCode,
              set: {
                fundHouse: "Equity",
                schemeType: "Equity",
                schemeCategory: "Stock",
                schemeName: ticker,
                lastFetchedAt: new Date().toISOString(),
              },
            });

          const historyValues = data.data.map((p) => ({
            schemeCode: ticker,
            date: p.date,
            nav: parseFloat(p.nav) || 0,
            fetchedAt: new Date().toISOString(),
          }));

          await db
            .delete(zerodhaSchemeNavHistory)
            .where(eq(zerodhaSchemeNavHistory.schemeCode, ticker));

          const chunkSize = 100;
          for (let i = 0; i < historyValues.length; i += chunkSize) {
            const chunk = historyValues.slice(i, i + chunkSize);
            await db.insert(zerodhaSchemeNavHistory).values(chunk);
          }

          return data;
        } catch (dbErr) {
          console.error(
            `Failed to cache stock history for ${ticker} in DB:`,
            dbErr
          );
          return data;
        }
      }

      return null;
    })();

    zerodhaStockHistoryCache.set(ticker, cachedPromise);
  }

  return cachedPromise;
}
