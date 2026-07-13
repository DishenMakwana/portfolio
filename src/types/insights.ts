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
  "overview" | "funds" | "members" | "sip" | "actions" | "overlaps";

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
