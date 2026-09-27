import type {
  AssetAllocation,
  FactsheetChartPoint,
  FactsheetProfile,
  VolatilityMeasures,
} from "./portfolio";
import type { StockFundamentalsData } from "./stock-fundamentals";
import type {
  RollingReturnsSummary,
  RollingReturnDataPoint,
} from "./rollingReturns";
import type { NavPoint } from "./alpha";
import type {
  WatchlistVroRiskData,
  WatchlistVroReturnsData,
  WatchlistVroPortfolioData,
} from "./watchlist";

export interface FactsheetRawAssetAllocation {
  equity?: number;
  debt?: number;
  cash?: number;
  others?: number;
  rawBreakdown?: Record<string, number>;
}

export interface ParsedPoint {
  dateStr: string;
  time: number;
  year: number;
  month: number; // 0-indexed
  day: number;
  nav: number;
}

export interface YoyReturnItem {
  periodLabel: string;
  startDate: string;
  endDate: string;
  startNav: number;
  endNav: number;
  fundReturn: number;
  benchmarkReturn: number | null;
  alpha: number | null;
  isPartial: boolean;
}

export interface FundYoyReturnsCardProps {
  navHistory: NavPoint[];
  benchmarkNavHistory?: NavPoint[];
  benchmarkName?: string;
  schemeName?: string;
  isStock?: boolean;
}

export interface CustomYoyTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: YoyReturnItem;
  }>;
  label?: string;
  isStock?: boolean;
}

export interface FundTransactionItem {
  id: number;
  memberId: number | null;
  schemeId: number | null;
  folioNo?: string | null;
  date: string;
  type: string;
  transactionType?: string | null;
  rawTransactionType?: string | null;
  units: number;
  nav: number;
  amount: number;
  stampDuty?: number | null;
  stt?: number | null;
  sourceReportId?: number | null;
  broker?: string | null;
  assetType?: string | null;
  uploadedAt?: string | null;
}

export interface AthOpportunityCardProps {
  athNav: number;
  athDateFormatted: string;
  currentNav: number;
  correctionPct: number;
  daysSinceAth: number;
  isLumpsumOpportunity: boolean;
  schemeName?: string | null;
  isStock?: boolean;
}

export interface FundAthMetrics {
  athNav: number;
  athDate: string;
  athDateFormatted: string;
  currentNav: number;
  correctionPct: number;
  daysSinceAth: number;
  isLumpsumOpportunity: boolean;
}

export interface FundDetailsClientProps {
  holding: HoldingDetails;
  transactions: FundTransactionItem[];

  metrics: {
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  };
  athMetrics?: FundAthMetrics | null;
  factsheetMeta: {
    profile: FactsheetProfile;
    allocation: AssetAllocation;
  };
  volatilityStats: VolatilityMeasures;
  chartData: FactsheetChartPoint[];
  fundNavHistory?: NavPoint[];
  benchNavHistory?: NavPoint[];
  earliestFundDateStr?: string | null;
  earliestBenchDateStr?: string | null;
  schemeCodeApi: string;
  benchmarkCode: string;
  holdingType?: string;
  source?: string;
  categoryRankingsData?: SchemeCategoryRankingsData | null;
  stockFundamentalsData?: StockFundamentalsData | null;
  rollingReturns?: RollingReturnsSummary | null;
  vroRisk?: WatchlistVroRiskData | null;
  vroReturns?: WatchlistVroReturnsData | null;
  vroPortfolio?: WatchlistVroPortfolioData | null;
  vroUrl?: string | null;
  lastVroSyncedAt?: string | null;
}

export type FundDetailsPageData = FundDetailsClientProps;

interface CustomTooltipPoint {
  date: string;
  timestamp: number;
  fundNav: number;
  benchNav: number | null;
  fundReturn: number;
  benchReturn: number | null;
  txs?: Array<{ type: string; amount: number }>;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number | null;
    name: string;
    payload: CustomTooltipPoint;
  }>;
  benchmarkName?: string;
}

export interface ChartActiveDotProps {
  cx?: number;
  cy?: number;
  payload?: {
    fundReturn?: number;
    benchReturn?: number | null;
  };
}

