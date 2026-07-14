import { db } from "../db/db";
import {
  zerodhaReports,
  zerodhaHoldings,
  zerodhaSchemes,
  zerodhaSchemeNavCacheMeta,
  zerodhaSchemeNavHistory,
  reports,
} from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import {
  ZerodhaDashboardData,
  ZerodhaBenchmarkReturns,
  ZerodhaInsightsData,
} from "@/types/zerodha";
import {
  getBenchmarkHistory,
  findClosestNav,
  parseAndSortNavHistory,
  findSyntheticInvestmentEntry,
  calculateCagr,
  calculateXirrFromNav,
  getBenchmarkCodeForCategory,
  getBenchmarkFundNameForCode,
} from "./alpha";
import { fetchStockHistory } from "./stockApi";
import {
  autoMapScheme,
  fetchMfDetails,
  isSpecializedFundSchemeCode,
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
    },
  };
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
  const schemeMap = new Map<string, number>();

  if (holdings.length > 0) {
    for (const h of holdings) {
      const schemeName = h.symbol;
      let scheme = await db.query.zerodhaSchemes.findFirst({
        where: eq(zerodhaSchemes.name, schemeName),
      });

      if (!scheme) {
        if (h.holdingType === "mutual_fund") {
          const apiMapping = await autoMapScheme(schemeName);
          const [inserted] = await db
            .insert(zerodhaSchemes)
            .values({
              name: schemeName,
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
          let ticker = `${h.symbol}.NS`;
          if (h.symbol === "SCL-X") ticker = "539574.BO";
          else if (h.symbol === "TMCV") ticker = "TMCV.NS";
          else if (h.symbol === "TATACAP") ticker = "TATACAP.NS";

          const [inserted] = await db
            .insert(zerodhaSchemes)
            .values({
              name: schemeName,
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
            isin: scheme.isin || h.isin,
            holdingType: scheme.holdingType || h.holdingType,
            sector: scheme.sector || h.sector,
            instrumentType: scheme.instrumentType || h.instrumentType,
          })
          .where(eq(zerodhaSchemes.id, scheme.id));
      }

      if (scheme) {
        schemeMap.set(schemeName, scheme.id);
      }
    }
  }

  await db.insert(zerodhaHoldings).values(
    holdings.map((h) => {
      const schemeId = schemeMap.get(h.symbol);
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

export async function getZerodhaReports() {
  return await db.query.zerodhaReports.findMany({
    orderBy: [desc(zerodhaReports.asOfDate)],
  });
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
  alpha: number;
} {
  if (!fundNavHistory.length || !currentNav || currentNav <= 0) {
    return { xirr: 0, cagr: 0, holdingDays: 0, benchmarkXirr: 0, alpha: 0 };
  }

  const parseApiDate = (s: string) => {
    const [dd, mm, yyyy] = s.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  const sorted = parseAndSortNavHistory(fundNavHistory, parseApiDate);
  const entry = findSyntheticInvestmentEntry(purchaseNav, sorted);

  if (!entry) {
    return { xirr: 0, cagr: 0, holdingDays: 0, benchmarkXirr: 0, alpha: 0 };
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
      alpha: metrics.alpha,
    };
  }
  const actualPurchaseNav = entry.nav;
  const years = msDiff / (365.25 * 24 * 60 * 60 * 1000);

  if (years <= 0) {
    return { xirr: 0, cagr: 0, holdingDays, benchmarkXirr: 0, alpha: 0 };
  }

  const cagrValue = calculateCagr(currentNav, actualPurchaseNav, years);
  return {
    xirr: cagrValue,
    cagr: cagrValue,
    holdingDays,
    benchmarkXirr: 0,
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

async function getZerodhaSnapshotTotals(reportId: number) {
  const rows = await db
    .select()
    .from(zerodhaHoldings)
    .where(eq(zerodhaHoldings.reportId, reportId));

  const invested = rows.reduce((sum, row) => sum + row.investedValue, 0);
  const currentValue = rows.reduce((sum, row) => sum + row.currentValue, 0);
  const gain = currentValue - invested;
  const absoluteReturn = invested > 0 ? (gain / invested) * 100 : 0;

  return { invested, currentValue, gain, absoluteReturn };
}

async function getZerodhaReportWeightedMetrics(
  reportId: number,
  asOfDate: string,
  schemesList: {
    name: string;
    category: string;
    schemeCodeApi: string | null;
  }[]
): Promise<{ portfolioXirr: number; benchmarkXirr: number; alpha: number }> {
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
    })
    .from(zerodhaHoldings)
    .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id))
    .where(eq(zerodhaHoldings.reportId, reportId));

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
              currentValue: h.currentValue,
              xirr: metrics.xirr,
              benchmarkXirr: metrics.benchmarkXirr,
            };
          }
        }
      } else if (h.holdingType === "equity") {
        const ticker = scheme?.schemeCodeApi || `${h.symbol}.NS`;
        const [stockDetails, benchDetails] = await Promise.all([
          getZerodhaStockHistoryForSymbol(ticker),
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
            currentValue: h.currentValue,
            xirr: metrics.xirr,
            benchmarkXirr: metrics.benchmarkXirr,
          };
        }
      }
      return {
        currentValue: h.currentValue,
        xirr: null,
        benchmarkXirr: null,
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

  return { portfolioXirr, benchmarkXirr, alpha };
}

export async function getZerodhaDashboardData(
  reportId?: number
): Promise<ZerodhaDashboardData> {
  const [reportsList, oldestCasReport] = await Promise.all([
    getZerodhaReports(),
    db.query.reports.findFirst({
      orderBy: [asc(reports.asOfDate)],
    }),
  ]);
  const firstCasReportDate = oldestCasReport?.asOfDate ?? null;

  if (reportsList.length === 0) {
    return {
      firstCasReportDate,
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
      },
      metricDeltas: {
        previousDate: null,
        portfolioXirr: null,
        benchmarkXirr: null,
        alpha: null,
      },
      sectorAllocation: [],
      categoryAllocation: [],
      assetSplit: [],
      timelineData: [],
      insights: emptyZerodhaInsightsData(),
    };
  }

  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0];

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
    })
    .from(zerodhaHoldings)
    .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id))
    .where(eq(zerodhaHoldings.reportId, selectedReport.id));

  const schemesList = await db.select().from(zerodhaSchemes);

  const enrichedHoldings = await Promise.all(
    rawHoldings.map(async (h) => {
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

      if (holdingType === "mutual_fund") {
        if (scheme && scheme.schemeCodeApi) {
          const [fundDetails, benchDetails] = await Promise.all([
            getZerodhaSchemeHistoryForDbCode(scheme.schemeCodeApi),
            getBenchmarkHistory(benchmarkCode),
          ]);
          if (fundDetails && fundDetails.data && fundDetails.data.length > 0) {
            const metrics = calculateFundMetrics(
              h.averagePrice,
              h.currentPrice,
              selectedReport.asOfDate,
              fundDetails.data,
              benchDetails?.data || []
            );
            return {
              ...h,
              symbol,
              holdingType,
              isin,
              sector,
              instrumentType: category,
              xirr: metrics.xirr,
              cagr: metrics.cagr,
              holdingDays: metrics.holdingDays,
              benchmarkXirr: metrics.benchmarkXirr,
              alpha: metrics.alpha,
              benchmarkCode,
              benchmarkName,
            };
          }
        }
      } else if (holdingType === "equity") {
        const ticker = scheme?.schemeCodeApi || `${symbol}.NS`;
        const [stockDetails, benchDetails] = await Promise.all([
          getZerodhaStockHistoryForSymbol(ticker),
          getBenchmarkHistory(benchmarkCode),
        ]);
        if (stockDetails && stockDetails.data && stockDetails.data.length > 0) {
          const metrics = calculateFundMetrics(
            h.averagePrice,
            h.currentPrice,
            selectedReport.asOfDate,
            stockDetails.data,
            benchDetails?.data || []
          );
          return {
            ...h,
            symbol,
            holdingType,
            isin,
            sector,
            instrumentType: category,
            xirr: metrics.xirr,
            cagr: metrics.cagr,
            holdingDays: metrics.holdingDays,
            benchmarkXirr: metrics.benchmarkXirr,
            alpha: metrics.alpha,
            benchmarkCode,
            benchmarkName,
          };
        }
      }
      return {
        ...h,
        symbol,
        holdingType,
        isin,
        sector,
        instrumentType: category,
        xirr: null,
        cagr: null,
        holdingDays: 0,
        benchmarkXirr: null,
        alpha: null,
        benchmarkCode,
        benchmarkName,
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
      .select({
        id: zerodhaHoldings.id,
        investedValue: zerodhaHoldings.investedValue,
        currentValue: zerodhaHoldings.currentValue,
        holdingType: zerodhaSchemes.holdingType,
      })
      .from(zerodhaHoldings)
      .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id))
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

  const selectedReportIndex = chronologicalReports.findIndex(
    (report) => report.id === selectedReport.id
  );
  const previousReport =
    selectedReportIndex > 0
      ? chronologicalReports[selectedReportIndex - 1]
      : null;
  const previousTotals = previousReport
    ? await getZerodhaSnapshotTotals(previousReport.id)
    : null;

  const insights: ZerodhaInsightsData = {
    reportDate: selectedReport.asOfDate,
    benchmarkReturns: calculateBenchmarkReturns(
      selectedReport.asOfDate,
      niftyHistory
    ),
    weightedCagr: weightedCagr !== null ? round2(weightedCagr) : null,
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

  let metricDeltas = {
    previousDate: previousReport?.asOfDate ?? null,
    portfolioXirr: null as number | null,
    benchmarkXirr: null as number | null,
    alpha: null as number | null,
  };

  if (previousReport) {
    const prevMetrics = await getZerodhaReportWeightedMetrics(
      previousReport.id,
      previousReport.asOfDate,
      schemesList
    );
    metricDeltas = {
      previousDate: previousReport.asOfDate,
      portfolioXirr: portfolioXirr - prevMetrics.portfolioXirr,
      benchmarkXirr: benchmarkXirr - prevMetrics.benchmarkXirr,
      alpha: alpha - prevMetrics.alpha,
    };
  }

  return {
    firstCasReportDate,
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
      portfolioXirr,
      benchmarkXirr,
      alpha,
    },
    metricDeltas,
    sectorAllocation,
    categoryAllocation,
    assetSplit,
    timelineData,
    insights,
  };
}

const zerodhaSchemeHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

export function clearZerodhaSchemeCache(schemeCode: string) {
  zerodhaSchemeHistoryCache.delete(schemeCode);
}

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

        // If not fresh, trigger SWR fetch
        if (!isFresh) {
          try {
            await triggerZerodhaNavCacheUpdate(schemeCode, latestDateStr);
            const updatedHistory =
              await db.query.zerodhaSchemeNavHistory.findMany({
                where: eq(zerodhaSchemeNavHistory.schemeCode, schemeCode),
              });
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

const zerodhaStockHistoryCache = new Map<
  string,
  Promise<MfDetailsResponse | null>
>();

export function clearZerodhaStockCache(ticker: string) {
  zerodhaStockHistoryCache.delete(ticker);
}

export function clearAllZerodhaCaches() {
  zerodhaSchemeHistoryCache.clear();
  zerodhaStockHistoryCache.clear();
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

    const historyValues = data.data.map((p) => ({
      schemeCode: t,
      date: p.date,
      nav: parseFloat(p.nav) || 0,
      fetchedAt: new Date().toISOString(),
    }));

    await db
      .delete(zerodhaSchemeNavHistory)
      .where(eq(zerodhaSchemeNavHistory.schemeCode, t));

    const chunkSize = 100;
    for (let i = 0; i < historyValues.length; i += chunkSize) {
      const chunk = historyValues.slice(i, i + chunkSize);
      await db.insert(zerodhaSchemeNavHistory).values(chunk);
    }
  }
}

async function triggerZerodhaStockNavCacheUpdate(ticker: string) {
  try {
    const data = await fetchStockHistory(ticker);
    if (data && data.meta && data.data && data.data.length > 0) {
      await saveZerodhaStockCacheAndMapping(ticker, data);
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
          try {
            await triggerZerodhaStockNavCacheUpdate(ticker);
            const updatedHistory =
              await db.query.zerodhaSchemeNavHistory.findMany({
                where: eq(zerodhaSchemeNavHistory.schemeCode, ticker),
              });
            if (updatedHistory.length > 0) {
              return {
                meta: {
                  fund_house: cachedMeta.fundHouse,
                  scheme_type: cachedMeta.schemeType,
                  scheme_category: cachedMeta.schemeCategory,
                  scheme_code: 0,
                  scheme_name: cachedMeta.schemeName,
                },
                data: updatedHistory.map((h) => ({
                  date: h.date,
                  nav: String(h.nav),
                })),
              };
            }
          } catch (e) {
            console.error("[SYNC ZERODHA STOCK CACHE UPDATE ERROR]", e);
          }
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
          await saveZerodhaStockCacheAndMapping(ticker, data);
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
