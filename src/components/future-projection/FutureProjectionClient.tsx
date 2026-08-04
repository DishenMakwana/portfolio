"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Rocket,
  Target,
  TrendingUp,
  Clock,
  Sparkles,
  Zap,
  RotateCcw,
  Sliders,
  DollarSign,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  formatCroreOrLakh,
  calculateFutureProjection,
  calculateScenarioComparisons,
} from "@/helpers/futureProjection";
import { formatCurrency } from "@/helpers/formatters";
import type { ProjectionInput } from "@/types/futureProjection";

interface FutureProjectionClientProps {
  initialPortfolioValue: number;
  initialInvestedCapital: number;
  initialMonthlySip: number;
  initialXirr: number;
}

const PRESET_GOALS = [
  { label: "₹1 Cr", value: 1_00_00_000 },
  { label: "₹2.5 Cr", value: 2_50_00_000 },
  { label: "₹5 Cr", value: 5_00_00_000 },
  { label: "₹10 Cr", value: 10_00_00_000 },
  { label: "₹15 Cr", value: 15_00_00_000 },
  { label: "₹20 Cr", value: 20_00_00_000 },
  { label: "₹50 Cr", value: 50_00_00_000 },
];

export default function FutureProjectionClient({
  initialPortfolioValue,
  initialInvestedCapital,
  initialMonthlySip,
  initialXirr,
}: FutureProjectionClientProps) {
  const defaultXirr = initialXirr > 0 ? parseFloat(initialXirr.toFixed(1)) : 12;

  const [targetAmount, setTargetAmount] = useState<number>(10_00_00_000); // 10 Cr default
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
  const [inflationPct, setInflationPct] = useState<number>(6);
  const [showTable, setShowTable] = useState<boolean>(true);
  const minTargetGoal = useMemo(() => {
    // Target goal minimum must strictly exceed current portfolio value
    return Math.max(currentPortfolioValue + 1_00_00_000, 10_00_000);
  }, [currentPortfolioValue]);

  const maxTargetGoal = 50_00_00_000; // 50 Cr max

  const handleCurrentPortfolioChange = (val: number) => {
    const newCurrent = Math.max(0, val);
    setCurrentPortfolioValue(newCurrent);
    if (targetAmount <= newCurrent) {
      setTargetAmount(newCurrent + 10_00_000);
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

  const chartData = useMemo(() => {
    return summary.yearlyBreakdown.map((item) => ({
      yearLabel: `Year ${item.year} (${item.calendarYear})`,
      calendarYear: item.calendarYear,
      endValue: Math.round(item.endValue),
      cumulativeInvested: Math.round(item.cumulativeInvested),
      returns: Math.round(item.cumulativeReturns),
    }));
  }, [summary]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900/90 to-indigo-950/80 border border-teal-500/30 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
                <Rocket className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                Portfolio Goal & Future Projection
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Wealth Simulator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Simulate exact timeline, step-up SIP impact, and compounding
              growth to reach your target net worth goal (e.g. ₹10 Crore).
            </p>
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-300 transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Target Goal Preset Selector & Slider Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-4">
        {/* Header & Main Target Goal Slider (Matching image design) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Target className="w-4.5 h-4.5 text-emerald-400" />
              <span>Target Portfolio Goal (₹)</span>
            </label>
            <span className="text-lg font-black text-emerald-400 tracking-tight">
              {formatCroreOrLakh(targetAmount)}
            </span>
          </div>

          <input
            type="range"
            min={minTargetGoal}
            max={maxTargetGoal}
            step={25_00_000}
            value={Math.max(targetAmount, minTargetGoal)}
            onChange={(e) => setTargetAmount(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-950 border border-slate-800 rounded-lg"
          />

          <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-0.5">
            <span>Min ({formatCroreOrLakh(minTargetGoal)})</span>
            <span>₹10 Cr (Target)</span>
            <span>Max (₹50 Cr)</span>
          </div>
        </div>

        {/* Quick Goal Preset Buttons (Strictly > Current Portfolio Value) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            QUICK PRESETS:
          </span>
          {PRESET_GOALS.filter((p) => p.value > currentPortfolioValue).map(
            (preset) => {
              const isActive = targetAmount === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTargetAmount(preset.value)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20 scale-105"
                      : "bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {preset.label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Controls Form */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Investment & Return Parameters
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Adjust parameters to model scenarios
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Target Portfolio Goal (₹)</span>
                <span className="text-amber-400 font-bold">
                  {formatCroreOrLakh(targetAmount)}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1000000}
                  step={1000000}
                  value={targetAmount}
                  onChange={(e) =>
                    setTargetAmount(Math.max(0, Number(e.target.value)))
                  }
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
                />
              </div>
            </div>

            {/* Current Portfolio Value Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Current Portfolio Value (₹)</span>
                <span className="text-teal-400 font-bold">
                  {formatCroreOrLakh(currentPortfolioValue)}
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={50000}
                value={currentPortfolioValue}
                onChange={(e) =>
                  handleCurrentPortfolioChange(Number(e.target.value))
                }
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
              />
            </div>

            {/* Total Invested Capital (Cost Basis) Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Total Invested Capital (Cost) (₹)</span>
                <span className="text-teal-300 font-bold">
                  {formatCroreOrLakh(investedCapital)}
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={50000}
                value={investedCapital}
                onChange={(e) =>
                  setInvestedCapital(Math.max(0, Number(e.target.value)))
                }
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
              />
            </div>

            {/* Monthly SIP Contribution Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Monthly SIP Contribution (₹)</span>
                <span className="text-emerald-400 font-bold">
                  {formatCurrency(monthlySip, 0)}/mo
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={monthlySip}
                onChange={(e) =>
                  setMonthlySip(Math.max(0, Number(e.target.value)))
                }
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
              />
            </div>

            {/* Future Lump-Sum Addition Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Annual Lump-Sum Top-Up (₹/yr)</span>
                <span className="text-blue-400 font-bold">
                  {annualLumpSum > 0
                    ? `+${formatCurrency(annualLumpSum, 0)}/yr`
                    : "None"}
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={50000}
                value={annualLumpSum}
                onChange={(e) =>
                  setAnnualLumpSum(Math.max(0, Number(e.target.value)))
                }
                placeholder="e.g. 100000"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
              />
            </div>

            {/* Expected XIRR Return Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Expected Return (XIRR % p.a.)</span>
                <span className="text-teal-400 font-extrabold">
                  {expectedXirrPct}%
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={25}
                step={0.5}
                value={expectedXirrPct}
                onChange={(e) => setExpectedXirrPct(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>4% (Debt)</span>
                <span>{defaultXirr}% (Portfolio XIRR)</span>
                <span>25% (High Growth)</span>
              </div>
            </div>

            {/* Annual Step-up SIP Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Annual SIP Step-Up (%)</span>
                <span className="text-emerald-400 font-extrabold">
                  {annualStepUpPct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={annualStepUpPct}
                onChange={(e) => setAnnualStepUpPct(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>0% (Fixed)</span>
                <span>10% (Std Step-Up)</span>
                <span>25% (Salary Growth)</span>
              </div>
            </div>

            {/* Expected Inflation Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Expected Inflation (%)</span>
                <span className="text-amber-400 font-extrabold">
                  {inflationPct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={inflationPct}
                onChange={(e) => setInflationPct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>0% (Nominal)</span>
                <span>6% (India Avg)</span>
                <span>12% (High)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Key Projection Results */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-teal-950/40 border border-teal-500/20 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-400 mb-2">
              <Clock className="w-4 h-4" />
              <span>ESTIMATED TIME TO GOAL</span>
            </div>

            <div className="mt-1">
              <div className="text-3xl font-black text-slate-100 tracking-tight">
                {summary.yearsToGoal}{" "}
                <span className="text-lg font-bold text-slate-400">Years</span>{" "}
                {summary.monthsToGoal > 0 && (
                  <>
                    {summary.monthsToGoal}{" "}
                    <span className="text-lg font-bold text-slate-400">
                      Months
                    </span>
                  </>
                )}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Target Year: {summary.targetYear}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Target Goal:</span>
              <span className="font-extrabold text-amber-400">
                {formatCroreOrLakh(targetAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Capital Invested:</span>
              <span className="font-extrabold text-slate-200">
                {formatCroreOrLakh(summary.totalInvestedAtGoal)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Wealth Created (Returns):</span>
              <span className="font-extrabold text-emerald-400">
                {formatCroreOrLakh(summary.totalReturnsAtGoal)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">
                Purchasing Power (Inflation Adj):
              </span>
              <span className="font-extrabold text-indigo-300">
                {formatCroreOrLakh(summary.inflationAdjustedTargetValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Comparisons ("What-If?") */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
            Goal Speed-up Scenarios ("What-If?")
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scenarios.map((sc, idx) => {
            const isFaster = sc.timeDifferenceMonths > 0;
            const diffYears = Math.floor(
              Math.abs(sc.timeDifferenceMonths) / 12
            );
            const diffMonths = Math.abs(sc.timeDifferenceMonths) % 12;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg hover:border-teal-500/30 transition-all"
              >
                <div className="text-xs font-bold text-slate-200 mb-0.5">
                  {sc.title}
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  {sc.subtitle}
                </div>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-lg font-black text-slate-100">
                    {sc.yearsToGoal} Years{" "}
                    {sc.monthsToGoal > 0 ? `${sc.monthsToGoal} Months` : ""}
                  </span>
                  {isFaster && (
                    <span className="text-xs font-extrabold text-emerald-400">
                      (
                      {diffYears > 0
                        ? `${diffYears} ${diffYears === 1 ? "Year" : "Years"} `
                        : ""}
                      {diffMonths} {diffMonths === 1 ? "Month" : "Months"}{" "}
                      faster!)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wealth Accumulation Chart Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
                Wealth Accumulation Curve
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison between Cumulative Investment and Compound Portfolio
              Growth
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-slate-200">
                Total Portfolio Value (Compounded)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              <span className="text-slate-200">
                Total Invested Capital (Principal + SIPs)
              </span>
            </div>
          </div>
        </div>

        {/* Y-Axis Unit Header */}
        <div className="flex justify-between items-center px-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Portfolio Amount (₹)
          </span>
        </div>

        {/* Chart Canvas */}
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 30, left: 15, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.4}
              />
              <XAxis
                dataKey="calendarYear"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                dy={5}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => formatCroreOrLakh(val)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="p-3 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md space-y-1.5 text-xs">
                      <div className="font-extrabold text-slate-200 border-b border-slate-800 pb-1">
                        Year: {label}
                      </div>
                      {payload.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: item.color || item.stroke,
                              }}
                            />
                            <span className="text-slate-300 font-medium">
                              {item.name}:
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-100">
                            {formatCurrency(Number(item.value || 0), 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={targetAmount}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Target: ${formatCroreOrLakh(targetAmount)}`,
                  fill: "#f59e0b",
                  fontSize: 11,
                  position: "top",
                }}
              />
              <Area
                type="monotone"
                dataKey="endValue"
                name="Total Portfolio Value"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
              <Area
                type="monotone"
                dataKey="cumulativeInvested"
                name="Total Invested Capital"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorInvested)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* X-Axis Unit Footer */}
        <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-1">
          Timeline (Calendar Year)
        </div>
      </div>

      {/* Milestone Breakdown Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
            Portfolio Milestones Breakdown
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {summary.milestones
            .filter(
              (m) => m.targetAmount > currentPortfolioValue && m.isReached
            )
            .map((m, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
                  m.isReached
                    ? "bg-slate-900/80 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                    : "bg-slate-900/40 border-slate-800/80"
                }`}
              >
                <div className="text-xs font-bold text-slate-400 uppercase">
                  Milestone
                </div>
                <div className="text-lg font-black text-amber-400 mt-0.5">
                  {m.label}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Year:</span>
                    <span className="font-extrabold text-slate-200">
                      {m.targetYear}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time Needed:</span>
                    <span className="font-extrabold text-emerald-400">
                      {m.yearsToReach} Yrs{" "}
                      {m.monthsToReach > 0 ? `${m.monthsToReach} Mos` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Invested:</span>
                    <span className="font-semibold text-slate-300">
                      {formatCroreOrLakh(m.totalInvested)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Yearly Projection Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="w-full p-4 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/60 transition-all cursor-pointer border-b border-slate-800/80"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
              Year-by-Year Growth Table
            </h3>
            <span className="text-xs text-slate-400">
              ({summary.yearlyBreakdown.length} Years Schedule)
            </span>
          </div>
          {showTable ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Starting Value</th>
                  <th className="py-3 px-4">Added Capital</th>
                  <th className="py-3 px-4">Returns Earned</th>
                  <th className="py-3 px-4">Ending Value</th>
                  <th className="py-3 px-4">Total Invested</th>
                  <th className="py-3 px-4">Goal Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {summary.yearlyBreakdown.map((row) => (
                  <tr
                    key={row.year}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-100">
                      {row.year === 0
                        ? `${row.calendarYear} (Running Year)`
                        : `Yr ${row.year} (${row.calendarYear})`}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatCroreOrLakh(row.startValue)}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      +{formatCroreOrLakh(row.annualContribution)}
                    </td>
                    <td className="py-3 px-4 text-teal-300 font-semibold">
                      +{formatCroreOrLakh(row.returnsEarned)}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-100">
                      {formatCroreOrLakh(row.endValue)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatCroreOrLakh(row.cumulativeInvested)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, row.targetProgressPct)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-emerald-400">
                          {row.targetProgressPct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
