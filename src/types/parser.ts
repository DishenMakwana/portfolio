export interface HoldingParsed {
  schemeName: string;
  folioNo: string;
  balanceUnits: number;
  purchaseNav: number;
  purchaseValue: number;
  currentNav: number;
  currentValue: number;
  dividend: number;
  gain: number;
  holdingDays: number;
  absoluteReturn: number;
  cagr: number;
  comments: string | null;
  category: string;
  memberName: string;
  memberPan: string;
}

export interface ParseResult {
  asOfDate: string;
  holdings: HoldingParsed[];
  familyCagr?: number;
  memberCagrs?: { memberName: string; cagr: number }[];
}