export interface FundPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface HoldingDetails {
  id: number;
  schemeId: number | null;
  memberId: number | null;
  schemeName: string | null;
  category: string | null;
  schemeCodeApi: string | null;
  folioNo?: string | null;
  balanceUnits: number;
  purchaseNav: number;
  purchaseValue: number;
  currentNav: number;
  currentValue: number;
  dividend: number | null;
  gain: number;
  holdingDays: number;
  absoluteReturn: number;
  cagr: number;
  comments: string | null;
  memberName: string | null;
  memberPan: string | null;
  asOfDate: string | null;
  holdingType?: string;
  isin?: string | null;
  reportId?: number | null;
  sector?: string | null;
  marketCapCategory?: string | null;
  frozenQuantity?: number | null;
  pledgedQuantity?: number | null;
  pledgeSetupQuantity?: number | null;
  freeQuantity?: number | null;
  lockinQuantity?: number | null;
  lockinDate?: string | null;
  balanceDescription?: string | null;
  annualisedReturn?: number | null;
  clientId?: string | null;
  athNav?: number | null;
  athDate?: string | null;
  athCorrectionPct?: number | null;
  athDaysDiff?: number | null;
  isLumpsumOpportunity?: boolean;
}

export interface EntryPointMarker {
  timestamp: number;
  fundReturn: number;
  nav: number;
  label: string;
  txType: "BUY" | "SELL";
}

export type FundTimeframe =
  "3m" | "6m" | "1y" | "3y" | "5y" | "all" | "invDate" | "custom";

export interface FundDetailsHeaderProps {
  holding: HoldingDetails;
  isStock: boolean;
  cleanCategory: string;
  isRefreshingGlobal: boolean;
  onGlobalRefresh: () => Promise<void>;
  onBack: () => void;
  categoryRankingsData?: SchemeCategoryRankingsData | null;
}

export interface FundDetailsMetricCardsProps {
  holding: HoldingDetails;
  metrics: {
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  };
  hasHoldingDays: boolean;
  isStock: boolean;
}

export interface FundAthOpportunityCardProps {
  athMetrics: FundAthMetrics;
  schemeName?: string | null;
  isStock?: boolean;
}

export interface HistoricalReturnsChartCardProps {
  holding: HoldingDetails;
  transactions: FundDetailsClientProps["transactions"];
  factsheetMeta: FundDetailsClientProps["factsheetMeta"];
  currentChartData: FactsheetChartPoint[];
  earliestFundDateStr?: string | null;
  earliestBenchDateStr?: string | null;
  isStock: boolean;
  isApproximateProxy: boolean;
  schemeCodeApi: string;
  benchmarkCode: string;
  holdingType?: string;
  source?: string;
}

export interface FactsheetPanelsProps {
  holding: HoldingDetails;
  transactions: FundDetailsClientProps["transactions"];
  athMetrics?: FundAthMetrics | null;
  factsheetMeta: FundDetailsClientProps["factsheetMeta"];
  currentVolatilityStats: VolatilityMeasures;
  cleanCategory: string;
  isStock: boolean;
  isDebt: boolean;
  categoryRankingsData?: SchemeCategoryRankingsData | null;
  schemeCodeApi?: string;
  stockFundamentalsData?: StockFundamentalsData | null;
  rollingReturns?: RollingReturnsSummary | null;
  chartData?: FactsheetChartPoint[];
  fundNavHistory?: NavPoint[];
  benchNavHistory?: NavPoint[];
  benchmarkCode?: string;
  vroRisk?: WatchlistVroRiskData | null;
  vroReturns?: WatchlistVroReturnsData | null;
  vroPortfolio?: WatchlistVroPortfolioData | null;
  vroUrl?: string | null;
  lastVroSyncedAt?: string | null;
  onOpenVroModal?: () => void;
  onSyncVro?: () => Promise<void>;
  isRefreshingVro?: boolean;
}

export interface GrowwAdvancedRatiosData {
  top5?: string | null;
  top20?: string | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  alpha?: number | null;
  beta?: number | null;
  sharpe?: number | null;
  sortino?: number | null;
  stdDev?: number | null;
  rSquared?: number | null;
}

export interface GrowwMarketCapData {
  largeCap: number;
  midCap: number;
  smallCap: number;
}

export interface GrowwAssetAllocationData {
  equity: number;
  debt: number;
  cash: number;
  realEstate?: number;
  commodities?: number;
  hedgedEquity?: number;
  others?: number;
  rawBreakdown?: Record<string, number>;
}

interface GrowwExitLoadTaxData {
  exitLoad: string | null;
  stampDuty: string | null;
  taxImplication: string | null;
}

export interface ReturnsRankingsTableData {
  horizons: string[];
  fundReturns: Record<string, string>;
  categoryAvg: Record<string, string>;
  categoryRank: Record<string, string>;
}

