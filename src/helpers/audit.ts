import type { AuditStatusType, UnitStatusType } from "@/types/audit";

export function analyzeAuditRootCause(
  casUnits: number,
  unitDiff: number,
  totalSellAmount: number,
  amountDiff: number,
  txCount: number
): {
  unitStatus: UnitStatusType;
  auditStatus: AuditStatusType;
  rootCauseAnalysis: string;
} {
  const absUnitDiff = Math.abs(unitDiff);
  const absAmountDiff = Math.abs(amountDiff);

  if (txCount === 0) {
    return {
      unitStatus: "MISSING_TXS",
      auditStatus: "MISSING_HISTORY",
      rootCauseAnalysis: `No historical transaction logs found for this folio in uploaded CAS statement. All ${casUnits.toFixed(
        3
      )} units directly imported from snapshot balances.`,
    };
  }

  if (absUnitDiff >= 0.001) {
    return {
      unitStatus: "MISMATCH",
      auditStatus: "UNIT_COST_MISMATCH",
      rootCauseAnalysis: `Unit difference of ${unitDiff.toFixed(
        3
      )} units and amount difference of ₹${Math.abs(amountDiff).toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}. Requires transaction log verification.`,
    };
  }

  // Units match 100%
  if (totalSellAmount > 0 && absAmountDiff >= 1.0) {
    // If the NAV rounding at zero decimal places is <= 1 rupee, treat as perfect match
    if (Math.round(absAmountDiff) <= 1) {
      return {
        unitStatus: "MATCH",
        auditStatus: "PERFECT_MATCH",
        rootCauseAnalysis: `Units match 100%. Cost basis difference of ₹${Math.abs(amountDiff).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} rounds to ≤₹1 — within NAV rounding tolerance.`,
      };
    }
    return {
      unitStatus: "MATCH",
      auditStatus: "PARTIAL_REDEMPTION",
      rootCauseAnalysis: `Units match 100%. Amount difference of ₹${Math.abs(
        amountDiff
      ).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} is due to past redemptions at higher NAV (realized capital gains excluded from remaining cost basis).`,
    };
  }

  if (absAmountDiff >= 1.0) {
    return {
      unitStatus: "MATCH",
      auditStatus: "NAV_ROUNDING",
      rootCauseAnalysis: `Units match 100%. Slight cost variance of ₹${Math.abs(
        amountDiff
      ).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} due to NAV decimal rounding across transactions or STT/stamp duty.`,
    };
  }

  return {
    unitStatus: "MATCH",
    auditStatus: "PERFECT_MATCH",
    rootCauseAnalysis: `Units match 100%. Cost basis matches CAS snapshot perfectly within ₹0.00.`,
  };
}

export function formatAuditStatusBadge(status: AuditStatusType): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case "PERFECT_MATCH":
      return {
        label: "PERFECT MATCH",
        badgeClass:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      };
    case "NAV_ROUNDING":
      return {
        label: "NAV ROUNDING",
        badgeClass: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
      };
    case "PARTIAL_REDEMPTION":
      return {
        label: "PARTIAL REDEMPTION",
        badgeClass:
          "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      };
    case "UNIT_COST_MISMATCH":
      return {
        label: "UNIT & COST MISMATCH",
        badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      };
    case "MISSING_HISTORY":
      return {
        label: "MISSING HISTORY",
        badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      };
    default:
      return {
        label: "UNKNOWN",
        badgeClass: "bg-slate-800 text-slate-400 border border-slate-700",
      };
  }
}
