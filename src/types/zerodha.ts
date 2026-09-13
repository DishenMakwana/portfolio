import type { TooltipContentProps } from "recharts";
import type { AthCorrectionData } from "./overview";
import type { PortfolioRiskMetrics, SchemeRankingsMapItem } from "./insights";
import type { TaxHarvestingSummary } from "./transactions";
import type { ZerodhaAuditData } from "./zerodhaAudit";

export interface ZerodhaMember {
  id: number;
  clientId: string;
  name: string;
  pan: string | null;
  email: string | null;
  phone: string | null;
}

interface ZerodhaHolding {
  id: number;
  reportId: number | null;
  clientId?: string | null;
  memberName?: string | null;
  holdingType: string;
  symbol: string;
  isin: string;
  sector: string | null;
  marketCapCategory?: string | null;
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
  benchmarkCagr?: number | null;
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
  schemeCodeApi?: string | null;
  folioNo?: string | null;
  athNav?: number | null;
  athDate?: string | null;
  athCorrectionPct?: number | null;
  athDaysDiff?: number | null;
  isLumpsumOpportunity?: boolean;
}

export interface ZerodhaSectorBreakdownItem {
  sector: string;
  investedValue: number;
  currentValue: number;
  gain: number;
  gainPct: number;
  allocationPct: number;
  stockCount: number;
}

export interface ZerodhaMarketCapBreakdownItem {
  category: "Large Cap" | "Mid Cap" | "Small Cap" | "Micro Cap";
  investedValue: number;
  currentValue: number;
  allocationPct: number;
  stockCount: number;
}

export interface ZerodhaSchemeMemberHolding {
  memberId: number | null;
  clientId: string;
  memberName: string;
  holdingId: number;
  quantity: number;
  currentValue: number;
  url: string;
}

export interface ZerodhaScheme {
  id: number;
  name: string;
  category: string;
  schemeCodeApi: string | null;
  isin?: string | null;
  holdingStatus?: "active" | "sold" | "mixed" | "none";
  holdingId?: number | null;
  url?: string | null;
  quantity?: number | null;
  currentValue?: number | null;
  memberHoldings?: ZerodhaSchemeMemberHolding[];
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
    stocksInvestedChange: number;
    stocksCurrentValueChange: number;
    stocksGainChange: number;
    fundsInvestedChange: number;
    fundsCurrentValueChange: number;
    fundsGainChange: number;
  };
  riskMetrics?: PortfolioRiskMetrics;
  stocksRiskMetrics?: PortfolioRiskMetrics;
  fundsRiskMetrics?: PortfolioRiskMetrics;
}

export type ZerodhaAssetFilterKey = "all" | "equity" | "mutual_fund";

export interface ZerodhaPortfolioRiskKpiCardsProps {
  riskMetrics?: PortfolioRiskMetrics;
  stocksRiskMetrics?: PortfolioRiskMetrics;
  fundsRiskMetrics?: PortfolioRiskMetrics;
}

export interface ZerodhaDashboardData {
  firstCasReportDate: string | null;
  members: ZerodhaMember[];
  selectedAccount: string;
  reportsList: ZerodhaReportRow[];
  selectedReport: ZerodhaReportRow | null;
  holdings: ZerodhaHolding[];
  transactions?: ZerodhaTransactionRow[];
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
    stocksXirr: number;
    stocksBenchmarkXirr: number;
    stocksAlpha: number;
    fundsXirr: number;
    fundsBenchmarkXirr: number;
    fundsAlpha: number;
  };
  metricDeltas: {
    previousDate: string | null;
    portfolioXirr: number | null;
    benchmarkXirr: number | null;
    alpha: number | null;
    stocksXirr: number | null;
    stocksBenchmarkXirr: number | null;
    stocksAlpha: number | null;
    fundsXirr: number | null;
    fundsBenchmarkXirr: number | null;
    fundsAlpha: number | null;
    cagr?: number | null;
  };
  sectorAllocation: { name: string; value: number }[];
  categoryAllocation: { name: string; value: number }[];
  sectorBreakdown: ZerodhaSectorBreakdownItem[];
  marketCapBreakdown: ZerodhaMarketCapBreakdownItem[];
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
  athData?: AthCorrectionData;
  taxHarvesting?: TaxHarvestingSummary;
  auditData?: ZerodhaAuditData;
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
  | "alpha"
  | "athCorrectionPct";

export interface ZerodhaDashboardProps {
  data: ZerodhaDashboardData;
  allSchemes: ZerodhaScheme[];
  categoryRankingsMap?: Record<string, SchemeRankingsMapItem>;
}

export interface ZerodhaOverviewTabProps {
  data: ZerodhaDashboardData;
  holdings: ZerodhaHolding[];
  COLORS: string[];
}

export interface ZerodhaBenchmarkCardsProps {
  totals: {
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  };
  metricDeltas: {
    portfolioXirr: number | null;
    benchmarkXirr: number | null;
    alpha: number | null;
  };
  title?: string;
  benchmarkLabel?: string;
}

