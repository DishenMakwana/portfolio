import { cleanFolioNumber } from "@/helpers/schemeNormalize";
import type { HoldingDetails } from "@/types/portfolio";
import type {
  TransactionRow,
  TransactionSummaryMetrics,
  CashflowReconciliationSummary,
  BaseTransactionLike,
} from "@/types/transactions";

export function isSellTransactionType(type: string): boolean {
  const t = (type || "").toUpperCase().trim();
  return (
    t === "SELL" ||
    t === "REDEMPTION" ||
    t.includes("REDEMPTION") ||
    t.includes("SELL") ||
    t.includes("SWITCH OUT") ||
    t.includes("SWITCH_OUT") ||
    t.includes("SWOUT") ||
    t.includes("SWP") ||
    t.includes("STP OUT") ||
    t.includes("STP_OUT") ||
    t.includes("STPOUT") ||
    t.includes("TRANSFER OUT") ||
    t.includes("TRANSFER_OUT") ||
    t.includes("SYSTEMATIC TRANSFER OUT") ||
    t.includes("SYSTEMATIC_TRANSFER_OUT") ||
    t.includes("TRANS OUT") ||
    t.includes("TOUT")
  );
}

export function isBuyTransactionType(type: string): boolean {
  if (isSellTransactionType(type)) return false;
  const t = (type || "").toUpperCase().trim();
  return (
    t === "BUY" ||
    t === "PURCHASE" ||
    t === "SIP" ||
    t.includes("PURCHASE") ||
    t.includes("BUY") ||
    t.includes("SIP") ||
    t.includes("SWITCH IN") ||
    t.includes("SWITCH_IN") ||
    t.includes("SWIN") ||
    t.includes("STP IN") ||
    t.includes("STP_IN") ||
    t.includes("STPIN") ||
    t.includes("TRANSFER IN") ||
    t.includes("TRANSFER_IN") ||
    t.includes("SYSTEMATIC TRANSFER IN") ||
    t.includes("SYSTEMATIC_TRANSFER_IN") ||
    t.includes("REINVEST") ||
    t.includes("DIVIDEND REINVEST")
  );
}

/**
 * Calculates Stamp Duty for mutual fund transactions in India.
 * Under the Indian Stamp Act amendment, 0.005% stamp duty applies on all
 * mutual fund purchases (Lump sum, SIP, Switch-in, STP-in) effective from 1st July 2020.
 */
export function calculateMutualFundStampDuty(
  type: string,
  amount: number,
  dateStr?: string | null
): number {
  if (!isBuyTransactionType(type)) return 0;
  if (!amount || amount <= 0) return 0;

  // Stamp duty effective since 1st July 2020 (2020-07-01)
  if (dateStr && dateStr < "2020-07-01") {
    return 0;
  }

  // 0.005% = 0.00005, rounded to 2 decimal places
  const duty = amount * 0.00005;
  return Math.round(duty * 100) / 100;
}

/**
 * Computes buy inflow and sell outflow summary metrics for any filtered set of transactions.
 */
export function calculateTransactionSummary(
  transactions: (TransactionRow | BaseTransactionLike)[]
): TransactionSummaryMetrics {
  let totalBuyAmount = 0;
  let totalBuyCount = 0;
  let totalSellAmount = 0;
  let totalSellCount = 0;
  let totalStampDuty = 0;
  let totalStt = 0;

  for (const t of transactions) {
    if (t.type === "BUY") {
      totalBuyAmount += t.amount;
      totalBuyCount++;
    } else if (t.type === "SELL") {
      totalSellAmount += t.amount;
      totalSellCount++;
    }

    if (t.stampDuty) totalStampDuty += t.stampDuty;
    if (t.stt) totalStt += t.stt;
  }

  return {
    totalCount: transactions.length,
    totalBuyAmount,
    totalBuyCount,
    totalSellAmount,
    totalSellCount,
    netInflowAmount: totalBuyAmount - totalSellAmount,
    totalStampDuty,
    totalStt,
  };
}

/**
 * Computes complete 8-card cashflow reconciliation metrics matching the broker statement formula:
 * Net Gain = F - A - B + C + D + E
 * Net Investment = A - D
 */
export function calculateCashflowReconciliation(
  transactions: (TransactionRow | BaseTransactionLike)[],
  currentPortfolioValue: number = 0
): CashflowReconciliationSummary {
  let investmentA = 0;
  let switchInB = 0;
  let switchOutC = 0;
  let redemptionD = 0;
  const divPayoutE = 0;

  for (const t of transactions) {
    const tt = (t.transactionType || "").toLowerCase().trim();
    if (
      tt === "sip" ||
      tt === "purchase" ||
      (t.type === "BUY" &&
        !tt.includes("switch") &&
        !tt.includes("transfer") &&
        !tt.includes("stp"))
    ) {
      investmentA += t.amount;
    } else if (
      tt.includes("switch in") ||
      tt.includes("systematic transfer in") ||
      (t.type === "BUY" && (tt.includes("switch") || tt.includes("transfer")))
    ) {
      switchInB += t.amount;
    } else if (
      tt.includes("switch out") ||
      tt.includes("systematic transfer out") ||
      (t.type === "SELL" && (tt.includes("switch") || tt.includes("transfer")))
    ) {
      switchOutC += t.amount;
    } else if (
      tt === "sell" ||
      tt === "redemption" ||
      (t.type === "SELL" &&
        !tt.includes("switch") &&
        !tt.includes("transfer") &&
        !tt.includes("stp"))
    ) {
      redemptionD += t.amount;
    }
  }

  const currentValueF = currentPortfolioValue;
  const netGain =
    currentValueF -
    investmentA -
    switchInB +
    switchOutC +
    redemptionD +
    divPayoutE;
  const netInvestment = investmentA - redemptionD;

  return {
    investmentA,
    switchInB,
    switchOutC,
    redemptionD,
    divPayoutE,
    currentValueF,
    netGain,
    netInvestment,
  };
}

