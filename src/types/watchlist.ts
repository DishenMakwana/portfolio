import type { ActionResult, FactsheetChartPoint } from "./portfolio";
import type { NavPoint } from "./alpha";
import type { MfSearchResult } from "./mf-api";
import type { CategoryBenchmarkRatios } from "./fund-details";
import type { RollingReturnsSummary } from "./rollingReturns";

export type WatchlistSearchResult = MfSearchResult;

export type WatchlistLumpsumSignal =
  | "DEEP_DIP" // Drawdown >= 10% (Attractive discount / buy zone)
  | "CORRECTION" // Drawdown between 5% and 10%
  | "NEAR_PEAK" // Drawdown between 0.01% and 5%
  | "AT_ATH"; // Current NAV equals or sets new ATH

export interface WatchlistReturns {
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  return1Y: number | null;
  return3Y: number | null;
  return5Y: number | null;
  sinceInception: number | null;
}

export interface WatchlistCategoryRanking {
  horizon: string; // "1Y" | "3Y" | "5Y"
  fundReturn: string;
  categoryAvg: string;
  categoryRank: string;
}

export interface WatchlistAdvancedRatios {
  sharpe?: number | null;
  sortino?: number | null;
  alpha?: number | null;
  beta?: number | null;
  stdDev?: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  rSquared?: number | null;
  top5?: string | null;
  top20?: string | null;
  top5Pct?: string | null;
  top20Pct?: string | null;
}

export interface WatchlistMarketCapSplit {
  largeCap: number;
  midCap: number;
  smallCap: number;
  avgMktCapCr?: number | null;
}

export interface WatchlistAssetAllocation {
  equity: number;
  debt: number;
  cash: number;
  realEstate?: number | null;
  commodities?: number | null;
  others?: number | null;
}

export interface WatchlistExitLoad {
  exitLoad: string | null;
  stampDuty: string | null;
  taxImplication: string | null;
}

export interface WatchlistTopHolding {
  companyName: string;
  sector?: string | null;
  instrument?: string | null;
  assetPct: number;
}

export interface WatchlistItem {
  id: number;
  schemeCode: string;
  schemeName: string;
  fundHouse: string | null;
  category: string | null;
  schemeType: string | null;
  isin: string | null;
  launchDate: string | null;
  aumCr: number | null;
  expenseRatio: number | null;
  exitLoad: string | null;
  fundManager: string | null;
  benchmarkCode: string | null;
  benchmarkName: string | null;
  growwSlug: string | null;
  vroUrl?: string | null;
  riskRating: number | null;
  minLumpsum: number | null;
  minSip: number | null;
  targetDipPct: number | null;
  targetNav: number | null;
  notes: string | null;
  lastFetchedAt: string | null;
  currentNav: number;
  prevNav: number | null;
  oneDayChangePct: number | null;
  athNav: number;
  athDate: string;
  drawdownPct: number;
  daysSinceAth: number;
  lumpsumSignal: WatchlistLumpsumSignal;
  returns: WatchlistReturns;
  rankings: WatchlistCategoryRanking[];
  advancedRatios: WatchlistAdvancedRatios | null;
  marketCap: WatchlistMarketCapSplit | null;
  assetAllocation: WatchlistAssetAllocation | null;
  topHoldings: WatchlistTopHolding[] | null;
  exitLoadTax: WatchlistExitLoad | null;
  vroRisk?: WatchlistVroRiskData | null;
  vroReturns?: WatchlistVroReturnsData | null;
  vroPortfolio?: WatchlistVroPortfolioData | null;
}

export interface WatchlistVroRiskRow {
  label: string;
  meanReturn: string;
  stdDev: string;
  sharpe: string;
  sortino: string;
  beta: string;
  alpha: string;
  informationRatio?: string;
}

export interface WatchlistVroRiskData {
  riskClassification: string;
  asOfDate?: string;
  rows: WatchlistVroRiskRow[];
}

export interface WatchlistVroReturnsRow {
  label: string;
  ytd: string;
  oneDay: string;
  oneMonth: string;
  threeMonth: string;
  sixMonth: string;
  oneYear: string;
  threeYear: string;
  fiveYear: string;
  sevenYear: string;
  tenYear: string;
}

export interface WatchlistVroReturnsData {
  asOfDate?: string;
  rows: WatchlistVroReturnsRow[];
}

export interface WatchlistVroSector {
  sector: string;
  fundPct: number;
  categoryPct: number;
}

export interface WatchlistVroHolding {
  companyName: string;
  sector: string;
  peRatio: number | null;
  assetPct: number;
}

export interface WatchlistVroPortfolioData {
  sectors: WatchlistVroSector[];
  topHoldings: WatchlistVroHolding[];
  marketCap?: {
    largeCap: number;
    midCap: number;
    smallCap: number;
    avgMktCapCr?: number | null;
  } | null;
  asOfDate?: string;
}

