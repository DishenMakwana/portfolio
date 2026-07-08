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

  // 3. Register mutual fund schemes in zerodhaSchemes if they don't exist and insert holdings
  if (holdings.length > 0) {
    for (const h of holdings) {
      if (h.holdingType === "mutual_fund") {
        const schemeName = h.symbol;
        let scheme = await db.query.zerodhaSchemes.findFirst({
          where: eq(zerodhaSchemes.name, schemeName),
        });

        if (!scheme) {
          const apiMapping = await autoMapScheme(schemeName);
          await db.insert(zerodhaSchemes).values({
            name: schemeName,
            category: h.instrumentType || "Mutual Fund",
            schemeCodeApi: apiMapping ? apiMapping.schemeCode : null,
            mappedAt: apiMapping ? new Date().toISOString() : null,
          });
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
  }

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
    };
  }

  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0];

  const holdings = await db
    .select()
    .from(zerodhaHoldings)
    .where(eq(zerodhaHoldings.reportId, selectedReport.id));

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

async function triggerZerodhaNavCacheUpdate(schemeCode: string) {
  try {
    const data = await fetchMfDetails(schemeCode);
    if (data && data.meta && data.data && data.data.length > 0) {
      await db
        .insert(zerodhaSchemeNavCacheMeta)
        .values({
          schemeCode,
          fundHouse: data.meta.fund_house || "Unknown",
          schemeType: data.meta.scheme_type || "Unknown",
          schemeCategory: data.meta.scheme_category || "Unknown",
          schemeName: data.meta.scheme_name || "Unknown",
          lastFetchedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: zerodhaSchemeNavCacheMeta.schemeCode,
          set: {
            fundHouse: data.meta.fund_house || "Unknown",
            schemeType: data.meta.scheme_type || "Unknown",
            schemeCategory: data.meta.scheme_category || "Unknown",
            schemeName: data.meta.scheme_name || "Unknown",
            lastFetchedAt: new Date().toISOString(),
          },
        });

      const historyValues = data.data.map((p) => ({
        schemeCode,
        date: p.date,
        nav: parseFloat(p.nav) || 0,
        fetchedAt: new Date().toISOString(),
      }));

      await db
        .delete(zerodhaSchemeNavHistory)
        .where(eq(zerodhaSchemeNavHistory.schemeCode, schemeCode));

      const chunkSize = 100;
      for (let i = 0; i < historyValues.length; i += chunkSize) {
        const chunk = historyValues.slice(i, i + chunkSize);
        await db.insert(zerodhaSchemeNavHistory).values(chunk);
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
        // If not fresh, trigger background SWR fetch
        if (!isFresh) {
          triggerZerodhaNavCacheUpdate(schemeCode).catch((e) =>
            console.error("[SWR BACKGROUND ERROR]", e)
          );
        }

        const history = await db.query.zerodhaSchemeNavHistory.findMany({
          where: eq(zerodhaSchemeNavHistory.schemeCode, schemeCode),
        });

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
      const data = await fetchMfDetails(schemeCode);
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
              lastFetchedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: zerodhaSchemeNavCacheMeta.schemeCode,
              set: {
                fundHouse: data.meta.fund_house || "Unknown",
                schemeType: data.meta.scheme_type || "Unknown",
                schemeCategory: data.meta.scheme_category || "Unknown",
                schemeName: data.meta.scheme_name || "Unknown",
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

          // Clear history and batch insert to avoid PG parameter limits
          await db
            .delete(zerodhaSchemeNavHistory)
            .where(eq(zerodhaSchemeNavHistory.schemeCode, schemeCode));

          const chunkSize = 100;
          for (let i = 0; i < historyValues.length; i += chunkSize) {
            const chunk = historyValues.slice(i, i + chunkSize);
            await db.insert(zerodhaSchemeNavHistory).values(chunk);
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
