export type MsflSortField =
  | "symbol"
  | "quantity"
  | "averagePrice"
  | "currentPrice"
  | "investedValue"
  | "currentValue"
  | "unrealizedPnl"
  | "cagr"
  | "alpha";

export interface MsflScheme {
  id: number;
  name: string;
  category: string;
  schemeCodeApi: string | null;
  mappedAt: string | null;
}

export interface MsflBenchmarkReturns {
  benchmarkCode: string;
  benchmarkName: string;
  endDate: string;
  endNav: number;
  return1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
}

export interface MsflInsightsData {
  reportDate: string | null;
  benchmarkReturns: MsflBenchmarkReturns;
  weightedCagr: number | null;
  movers: {
    topGainers: Array<{ symbol: string; returnPct: number; gain: number }>;
    laggards: Array<{ symbol: string; returnPct: number; gain: number }>;
  };
  previousSnapshot: {
    date: string | null;
    investedChange: number;
    currentValueChange: number;
    gainChange: number;
    returnPctChange: number;
  };
}

export interface MsflHoldingData {
  id: number;
  reportId: number | null;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  xirr?: number | null;
  cagr?: number | null;
  alpha?: number | null;
}

export interface MsflDashboardData {
  reportsList: {
    id: number;
    asOfDate: string;
    filename: string;
    uploadedAt: string;
  }[];
  selectedReport: {
    id: number;
    asOfDate: string;
    filename: string;
    uploadedAt: string;
  } | null;
  holdings: MsflHoldingData[];
  totals: {
    invested: number;
    currentValue: number;
    gain: number;
    absoluteReturn: number;
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  };
  metricDeltas: {
    previousDate: string | null;
    portfolioXirr: number | null;
    benchmarkXirr: number | null;
    alpha: number | null;
  };
  insights: MsflInsightsData;
  timelineData: {
    date: string;
    portfolioValue: number;
    nifty55: number;
    nifty50: number;
    portfolioReturn: number;
    niftyReturn: number;
  }[];
}

export interface MsflDashboardClientProps {
  msflData: MsflDashboardData;
  allMsflSchemes: MsflScheme[];
}

export interface PageProps {
  searchParams: Promise<{ msflReportId?: string }>;
}
