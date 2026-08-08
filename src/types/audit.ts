export type UnitStatusType = "MATCH" | "MISMATCH" | "MISSING_TXS";

export type AuditStatusType =
  | "PERFECT_MATCH"
  | "NAV_ROUNDING"
  | "PARTIAL_REDEMPTION"
  | "UNIT_COST_MISMATCH"
  | "MISSING_HISTORY";

export type AuditSortField =
  | "memberName"
  | "schemeName"
  | "folioNo"
  | "casBalanceUnits"
  | "txNetUnits"
  | "unitDifference"
  | "casPurchaseValue"
  | "txNetAmount"
  | "amountDifference"
  | "casCurrentValue"
  | "auditStatus";

export type AuditSortOrder = "asc" | "desc";

export interface AuditUrlState {
  searchTerm: string;
  statusFilters: AuditStatusType[];
  memberFilter: string;
  categoryFilter: string;
  sortField: AuditSortField;
  sortOrder: AuditSortOrder;
  viewMode: "compact" | "expanded";
}

export interface AuditHoldingItem {
  holdingId: number;
  isZeroBalance?: boolean;
  isSold?: boolean;
  memberName: string;
  schemeName: string;
  schemeCategory: string;
  folioNo: string;
  casBalanceUnits: number;
  txNetUnits: number;
  unitDifference: number;
  unitStatus: UnitStatusType;
  casPurchaseValue: number;
  txNetAmount: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalStt: number;
  totalStampDuty: number;
  txNetAmountWithCharges: number;
  amountDifference: number;
  casCurrentValue: number;
  auditStatus: AuditStatusType;
  rootCauseAnalysis: string;
}

export interface AuditSummary {
  totalAudited: number;
  perfectMatchCount: number;
  navRoundingCount: number;
  partialRedemptionCount: number;
  unitMismatchCount: number;
  missingTxCount: number;
  totalCasValue: number;
  totalTxNetValue: number;
}

export interface PortfolioAuditData {
  summary: AuditSummary;
  items: AuditHoldingItem[];
}
