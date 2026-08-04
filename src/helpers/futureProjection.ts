import type {
  ProjectionInput,
  ProjectionSummary,
  YearlyProjectionPoint,
  MilestonePoint,
  ScenarioComparison,
} from "@/types/futureProjection";

/**
 * Formats a currency amount into Cr or L format with symbol.
 * Example: 100000000 -> "₹10.00 Cr" | 5000000 -> "₹50.00 L"
 */
export function formatCroreOrLakh(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Month-by-month compounding simulation for SIP + Lump Sum portfolio growth.
 */
export function calculateFutureProjection(
  input: ProjectionInput
): ProjectionSummary {
  const {
    targetAmount,
    currentPortfolioValue,
    initialInvestedCapital,
    monthlySip,
    annualLumpSum = 0,
    annualStepUpPct,
    expectedXirrPct,
    expectedCagrPct,
    inflationPct,
  } = input;

  const ratePct = expectedXirrPct ?? expectedCagrPct ?? 12;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  const elapsedMonthsInCurrentYear = currentMonth - 1; // Completed months in running year
  const remainingMonthsInCurrentYear = Math.max(
    1,
    12 - elapsedMonthsInCurrentYear
  ); // Remaining months in running year

  const investedBasis =
    initialInvestedCapital > 0 ? initialInvestedCapital : currentPortfolioValue;

  // Monthly interest rate calculated from XIRR / CAGR
  const monthlyRate = ratePct > 0 ? Math.pow(1 + ratePct / 100, 1 / 12) - 1 : 0;

  let balance = currentPortfolioValue;
  let curMonthlySip = monthlySip;
  let cumulativeInvested = investedBasis;

  const milestoneTargets = [
    { label: "₹1 Cr", amount: 1_00_00_000 },
    { label: "₹2.5 Cr", amount: 2_50_00_000 },
    { label: "₹5 Cr", amount: 5_00_00_000 },
    { label: "₹7.5 Cr", amount: 7_50_00_000 },
    { label: "₹10 Cr", amount: 10_00_00_000 },
    { label: "₹15 Cr", amount: 15_00_00_000 },
    { label: "₹20 Cr", amount: 20_00_00_000 },
  ].filter(
    (m) =>
      m.amount > currentPortfolioValue &&
      (m.amount <= Math.max(targetAmount, 20_00_00_000) ||
        m.amount === targetAmount)
  );

  // Add custom target milestone if not present
  if (!milestoneTargets.some((m) => m.amount === targetAmount)) {
    milestoneTargets.push({
      label: formatCroreOrLakh(targetAmount),
      amount: targetAmount,
    });
    milestoneTargets.sort((a, b) => a.amount - b.amount);
  }

  const milestoneResults: MilestonePoint[] = milestoneTargets.map((m) => {
    return {
      label: m.label,
      targetAmount: m.amount,
      yearsToReach: 0,
      monthsToReach: 0,
      targetYear: currentYear,
      totalInvested: 0,
      wealthGained: 0,
      isReached: false,
    };
  });

  const yearlyBreakdown: YearlyProjectionPoint[] = [];

  let goalMonth = -1;
  let totalElapsedMonths = 0;
  const maxYears = 40;

  const checkMilestones = () => {
    for (let i = 0; i < milestoneTargets.length; i++) {
      const mTarget = milestoneTargets[i];
      if (!milestoneResults[i].isReached && balance >= mTarget.amount) {
        milestoneResults[i].isReached = true;
        milestoneResults[i].yearsToReach = Math.floor(totalElapsedMonths / 12);
        milestoneResults[i].monthsToReach = totalElapsedMonths % 12;
        milestoneResults[i].targetYear =
          currentYear +
          Math.floor((currentMonth - 1 + totalElapsedMonths) / 12);
        milestoneResults[i].totalInvested = cumulativeInvested;
        milestoneResults[i].wealthGained = balance - cumulativeInvested;
      }
    }
    if (goalMonth === -1 && balance >= targetAmount) {
      goalMonth = totalElapsedMonths;
    }
  };

  // 1. First Phase: Simulate remaining months of running calendar year (e.g. Aug to Dec 2026)
  let yearStartBalance = balance;
  let yearInvested = 0;

  // Add annual lump-sum top-up if configured
  if (annualLumpSum > 0) {
    balance += annualLumpSum;
    cumulativeInvested += annualLumpSum;
    yearInvested += annualLumpSum;
  }

  for (let m = 1; m <= remainingMonthsInCurrentYear; m++) {
    totalElapsedMonths++;
    const monthlyReturns = balance * monthlyRate;
    balance += monthlyReturns;
    balance += curMonthlySip;
    cumulativeInvested += curMonthlySip;
    yearInvested += curMonthlySip;

    checkMilestones();
  }

  // Record Running Year (Year 0 / Current Calendar Year)
  yearlyBreakdown.push({
    year: 0,
    calendarYear: currentYear,
    startValue: yearStartBalance,
    annualContribution: yearInvested,
    returnsEarned: balance - yearStartBalance - yearInvested,
    endValue: balance,
    cumulativeInvested,
    cumulativeReturns: balance - cumulativeInvested,
    targetProgressPct: Math.min(100, (balance / targetAmount) * 100),
  });

  // Annual SIP Step-up for next year
  if (annualStepUpPct > 0) {
    curMonthlySip = curMonthlySip * (1 + annualStepUpPct / 100);
  }

  // 2. Second Phase: Full 12-month Calendar Years (2027, 2028, ...)
  for (let yearIndex = 1; yearIndex <= maxYears; yearIndex++) {
    yearStartBalance = balance;
    yearInvested = 0;

    // Add annual lump-sum top-up at start of each new calendar year
    if (annualLumpSum > 0) {
      balance += annualLumpSum;
      cumulativeInvested += annualLumpSum;
      yearInvested += annualLumpSum;
    }

    for (let m = 1; m <= 12; m++) {
      totalElapsedMonths++;
      const monthlyReturns = balance * monthlyRate;
      balance += monthlyReturns;
      balance += curMonthlySip;
      cumulativeInvested += curMonthlySip;
      yearInvested += curMonthlySip;

      checkMilestones();
    }

    const calYear = currentYear + yearIndex;
    yearlyBreakdown.push({
      year: yearIndex,
      calendarYear: calYear,
      startValue: yearStartBalance,
      annualContribution: yearInvested,
      returnsEarned: balance - yearStartBalance - yearInvested,
      endValue: balance,
      cumulativeInvested,
      cumulativeReturns: balance - cumulativeInvested,
      targetProgressPct: Math.min(100, (balance / targetAmount) * 100),
    });

    if (annualStepUpPct > 0) {
      curMonthlySip = curMonthlySip * (1 + annualStepUpPct / 100);
    }

    // Stop simulation once primary goal is reached AND all defined milestones are reached
    const allMilestonesReached = milestoneResults.every((m) => m.isReached);
    const goalYearIndex = goalMonth !== -1 ? Math.ceil(goalMonth / 12) : 999;
    if (
      goalMonth !== -1 &&
      (allMilestonesReached || yearIndex >= goalYearIndex + 12)
    ) {
      break;
    }
  }

  const finalMonths = goalMonth === -1 ? totalElapsedMonths : goalMonth;
  const yearsToGoal = Math.floor(finalMonths / 12);
  const monthsToGoal = finalMonths % 12;
  const targetYear =
    currentYear + Math.floor((currentMonth - 1 + finalMonths) / 12);

  // Inflation adjusted purchasing power value after N years
  const inflationFactor = Math.pow(1 + inflationPct / 100, yearsToGoal);
  const inflationAdjustedTargetValue = targetAmount / inflationFactor;

  const totalInvestedAtGoal =
    yearlyBreakdown.find((y) => y.year === Math.ceil(finalMonths / 12))
      ?.cumulativeInvested || cumulativeInvested;

  const totalReturnsAtGoal = Math.max(0, targetAmount - totalInvestedAtGoal);

  return {
    yearsToGoal,
    monthsToGoal,
    targetYear,
    totalInvestedAtGoal,
    totalReturnsAtGoal,
    inflationAdjustedTargetValue,
    yearlyBreakdown,
    milestones: milestoneResults,
  };
}

/**
 * Generates what-if scenario comparison data.
 */
export function calculateScenarioComparisons(
  input: ProjectionInput
): ScenarioComparison[] {
  const baseSummary = calculateFutureProjection(input);
  const baseTotalMonths =
    baseSummary.yearsToGoal * 12 + baseSummary.monthsToGoal;

  const currentXirr = input.expectedXirrPct ?? input.expectedCagrPct ?? 12;

  const scenarios = [
    {
      title: "Optimistic Return (+2% XIRR)",
      subtitle: `${currentXirr + 2}% expected return`,
      xirrDelta: 2,
      cagrDelta: 2,
      stepUpDelta: 0,
      monthlySipDelta: 0,
    },
    {
      title: "Aggressive Step-up (+5%)",
      subtitle: `${input.annualStepUpPct + 5}% annual step-up`,
      xirrDelta: 0,
      cagrDelta: 0,
      stepUpDelta: 5,
      monthlySipDelta: 0,
    },
    {
      title: "Boost SIP (+₹10,000/mo)",
      subtitle: `₹${(input.monthlySip + 10000).toLocaleString("en-IN")}/mo SIP`,
      xirrDelta: 0,
      cagrDelta: 0,
      stepUpDelta: 0,
      monthlySipDelta: 10000,
    },
  ];

  return scenarios.map((sc) => {
    const scInput: ProjectionInput = {
      ...input,
      expectedXirrPct: currentXirr + sc.xirrDelta,
      expectedCagrPct: currentXirr + sc.cagrDelta,
      annualStepUpPct: input.annualStepUpPct + sc.stepUpDelta,
      monthlySip: input.monthlySip + sc.monthlySipDelta,
    };
    const scSummary = calculateFutureProjection(scInput);
    const scTotalMonths = scSummary.yearsToGoal * 12 + scSummary.monthsToGoal;
    const timeDifferenceMonths = baseTotalMonths - scTotalMonths;

    return {
      title: sc.title,
      subtitle: sc.subtitle,
      xirrDelta: sc.xirrDelta,
      cagrDelta: sc.cagrDelta,
      stepUpDelta: sc.stepUpDelta,
      monthlySipDelta: sc.monthlySipDelta,
      yearsToGoal: scSummary.yearsToGoal,
      monthsToGoal: scSummary.monthsToGoal,
      timeDifferenceMonths,
    };
  });
}
