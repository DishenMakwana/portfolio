import axios from "axios";
import type { MfDetailsResponse, MfSearchResult } from "@/types/mf-api";

export function isSpecializedFundSchemeCode(
  schemeCode: string | null | undefined
): boolean {
  return Boolean(schemeCode?.toUpperCase().includes("SIF"));
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
 * Custom retry helper for axios with exponential backoff
 */
async function axiosGetWithRetry<T>(
  url: string,
  timeoutMs: number,
  retries: number,
  backoffMs: number
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const response = await axios.get<T>(url, {
        headers: {
          Accept: "application/json",
        },
        timeout: timeoutMs,
      });
      return response.data;
    } catch (error: unknown) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      const delay = backoffMs * Math.pow(2, attempt - 1);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[AXIOS RETRY] Request to "${url}" failed (Attempt ${attempt}/${retries + 1}). Retrying in ${delay}ms... Reason: ${errorMsg}`
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
): Promise<MfSearchResult[]> {
  if (!query || query.trim().length < 3) return [];
  const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`;
  try {
    await throttleRequest();
    const data = await axiosGetWithRetry<MfSearchResult[]>(url, 4000, 1, 500);
    return Array.isArray(data) ? data : [];
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`Error searching MF API at "${url}":`, errorMsg);
    return [];
  }
}

/**
 * Fetch scheme details and historical NAVs by scheme code
 */

export async function fetchMfDetails(
  schemeCode: string,
  startDate?: string,
  endDate?: string
): Promise<MfDetailsResponse | null> {
  if (!schemeCode) return null;
  if (isSpecializedFundSchemeCode(schemeCode)) return null;

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
    return await axiosGetWithRetry<MfDetailsResponse>(url, 15000, 2, 1000);
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
    return null;
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

  const searchResults = await searchMutualFund(cleanName.slice(0, 30));
  if (searchResults.length === 0) return null;

  // Let's find the best string match
  let bestMatch = searchResults[0];
  let highestScore = 0;

  for (const result of searchResults) {
    const score = calculateStringSimilarity(
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
