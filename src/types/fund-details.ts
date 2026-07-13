import {
  OverviewHolding,
  VolatilityMeasures,
  FactsheetProfile,
  AssetAllocation,
  FactsheetChartPoint,
} from "./portfolio";

export interface FundDetailsClientProps {
  holding: OverviewHolding & {
    folioNo?: string | null;
    asOfDate?: string | null;
  };
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
}

export interface CustomTooltipPoint {
  date: string;
  timestamp: number;
  fundNav: number;
  benchNav: number;
  fundReturn: number;
  benchReturn: number;
  txs?: Array<{ type: string; amount: number }>;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: CustomTooltipPoint;
  }>;
  benchmarkName?: string;
}

export interface FundPageProps {
  params: Promise<{ id: string }>;
}