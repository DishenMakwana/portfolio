import { calculateXIRR, CashFlow } from './xirr';
import { fetchMfDetails, isSpecializedFundSchemeCode, MfDetailsResponse } from './mfApi';
import fs from 'fs';
import path from 'path';

// Local file cache for Mutual Fund NAVs to avoid hitting the API repeatedly
const CACHE_DIR = path.join(process.cwd(), '.cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface BenchmarkCache {
  fetchedAt: string;
  schemeCode: string;
  data: MfDetailsResponse;
}

function normaliseSchemeCode(schemeCode: string | number | null | undefined): string {
  return String(schemeCode || '').trim();
}

function responseMatchesRequestedScheme(data: MfDetailsResponse | null | undefined, schemeCode: string): boolean {
  const responseCode = normaliseSchemeCode(data?.meta?.scheme_code);
  return responseCode === schemeCode;
}

/**
 * Fetch scheme NAV history for the code passed from the database.
 * Cache files are only storage; their filenames are never treated as source-of-truth scheme codes.
 */
async function getSchemeHistoryForDbCode(dbSchemeCode: string): Promise<MfDetailsResponse | null> {
  const schemeCode = normaliseSchemeCode(dbSchemeCode);
  if (!schemeCode || isSpecializedFundSchemeCode(schemeCode)) return null;

  const cachePath = path.join(CACHE_DIR, `scheme_${schemeCode}.json`);

  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as BenchmarkCache;
      const cachedDate = new Date(cached.fetchedAt);
      const now = new Date();
      // Use cache if less than 24 hours old
      if (
        now.getTime() - cachedDate.getTime() < 24 * 60 * 60 * 1000 &&
        normaliseSchemeCode(cached.schemeCode) === schemeCode &&
        responseMatchesRequestedScheme(cached.data, schemeCode)
      ) {
        return cached.data;
      }
    } catch (e) {
      console.error('Error reading NAV cache:', e);
    }
  }

  // Fetch fresh data
  const data = await fetchMfDetails(schemeCode);
  if (data && data.data && data.data.length > 0) {
    try {
      const dir = path.dirname(cachePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        cachePath,
        JSON.stringify({ fetchedAt: new Date().toISOString(), schemeCode, data }, null, 2)
      );
    } catch (e) {
      console.error('Error writing NAV cache:', e);
    }
    return data;
  }

  // Fallback to expired cache if fetch fails
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as BenchmarkCache;
      if (
        normaliseSchemeCode(cached.schemeCode) === schemeCode &&
        responseMatchesRequestedScheme(cached.data, schemeCode)
      ) {
        return cached.data;
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Find the closest NAV on or before a given date
 * dateStr format: YYYY-MM-DD
 */
function findClosestNav(navHistory: { date: string; nav: string }[], targetDateStr: string): number {
  const targetDate = new Date(targetDateStr);
  
  // Sort NAV history from oldest to newest
  // Input dates from API are DD-MM-YYYY
  const parseApiDate = (apiDateStr: string) => {
    const [dd, mm, yyyy] = apiDateStr.split('-');
    return new Date(`${yyyy}-${mm}-${dd}`);
  };

  const sortedNavs = [...navHistory]
    .map(p => ({ date: parseApiDate(p.date), nav: parseFloat(p.nav) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedNavs.length === 0) return 10; // Propose a dummy NAV to prevent division by zero

  let closestNav = sortedNavs[0].nav;
  let closestDateDiff = Infinity;

  for (const point of sortedNavs) {
    const diff = targetDate.getTime() - point.date.getTime();
    
    // We want the closest date that is on or before the target date
    if (diff >= 0 && diff < closestDateDiff) {
      closestDateDiff = diff;
      closestNav = point.nav;
    }
  }

  const MAX_LOOKBACK_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
  if (closestDateDiff > MAX_LOOKBACK_MS) {
    // Check if targetDate is slightly before first NAV (inception fallback)
    const oldestPoint = sortedNavs[0];
    const inceptionDiff = oldestPoint.date.getTime() - targetDate.getTime();
    if (inceptionDiff >= 0 && inceptionDiff <= MAX_LOOKBACK_MS) {
      return oldestPoint.nav;
    }
    console.warn(`[NAV LOOKBACK GAP] Target date ${targetDateStr} is ${Math.round(closestDateDiff / (24*60*60*1000))} days away from nearest NAV. Using closest available.`);
  }

  return closestNav;
}

export interface PortfolioTransaction {
  date: string; // YYYY-MM-DD
  type: 'BUY' | 'SELL';
  amount: number; // Positive absolute value
  units: number;
}

/**
 * Calculates simulated Benchmark XIRR and Alpha for a set of transactions and final value.
 */
export async function calculateAlpha(
  transactions: PortfolioTransaction[],
  asOfDate: string,
  currentValuation: number,
  benchmarkSchemeCode: string = '119598' // SBI Nifty 50 Index Fund Regular Growth
): Promise<{
  portfolioXirr: number;
  benchmarkXirr: number;
  alpha: number;
}> {
  // Sort transactions chronologically, and same-day BUYs before SELLs
  const sortedTxs = [...transactions].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    if (a.type === 'BUY' && b.type === 'SELL') return -1;
    if (a.type === 'SELL' && b.type === 'BUY') return 1;
    return 0;
  });

  // 1. Calculate Portfolio XIRR
  const portfolioCashFlows: CashFlow[] = [];
  
  for (const tx of sortedTxs) {
    // BUY is cash outflow (negative), SELL is cash inflow (positive)
    const amount = tx.type === 'BUY' ? -tx.amount : tx.amount;
    portfolioCashFlows.push({
      amount,
      date: new Date(tx.date),
    });
  }

  // Add the final valuation as a positive cash flow at the report date
  portfolioCashFlows.push({
    amount: currentValuation,
    date: new Date(asOfDate),
  });

  const portfolioXirr = calculateXIRR(portfolioCashFlows);

  if (isSpecializedFundSchemeCode(benchmarkSchemeCode)) {
    return {
      portfolioXirr,
      benchmarkXirr: 0,
      alpha: 0,
    };
  }

  // 2. Fetch Benchmark NAV History
  const benchmarkDetails = await getSchemeHistoryForDbCode(benchmarkSchemeCode);
  if (!benchmarkDetails || !benchmarkDetails.data || benchmarkDetails.data.length === 0) {
    return {
      portfolioXirr,
      benchmarkXirr: 0,
      alpha: 0,
    };
  }

  const navHistory = benchmarkDetails.data;

  // 3. Simulate Investing same cash flows in the Benchmark Index Fund
  let benchmarkUnitsHeld = 0;
  const benchmarkCashFlows: CashFlow[] = [];

  for (const tx of sortedTxs) {
    // Find benchmark NAV on the transaction date
    const nav = findClosestNav(navHistory, tx.date);
    
    if (tx.type === 'BUY') {
      const unitsBought = tx.amount / nav;
      benchmarkUnitsHeld += unitsBought;
      benchmarkCashFlows.push({
        amount: -tx.amount, // cash outflow
        date: new Date(tx.date),
      });
    } else {
      // In case of sell, we redeem equivalent amount from benchmark, clamped to holdings
      let unitsSold = tx.amount / nav;
      if (unitsSold > benchmarkUnitsHeld) {
        unitsSold = benchmarkUnitsHeld;
      }
      benchmarkUnitsHeld -= unitsSold;
      
      // cash inflow reflects simulated redeemed value from index fund
      const simulatedRedeemedAmount = unitsSold * nav;
      benchmarkCashFlows.push({
        amount: simulatedRedeemedAmount,
        date: new Date(tx.date),
      });
    }
  }

  // Get current benchmark NAV as of valuation date
  const finalBenchmarkNav = findClosestNav(navHistory, asOfDate);
  const simulatedBenchmarkValue = benchmarkUnitsHeld * finalBenchmarkNav;

  // Add the final simulated valuation
  benchmarkCashFlows.push({
    amount: simulatedBenchmarkValue,
    date: new Date(asOfDate),
  });

  const benchmarkXirr = calculateXIRR(benchmarkCashFlows);
  const alpha = portfolioXirr - benchmarkXirr;

  return {
    portfolioXirr,
    benchmarkXirr,
    alpha,
  };
}
