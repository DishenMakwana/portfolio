import type { ActionResult } from "@/types/portfolio";
import axios from "axios";
import { MfDetailsResponse } from "@/types/mf-api";

async function fetchFromYahoo(
  ticker: string,
  symbol: string
): Promise<MfDetailsResponse | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?range=1y&interval=1d`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      timeout: 3000,
    });

    const result = res.data?.chart?.result?.[0];
    if (!result) {
      console.warn(`[Yahoo Finance API] No result returned for ${ticker}`);
      return null;
    }

    const timestamps: number[] = result.timestamp || [];
    const closePrices: (number | null)[] =
      result.indicators?.quote?.[0]?.close || [];

    const data: { date: string; nav: string }[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const close = closePrices[i];

      if (ts && close !== null && close !== undefined) {
        const dateObj = new Date(ts * 1000);
        // Format as DD-MM-YYYY to match the main API
        const dd = String(dateObj.getDate()).padStart(2, "0");
        const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
        const yyyy = dateObj.getFullYear();

        data.push({
          date: `${dd}-${mm}-${yyyy}`,
          nav: String(close.toFixed(2)),
        });
      }
    }

    if (data.length === 0) {
      return null;
    }

    // Sort descending by date (latest first) to match API behavior
    data.sort((a, b) => {
      const [ad, am, ay] = a.date.split("-");
      const [bd, bm, by] = b.date.split("-");
      return (
        new Date(`${by}-${bm}-${bd}`).getTime() -
        new Date(`${ay}-${am}-${ad}`).getTime()
      );
    });

    return {
      meta: {
        fund_house: "Equity",
        scheme_type: "Equity",
        scheme_category: "Stock",
        scheme_code: 0,
        scheme_name: symbol,
      },
      data,
      resolvedTicker: ticker,
    };
  } catch (error: unknown) {
    const errObj = error as
      { name?: string; code?: string | number } | null | undefined;
    const errorName = errObj?.name;
    const errorCode = errObj?.code;
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorName === "TimeoutError" ||
      errorName === "AbortError" ||
      errorCode === 23 ||
      errorCode === "ETIMEDOUT"
    ) {
      console.warn(
        `[Yahoo Finance API] Timeout fetching history for ${ticker} (3s). Using cache or fallback.`
      );
    } else {
      console.warn(
        `[Yahoo Finance API] Failed fetching history for ${ticker}:`,
        errorMsg
      );
    }
    return null;
  }
}

/**
 * Fetch stock price history from Yahoo Finance and format it like Mutual Fund NAV history.
 */
export async function fetchStockHistory(
  symbol: string
): Promise<ActionResult<MfDetailsResponse>> {
  if (!symbol) return { success: false, error: "Symbol is required" };
  if (isUnlistedStock(symbol))
    return { success: false, error: "Unlisted stock" };

  // If a suffix is already specified (like .NS or .BO), fetch it directly.
  if (symbol.includes(".")) {
    const data = await fetchFromYahoo(symbol, symbol);
    return data
      ? { success: true, data }
      : { success: false, error: "Failed to fetch Yahoo chart" };
  }

  // Try NSE first (.NS)
  const nseTicker = `${symbol}.NS`;
  const nseData = await fetchFromYahoo(nseTicker, symbol);
  if (nseData) {
    return { success: true, data: nseData };
  }

  // Fallback to BSE (.BO)
  const bseTicker = `${symbol}.BO`;
  console.log(
    `[Yahoo Finance API] NSE failed or returned empty for ${symbol}. Trying BSE fallback: ${bseTicker}`
  );
  const bseData = await fetchFromYahoo(bseTicker, symbol);
  return bseData
    ? { success: true, data: bseData }
    : { success: false, error: "Failed to fetch BSE chart fallback" };
}

const UNLISTED_STOCKS = new Set([
  "BIBCL.NS",
  "BIBCL",
  "GVFILM.NS",
  "GVFILM",
  "BIRLACAP.NS",
  "BIRLACAP",
]);

export function isUnlistedStock(symbol: string | null | undefined): boolean {
  if (!symbol) return false;
  const s = symbol.toUpperCase().trim();
  return UNLISTED_STOCKS.has(s);
}
