import type { OverviewHolding } from "@/types/portfolio";

export const OVERVIEW_COLORS = [
  "#10b981",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#ef4444",
];

export const OVERVIEW_BG_CLASSES = [
  "bg-teal-600",
  "bg-violet-500",
  "bg-blue-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-red-500",
];

export const OVERVIEW_GRAD_CLASSES = [
  "from-teal-600 to-blue-500",
  "from-violet-500 to-pink-500",
  "from-blue-500 to-amber-500",
  "from-pink-500 to-emerald-500",
  "from-amber-500 to-red-500",
  "from-emerald-500 to-teal-600",
  "from-red-500 to-violet-500",
];

export interface OverviewTabProps {
  totals: {
    currentValue: number;
    invested: number;
    gain: number;
    absoluteReturn: number;
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
    cagr?: number | null;
  };
  metricDeltas: {
    previousDate: string | null;
    portfolioXirr: number | null;
    benchmarkXirr: number | null;
    alpha: number | null;
    cagr: number | null;
    currentValueDiff: number | null;
    investedDiff: number | null;
  };
  timelineData: {
    date: string;
    invested: number;
    value: number;
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  }[];
  categoryAllocation: { name: string; value: number }[];
  amcAllocation: { name: string; value: number }[];
  capAllocation: { name: string; value: number }[];
  memberSummaries: {
    name: string;
    pan: string | null;
    invested: number;
    currentValue: number;
    gain: number;
    cagr: number;
    xirr: number;
    alpha: number;
    cagrDelta: number | null;
    xirrDelta: number | null;
    alphaDelta: number | null;
  }[];
  holdings: OverviewHolding[];
}

export interface CustomTooltipItem {
  name: string;
  value: number;
  dataKey?: string;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipItem[];
  label?: string;
}

export interface PageProps {
  searchParams: Promise<{ reportId?: string }>;
}
