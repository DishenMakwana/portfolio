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
}

export interface ZerodhaParseResult {
  asOfDate: string;
  holdings: ZerodhaHoldingParsed[];
}
