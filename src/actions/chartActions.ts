"use server";

import {
  getSchemeHistoryForDbCode,
  getBenchmarkHistory,
  generateFactsheetChartData,
} from "@/lib/alpha";
import {
  getZerodhaSchemeHistoryForDbCode,
  getZerodhaStockHistoryForSymbol,
} from "@/lib/zerodhaService";
import { getMsflStockHistoryForSymbol } from "@/lib/msflService";
import { parseHistoryDate, parseToLocalMidnight } from "@/helpers/dates";
import { FactsheetChartPoint } from "@/types/portfolio";
import { FundTimeframe } from "@/types/fund-details";

/** Maps a FundTimeframe to the number of months to look back from asOfDate. */
function timeframeToMonths(tf: FundTimeframe): number | null {
  switch (tf) {
    case "3m":
      return 3;
    case "6m":
      return 6;
    case "1y":
      return 12;
    case "3y":
      return 36;
    case "5y":
      return 60;
    case "all":
    case "invDate":
    case "custom":
    default:
      return null; // no limit
  }
}

export interface ChartDataResponse {
  chartData: FactsheetChartPoint[];
  earliestFundDateStr: string | null;
  earliestBenchDateStr: string | null;
}

/**
 * Server Action: fetch chart data for a specific timeframe.
 * Called lazily from the client when the user switches to a timeframe
 * whose data is not yet cached.
 */
export async function fetchChartData(
  schemeCodeApi: string,
  benchmarkCode: string,
  asOfDate: string,
  timeframe: FundTimeframe,
  transactions: { date: string; type: "BUY" | "SELL"; amount: number }[],
  holdingType?: string,
  source?: string
): Promise<ChartDataResponse> {
  const months = timeframeToMonths(timeframe);
  const asOfLocal = parseToLocalMidnight(asOfDate);
  const startDate =
    months !== null
      ? new Date(
          asOfLocal.getFullYear(),
          asOfLocal.getMonth() - months,
          asOfLocal.getDate(),
          0,
          0,
          0,
          0
        )
      : undefined;

  let startDateString: string | undefined = undefined;
  if (startDate) {
    const y = startDate.getFullYear();
    const m = String(startDate.getMonth() + 1).padStart(2, "0");
    const d = String(startDate.getDate()).padStart(2, "0");
    startDateString = `${y}-${m}-${d}`;
  }

  // 1. Fetch NAV histories from DB cache (same path as page.tsx)
  let fundDetailsPromise;
  if (source === "msfl") {
    fundDetailsPromise = getMsflStockHistoryForSymbol(
      schemeCodeApi,
      "10y",
      startDateString
    );
  } else if (source === "zerodha" && holdingType === "equity") {
    fundDetailsPromise = getZerodhaStockHistoryForSymbol(
      schemeCodeApi,
      "10y",
      startDateString
    );
  } else if (source === "zerodha") {
    fundDetailsPromise = getZerodhaSchemeHistoryForDbCode(
      schemeCodeApi,
      startDateString
    );
  } else {
    fundDetailsPromise = getSchemeHistoryForDbCode(
      schemeCodeApi,
      startDateString
    );
  }

  const [fundDetails, benchDetails] = await Promise.all([
    fundDetailsPromise,
    getBenchmarkHistory(benchmarkCode, startDateString),
  ]);

  const fundNavHistory = fundDetails?.data || [];
  const benchNavHistory = benchDetails?.data || [];

  // 2. Compute startDateOverride based on the requested timeframe
  let startDateOverride: Date | undefined;
  if (months !== null) {
    startDateOverride = startDate;
  }

  // 3. Generate chart data for the requested slice
  const chartData = generateFactsheetChartData(
    fundNavHistory,
    benchNavHistory,
    asOfDate,
    transactions,
    startDateOverride
  );

  // 4. Compute earliest date strings
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

  return { chartData, earliestFundDateStr, earliestBenchDateStr };
}
