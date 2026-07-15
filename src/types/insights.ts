import type { ElementType } from "react";

export interface BenchmarkReturns {
  benchmarkCode: string;
  benchmarkName: string;
  endDate: string;
  endNav: number;
  return1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
  earliestDate: string | null;
}

export interface InsightsData {
  reportDate: string;
  totals: {
    invested: number;
    current: number;
    gain: number;
    absReturn: number;
    totalMonthlySip: number;
    uniqueSchemes: number;
    memberCount: number;
  };
  memberCagrs: Array<{ memberName: string; cagr: number }>;
  categoryAllocation: Array<{
    category: string;
    invested: number;
    current: number;
    gain: number;
    absReturn: number;
    allocation: number;
  }>;
  schemes: Array<{
    scheme: string;
    category: string;
    invested: number;
    current: number;
    gain: number;
    absReturn: number;
    avgCagr: number;
    memberCount: number;
    holdings: Array<{
      holdingId: number;
      memberName: string;
      invested: number;
      current: number;
      gain: number;
      cagr: number;
      holdingDays: number;
    }>;
  }>;
  sips: Array<{
    member: string;
    scheme: string;
    category: string;
    monthlyAmount: number;
    startMonth: string;
  }>;
  benchmarkReturns: BenchmarkReturns;
  zerodhaHoldings: Array<{
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    holdingType: string | null;
  }>;
  msflHoldings: Array<{
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
  }>;
}

export type Tab =
  "overview" | "funds" | "members" | "sip" | "actions" | "overlaps" | "amc";

export interface AmcPoint {
  name: string;
  invested: number;
  current: number;
  gain: number;
  cagr: number;
  avgHoldingDays: number;
  weight: number;
  xirr: number;
}

export interface HoveredAmcPoint {
  x: number;
  y: number;
  name: string;
  invested: number;
  current: number;
  gain: number;
  cagr: number;
  avgHoldingDays: number;
  weight: number;
  xirr: number;
}

export type SortKey =
  | "scheme"
  | "category"
  | "invested"
  | "current"
  | "gain"
  | "absReturn"
  | "avgCagr"
  | "memberCount";

export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export interface InsightsDashboardProps {
  data: InsightsData;
}

export type MetricAccentColor =
  "indigo" | "teal" | "emerald" | "rose" | "amber";

export interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: ElementType;
  accentColor?: MetricAccentColor;
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface MemberCagrPoint {
  memberName: string;
  cagr: number;
}

export interface HoveredMemberCagrPoint {
  x: number;
  y: number;
  fullName: string;
  cagr: number;
}

export interface CategoryOverlap {
  category: string;
  count: number;
  funds: string[];
}

export interface SubCategoryGroupItem {
  schemeName: string;
  cagr: number;
  holders: string[];
  totalValue: number;
  avgHoldingDays: number;
}
