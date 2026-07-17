import type { OverviewHolding, ReportSummary } from "@/types/portfolio";

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
  address?: string | null;
  email?: string | null;
  mobile?: string | null;
  dematNominee?: string | null;
  dpId?: string | null;
  clientId?: string | null;
  dpName?: string | null;
  boSubStatus?: string | null;
  bsda?: string | null;
  rgess?: string | null;
  accountStatus?: string | null;
  frozenStatus?: string | null;
  boStatus?: string | null;
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
  selectedReport?: ReportSummary | null;
}

export interface PageProps {
  searchParams: Promise<{ reportId?: string }>;
}
