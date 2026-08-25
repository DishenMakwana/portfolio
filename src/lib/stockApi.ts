import type { ActionResult } from "@/types/portfolio";
import type { StockSearchResult, YahooQuoteItem } from "@/types/zerodha";
import axios from "axios";
import { MfDetailsResponse } from "@/types/mf-api";
import {
  YAHOO_FINANCE_API_TIMEOUT_MS,
  YAHOO_FINANCE_API_RETRIES,
  YAHOO_FINANCE_API_BACKOFF_MS,
} from "@/types/constants";

import { isIndianMarketOpen } from "@/helpers/tradingDays";

function formatIstDate(timestampSec: number): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return formatter.format(new Date(timestampSec * 1000)).replace(/\//g, "-");
}

async function fetchFromYahoo(
  ticker: string,
  symbol: string,
  range = "1y"
): Promise<MfDetailsResponse | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?range=${range}&interval=1d`;

  for (let attempt = 0; attempt <= YAHOO_FINANCE_API_RETRIES; attempt++) {
    const currentTimeout = Math.round(
      YAHOO_FINANCE_API_TIMEOUT_MS * Math.pow(1.5, attempt)
    );
    try {
      const res = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout: currentTimeout,
      });

      const result = res.data?.chart?.result?.[0];
      if (!result) {
        console.warn(`[Yahoo Finance API] No result returned for ${ticker}`);
        return null;
      }

      const meta = result.meta;
      const timestamps: number[] = result.timestamp || [];
      const closePrices: (number | null)[] =
        result.indicators?.quote?.[0]?.close || [];
      const highPrices: (number | null)[] =
        result.indicators?.quote?.[0]?.high || [];

      const dataMap = new Map<string, number>();

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const close = closePrices[i];
        const high = highPrices[i];

        if (ts) {
          const dStr = formatIstDate(ts);
          const price = close ?? high;
          if (price !== null && price !== undefined && !isNaN(price)) {
            dataMap.set(dStr, price);
          }
        }
      }

      // Live regularMarketPrice injection (during market running or at market close)
      if (meta?.regularMarketPrice && meta?.regularMarketTime) {
        const liveDateStr = formatIstDate(meta.regularMarketTime);
        const livePrice = Number(meta.regularMarketPrice);
        if (!isNaN(livePrice) && livePrice > 0) {
          dataMap.set(liveDateStr, livePrice);
        }
      }

      const data: { date: string; nav: string }[] = [];
      for (const [date, val] of dataMap.entries()) {
        data.push({
          date,
          nav: val.toFixed(2),
        });
      }

      if (data.length === 0) {
        return null;
      }

      // Sort descending by date (latest first)
      data.sort((a, b) => {
        const [ad, am, ay] = a.date.split("-").map(Number);
        const [bd, bm, by] = b.date.split("-").map(Number);
        return (
          new Date(by, bm - 1, bd).getTime() -
          new Date(ay, am - 1, ad).getTime()
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
      const isLastAttempt = attempt === YAHOO_FINANCE_API_RETRIES;
      const errObj = error as
        { name?: string; code?: string | number } | null | undefined;
      const errorName = errObj?.name;
      const errorCode = errObj?.code;
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (!isLastAttempt) {
        const delay = YAHOO_FINANCE_API_BACKOFF_MS * Math.pow(2, attempt);
        const nextTimeout = Math.round(
          YAHOO_FINANCE_API_TIMEOUT_MS * Math.pow(1.5, attempt + 1)
        );
        console.warn(
          `[Yahoo Finance API Retry] Fetch for ${ticker} failed (Attempt ${attempt + 1}/${YAHOO_FINANCE_API_RETRIES + 1}, timeout was ${currentTimeout}ms). Retrying in ${delay}ms with increased timeout ${nextTimeout}ms... Reason: ${errorMsg}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (
        errorName === "TimeoutError" ||
        errorName === "AbortError" ||
        errorCode === 23 ||
        errorCode === "ETIMEDOUT"
      ) {
        console.warn(
          `[Yahoo Finance API] Timeout fetching history for ${ticker} (${currentTimeout}ms). Using cache or fallback.`
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
  return null;
}

const niftyIndexCache = new Map<
  string,
  { data: MfDetailsResponse; fetchedAt: number }
>();

export function clearNiftyIndexCache(): void {
  niftyIndexCache.clear();
}

/**
 * Fetch NIFTY 50 spot index points history from Yahoo Finance (^NSEI).
 * Live & uncached during active market hours; cached outside market hours.
 */
export async function getNifty50IndexHistory(
  range = "10y"
): Promise<MfDetailsResponse | null> {
  const normalizedRange = range === "max" ? "10y" : range;
  const now = Date.now();
  const marketOpen = isIndianMarketOpen();
  const cached = niftyIndexCache.get(normalizedRange);

  // During active market hours: do not use stale cache (only 5s debounce for parallel sub-requests).
  // Outside market hours: cache for up to 1 hour.
  if (marketOpen) {
    if (cached && now - cached.fetchedAt < 5 * 1000) {
      return cached.data;
    }
  } else {
    if (cached && now - cached.fetchedAt < 60 * 60 * 1000) {
      return cached.data;
    }
  }

  let res = await fetchFromYahoo("^NSEI", "NIFTY 50", normalizedRange);
  if (!res && (normalizedRange === "10y" || normalizedRange === "max")) {
    // Fallback to 5y if 10y timed out
    res = await fetchFromYahoo("^NSEI", "NIFTY 50", "5y");
  }

  if (res) {
    niftyIndexCache.set(normalizedRange, { data: res, fetchedAt: now });
    return res;
  }
  return cached?.data ?? null;
}

/**
 * Fetch stock price history from Yahoo Finance and format it like Mutual Fund NAV history.
 */
export async function fetchStockHistory(
  symbol: string,
  range = "1y"
): Promise<ActionResult<MfDetailsResponse>> {
  if (!symbol) return { success: false, error: "Symbol is required" };
  if (isUnlistedStock(symbol))
    return { success: false, error: "Unlisted stock" };

  // If a prefix/suffix is already specified (like ^NSEI, .NS or .BO), fetch it directly.
  if (symbol.startsWith("^") || symbol.includes(".")) {
    const data = await fetchFromYahoo(symbol, symbol, range);
    return data
      ? { success: true, data }
      : { success: false, error: "Failed to fetch Yahoo chart" };
  }

  // Try NSE first (.NS)
  const nseTicker = `${symbol}.NS`;
  const nseData = await fetchFromYahoo(nseTicker, symbol, range);
  if (nseData) {
    return { success: true, data: nseData };
  }

  // Fallback to BSE (.BO)
  const bseTicker = `${symbol}.BO`;
  console.log(
    `[Yahoo Finance API] NSE failed or returned empty for ${symbol}. Trying BSE fallback: ${bseTicker}`
  );
  const bseData = await fetchFromYahoo(bseTicker, symbol, range);
  return bseData
    ? { success: true, data: bseData }
    : { success: false, error: "Failed to fetch BSE chart fallback" };
}

const UNLISTED_STOCKS = new Set([
  "BELLARY.NS",
  "BELLARY.BO",
  "BELLARY",
  "NEPC.NS",
  "NEPC.BO",
  "NEPC",
]);

export function isUnlistedStock(symbol: string | null | undefined): boolean {
  if (!symbol) return false;
  const s = symbol.toUpperCase().trim();
  return UNLISTED_STOCKS.has(s);
}

export async function searchStockSymbols(
  query: string
): Promise<StockSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&quotesCount=15&newsCount=0`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      timeout: 5000,
    });

    const quotes: YahooQuoteItem[] = res.data?.quotes || [];
    const results: StockSearchResult[] = quotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortname || item.longname || item.symbol,
      exchange: item.exchDisp || item.exchange || "Stock",
      quoteType: item.quoteType || item.typeDisp || "EQUITY",
      industry: item.industryDisp || item.sectorDisp || undefined,
    }));

    // Prioritize Indian symbols (.NS and .BO) and exchanges (NSE, BSE, Bombay)
    results.sort((a, b) => {
      const aIsIndian =
        a.symbol.endsWith(".NS") ||
        a.symbol.endsWith(".BO") ||
        a.exchange.includes("NSE") ||
        a.exchange.includes("BSE") ||
        a.exchange.includes("Bombay");
      const bIsIndian =
        b.symbol.endsWith(".NS") ||
        b.symbol.endsWith(".BO") ||
        b.exchange.includes("NSE") ||
        b.exchange.includes("BSE") ||
        b.exchange.includes("Bombay");

      if (aIsIndian && !bIsIndian) return -1;
      if (!aIsIndian && bIsIndian) return 1;
      return 0;
    });

    return results;
  } catch (error) {
    console.error("searchStockSymbols error:", error);
    return [];
  }
}
