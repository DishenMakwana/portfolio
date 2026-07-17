import type { TooltipContentProps } from "recharts";
export interface ZerodhaHolding {
  id: number;
  reportId: number | null;
  holdingType: string;
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
  xirr?: number | null;
  cagr?: number | null;
  holdingDays?: number | null;
  benchmarkXirr?: number | null;
  alpha?: number | null;
  benchmarkCode?: string | null;
  benchmarkName?: string | null;
  frozenQuantity?: number | null;
  pledgedQuantity?: number | null;
  pledgeSetupQuantity?: number | null;
  freeQuantity?: number | null;
  lockinQuantity?: number | null;
  lockinDate?: string | null;
  balanceDescription?: string | null;
}

export interface ZerodhaScheme {
  id: number;
  name: string;
  category: string;
  schemeCodeApi: string | null;
}

export interface ZerodhaBenchmarkReturns {
  benchmarkCode: string;
  benchmarkName: string;
  endDate: string;
  endNav: number;
  return1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
}

export interface ZerodhaInsightsData {
  reportDate: string | null;
  benchmarkReturns: ZerodhaBenchmarkReturns;
  weightedCagr: number | null;
  stockWeight: number;
  fundWeight: number;
  concentration: {
    topHoldingPct: number;
    top3Pct: number;
    top5Pct: number;
  };
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

export interface ZerodhaDashboardData {
  firstCasReportDate: string | null;
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
  holdings: ZerodhaHolding[];
  totals: {
    invested: number;
    currentValue: number;
    gain: number;
    absoluteReturn: number;
    stocksInvested: number;
    stocksCurrentValue: number;
    stocksGain: number;
    fundsInvested: number;
    fundsCurrentValue: number;
    fundsGain: number;
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
  sectorAllocation: { name: string; value: number }[];
  categoryAllocation: { name: string; value: number }[];
  assetSplit: { name: string; value: number }[];
  timelineData: {
    date: string;
    equity: number;
    mutualFunds: number;
    nifty50: number;
    equityReturn: number;
    fundsReturn: number;
    niftyReturn: number;
  }[];
  insights: ZerodhaInsightsData;
}

export const ZERODHA_COLORS = [
  "#10b981",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#ef4444",
];

export type ZerodhaTab =
  "overview" | "insights" | "stocks" | "funds" | "mapping" | "files";

export type ZerodhaStockSortField =
  | "symbol"
  | "quantity"
  | "averagePrice"
  | "currentPrice"
  | "investedValue"
  | "currentValue"
  | "unrealizedPnl"
  | "unrealizedPnlPct"
  | "xirr"
  | "cagr"
  | "alpha";

export type ZerodhaFundSortField =
  | "symbol"
  | "quantity"
  | "averagePrice"
  | "currentPrice"
  | "investedValue"
  | "currentValue"
  | "unrealizedPnl"
  | "unrealizedPnlPct"
  | "xirr"
  | "cagr"
  | "holdingDays"
  | "alpha";

export interface ZerodhaDashboardProps {
  data: ZerodhaDashboardData;
  allSchemes: ZerodhaScheme[];
}

export interface ZerodhaOverviewTabProps {
  data: ZerodhaDashboardData;
  holdings: ZerodhaHolding[];
  COLORS: string[];
}

export interface ZerodhaPerformancePoint {
  date: string;
  equity: number;
  equityReturn: number;
  mutualFunds: number;
  fundsReturn: number;
  nifty50: number;
  niftyReturn: number;
}

export interface CustomPerformanceTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload: ZerodhaPerformancePoint;
  }>;
}

export type SimplePieTooltipProps = TooltipContentProps;

export interface SimplePiePayload {
  name: string;
  value: number;
}

export interface ZerodhaStocksTabProps {
  stocks: ZerodhaHolding[];
  renderStockSortIcon: (field: ZerodhaStockSortField) => React.ReactNode;
  toggleStockSort: (field: ZerodhaStockSortField) => void;
  stockSortField: ZerodhaStockSortField;
  stockSortOrder: "asc" | "desc";
  formatPrice: (v: number) => string;
}

export interface ZerodhaFundsTabProps {
  funds: ZerodhaHolding[];
  renderFundSortIcon: (field: ZerodhaFundSortField) => React.ReactNode;
  toggleFundSort: (field: ZerodhaFundSortField) => void;
  fundSortField: ZerodhaFundSortField;
  fundSortOrder: "asc" | "desc";
}

export interface ZerodhaInsightsTabProps {
  data: ZerodhaDashboardData;
}

export interface SnapshotReport {
  id: number;
  asOfDate: string;
  filename: string;
  uploadedAt: string;
}

export interface ZerodhaSnapshotsTabProps {
  reportsList: SnapshotReport[];
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteReport: (id: number) => void;
  firstCasReportDate?: string | null;
}

export interface ZerodhaAutoMapResult {
  schemeId: number;
  schemeName: string;
  status:
    "mapped" | "low_confidence" | "not_found" | "already_mapped" | "api_error";
  schemeCode: string | null;
  confidence: number | null;
}

export interface PageProps {
  searchParams: Promise<{ zerodhaReportId?: string }>;
}

export const ZERODHA_COLOR_CLASSES = [
  "bg-emerald-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-red-500",
];
