export interface ProjectionInput {
  targetAmount: number;
  currentPortfolioValue: number;
  initialInvestedCapital: number;
  monthlySip: number;
  annualLumpSum: number;
  annualStepUpPct: number;
  expectedXirrPct: number;
  expectedCagrPct?: number;
  inflationPct: number;
}

export interface YearlyProjectionPoint {
  year: number;
  calendarYear: number;
  startValue: number;
  annualContribution: number;
  returnsEarned: number;
  endValue: number;
  cumulativeInvested: number;
  cumulativeReturns: number;
  targetProgressPct: number;
}

export interface MilestonePoint {
  label: string;
  targetAmount: number;
  yearsToReach: number;
  monthsToReach: number;
  targetYear: number;
  totalInvested: number;
  wealthGained: number;
  isReached: boolean;
}

export interface ProjectionSummary {
  yearsToGoal: number;
  monthsToGoal: number;
  targetYear: number;
  totalInvestedAtGoal: number;
  totalReturnsAtGoal: number;
  inflationAdjustedTargetValue: number;
  yearlyBreakdown: YearlyProjectionPoint[];
  milestones: MilestonePoint[];
}

export interface ScenarioComparison {
  title: string;
  subtitle: string;
  xirrDelta: number;
  cagrDelta?: number;
  stepUpDelta: number;
  monthlySipDelta: number;
  yearsToGoal: number;
  monthsToGoal: number;
  timeDifferenceMonths: number; // positive = faster, negative = slower
}
