import type { HoldingDetails } from "@/types/portfolio";

export interface MemberSummary {
  name: string;
  pan: string | null;
  invested: number;
  currentValue: number;
  gain: number;
  cagr: number;
  xirr: number;
}

export interface AllocationClientProps {
  memberSummaries: MemberSummary[];
  holdings: (HoldingDetails & { xirr: number; alpha: number })[];
  categoryAllocation: { name: string; value: number }[];
  capAllocation: { name: string; value: number }[];
  amcAllocation: { name: string; value: number }[];
  totals: {
    invested: number;
    currentValue: number;
    gain: number;
    absoluteReturn: number;
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  };
  selectedReport: { id: number; asOfDate: string } | null;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      pct?: number;
    };
  }>;
}

export type SortOrder = "asc" | "desc";

export type SortState = { col: string; dir: SortOrder };

export type SortableRecord = Record<string, string | number>;

export const ALLOCATION_PALETTE = [
  "#22c55e",
  "#3b82f6",
  "#1d4ed8",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
];

export const ALLOCATION_BG_CLASSES = [
  "bg-green-500",
  "bg-blue-500",
  "bg-blue-700",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-lime-500",
];

export interface PageProps {
  searchParams: Promise<{ reportId?: string }>;
}
