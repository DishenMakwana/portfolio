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
      folioNo: string;
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
  | "overview"
  | "funds"
  | "members"
  | "sip"
  | "actions"
  | "overlaps"
  | "amc"
  | "category";

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

export type AllocationAnalysisSortKey = keyof AmcPoint;

export interface AllocationAnalysisGroup {
  name: string;
  invested: number;
  current: number;
  gain: number;
  weightedCagrSum: number;
  weightedHoldingDaysSum: number;
  totalCagrWeight: number;
  totalHoldingDaysWeight: number;
}

export interface AllocationAnalysisTabProps {
  analysisData: AmcPoint[];
  niftyBenchmark: number;
  sortKey: AllocationAnalysisSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: AllocationAnalysisSortKey) => void;
  entityLabel: string;
  entityDescription: string;
  title: string;
  downloadPrefix: string;
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
  subColor?: string;
  icon: ElementType;
  accentColor?: MetricAccentColor;
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
}

export interface MemberCagrPoint {
  memberName: string;
  cagr: number;
}

export interface MembersBarChartProps {
  memberCagrs: MemberCagrPoint[];
  niftyBenchmark: number;
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

// ─── Category colour palette (one distinct colour per SEBI category) ───────────
export const CAT_PALETTE = [
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#ec4899", // pink
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fb923c", // orange
  "#f87171", // red
  "#60a5fa", // blue
  "#facc15", // yellow
  "#4ade80", // green
  "#e879f9", // fuchsia
  "#2dd4bf", // teal-light
  "#818cf8", // indigo-light
];

export const CAT_DOT_CLASSES = [
  "bg-teal-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-orange-400",
  "bg-red-400",
  "bg-blue-400",
  "bg-yellow-400",
  "bg-green-400",
  "bg-fuchsia-400",
  "bg-teal-400",
  "bg-indigo-400",
];

export const CAT_GRADIENT_CLASSES = [
  "bg-gradient-to-r from-teal-500 to-teal-400/50",
  "bg-gradient-to-r from-indigo-500 to-indigo-400/50",
  "bg-gradient-to-r from-amber-500 to-amber-400/50",
  "bg-gradient-to-r from-pink-500 to-pink-400/50",
  "bg-gradient-to-r from-cyan-400 to-cyan-300/50",
  "bg-gradient-to-r from-violet-400 to-violet-300/50",
  "bg-gradient-to-r from-emerald-400 to-emerald-300/50",
  "bg-gradient-to-r from-orange-400 to-orange-300/50",
  "bg-gradient-to-r from-red-400 to-red-300/50",
  "bg-gradient-to-r from-blue-400 to-blue-300/50",
  "bg-gradient-to-r from-yellow-400 to-yellow-300/50",
  "bg-gradient-to-r from-green-400 to-green-300/50",
  "bg-gradient-to-r from-fuchsia-400 to-fuchsia-300/50",
  "bg-gradient-to-r from-teal-400 to-teal-300/50",
  "bg-gradient-to-r from-indigo-400 to-indigo-300/50",
];

export const CAT_BADGE_CLASSES = [
  "bg-teal-500/15 text-teal-300 border-teal-500/25",
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
  "bg-amber-500/15 text-amber-300 border-amber-500/25",
  "bg-pink-500/15 text-pink-300 border-pink-500/25",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "bg-orange-500/15 text-orange-300 border-orange-500/25",
  "bg-red-500/15 text-red-300 border-red-500/25",
  "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
  "bg-green-500/15 text-green-300 border-green-500/25",
  "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
  "bg-teal-500/15 text-teal-300 border-teal-500/25",
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
];

export const FALLBACK_DOT_CLASS = "bg-slate-500";

export const FALLBACK_GRADIENT_CLASS =
  "bg-gradient-to-r from-slate-500 to-slate-400/50";

export const FALLBACK_BADGE_CLASS =
  "bg-slate-500/15 text-slate-300 border-slate-500/25";

export const ALLOCATION_ANALYSIS_SORT_KEYS: AllocationAnalysisSortKey[] = [
  "name",
  "weight",
  "current",
  "invested",
  "gain",
  "cagr",
  "avgHoldingDays",
  "xirr",
];
