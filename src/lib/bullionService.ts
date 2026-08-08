import type { ActionResult, BullionRatesResponse } from "@/types/portfolio";
import axios from "axios";
import type {
  BullionCache,
  BullionRates,
  ChartDataPoint,
} from "@/types/bullion";
import { db } from "@/db/db";
import { bullionHistory } from "@/db/schema";
import { asc } from "drizzle-orm";
import {
  createBullionChartData,
  createBullionRatesFromHistory,
} from "@/helpers/bullion";

const cache: BullionCache = {
  rates: null,
  chartData: null,
  lastFetched: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms
const MIN_EXTERNAL_INTERVAL = 15 * 1000; // 15 seconds minimum between API calls
const COINGECKO_CURRENT_TIMEOUT_MS = 10000;
const COINGECKO_HISTORY_TIMEOUT_MS = 15000;
const COINGECKO_RETRIES = 3;
const COINGECKO_RETRY_BACKOFF_MS = 1000;
let lastExternalFetchTime = 0;
const GRAMS_PER_TROY_ONCE = 31.1034768;

// Indian retail overhead multipliers (duty, handling, margins)
const GOLD_INDIA_MULTIPLIER = 1.15626;
const SILVER_INDIA_MULTIPLIER = 1.3072;

async function axiosGetWithRetry<T>(
  url: string,
  timeoutMs: number
): Promise<T> {
  let retryCount = 0;

  while (true) {
    try {
      const response = await axios.get<T>(url, {
        headers: { Accept: "application/json" },
        timeout: timeoutMs,
      });
      return response.data;
    } catch (error: unknown) {
      if (retryCount >= COINGECKO_RETRIES) {
        throw error;
      }

      retryCount += 1;
      const delay = COINGECKO_RETRY_BACKOFF_MS * 2 ** (retryCount - 1);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[BULLION RETRY] CoinGecko request failed (${retryCount}/${COINGECKO_RETRIES}). Retrying in ${delay}ms: ${errorMsg}`
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
}

export const CITIES = [
  { id: "rajkot", name: "Rajkot", offset: 0.0 },
  { id: "mumbai", name: "Mumbai", offset: -0.0015 },
  { id: "delhi", name: "Delhi", offset: 0.001 },
  { id: "ahmedabad", name: "Ahmedabad", offset: -0.0005 },
  { id: "chennai", name: "Chennai", offset: 0.0025 },
  { id: "kolkata", name: "Kolkata", offset: 0.0015 },
  { id: "bangalore", name: "Bangalore", offset: 0.002 },
  { id: "hyderabad", name: "Hyderabad", offset: 0.0022 },
];

/**
 * Fetch and process live bullion prices from CoinGecko & DB history
 */
export async function getBullionData(
  forceRefresh = false,
  days: string | number = 365
): Promise<ActionResult<BullionRatesResponse>> {
  const now = Date.now();

  const canMakeExternalCall =
    !cache.rates ||
    !cache.chartData ||
    now - lastExternalFetchTime >= MIN_EXTERNAL_INTERVAL;

  if (cache.rates && cache.chartData) {
    if (now - cache.lastFetched < CACHE_TTL && !forceRefresh) {
      return {
        success: true,
        data: {
          rates: cache.rates,
          chartData: cache.chartData,
          isThrottled: false,
        },
      };
    }
    if (forceRefresh && !canMakeExternalCall) {
      return {
        success: true,
        data: {
          rates: cache.rates,
          chartData: cache.chartData,
          isThrottled: true,
        },
      };
    }
  }

  // We are performing an external fetch
  lastExternalFetchTime = now;

  try {
    // 1. Fetch current rates from CoinGecko
    const priceData = await axiosGetWithRetry<Record<string, { inr?: number }>>(
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,kinesis-silver&vs_currencies=inr",
      COINGECKO_CURRENT_TIMEOUT_MS
    );

    const goldOunceINR: number | undefined = priceData["pax-gold"]?.inr;
    const silverOunceINR: number | undefined = priceData["kinesis-silver"]?.inr;

    if (!goldOunceINR || !silverOunceINR) {
      throw new Error("Invalid data format from CoinGecko");
    }

    // 2. Fetch historical rates (days)
    const [goldHistoryData, silverHistoryData] = await Promise.all([
      axiosGetWithRetry<{ prices?: [number, number][] }>(
        `https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=inr&days=${days}&interval=daily`,
        COINGECKO_HISTORY_TIMEOUT_MS
      ),
      axiosGetWithRetry<{ prices?: [number, number][] }>(
        `https://api.coingecko.com/api/v3/coins/kinesis-silver/market_chart?vs_currency=inr&days=${days}&interval=daily`,
        COINGECKO_HISTORY_TIMEOUT_MS
      ),
    ]);

    const goldHistory: [number, number][] = goldHistoryData.prices || [];
    const silverHistory: [number, number][] = silverHistoryData.prices || [];

    if (goldHistory.length === 0 || silverHistory.length === 0) {
      throw new Error("Empty historical data received from CoinGecko");
    }

    // 3. Process current rates
    const gold24K = Math.round(
      (goldOunceINR / GRAMS_PER_TROY_ONCE) * GOLD_INDIA_MULTIPLIER
    );
    const silver999 = Math.round(
      (silverOunceINR / GRAMS_PER_TROY_ONCE) * SILVER_INDIA_MULTIPLIER
    );
    const platinumPT950 = Math.round(gold24K * 0.2127);

    let goldChange = -11;
    let silverChange = -2.0;
    let platinumChange = -5.0;

    if (goldHistory.length >= 2) {
      const yesterdayGold =
        (goldHistory[goldHistory.length - 2][1] / GRAMS_PER_TROY_ONCE) *
        GOLD_INDIA_MULTIPLIER;
      const todayGold =
        (goldHistory[goldHistory.length - 1][1] / GRAMS_PER_TROY_ONCE) *
        GOLD_INDIA_MULTIPLIER;
      goldChange = Math.round(todayGold - yesterdayGold);
    }
    if (silverHistory.length >= 2) {
      const yesterdaySilver =
        (silverHistory[silverHistory.length - 2][1] / GRAMS_PER_TROY_ONCE) *
        SILVER_INDIA_MULTIPLIER;
      const todaySilver =
        (silverHistory[silverHistory.length - 1][1] / GRAMS_PER_TROY_ONCE) *
        SILVER_INDIA_MULTIPLIER;
      silverChange = parseFloat((todaySilver - yesterdaySilver).toFixed(2));
    }
    platinumChange = parseFloat((goldChange * 0.2127).toFixed(2));

    const todayDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const rates: BullionRates = {
      asOfDate: todayDate,
      gold: {
        "24K": gold24K,
        "22K": Math.round((gold24K * 22) / 24),
        "18K": Math.round((gold24K * 18) / 24) + 2,
        change: goldChange,
      },
      silver: {
        "999": silver999,
        "925": Math.round(silver999 * 0.925),
        "800": Math.round(silver999 * 0.8),
        change: silverChange,
      },
      platinum: {
        PT950: platinumPT950,
        PT900: Math.round(platinumPT950 * 0.9474),
        PT850: Math.round(platinumPT950 * 0.8947),
        change: platinumChange,
      },
    };

    // 4. Save fetched history points to Database for persistent multi-year tracking
    const minLen = Math.min(goldHistory.length, silverHistory.length);
    const dbPayload = [];

    for (let i = 0; i < minLen; i++) {
      const time = goldHistory[i][0];
      const dateIso = new Date(time).toISOString().split("T")[0];
      const gG = Math.round(
        (goldHistory[i][1] / GRAMS_PER_TROY_ONCE) * GOLD_INDIA_MULTIPLIER
      );
      const sS = Math.round(
        (silverHistory[i][1] / GRAMS_PER_TROY_ONCE) * SILVER_INDIA_MULTIPLIER
      );
      const pP = Math.round(gG * 0.2127);

      dbPayload.push({
        date: dateIso,
        timestamp: time,
        goldPrice: gG,
        silverPrice: sS,
        platinumPrice: pP,
      });
    }

    if (dbPayload.length > 0) {
      try {
        await db.insert(bullionHistory).values(dbPayload).onConflictDoNothing();
      } catch (dbErr) {
        console.warn(
          "[BULLION SERVICE] Database history upsert warning:",
          dbErr
        );
      }
    }

    // 5. Query stored history from Database to combine multi-year data
    const dbRecords = await db
      .select()
      .from(bullionHistory)
      .orderBy(asc(bullionHistory.timestamp));

    const chartData: ChartDataPoint[] = [];

    if (dbRecords.length > 0) {
      for (const rec of dbRecords) {
        const dateStr = new Date(rec.timestamp).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });

        chartData.push({
          date: dateStr,
          timestamp: rec.timestamp,
          Gold: Math.round(rec.goldPrice),
          Silver: Math.round(rec.silverPrice),
          Platinum: Math.round(rec.platinumPrice),
        });
      }
    } else {
      // Fallback if DB query returned nothing
      for (let i = 0; i < minLen; i++) {
        const time = goldHistory[i][0];
        const dateStr = new Date(time).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });
        const gG = Math.round(
          (goldHistory[i][1] / GRAMS_PER_TROY_ONCE) * GOLD_INDIA_MULTIPLIER
        );
        const sS = Math.round(
          (silverHistory[i][1] / GRAMS_PER_TROY_ONCE) * SILVER_INDIA_MULTIPLIER
        );
        const pP = Math.round(gG * 0.2127);

        chartData.push({
          date: dateStr,
          timestamp: time,
          Gold: gG,
          Silver: sS,
          Platinum: pP,
        });
      }
    }

    // Update Cache
    cache.rates = rates;
    cache.chartData = chartData;
    cache.lastFetched = now;

    return {
      success: true,
      data: {
        rates: cache.rates,
        chartData: cache.chartData,
        isThrottled: false,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(
      "[BULLION SERVICE] Live prices unavailable; using database history:",
      errorMsg
    );

    try {
      const fallbackRecords = await db
        .select()
        .from(bullionHistory)
        .orderBy(asc(bullionHistory.timestamp));

      if (fallbackRecords.length > 0) {
        const rates = createBullionRatesFromHistory(fallbackRecords);
        const chartData = createBullionChartData(fallbackRecords);
        cache.rates = rates;
        cache.chartData = chartData;
        cache.lastFetched = now;

        return {
          success: true,
          data: { rates, chartData, isThrottled: false, isStale: true },
        };
      }
    } catch (fallbackError) {
      console.error(
        "[BULLION SERVICE] Database fallback failed:",
        fallbackError
      );
    }

    return {
      success: false,
      error: `Failed to fetch live bullion prices: ${errorMsg}`,
    };
  }
}
