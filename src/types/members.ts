import type { OverviewHolding } from "@/types/portfolio";

export interface MemberSummary {
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
}

export interface Totals {
  invested: number;
  currentValue: number;
  gain: number;
  absoluteReturn: number;
  portfolioXirr: number;
  benchmarkXirr: number;
  alpha: number;
  cagr?: number | null;
}

export interface MembersTabProps {
  memberSummaries: MemberSummary[];
  totals: Totals;
  metricDeltas: {
    previousDate: string | null;
    portfolioXirr: number | null;
    benchmarkXirr: number | null;
    alpha: number | null;
    cagr: number | null;
  };
  holdings: OverviewHolding[];
}

export interface PageProps {
  searchParams: Promise<{ reportId?: string }>;
}
