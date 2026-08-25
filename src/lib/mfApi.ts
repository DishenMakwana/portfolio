import { normalizeSchemeName } from "@/helpers/schemeNormalize";
import type { ActionResult } from "@/types/portfolio";
import axios from "axios";
import type {
  AmfiSifNavRecord,
  MfDetailsResponse,
  MfSearchResult,
} from "@/types/mf-api";
import {
  MF_API_DETAILS_TIMEOUT_MS,
  MF_API_DETAILS_RETRIES,
  MF_API_DETAILS_BACKOFF_MS,
  MF_API_SEARCH_TIMEOUT_MS,
  MF_API_SEARCH_RETRIES,
  MF_API_SEARCH_BACKOFF_MS,
  AMFI_SIF_API_TIMEOUT_MS,
  AMFI_SIF_API_RETRIES,
  AMFI_SIF_API_BACKOFF_MS,
  UPVALY_API_TIMEOUT_MS,
} from "@/types/constants";

export function isSpecializedFundSchemeCode(
  schemeCode: string | number | null | undefined
): boolean {
  if (schemeCode === null || schemeCode === undefined) return false;
  return String(schemeCode).toUpperCase().includes("SIF");
}

let lastRequestTime = 0;

async function throttleRequest(): Promise<void> {
  const minInterval = 500; // 500ms delay between API calls
  const now = Date.now();
  const nextAllowedTime = Math.max(lastRequestTime + minInterval, now);
  lastRequestTime = nextAllowedTime;

  const delay = nextAllowedTime - now;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Custom retry helper for axios with exponential backoff and progressive timeout increasing
 */
async function axiosGetWithRetry<T>(
  url: string,
  initialTimeoutMs: number,
  retries: number,
  backoffMs: number,
  headers?: Record<string, string>
): Promise<T> {
  let attempt = 0;
  while (true) {
    // Progressively increase timeout on each attempt (e.g. 15s -> 22.5s -> 33.75s)
    const currentTimeout = Math.round(
      initialTimeoutMs * Math.pow(1.5, attempt)
    );
    try {
      const response = await axios.get<T>(url, {
        headers: headers || {
          Accept: "application/json",
        },
        timeout: currentTimeout,
      });
      return response.data;
    } catch (error: unknown) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      const delay = backoffMs * Math.pow(2, attempt - 1);
      const nextTimeout = Math.round(initialTimeoutMs * Math.pow(1.5, attempt));
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[AXIOS RETRY] Request to "${url}" failed (Attempt ${attempt}/${retries + 1}, timeout was ${currentTimeout}ms). Retrying in ${delay}ms with increased timeout ${nextTimeout}ms... Reason: ${errorMsg}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Search mutual funds by text query on api.mfapi.in
 */
export async function searchMutualFund(
  query: string
): Promise<ActionResult<MfSearchResult[]>> {
  if (!query || query.trim().length < 3) return { success: true, data: [] };
  const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`;
  try {
    await throttleRequest();
    const data = await axiosGetWithRetry<MfSearchResult[]>(
      url,
      MF_API_SEARCH_TIMEOUT_MS,
      MF_API_SEARCH_RETRIES,
      MF_API_SEARCH_BACKOFF_MS
    );
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`Error searching MF API at "${url}":`, errorMsg);
    return { success: false, error: errorMsg, data: [] };
  }
}

/**
 * Fetch scheme details and historical NAVs by scheme code
 */

export async function fetchMfDetails(
  schemeCode: string,
  startDate?: string,
  endDate?: string
): Promise<ActionResult<MfDetailsResponse>> {
  if (!schemeCode) return { success: false, error: "Scheme code is required" };
  if (isSpecializedFundSchemeCode(schemeCode))
    return {
      success: false,
      error: "Specialized fund scheme codes are not supported",
    };

  const params = new URLSearchParams();
  if (startDate) {
    params.append("startDate", startDate);
    const resolvedEndDate = endDate || new Date().toISOString().split("T")[0];
    params.append("endDate", resolvedEndDate);
  } else if (endDate) {
    params.append("endDate", endDate);
  }
  const queryString = params.toString();
  const url = `https://api.mfapi.in/mf/${schemeCode}${queryString ? `?${queryString}` : ""}`;

  try {
    await throttleRequest();
    const data = await axiosGetWithRetry<MfDetailsResponse>(
      url,
      MF_API_DETAILS_TIMEOUT_MS,
      MF_API_DETAILS_RETRIES,
      MF_API_DETAILS_BACKOFF_MS
    );
    return { success: true, data };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    const isTimeout =
      (e &&
        typeof e === "object" &&
        "code" in e &&
        e.code === "ECONNABORTED") ||
      errorMsg.includes("timeout");
    if (isTimeout) {
      console.warn(
        `[API TIMEOUT] api.mfapi.in timed out fetching details. URL: "${url}". Using cache or fallback.`
      );
    } else {
      console.error(`Error fetching MF details from "${url}":`, errorMsg);
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Auto-fuzzy map scheme name to best scheme code from API
 */
export async function autoMapScheme(
  schemeName: string
): Promise<{ schemeCode: string; confidence: number } | null> {
  // Try searching with the scheme name
  const cleanName = schemeName
    .replace(/Reg(?:ular)?/gi, "")
    .replace(/\(G\)/g, "Growth")
    .replace(/Growth/gi, "")
    .replace(/-*/g, "")
    .trim();

  const searchRes = await searchMutualFund(cleanName.slice(0, 30));
  const searchResults = searchRes.data || [];
  if (!searchRes.success || searchResults.length === 0) return null;

  // Let's find the best string match
  let bestMatch = searchResults[0];
  let highestScore = 0;
  const normInput = normalizeSchemeName(schemeName);

  for (const result of searchResults) {
    const normResult = normalizeSchemeName(result.schemeName);
    const score =
      normInput && normResult && normInput === normResult
        ? 1.0
        : calculateStringSimilarity(
            cleanName.toLowerCase(),
            result.schemeName.toLowerCase()
          );
    if (score > highestScore) {
      highestScore = score;
      bestMatch = result;
    }
  }

  return {
    schemeCode: String(bestMatch.schemeCode),
    confidence: highestScore,
  };
}

function calculateStringSimilarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

function editDistance(s1: string, s2: string): number {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

const AMFI_MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toAmfiDateString(dateInput?: string | Date): string {
  if (!dateInput) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mmm = MONTH_NAMES[now.getMonth()];
    const yyyy = now.getFullYear();
    return `${dd}-${mmm}-${yyyy}`;
  }

  if (dateInput instanceof Date) {
    const dd = String(dateInput.getDate()).padStart(2, "0");
    const mmm = MONTH_NAMES[dateInput.getMonth()];
    const yyyy = dateInput.getFullYear();
    return `${dd}-${mmm}-${yyyy}`;
  }

  const str = String(dateInput).trim();
  // If already DD-MMM-YYYY
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(str)) {
    return str;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    const mIdx = parseInt(m, 10) - 1;
    const mmm = MONTH_NAMES[mIdx] || "Jan";
    return `${d.padStart(2, "0")}-${mmm}-${y}`;
  }
  // If DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split("-");
    const mIdx = parseInt(m, 10) - 1;
    const mmm = MONTH_NAMES[mIdx] || "Jan";
    return `${d.padStart(2, "0")}-${mmm}-${y}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mmm = MONTH_NAMES[parsed.getMonth()];
    const yyyy = parsed.getFullYear();
    return `${dd}-${mmm}-${yyyy}`;
  }

  return str;
}

function fromAmfiDateString(amfiDateStr: string): string | null {
  const parts = amfiDateStr.trim().split("-");
  if (parts.length !== 3) return null;
  const day = parts[0].padStart(2, "0");
  const mon = AMFI_MONTHS[parts[1].toLowerCase()];
  const year = parts[2];
  if (!mon) return null;
  return `${day}-${mon}-${year}`;
}

/**
 * Fetch Specialized Investment Fund (SIF) NAV history directly from AMFI portal
 */
export async function fetchAmfiSifNavHistory(
  startDate?: string,
  endDate?: string,
  mfId?: string | number
): Promise<ActionResult<AmfiSifNavRecord[]>> {
  const fromDt = toAmfiDateString(startDate || "01-Jul-2026");
  const toDt = toAmfiDateString(endDate);

  const baseUrl =
    "https://portal.amfiindia.com/SIF_DownloadNAVHistoryReport.aspx";
  const url = mfId
    ? `${baseUrl}?mf=${mfId}&frmdt=${fromDt}&todt=${toDt}`
    : `${baseUrl}?frmdt=${fromDt}&todt=${toDt}`;

  try {
    await throttleRequest();
    const data = await axiosGetWithRetry<string>(
      url,
      AMFI_SIF_API_TIMEOUT_MS,
      AMFI_SIF_API_RETRIES,
      AMFI_SIF_API_BACKOFF_MS,
      {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/plain, */*",
      }
    );

    const lines = (data || "").split("\n");
    const records: AmfiSifNavRecord[] = [];

    for (const line of lines) {
      const parts = line.split(";");
      if (parts.length >= 8 && parts[0].trim().startsWith("SIF-")) {
        const schemeCode = parts[0].trim();
        const schemeName = parts[1].trim();
        const isin = parts[4].trim() || parts[2].trim() || null;
        const navVal = parseFloat(parts[6].trim());
        const dateStr = fromAmfiDateString(parts[7].trim());

        if (schemeCode && !isNaN(navVal) && dateStr) {
          records.push({
            schemeCode,
            schemeName,
            isin,
            nav: navVal,
            date: dateStr,
          });
        }
      }
    }

    return { success: true, data: records };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`Error fetching AMFI SIF NAVs from "${url}":`, errorMsg);
    return { success: false, error: errorMsg, data: [] };
  }
}

/**
 * Fetch scheme details & historical NAVs for a SIF scheme from AMFI portal
 */
export async function fetchSifMfDetails(
  schemeCode: string,
  startDate?: string,
  endDate?: string
): Promise<ActionResult<MfDetailsResponse>> {
  if (!schemeCode) return { success: false, error: "Scheme code is required" };

  // Resolve aliases if any (e.g. SIF-916 -> SIF-35)
  const lookupCode = schemeCode === "SIF-916" ? "SIF-35" : schemeCode;

  const res = await fetchAmfiSifNavHistory(startDate, endDate);
  if (!res.success || !res.data || res.data.length === 0) {
    return {
      success: false,
      error: res.error || "No SIF data returned from AMFI",
    };
  }

  const matchingRecords = res.data.filter(
    (r) => r.schemeCode === lookupCode || r.schemeCode === schemeCode
  );

  if (matchingRecords.length === 0) {
    return {
      success: false,
      error: `Scheme code ${schemeCode} not found in AMFI SIF feed`,
    };
  }

  // Sort descending by date (latest first)
  matchingRecords.sort((a, b) => {
    const [d1, m1, y1] = a.date.split("-").map(Number);
    const [d2, m2, y2] = b.date.split("-").map(Number);
    return (
      new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
    );
  });

  const first = matchingRecords[0];

  const data: MfDetailsResponse = {
    meta: {
      fund_house:
        first.schemeCode.includes("96") || first.schemeCode.includes("95")
          ? "Sapphire"
          : "iSIF",
      scheme_type: "Specialized Investment Fund",
      scheme_category: "SIF",
      scheme_code: 0,
      scheme_name: first.schemeName,
      isin_growth: first.isin,
    },
    data: matchingRecords.map((r) => ({
      date: r.date,
      nav: String(r.nav),
    })),
  };

  return { success: true, data };
}

/**
 * Fetch mutual fund factsheet details from Upvaly API
 */
export async function fetchUpvalyMfDetails(isin: string): Promise<{
  inceptionDate?: string;
  aum?: number;
  expenseRatio?: number;
  exitLoadMessage?: string;
} | null> {
  if (!isin) return null;
  const url = `https://finapi.upvaly.com/api/mf/isin/${isin}`;
  try {
    const res = await axios.get(url, { timeout: UPVALY_API_TIMEOUT_MS });
    if (res.data?.status === "success" && res.data?.data) {
      const d = res.data.data;
      return {
        inceptionDate: d.inceptionDate || undefined,
        aum: d.aum ? parseFloat(d.aum.replace(/,/g, "")) : undefined,
        expenseRatio: d.expenseRatio ? parseFloat(d.expenseRatio) : undefined,
        exitLoadMessage: d.exitLoadMessage || undefined,
      };
    }
  } catch (error) {
    console.warn(
      `[Upvaly API] Failed to fetch factsheet for ISIN ${isin}:`,
      error
    );
  }
  return null;
}
