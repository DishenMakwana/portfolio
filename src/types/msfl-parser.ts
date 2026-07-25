export interface MsflHoldingParsed {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  faceValue?: number | null;
  tradingStatus?: string | null;
}

export interface MsflParseResult {
  asOfDate: string;
  holdings: MsflHoldingParsed[];
}