/**
 * Calculates absolute return % and annualized CAGR % for a transaction relative to current NAV.
 * Methodology matching AMFI / SEBI regulations & Zerodha standards:
 * - Absolute Return = ((currentNav - txNav) / txNav) * 100
 * - For Holding < 30 Days (< 1 Month): Absolute Return (eliminates short-term annualization distortion)
 * - For Holding 30 - 365 Days: Simple Annualized Return = (Absolute Return * 365) / holdingDays
 * - For Holding > 365 Days: Compound CAGR = ((currentNav / txNav) ^ (365 / holdingDays) - 1) * 100
 */
export function calculateTransactionReturns(
  txNav: number,
  currentNav: number,
  holdingDays: number,
  isBuy: boolean = true
): { absReturn: number | null; cagr: number | null } {
  if (!isBuy || txNav <= 0 || currentNav <= 0) {
    return { absReturn: null, cagr: null };
  }

  const absReturn = ((currentNav - txNav) / txNav) * 100;

  let cagr: number | null = null;
  if (holdingDays > 0) {
    if (holdingDays < 30) {
      // Under 30 days: Use actual Absolute Return to prevent extreme mathematical distortion
      cagr = absReturn;
    } else if (holdingDays <= 365) {
      // Simple annualized return for holdings between 30 and 365 days
      cagr = (absReturn * 365) / holdingDays;
    } else {
      // Compound annual growth rate for holdings exceeding 1 year
      cagr = (Math.pow(currentNav / txNav, 365 / holdingDays) - 1) * 100;
    }
  }

  return {
    absReturn: Math.round(absReturn * 100) / 100,
    cagr: cagr !== null ? Math.round(cagr * 100) / 100 : null,
  };
}

/**
 * Enriches transaction rows with matching active holding IDs from the current portfolio report.
 *
 * Matching priority:
 * 1. Exact match on memberId + schemeId + cleanFolioNumber(folioNo)
 * 2. Sub-folio / substring match for the same memberId and schemeId
 * 3. Single holding fallback: If the member has exactly one holding for this scheme in the active report and tx folio is empty
 * 4. Sold/closed fallback: Leaves holdingId as null so the UI can route to /fund/sold_${t.id}
 */
export function enrichTransactionsWithHoldings(
  transactionsList: TransactionRow[],
  holdingsList: HoldingDetails[]
): TransactionRow[] {
  const exactMap = new Map<string, HoldingDetails>();
  const memberSchemeMap = new Map<string, HoldingDetails[]>();

  for (const h of holdingsList) {
    if (h.memberId == null || h.schemeId == null) continue;
    const cleanFolio = cleanFolioNumber(h.folioNo);
    if (cleanFolio) {
      exactMap.set(`${h.memberId}_${h.schemeId}_${cleanFolio}`, h);
    }
    const msKey = `${h.memberId}_${h.schemeId}`;
    const existing = memberSchemeMap.get(msKey);
    if (existing) {
      existing.push(h);
    } else {
      memberSchemeMap.set(msKey, [h]);
    }
  }

  return transactionsList.map((t) => {
    if (t.memberId == null || t.schemeId == null) {
      return { ...t, holdingId: null };
    }

    const tCleanFolio = cleanFolioNumber(t.folioNo);

    // 1. Exact match on member + scheme + clean folio
    if (tCleanFolio) {
      const exact = exactMap.get(`${t.memberId}_${t.schemeId}_${tCleanFolio}`);
      if (exact) {
        const isZero =
          (exact.currentValue ?? 0) <= 0.0001 ||
          (exact.balanceUnits ?? 0) <= 0.0001;
        return {
          ...t,
          holdingId: isZero ? -Math.abs(exact.id) : exact.id,
        };
      }
    }

    // 2. Sub-folio or substring matches for the same member & scheme
    const memberHoldings =
      memberSchemeMap.get(`${t.memberId}_${t.schemeId}`) || [];
    if (tCleanFolio) {
      const subMatch = memberHoldings.find((h) => {
        const hClean = cleanFolioNumber(h.folioNo);
        return (
          hClean &&
          (hClean.includes(tCleanFolio) || tCleanFolio.includes(hClean))
        );
      });
      if (subMatch) {
        const isZero =
          (subMatch.currentValue ?? 0) <= 0.0001 ||
          (subMatch.balanceUnits ?? 0) <= 0.0001;
        return {
          ...t,
          holdingId: isZero ? -Math.abs(subMatch.id) : subMatch.id,
        };
      }
    }

    // 3. Fallback: if member has only 1 holding for this scheme and transaction has no folio
    if (memberHoldings.length === 1 && !tCleanFolio) {
      const single = memberHoldings[0];
      const isZero =
        (single.currentValue ?? 0) <= 0.0001 ||
        (single.balanceUnits ?? 0) <= 0.0001;
      return {
        ...t,
        holdingId: isZero ? -Math.abs(single.id) : single.id,
      };
    }

    // 4. Sold / closed folio / no active holding found
    return {
      ...t,
      holdingId: null,
    };
  });
}
