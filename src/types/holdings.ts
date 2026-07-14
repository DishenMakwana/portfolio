export type HoldingsSortField =
  "currentValue" | "xirr" | "alpha" | "gain" | "cagr" | "holdingDays";

export interface Holding {
  id: number;
  schemeId: number;
  memberId: number;
  schemeName: string;
  category: string;
  schemeCodeApi?: string | null;
  folioNo: string;
  balanceUnits: number;
  purchaseNav: number;
  purchaseValue: number;
  currentNav: number;
  currentValue: number;
  gain: number;
  holdingDays: number;
  absoluteReturn: number;
  cagr: number;
  comments: string | null;
  memberName: string;
  memberPan: string | null;
  xirr: number;
  alpha: number;
}

export interface HoldingsMemberSummary {
  name: string;
}

export interface HoldingsTabProps {
  holdings: Holding[];
  memberSummaries: HoldingsMemberSummary[];
  initialMember?: string;
}

export interface PageProps {
  searchParams: Promise<{ reportId?: string; member?: string }>;
}
