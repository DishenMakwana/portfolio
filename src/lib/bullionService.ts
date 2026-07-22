import type { ActionResult, BullionRatesResponse } from "@/types/portfolio";
import axios from "axios";
import type {
  BullionCache,
  BullionRates,
  ChartDataPoint,
} from "@/types/bullion";

const cache: BullionCache = {
  rates: null,
  chartData: null,
  lastFetched: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms
const MIN_EXTERNAL_INTERVAL = 15 * 1000; // 15 seconds minimum between API calls
let lastExternalFetchTime = 0;
const GRAMS_PER_TROY_ONCE = 31.1034768;

// Indian retail overhead multipliers (duty, handling, margins)
const GOLD_INDIA_MULTIPLIER = 1.15626;
const SILVER_INDIA_MULTIPLIER = 1.3072;

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
 * Fetch and process live bullion prices from CoinGecko
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
    const cgRes = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,kinesis-silver&vs_currencies=inr",
      {
        headers: { Accept: "application/json" },
        timeout: 3000,
      }
    );

    const priceData = cgRes.data;
    const goldOunceINR: number | undefined = priceData["pax-gold"]?.inr;
    const silverOunceINR: number | undefined = priceData["kinesis-silver"]?.inr;

    if (!goldOunceINR || !silverOunceINR) {
      throw new Error("Invalid data format from CoinGecko");
    }

    // 2. Fetch historical rates (days)
    const [goldHistRes, silverHistRes] = await Promise.all([
      axios.get(
        `https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=inr&days=${days}&interval=daily`,
        { timeout: 4000 }
      ),
      axios.get(
        `https://api.coingecko.com/api/v3/coins/kinesis-silver/market_chart?vs_currency=inr&days=${days}&interval=daily`,
        { timeout: 4000 }
      ),
    ]);

    const goldHistory: [number, number][] = goldHistRes.data.prices || [];
    const silverHistory: [number, number][] = silverHistRes.data.prices || [];

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
    const platinumPT950 = Math.round(gold24K * 0.2127); // Platinum ratio relative to gold

    // Calculate daily changes based on history (yesterday vs today)
    let goldChange = -11; // default fallback if history is less than 2
    let silverChange = -2.0; // default fallback if history is less than 2
    let platinumChange = -5.0; // default fallback if history is less than 2

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
      silverChange = parseFloat((todaySilver - yesterdaySilver).toFixed(1));
    }
    platinumChange = parseFloat((goldChange * 0.2127).toFixed(1));

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

    // 4. Compile chart data
    const chartData: ChartDataPoint[] = [];
    const minLen = Math.min(goldHistory.length, silverHistory.length);

    for (let i = 0; i < minLen; i++) {
      const time = goldHistory[i][0];
      const gPriceOunce = goldHistory[i][1];
      const sPriceOunce = silverHistory[i][1];

      const dateStr = new Date(time).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
      const gG = Math.round(
        (gPriceOunce / GRAMS_PER_TROY_ONCE) * GOLD_INDIA_MULTIPLIER
      );
      const sS = Math.round(
        (sPriceOunce / GRAMS_PER_TROY_ONCE) * SILVER_INDIA_MULTIPLIER
      );
      const pP = Math.round(gG * 0.2127);

      chartData.push({
        date: dateStr,
        Gold: gG,
        Silver: sS,
        Platinum: pP,
      });
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
    console.error(
      "[BULLION SERVICE] Fetching bullion rates failed. Error:",
      error
    );

    return {
      success: false,
      error: `Failed to fetch live bullion prices: ${errorMsg}`,
    };
  }
}
