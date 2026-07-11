import { db } from "../db/db";
import {
  msflReports,
  msflHoldings,
  msflSchemes,
  msflSchemeNavCacheMeta,
  msflSchemeNavHistory,
} from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { fetchStockHistory } from "./stockApi";
import {
  getBenchmarkHistory,
  parseAndSortNavHistory,
  findSyntheticInvestmentEntry,
  calculateCagr,
} from "./alpha";
import type { MfDetailsResponse } from "./mfApi";

export interface MsflBenchmarkReturns {
  benchmarkCode: string;
  benchmarkName: string;
  endDate: string;
  endNav: number;
  return1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
}

export interface MsflInsightsData {
  reportDate: string | null;
  benchmarkReturns: MsflBenchmarkReturns;
  weightedCagr: number | null;
  movers: {
    topGainers: Array<{ symbol: string; returnPct: number; gain: number }>;
    laggards: Array<{ symbol: string; returnPct: number; gain: number }>;
  };
  previousSnapshot: {
    date: string | null;
    investedChange: number;
    currentValueChange: number;
    gainChange: number;
    returnPctChange: number;
  };
}

export interface MsflHoldingData {
  id: number;
  reportId: number | null;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  xirr?: number | null;
  cagr?: number | null;
  alpha?: number | null;
}