export interface WatchlistFundDetails {
  schemeCode: string;
  schemeName: string;
  fundHouse: string | null;
  category: string | null;
  schemeType: string | null;
  isin: string | null;
  launchDate: string | null;
  aumCr: number | null;
  expenseRatio: number | null;
  exitLoad: string | null;
  fundManager: string | null;
  benchmarkCode: string | null;
  benchmarkName: string | null;
  benchmarkFundName?: string | null;
  earliestFundDateStr?: string | null;
  earliestBenchDateStr?: string | null;
  initialChartData?: FactsheetChartPoint[];
  asOfDate?: string | null;
  growwSlug: string | null;
  vroUrl: string | null;
  currentNav: number;
  prevNav: number | null;
  oneDayChangePct: number | null;
  athNav: number;
  athDate: string;
  drawdownPct: number;
  daysSinceAth: number;
  lumpsumSignal: WatchlistLumpsumSignal;
  returns: WatchlistReturns;
  rankings: WatchlistCategoryRanking[];
  advancedRatios: WatchlistAdvancedRatios | null;
  marketCap: WatchlistMarketCapSplit | null;
  assetAllocation: WatchlistAssetAllocation | null;
  topHoldings: WatchlistTopHolding[] | null;
  exitLoadTax: WatchlistExitLoad | null;
  vroRisk: WatchlistVroRiskData | null;
  vroReturns: WatchlistVroReturnsData | null;
  vroPortfolio: WatchlistVroPortfolioData | null;
  lastGrowwSyncedAt: string | null;
  lastVroSyncedAt: string | null;
  navHistory: NavPoint[];
  benchNavHistory?: NavPoint[];
  categoryRatios?: CategoryBenchmarkRatios | null;
  rollingReturns?: RollingReturnsSummary | null;
}

interface WatchlistSummaryMetrics {
  totalFunds: number;
  top1YFund: {
    schemeCode: string;
    schemeName: string;
    return1Y: number;
  } | null;
  lowestExpenseFund: {
    schemeCode: string;
    schemeName: string;
    expenseRatio: number;
  } | null;
  deepDipsCount: number;
  correctionsCount: number;
  average3YReturn: number | null;
}

export interface WatchlistDashboardData {
  summary: WatchlistSummaryMetrics;
  items: WatchlistItem[];
  categories: string[];
  asOfDate: string;
}

export interface WatchlistAddFundInput {
  schemeCode: string;
  schemeName: string;
  fundHouse?: string | null;
  category?: string | null;
  schemeType?: string | null;
  targetDipPct?: number | null;
  targetNav?: number | null;
  notes?: string | null;
}

export type WatchlistSortField =
  | "schemeName"
  | "currentNav"
  | "oneDayChangePct"
  | "return1Y"
  | "return3Y"
  | "return5Y"
  | "drawdownPct"
  | "expenseRatio"
  | "aumCr"
  | "sharpe";

export type WatchlistSortOrder = "asc" | "desc";

export interface WatchlistDashboardProps {
  initialData: WatchlistDashboardData;
}

export interface WatchlistHeroCardsProps {
  summary: WatchlistSummaryMetrics;
  selectedOpportunityFilter: string;
  onSelectOpportunityFilter: (
    filter: "ALL" | "DEEP_DIP" | "CORRECTION"
  ) => void;
}

export interface WatchlistTableProps {
  items: WatchlistItem[];
  categories: string[];
  opportunityFilter: string;
  onOpportunityChange: (
    val: "ALL" | "DEEP_DIP" | "CORRECTION" | "NEAR_PEAK" | "AT_ATH"
  ) => void;
  onRefreshItem: (schemeCode: string) => Promise<void>;
  onDeleteItem: (item: WatchlistItem) => void;
  refreshingCodes: Set<string>;
  onOpenAddModal: () => void;
  onRefreshAll: () => Promise<void>;
  isRefreshingAll: boolean;
}

export interface AddWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingCodes: Set<string>;
}

export interface RemoveWatchlistModalProps {
  isOpen: boolean;
  item: WatchlistItem | null;
  onClose: () => void;
  onConfirm: (schemeCode: string) => Promise<void>;
  isDeleting: boolean;
}

export type WatchlistActionResult<T = void> = ActionResult<T>;

export interface VroUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemeCode: string;
  schemeName: string;
  currentVroUrl: string | null | undefined;
  onSync: (vroUrl?: string) => Promise<void>;
  isSyncing: boolean;
}

export interface WatchlistAthOpportunityCardProps {
  fund: WatchlistFundDetails;
}

export interface WatchlistDetailsClientProps {
  initialFund: WatchlistFundDetails;
}

export interface WatchlistDetailsHeaderProps {
  fund: WatchlistFundDetails;
  onRefreshGroww: () => Promise<void>;
  isRefreshingGroww: boolean;
}

export interface WatchlistPerformanceChartCardProps {
  fund: WatchlistFundDetails;
}

export interface WatchlistPortfolioBreakdownCardProps {
  vroPortfolio: WatchlistVroPortfolioData | null | undefined;
  growwTopHoldings: WatchlistTopHolding[] | null | undefined;
}

export interface WatchlistSchemeProfilePanelsProps {
  fund: WatchlistFundDetails;
  onRefreshGroww?: () => Promise<void>;
  isRefreshingGroww?: boolean;
  onSyncVro?: () => Promise<void>;
  isRefreshingVro?: boolean;
}

export interface WatchlistVroReturnsCardProps {
  returnsData: WatchlistVroReturnsData | null | undefined;
  onOpenVroModal: () => void;
  onSyncVro?: () => Promise<void>;
  isRefreshingVro?: boolean;
  lastVroSyncedAt?: string | null;
}

export interface WatchlistVroRiskCardProps {
  riskData: WatchlistVroRiskData | null | undefined;
  onOpenVroModal: () => void;
  onSyncVro?: () => Promise<void>;
  isRefreshingVro?: boolean;
  lastVroSyncedAt?: string | null;
}

export interface WatchlistDetailsPageProps {
  params: Promise<{ id: string }>;
}
