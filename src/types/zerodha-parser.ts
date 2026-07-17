export interface ZerodhaHoldingParsed {
  holdingType: "equity" | "mutual_fund";
  symbol: string;
  isin: string;
  sector: string | null;
  instrumentType: string | null;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  frozenQuantity?: number | null;
  pledgedQuantity?: number | null;
  pledgeSetupQuantity?: number | null;
  freeQuantity?: number | null;
  lockinQuantity?: number | null;
  lockinDate?: string | null;
  balanceDescription?: string | null;
}

export interface ZerodhaParseResult {
  asOfDate: string;
  holdings: ZerodhaHoldingParsed[];
}
