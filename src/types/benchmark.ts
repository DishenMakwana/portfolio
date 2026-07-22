export interface BenchmarkRuleDetails {
  benchmarkCode: string;
  benchmarkName: string;
  benchmarkFundName: string;
  corpusCr: number | null;
  expenseRatio: number | null;
  exitLoad: string | null;
  allocationEquity: number;
  allocationDebt: number;
  allocationGold: number;
  allocationGlobalEquity: number;
  allocationOther: number;
}
