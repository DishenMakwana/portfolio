import type { BullionRates, ChartDataPoint } from "./bullion";

export interface HoldingDetails {
  id: number;
  schemeId: number;
  memberId: number;
  schemeName: string;
  category: string;
  schemeCodeApi: string | null;
  folioNo: string;
  balanceUnits: number;
  purchaseNav: number;
  purchaseValue: number;
  currentNav: number;
  currentValue: number;
  gain: number;
  holdingDays: number;
  absoluteReturn: number;
  cagr: number;
  comments: string | null;
  memberName: string;
  memberPan: string | null;
  modeOfHolding: string | null;
  kycStatus: string | null;
  ucc: string | null;
  email: string | null;
  mobile: string | null;
  nominee: string | null;
  rta: string | null;
}

export interface PortfolioTransaction {
  id?: number;
  date: string;
  type: "BUY" | "SELL";
  amount: number;
  units?: number;
  schemeId?: number;
  memberId?: number;
  folioNo?: string;
}

export interface RawTransaction {
  id: number;
  memberId: number | null;
  schemeId: number | null;
  folioNo: string | null;
  date: string;
  type: string;
  units: number;
  nav: number;
  amount: number;
  sourceReportId: number | null;
}

export interface VolatilityMeasures {
  alpha: number;
  sharpe: number;
  mean: number;
  beta: number;
  stdDev: number;
  ytm: number;
  modifiedDuration: number;
  avgMaturity: number;
}

export interface FactsheetProfile {
  launchDate: string;
  corpusCr: number;
  expenseRatio: number;
  exitLoad: string;
  benchmarkName: string;
  benchmarkCode?: string;
  benchmarkFundName?: string;
}

export interface AssetAllocation {
  equity: number;
  debt: number;
  gold: number;
  globalEquity: number;
  other: number;
}

export interface FactsheetChartPoint {
  date: string;
  timestamp: number;
  fundNav: number;
  benchNav: number;
  fundReturn: number;
  benchReturn: number;
  txs?: { type: string; amount: number }[];
}

export interface AutoMapResult {
  schemeId: number;
  schemeName: string;
  status:
    "mapped" | "low_confidence" | "not_found" | "already_mapped" | "api_error";
  schemeCode: string | null;
  confidence: number | null;
  topMatches: { schemeCode: number; schemeName: string }[];
}

export interface ReportSummary {
  id: number;
  asOfDate: string;
  uploadedAt: string;
  filename: string;
  cagr: number | null;
  casId?: string | null;
}

export interface DashboardData {
  reportsList: ReportSummary[];
  selectedReport: ReportSummary | null;
  totals: {
    invested: number;
    currentValue: number;
    gain: number;
    absoluteReturn: number;
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
    cagr?: number | null;
  };
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
    currentValueDelta: number | null;
    investedDelta: number | null;
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
  }[];
  holdings: (HoldingDetails & { xirr: number; alpha: number })[];
  categoryAllocation: { name: string; value: number }[];
  capAllocation: { name: string; value: number }[];
  amcAllocation: { name: string; value: number }[];
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
    cagr: number;
  }[];
}

export interface OverviewHolding {
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
  dividend?: number | null;
  gain: number;
  holdingDays: number;
  absoluteReturn: number;
  cagr: number;
  comments: string | null;
  memberName: string | null;
  memberPan: string | null;
  asOfDate?: string | null;
  xirr?: number | null;
  alpha?: number | null;
  holdingType?: string;
  sector?: string | null;
}

export interface ParsedHolding {
  memberName: string;
  memberPan?: string | null;
  schemeName: string;
  category: string;
  folioNo: string;
  balanceUnits: number;
  purchaseNav: number;
  purchaseValue: number;
  currentNav: number;
  currentValue: number;
  dividend?: number | null;
  gain: number;
  holdingDays: number;
  absoluteReturn: number;
  cagr: number;
  comments?: string | null;
}

export interface SipMandateRow {
  id: number;
  memberId: number;
  memberName: string;
  schemeId: number;
  schemeName: string;
  folioNo: string;
  monthlyAmount: number;
  monthlyHistory: Record<string, number>;
  startMonth: string | null;
  isActive: boolean;
  uploadedAt: string;
  sourceFile: string | null;
}

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface BullionRatesResponse {
  rates: BullionRates;
  chartData: ChartDataPoint[];
  isThrottled?: boolean;
}
