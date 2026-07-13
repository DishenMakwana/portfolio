export interface MsflHoldingParsed {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface MsflParseResult {
  asOfDate: string;
  holdings: MsflHoldingParsed[];
}