export interface CategoryBenchmarkRatios {
  categoryName: string;
  source: string;
  top5?: string | null;
  top20?: string | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  alpha?: number | null;
  beta?: number | null;
  sharpe?: number | null;
  sortino?: number | null;
  stdDev?: number | null;
  rSquared?: number | null;
  sampleFundCount?: number;
  lastSyncedAt: string;
}

export interface SchemeCategoryRankingsData {
  schemeCode: string;
  schemeName: string;
  categoryName: string;
  growwSlug?: string | null;
  annualised: ReturnsRankingsTableData | null;
  absolute: ReturnsRankingsTableData | null;
  advancedRatios?: GrowwAdvancedRatiosData | null;
  categoryRatios?: CategoryBenchmarkRatios | null;
  marketCap?: GrowwMarketCapData | null;
  assetAllocation?: GrowwAssetAllocationData | null;
  exitLoadTax?: GrowwExitLoadTaxData | null;
  expenseRatio?: number | null;
  lastScrapedAt: string;
}

export interface FundReturnsAndRankingsCardProps {
  schemeCode: string;
  schemeName: string;
  categoryName: string;
  initialRankingsData: SchemeCategoryRankingsData | null;
  onDataUpdated?: (data: SchemeCategoryRankingsData) => void;
}

export interface FundAdvancedRatiosCardProps {
  schemeCode?: string;
  schemeName?: string;
  categoryName?: string;
  advancedRatios?: GrowwAdvancedRatiosData | null;
  categoryRatios?: CategoryBenchmarkRatios | null;
  volatilityStats: VolatilityMeasures;
  benchmarkName?: string;
  lastScrapedAt?: string;
  onDataUpdated?: (data: SchemeCategoryRankingsData) => void;
}

export interface StockInsightsPanelsProps {
  stockData: StockFundamentalsData | null;
  symbol: string;
  currentPrice?: number;
  listingDate?: string;
  indexBenchmark?: string;
  sector?: string;
  marketCapCategory?: string;
}

export interface FundRollingReturnsCardProps {
  rollingReturns?: RollingReturnsSummary | null;
  holdingName?: string | null;
  isStock?: boolean;
}

export interface CustomRollingTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number | null;
    name: string;
    payload: RollingReturnDataPoint;
  }>;
  benchmarkName?: string;
  horizonLabel: string;
}

export interface SchemeRankingsMapItem {
  schemeCode: string;
  schemeName: string;
  categoryName: string | null;
  expenseRatio: number | null;
  rank1Y: number | null;
  rank3Y: number | null;
  rank5Y: number | null;
  rank6M: number | null;
  rank3M: number | null;
  rank1M: number | null;
  rank10Y: number | null;
  fundReturn5Y: number | null;
  categoryAvg5Y: number | null;
  alpha5Y: number | null;
  fundReturn3Y: number | null;
  categoryAvg3Y: number | null;
  alpha3Y: number | null;
  fundReturn1Y: number | null;
  categoryAvg1Y: number | null;
  alpha1Y: number | null;
  fundReturn6M: number | null;
  categoryAvg6M: number | null;
  alpha6M: number | null;
  fundReturn3M: number | null;
  categoryAvg3M: number | null;
  alpha3M: number | null;
  fundReturn1M: number | null;
  categoryAvg1M: number | null;
  alpha1M: number | null;
  fundReturn10Y: number | null;
  categoryAvg10Y: number | null;
  alpha10Y: number | null;
  bestRank: { rank: number; horizon: string } | null;
  primaryRank: { rank: number; horizon: string } | null;
  allRanks: Record<string, string>;
}

export interface ChartDataResponse {
  chartData: FactsheetChartPoint[];
  earliestFundDateStr: string | null;
  earliestBenchDateStr: string | null;
}

export type CaptureTimeframe = "1Y" | "3Y" | "5Y" | "ALL";

export interface CaptureRatioResult {
  upsideCapture: number;
  downsideCapture: number;
  captureRatio: number;
  captureSpread: number;
  upPeriodsCount: number;
  downPeriodsCount: number;
  totalPeriodsCount: number;
  fundUpReturnAnnualized: number;
  benchUpReturnAnnualized: number;
  fundDownReturnAnnualized: number;
  benchDownReturnAnnualized: number;
  verdictTitle: string;
  verdictDescription: string;
  verdictBadgeClass: string;
}

export interface FundCaptureRatioCardProps {
  fundNavHistory: Array<{ date: string; nav: number | string }>;
  benchNavHistory: Array<{ date: string; nav: number | string }>;
  benchmarkName?: string | null;
  schemeName?: string | null;
}

export interface HistoricalChartLabelBadgeProps {
  viewBox?: { x?: number; y?: number };
  value?: string;
}
