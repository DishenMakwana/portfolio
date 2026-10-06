"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  calculateFutureProjection,
  calculateScenarioComparisons,
} from "@/helpers/futureProjection";
import type {
  FutureProjectionClientProps,
  ProjectionInput,
} from "@/types/futureProjection";
import { FutureProjectionChart } from "./FutureProjectionChart";
import { FutureProjectionGoalSlider } from "./FutureProjectionGoalSlider";
import { FutureProjectionGrowthTable } from "./FutureProjectionGrowthTable";
import { FutureProjectionHeader } from "./FutureProjectionHeader";
import { FutureProjectionMilestones } from "./FutureProjectionMilestones";
import { FutureProjectionParameters } from "./FutureProjectionParameters";
import { FutureProjectionResultsCard } from "./FutureProjectionResultsCard";
import { FutureProjectionScenarios } from "./FutureProjectionScenarios";

export default function FutureProjectionClient({
  initialPortfolioValue,
  initialInvestedCapital,
  initialMonthlySip,
  initialXirr,
}: FutureProjectionClientProps) {
  const defaultXirr =
    initialXirr > 0 ? Math.round(initialXirr * 10) / 10 : 12.0;

  // State parameters
  const [targetAmount, setTargetAmount] = useState<number>(10_00_00_000); // Default ₹10 Crore
  const [currentPortfolioValue, setCurrentPortfolioValue] = useState<number>(
    initialPortfolioValue > 0 ? Math.round(initialPortfolioValue) : 50_00_000
  );
  const [investedCapital, setInvestedCapital] = useState<number>(
    initialInvestedCapital > 0
      ? Math.round(initialInvestedCapital)
      : Math.round(initialPortfolioValue * 0.7)
  );
  const [monthlySip, setMonthlySip] = useState<number>(
    initialMonthlySip > 0 ? Math.round(initialMonthlySip) : 50_000
  );
  const [annualLumpSum, setAnnualLumpSum] = useState<number>(0);
  const [annualStepUpPct, setAnnualStepUpPct] = useState<number>(0);
  const [expectedXirrPct, setExpectedXirrPct] = useState<number>(defaultXirr);
  const [inflationPct, setInflationPct] = useState<number>(6); // Default 6%
  const [showTable, setShowTable] = useState<boolean>(false);

  // Dynamic bounds for target goal slider
  const minTargetGoal = Math.max(
    25_00_000,
    Math.ceil(currentPortfolioValue / 10_00_000) * 10_00_000
  );
  const maxTargetGoal = 50_00_00_000; // ₹50 Crore

  const handleCurrentPortfolioChange = (val: number) => {
    const newVal = Math.max(0, val);
    setCurrentPortfolioValue(newVal);
    if (targetAmount < newVal) {
      setTargetAmount(Math.ceil((newVal * 1.5) / 10_00_000) * 10_00_000);
    }
  };

  const projectionInput: ProjectionInput = useMemo(
    () => ({
      targetAmount,
      currentPortfolioValue,
      initialInvestedCapital: investedCapital,
      monthlySip,
      annualLumpSum,
      annualStepUpPct,
      expectedXirrPct,
      inflationPct,
    }),
    [
      targetAmount,
      currentPortfolioValue,
      investedCapital,
      monthlySip,
      annualLumpSum,
      annualStepUpPct,
      expectedXirrPct,
      inflationPct,
    ]
  );

  const summary = useMemo(
    () => calculateFutureProjection(projectionInput),
    [projectionInput]
  );

  const scenarios = useMemo(
    () => calculateScenarioComparisons(projectionInput),
    [projectionInput]
  );

  const resetToDefaults = () => {
    setTargetAmount(10_00_00_000);
    setCurrentPortfolioValue(
      initialPortfolioValue > 0 ? Math.round(initialPortfolioValue) : 50_00_000
    );
    setInvestedCapital(
      initialInvestedCapital > 0
        ? Math.round(initialInvestedCapital)
        : Math.round(initialPortfolioValue * 0.7)
    );
    setMonthlySip(
      initialMonthlySip > 0 ? Math.round(initialMonthlySip) : 50_000
    );
    setAnnualLumpSum(0);
    setAnnualStepUpPct(0);
    setExpectedXirrPct(defaultXirr);
    setInflationPct(6);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Top Banner Header */}
      <FutureProjectionHeader onResetDefaults={resetToDefaults} />

      {/* Target Goal Preset Selector & Slider Bar */}
      <FutureProjectionGoalSlider
        targetAmount={targetAmount}
        onTargetAmountChange={setTargetAmount}
        currentPortfolioValue={currentPortfolioValue}
        minTargetGoal={minTargetGoal}
        maxTargetGoal={maxTargetGoal}
      />

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FutureProjectionParameters
          targetAmount={targetAmount}
          onTargetAmountChange={setTargetAmount}
          currentPortfolioValue={currentPortfolioValue}
          onCurrentPortfolioChange={handleCurrentPortfolioChange}
          investedCapital={investedCapital}
          onInvestedCapitalChange={setInvestedCapital}
          monthlySip={monthlySip}
          onMonthlySipChange={setMonthlySip}
          annualLumpSum={annualLumpSum}
          onAnnualLumpSumChange={setAnnualLumpSum}
          expectedXirrPct={expectedXirrPct}
          onExpectedXirrChange={setExpectedXirrPct}
          defaultXirr={defaultXirr}
          annualStepUpPct={annualStepUpPct}
          onAnnualStepUpChange={setAnnualStepUpPct}
          inflationPct={inflationPct}
          onInflationChange={setInflationPct}
        />

        <FutureProjectionResultsCard
          summary={summary}
          targetAmount={targetAmount}
        />
      </div>

      {/* Scenario Comparisons ("What-If?") */}
      <FutureProjectionScenarios scenarios={scenarios} />

      {/* Wealth Accumulation Chart Card */}
      <FutureProjectionChart
        summary={summary}
        targetAmount={targetAmount}
        monthlySip={monthlySip}
        expectedXirrPct={expectedXirrPct}
        annualStepUpPct={annualStepUpPct}
        annualLumpSum={annualLumpSum}
      />

      {/* Milestone Breakdown Cards */}
      <FutureProjectionMilestones
        milestones={summary.milestones}
        currentPortfolioValue={currentPortfolioValue}
      />

      {/* Yearly Projection Table */}
      <FutureProjectionGrowthTable
        yearlyBreakdown={summary.yearlyBreakdown}
        showTable={showTable}
        onToggleTable={() => setShowTable((prev) => !prev)}
      />
    </motion.div>
  );
}