interface ZerodhaPerformancePoint {
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

export interface ZerodhaAccountFilterPillsProps {
  members: ZerodhaMember[];
  selectedAccount: string;
  onSelect: (account: string) => void;
  className?: string;
}

export interface ZerodhaStocksTabProps {
  stocks: ZerodhaHolding[];
  renderStockSortIcon: (field: ZerodhaStockSortField) => React.ReactNode;
  toggleStockSort: (field: ZerodhaStockSortField) => void;
  stockSortField: ZerodhaStockSortField;
  stockSortOrder: "asc" | "desc";
  formatPrice: (v: number) => string;
  totals?: ZerodhaDashboardData["totals"];
  metricDeltas?: ZerodhaDashboardData["metricDeltas"];
  selectedAccount?: string;
}

export interface ZerodhaFundsTabProps {
  funds: ZerodhaHolding[];
  renderFundSortIcon: (field: ZerodhaFundSortField) => React.ReactNode;
  toggleFundSort: (field: ZerodhaFundSortField) => void;
  fundSortField: ZerodhaFundSortField;
  fundSortOrder: "asc" | "desc";
  totals?: ZerodhaDashboardData["totals"];
  metricDeltas?: ZerodhaDashboardData["metricDeltas"];
  selectedAccount?: string;
  categoryRankingsMap?: Record<string, SchemeRankingsMapItem>;
}

export interface ZerodhaInsightsTabProps {
  data: ZerodhaDashboardData;
}

export interface ZerodhaSnapshotsTabProps {
  reportsList: ZerodhaReportRow[];
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

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType?: string;
  industry?: string;
}

export interface YahooQuoteItem {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
  industryDisp?: string;
  sectorDisp?: string;
}

export interface PageProps {
  searchParams: Promise<{
    zerodhaReportId?: string;
    reportId?: string;
    tab?: string;
    account?: string;
  }>;
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

type ZerodhaCagrAssetType = "mutual_fund" | "equity";

interface ZerodhaHoldingWithCagr {
  id?: number | null;
  clientId?: string | null;
  memberName?: string | null;
  symbol: string;
  cagr: number;
  currentValue: number;
  investedValue: number;
  unrealizedPnl: number;
  holdingDays: number;
  xirr: number;
  benchmarkXirr: number;
}

export interface ZerodhaCagrLeaderboardChartProps {
  holdings: ZerodhaHoldingWithCagr[];
  niftyBenchmark: number;
  cagrAssetType?: ZerodhaCagrAssetType;
}

export interface ZerodhaInsightsHeroCardsProps {
  cagrAssetType: ZerodhaCagrAssetType;
  setCagrAssetType: (type: ZerodhaCagrAssetType) => void;
  mfCount: number;
  stockCount: number;
  activeTotalInvested: number;
  activeCurrentValue: number;
  activeTotalGain: number;
  activeAbsReturn: number;
  activeWeightedCagr: number | null;
  activeCagrDelta: number | null;
  activeInvestedDiff: { sub: string; subColor: string };
  activeCurrentValueDiff: { sub: string; subColor: string };
  benchmarkLabel: string;
  assetTypeLabel: string;
}

export interface ZerodhaInsightsBenchmarkCardProps {
  activeBeatsBenchmark: boolean;
  assetTypeFullLabel: string;
  assetTypeLabel: string;
  activeWeightedCagr: number | null;
  benchmark: number;
}

export interface ZerodhaInsightsSummaryCardProps {
  assetTypeFullLabel: string;
  cagrAssetType: ZerodhaCagrAssetType;
  activeHoldingsCount: number;
  activeCurrentValue: number;
  activeTopPerformer: ZerodhaHoldingWithCagr | null;
}

export interface ZerodhaInsightsOutperformersGridProps {
  activeBeatingList: ZerodhaHoldingWithCagr[];
  activeLaggingList: ZerodhaHoldingWithCagr[];
  assetTypePlural: string;
}

export interface ZerodhaInsightsMarketCapCardProps {
  mfHoldings: ZerodhaHolding[];
  totalCurrentValue: number;
}

export interface ZerodhaTransactionRow {
  id: number;
  date: string;
  schemeName: string;
  category: string | null;
  folioNo: string | null;
  memberName: string;
  clientId: string | null;
  type: string;
  rawTransactionType: string | null;
  units: number;
  nav: number;
  amount: number;
  stampDuty: number | null;
  broker: string | null;
  assetType: string | null;
  schemeId: number | null;
  holdingId?: number | null;
}

export type ZerodhaTab =
  | "overview"
  | "insights"
  | "stocks"
  | "funds"
  | "transactions"
  | "tax-harvesting"
  | "audit"
  | "mapping"
  | "files";

export interface ZerodhaSectorAndCapAnalysisProps {
  sectorBreakdown: ZerodhaSectorBreakdownItem[];
  marketCapBreakdown: ZerodhaMarketCapBreakdownItem[];
}

export type ZerodhaTaxAssetFilterKey = "all" | "equity" | "mutual_fund";

export interface ZerodhaTaxMemberMetrics {
  memberCount: number;
  annualLimit: number;
  harvestableLtcg: number;
  totalNetGain: number;
  exemptionUsed: number;
  remainingLimit: number;
  quotaUsedPct: number;
  taxSaved: number;
  totalLoss: number;
  shortTermLoss: number;
  longTermLoss: number;
  lossShield: number;
  lossLotsCount: number;
  underperformingCount: number;
  stocksHarvestableLtcg?: number;
  fundsHarvestableLtcg?: number;
}

export interface ZerodhaTaxHarvestingTabProps {
  data: ZerodhaDashboardData;
  summary?: TaxHarvestingSummary;
}

export interface ZerodhaTransactionsTabProps {
  transactions: ZerodhaTransactionRow[];
  currentPortfolioValue?: number;
  selectedAccount?: string;
}

export interface AggregatedSchemeHolding {
  schemeId: number;
  totalQuantity: number;
  totalCurrentValue: number;
  primaryHoldingId: number;
  memberHoldings: ZerodhaSchemeMemberHolding[];
}

export interface ZerodhaReportRow {
  id: number;
  asOfDate: string;
  filename: string;
  uploadedAt: string | null;
  clientId: string | null;
  memberId: number | null;
  memberName: string | null;
}
