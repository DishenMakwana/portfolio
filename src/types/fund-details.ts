import {
  VolatilityMeasures,
  FactsheetProfile,
  AssetAllocation,
  FactsheetChartPoint,
} from "./portfolio";

export interface FundDetailsClientProps {
  holding: HoldingDetails;
  transactions: Array<{
    id: number;
    memberId: number | null;
    schemeId: number | null;
    date: string;
    type: string;
    units: number;
    nav: number;
    amount: number;
    sourceReportId: number | null;
  }>;
  metrics: {
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  };
  factsheetMeta: {
    profile: FactsheetProfile;
    allocation: AssetAllocation;
  };
  volatilityStats: VolatilityMeasures;
  chartData: FactsheetChartPoint[];
  earliestFundDateStr?: string | null;
  earliestBenchDateStr?: string | null;
  schemeCodeApi: string;
  benchmarkCode: string;
  holdingType?: string;
  source?: string;
}

export interface CustomTooltipPoint {
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

export interface FundPageProps {
  params: Promise<{ id: string }>;
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
  frozenQuantity?: number | null;
  pledgedQuantity?: number | null;
  pledgeSetupQuantity?: number | null;
  freeQuantity?: number | null;
  lockinQuantity?: number | null;
  lockinDate?: string | null;
  balanceDescription?: string | null;
  annualisedReturn?: number | null;
}

export interface EntryPointMarker {
  timestamp: number;
  fundReturn: number;
  nav: number;
  label: string;
  txType: "BUY" | "SELL";
}

export type FundTimeframe = "3m" | "6m" | "1y" | "3y" | "5y" | "all";

export interface FundDetailsHeaderProps {
  holding: HoldingDetails;
  isStock: boolean;
  cleanCategory: string;
  isRefreshingGlobal: boolean;
  onGlobalRefresh: () => Promise<void>;
  onBack: () => void;
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
  factsheetMeta: FundDetailsClientProps["factsheetMeta"];
  currentVolatilityStats: VolatilityMeasures;
  cleanCategory: string;
  isStock: boolean;
  isDebt: boolean;
}