export interface MsflDashboardData {
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
  holdings: MsflHoldingData[];
  totals: {
    invested: number;
    currentValue: number;
    gain: number;
    absoluteReturn: number;
  };
  timelineData: {
    date: string;
    portfolioValue: number;
    nifty50: number;
    portfolioReturn: number;
    niftyReturn: number;
  }[];
  insights: MsflInsightsData;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseApiDate(s: string): Date {
  const [dd, mm, yyyy] = s.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseIsoDate(s: string): Date {
  const [yyyy, mm, dd] = s.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function calculateFundMetrics(
  purchaseNav: number,
  currentNav: number,
  asOfDate: string,
  fundNavHistory: { date: string; nav: string }[],
  benchmarkNavHistory?: { date: string; nav: string }[]
): { xirr: number; cagr: number; alpha: number | null } {
  if (!fundNavHistory.length || !currentNav || currentNav <= 0) {
    return { xirr: 0, cagr: 0, alpha: null };
  }

  const parseApiDateLocal = (s: string) => {
    const [dd, mm, yyyy] = s.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  const sorted = parseAndSortNavHistory(fundNavHistory, parseApiDateLocal);
  const entry = findSyntheticInvestmentEntry(purchaseNav, sorted);

  if (!entry) {
    return { xirr: 0, cagr: 0, alpha: null };
  }

  const investDate = entry.date;
  const actualPurchaseNav = entry.nav;
  const exitDate = new Date(asOfDate);
  const msDiff = exitDate.getTime() - investDate.getTime();
  const years = msDiff / (365.25 * 24 * 60 * 60 * 1000);

  if (years <= 0) {
    return { xirr: 0, cagr: 0, alpha: null };
  }

  const cagrValue = calculateCagr(currentNav, actualPurchaseNav, years);

  let alpha: number | null = null;
  if (benchmarkNavHistory && benchmarkNavHistory.length > 0) {
    const sortedBenchmark = benchmarkNavHistory
      .map((p) => ({ date: parseApiDate(p.date), nav: parseFloat(p.nav) }))
      .filter((p) => !isNaN(p.nav) && p.nav > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (sortedBenchmark.length > 0) {
      // Find benchmark price closest to investDate
      let startBenchmarkPrice = sortedBenchmark[0].nav;
      for (let i = sortedBenchmark.length - 1; i >= 0; i--) {
        if (sortedBenchmark[i].date <= investDate) {
          startBenchmarkPrice = sortedBenchmark[i].nav;
          break;
        }
      }

      // Find benchmark price closest to exitDate
      let endBenchmarkPrice = sortedBenchmark[sortedBenchmark.length - 1].nav;
      for (let i = sortedBenchmark.length - 1; i >= 0; i--) {
        if (sortedBenchmark[i].date <= exitDate) {
          endBenchmarkPrice = sortedBenchmark[i].nav;
          break;
        }
      }

      if (startBenchmarkPrice > 0 && endBenchmarkPrice > 0) {
        const benchmarkCagr = calculateCagr(
          endBenchmarkPrice,
          startBenchmarkPrice,
          years
        );
        alpha = cagrValue - benchmarkCagr;
      }
    }
  }

  return {
    xirr: cagrValue,
    cagr: cagrValue,
    alpha,
  };
}

function calculateBenchmarkReturns(
  reportDate: string,
  history: { date: string; nav: string }[]
): MsflBenchmarkReturns {
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

async function getMsflSnapshotTotals(reportId: number) {
  const rows = await db
    .select()
    .from(msflHoldings)
    .where(eq(msflHoldings.reportId, reportId));

  let invested = 0;
  let currentValue = 0;
  for (const r of rows) {
    invested += r.investedValue;
    currentValue += r.currentValue;
  }

  const gain = currentValue - invested;
  const absoluteReturn = invested > 0 ? (gain / invested) * 100 : 0;

  return {
    invested: round2(invested),
    currentValue: round2(currentValue),
    gain: round2(gain),
    absoluteReturn: round2(absoluteReturn),
  };
}

export async function saveMsflHoldingsReport(
  asOfDate: string,
  filename: string,
  holdings: any[]
): Promise<number> {
  const reportResult = await db
    .insert(msflReports)
    .values({
      asOfDate,
      filename,
      uploadedAt: new Date().toISOString(),
    })
    .returning({ id: msflReports.id });

  const reportId = reportResult[0].id;

  const schemesList = await db.select().from(msflSchemes);
  const existingNames = new Set(schemesList.map((s) => s.name));

  // Insert novel schemes with standard Yahoo Finance suffix (.NS)
  for (const h of holdings) {
    if (!existingNames.has(h.symbol)) {
      await db
        .insert(msflSchemes)
        .values({
          name: h.symbol,
          category: "Stock",
          schemeCodeApi: `${h.symbol}.NS`,
          mappedAt: new Date().toISOString(),
        })
        .onConflictDoNothing();
      existingNames.add(h.symbol);
    }
  }

  const holdingsToSave = holdings.map((h) => ({
    reportId,
    symbol: h.symbol,
    quantity: h.quantity,
    averagePrice: h.averagePrice,
    currentPrice: h.currentPrice,
    investedValue: h.investedValue,
    currentValue: h.currentValue,
    unrealizedPnl: h.unrealizedPnl,
    unrealizedPnlPct: h.unrealizedPnlPct,
  }));

  const chunkSize = 50;
  for (let i = 0; i < holdingsToSave.length; i += chunkSize) {
    const chunk = holdingsToSave.slice(i, i + chunkSize);
    await db.insert(msflHoldings).values(chunk);
  }

  return reportId;
}

export async function deleteMsflHoldingsReport(
  reportId: number
): Promise<void> {
  await db.delete(msflReports).where(eq(msflReports.id, reportId));
}

const msflStockHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

export function clearMsflStockCache(ticker: string) {
  msflStockHistoryCache.delete(ticker);
}

async function triggerMsflStockNavCacheUpdate(ticker: string) {
  try {
    const data = await fetchStockHistory(ticker);
    if (data && data.meta && data.data && data.data.length > 0) {
      await db
        .insert(msflSchemeNavCacheMeta)
        .values({
          schemeCode: ticker,
          fundHouse: "Equity",
          schemeType: "Equity",
          schemeCategory: "Stock",
          schemeName: ticker,
          lastFetchedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: msflSchemeNavCacheMeta.schemeCode,
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
        .delete(msflSchemeNavHistory)
        .where(eq(msflSchemeNavHistory.schemeCode, ticker));

      const chunkSize = 100;
      for (let i = 0; i < historyValues.length; i += chunkSize) {
        const chunk = historyValues.slice(i, i + chunkSize);
        await db.insert(msflSchemeNavHistory).values(chunk);
      }
    }
  } catch (err) {
    console.error(
      `Failed background cache update for MSFL stock ${ticker}:`,
      err
    );
  }
}

export function getMsflStockHistoryForSymbol(
  ticker: string
): Promise<MfDetailsResponse | null> {
  if (!ticker) return Promise.resolve(null);

  let cachedPromise = msflStockHistoryCache.get(ticker);
  if (!cachedPromise) {
    cachedPromise = (async () => {
      const cachedMeta = await db.query.msflSchemeNavCacheMeta.findFirst({
        where: eq(msflSchemeNavCacheMeta.schemeCode, ticker),
      });

      const now = new Date();
      const cacheAgeLimit = 24 * 60 * 60 * 1000;
      const isFresh =
        cachedMeta &&
        now.getTime() - new Date(cachedMeta.lastFetchedAt).getTime() <
          cacheAgeLimit;

      if (cachedMeta) {
        if (!isFresh) {
          triggerMsflStockNavCacheUpdate(ticker).catch((e) =>
            console.error("[SWR BACKGROUND MSFL STOCK ERROR]", e)
          );
        }

        const history = await db.query.msflSchemeNavHistory.findMany({
          where: eq(msflSchemeNavHistory.schemeCode, ticker),
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

      // First time fetch
      try {
        const data = await fetchStockHistory(ticker);
        if (data && data.meta && data.data && data.data.length > 0) {
          await db
            .insert(msflSchemeNavCacheMeta)
            .values({
              schemeCode: ticker,
              fundHouse: "Equity",
              schemeType: "Equity",
              schemeCategory: "Stock",
              schemeName: ticker,
              lastFetchedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: msflSchemeNavCacheMeta.schemeCode,
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
            .delete(msflSchemeNavHistory)
            .where(eq(msflSchemeNavHistory.schemeCode, ticker));

          const chunkSize = 100;
          for (let i = 0; i < historyValues.length; i += chunkSize) {
            const chunk = historyValues.slice(i, i + chunkSize);
            await db.insert(msflSchemeNavHistory).values(chunk);
          }

          return data;
        }
      } catch (err) {
        console.error(`Failed first-time fetch for MSFL stock ${ticker}:`, err);
      }

      return null;
    })();
    msflStockHistoryCache.set(ticker, cachedPromise);
  }

  return cachedPromise;
}

export async function getMsflSchemes() {
  return await db.query.msflSchemes.findMany({
    orderBy: [asc(msflSchemes.name)],
  });
}

export async function updateMsflSchemeCode(
  schemeId: number,
  code: string | null
) {
  await db
    .update(msflSchemes)
    .set({
      schemeCodeApi: code,
      mappedAt: code ? new Date().toISOString() : null,
    })
    .where(eq(msflSchemes.id, schemeId));
}

function emptyMsflInsightsData(): MsflInsightsData {
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
    },
  };
}

export async function getMsflDashboardData(
  reportId?: number
): Promise<MsflDashboardData> {
  const reportsList = await db
    .select()
    .from(msflReports)
    .orderBy(desc(msflReports.asOfDate), desc(msflReports.id));

  if (reportsList.length === 0) {
    return {
      reportsList: [],
      selectedReport: null,
      holdings: [],
      totals: { invested: 0, currentValue: 0, gain: 0, absoluteReturn: 0 },
      timelineData: [],
      insights: emptyMsflInsightsData(),
    };
  }

  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0];

  const rawHoldings = await db
    .select()
    .from(msflHoldings)
    .where(eq(msflHoldings.reportId, selectedReport.id));

  const schemesList = await db.select().from(msflSchemes);

  const niftyHistory = await getBenchmarkHistory("120716");
  const niftyData = niftyHistory?.data || [];

  const enrichedHoldings = await Promise.all(
    rawHoldings.map(async (h) => {
      const scheme = schemesList.find((s) => s.name === h.symbol);
      const ticker = scheme?.schemeCodeApi || `${h.symbol}.NS`;

      const stockDetails = await getMsflStockHistoryForSymbol(ticker);
      if (stockDetails && stockDetails.data && stockDetails.data.length > 0) {
        const metrics = calculateFundMetrics(
          h.averagePrice,
          h.currentPrice,
          selectedReport.asOfDate,
          stockDetails.data,
          niftyData
        );
        return {
          ...h,
          xirr: metrics.xirr,
          cagr: metrics.cagr,
          alpha: metrics.alpha,
        };
      }
      return { ...h, xirr: null, cagr: null, alpha: null };
    })
  );

  const holdings = enrichedHoldings;

  // Compute totals
  let invested = 0;
  let currentValue = 0;
  for (const h of holdings) {
    invested += h.investedValue;
    currentValue += h.currentValue;
  }
  const gain = currentValue - invested;
  const absoluteReturn = invested > 0 ? (gain / invested) * 100 : 0;

  const totals = {
    invested: round2(invested),
    currentValue: round2(currentValue),
    gain: round2(gain),
    absoluteReturn: round2(absoluteReturn),
  };

  // Timeline Data
  const timelineData = [];
  const chronologicalReports = [...reportsList].reverse();

  for (const r of chronologicalReports) {
    const t = await getMsflSnapshotTotals(r.id);
    const n = calculateBenchmarkReturns(r.asOfDate, niftyData);

    const reportDateIso = parseIsoDate(r.asOfDate);
    const initialNifty =
      niftyData.find(
        (p) => parseApiDate(p.date).getTime() >= reportDateIso.getTime()
      ) ?? niftyData[0];

    const currentNiftyNav = n.endNav;
    const initialNiftyNav = Number(initialNifty?.nav) || 1;
    const niftyPct =
      ((currentNiftyNav - initialNiftyNav) / initialNiftyNav) * 100;

    timelineData.push({
      date: r.asOfDate,
      portfolioValue: t.currentValue,
      nifty55: currentNiftyNav,
      nifty50: round2(niftyPct),
      portfolioReturn: t.absoluteReturn,
      niftyReturn: round2(niftyPct),
    });
  }

  // Insights
  const cagrHoldings = holdings.filter(
    (h) => typeof h.cagr === "number" && h.currentValue > 0
  );
  const weightedCagr =
    cagrHoldings.length > 0
      ? cagrHoldings.reduce(
          (sum, h) => sum + (h.cagr ?? 0) * h.currentValue,
          0
        ) / cagrHoldings.reduce((sum, h) => sum + h.currentValue, 0)
      : null;

  const sortedByPerf = [...holdings]
    .map((h) => ({
      symbol: h.symbol,
      returnPct: h.unrealizedPnlPct,
      gain: h.unrealizedPnl,
    }))
    .sort((a, b) => b.returnPct - a.returnPct);

  const topGainers = sortedByPerf.slice(0, 3);
  const laggards = [...sortedByPerf].reverse().slice(0, 3);

  const selectedReportIndex = chronologicalReports.findIndex(
    (r) => r.id === selectedReport.id
  );
  const previousReport =
    selectedReportIndex > 0
      ? chronologicalReports[selectedReportIndex - 1]
      : null;
  const previousTotals = previousReport
    ? await getMsflSnapshotTotals(previousReport.id)
    : null;

  const previousSnapshot = {
    date: previousReport ? previousReport.asOfDate : null,
    investedChange: previousTotals
      ? round2(totals.invested - previousTotals.invested)
      : 0,
    currentValueChange: previousTotals
      ? round2(totals.currentValue - previousTotals.currentValue)
      : 0,
    gainChange: previousTotals ? round2(totals.gain - previousTotals.gain) : 0,
    returnPctChange: previousTotals
      ? round2(totals.absoluteReturn - previousTotals.absoluteReturn)
      : 0,
  };

  const insights: MsflInsightsData = {
    reportDate: selectedReport.asOfDate,
    benchmarkReturns: calculateBenchmarkReturns(
      selectedReport.asOfDate,
      niftyData
    ),
    weightedCagr: weightedCagr !== null ? round2(weightedCagr) : null,
    movers: {
      topGainers,
      laggards,
    },
    previousSnapshot,
  };

  return {
    reportsList,
    selectedReport,
    holdings,
    totals,
    timelineData,
    insights,
  };
}
