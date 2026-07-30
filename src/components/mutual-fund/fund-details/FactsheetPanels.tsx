"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  PieChart,
  Activity,
  Info,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  formatNullableDate,
  formatHoldingYearsAndDays,
  formatCurrency,
} from "@/helpers/formatters";
import { FactsheetPanelsProps } from "@/types/fund-details";

export default function FactsheetPanels({
  holding,
  transactions,
  factsheetMeta,
  currentVolatilityStats,
  cleanCategory,
  isStock,
  isDebt,
}: FactsheetPanelsProps) {
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  return (
    <div className="space-y-8">
      {/* DETAILED FACTSHEET PANELS */}
      <div
        className={`grid grid-cols-1 ${isStock ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-6`}
      >
        {/* PANEL 1: SCHEME PROFILE */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
              <Layers size={18} className="text-teal-400" />
              <span>{isStock ? "Stock Profile" : "Scheme Profile"}</span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">
                  {isStock ? "Listing Date" : "Launch Date"}
                </span>
                <span className="font-semibold text-slate-200">
                  {factsheetMeta.profile.launchDate}
                </span>
              </div>
              {!isStock && (
                <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                  <span className="text-slate-400 font-medium">
                    Corpus (Cr)
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    ₹{factsheetMeta.profile.corpusCr.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">
                  {isStock ? "Sector" : "Category"}
                </span>
                <span className="font-semibold text-slate-200">
                  {isStock ? holding.sector || "General" : cleanCategory}
                </span>
              </div>
              {!isStock && (
                <>
                  <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                    <span className="text-slate-400 font-medium">
                      Expense Ratio
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      {factsheetMeta.profile.expenseRatio.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                    <span className="text-slate-400 font-medium">
                      Scheme Type
                    </span>
                    <span className="font-semibold text-teal-400">
                      Open-Ended
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-start text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">
                  {isStock ? "Index Benchmark" : "Benchmark"}
                </span>
                <span className="font-semibold text-indigo-400 text-right text-xs max-w-[200px]">
                  {factsheetMeta.profile.benchmarkName}
                </span>
              </div>
              {!isStock && (
                <div className="flex flex-col text-sm pt-1">
                  <span className="text-slate-400 font-medium mb-1">
                    Exit Load
                  </span>
                  <span className="text-xs text-slate-300 bg-slate-950/40 p-2.5 border border-slate-850/80 rounded-lg leading-relaxed italic">
                    {factsheetMeta.profile.exitLoad}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL 2: COMPOSITION */}
        {!isStock && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
            <div>
              <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
                <PieChart size={18} className="text-teal-400" />
                <span>Asset Composition (%)</span>
              </h3>

              <div className="space-y-4">
                {/* Equity */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Equity Allocation</span>
                    <span className="text-teal-400 font-mono">
                      {factsheetMeta.allocation.equity.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-teal-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${factsheetMeta.allocation.equity}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Debt */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Debt Allocation</span>
                    <span className="text-purple-400 font-mono">
                      {factsheetMeta.allocation.debt.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${factsheetMeta.allocation.debt}%` }}
                    />
                  </div>
                </div>

                {/* Gold */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Gold</span>
                    <span className="text-amber-400 font-mono">
                      {factsheetMeta.allocation.gold.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${factsheetMeta.allocation.gold}%` }}
                    />
                  </div>
                </div>

                {/* Global Equity */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Global Equity</span>
                    <span className="text-blue-400 font-mono">
                      {factsheetMeta.allocation.globalEquity.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${factsheetMeta.allocation.globalEquity}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Other */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">
                      Other (Cash/Call Money)
                    </span>
                    <span className="text-slate-400 font-mono">
                      {factsheetMeta.allocation.other.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-slate-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${factsheetMeta.allocation.other}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed">
              Note: Portfolio allocations are estimated based on standard mutual
              fund category guidelines. Real-time updates reflect fund house
              holdings updates.
            </div>
          </div>
        )}

        {/* PANEL 3: VOLATILITY MEASURES */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
              <Activity size={18} className="text-teal-400" />
              <span>Volatility Measures</span>
            </h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Alpha
                  <span title="Outperformance over index return">
                    <Info size={10} className="text-slate-600" />
                  </span>
                </span>
                <span
                  className={`text-base font-black font-mono block mt-1 ${currentVolatilityStats.alpha >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {currentVolatilityStats.alpha.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Sharpe Ratio
                  <span title="Risk-adjusted outperformance return">
                    <Info size={10} className="text-slate-600" />
                  </span>
                </span>
                <span className="text-base font-black font-mono text-teal-400 block mt-1">
                  {currentVolatilityStats.sharpe.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Mean Return
                  <span title="Average annualized return rate">
                    <Info size={10} className="text-slate-600" />
                  </span>
                </span>
                <span className="text-base font-black font-mono text-slate-200 block mt-1">
                  {currentVolatilityStats.mean.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Beta
                  <span title="Market sensitivity volatility ratio">
                    <Info size={10} className="text-slate-600" />
                  </span>
                </span>
                <span className="text-base font-black font-mono text-indigo-400 block mt-1">
                  {currentVolatilityStats.beta.toFixed(2)}
                </span>
              </div>
              <div
                className={`bg-slate-950/40 p-3 border border-slate-850 rounded-xl ${!isDebt ? "col-span-2" : ""}`}
              >
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Std. Deviation
                  <span title="Overall historical return volatility">
                    <Info size={10} className="text-slate-600" />
                  </span>
                </span>
                <span className="text-base font-black font-mono text-slate-200 block mt-1">
                  {currentVolatilityStats.stdDev.toFixed(2)}%
                </span>
              </div>
              {isDebt && (
                <>
                  <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                      YTM (Debt)
                      <span title="Yield to maturity (only for Debt)">
                        <Info size={10} className="text-slate-600" />
                      </span>
                    </span>
                    <span className="text-base font-black font-mono text-slate-400 block mt-1">
                      {currentVolatilityStats.ytm > 0
                        ? `${currentVolatilityStats.ytm.toFixed(2)}%`
                        : "0.0%"}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                      Mod. Duration
                      <span title="Debt yield sensitivity time frame">
                        <Info size={10} className="text-slate-600" />
                      </span>
                    </span>
                    <span className="text-base font-black font-mono text-slate-400 block mt-1">
                      {currentVolatilityStats.modifiedDuration > 0
                        ? `${currentVolatilityStats.modifiedDuration.toFixed(2)} Yr`
                        : "0.0"}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1 justify-center">
                      Avg Maturity
                      <span title="Average holding debt maturity period">
                        <Info size={10} className="text-slate-600" />
                      </span>
                    </span>
                    <span className="text-base font-black font-mono text-slate-400 block mt-1 text-center">
                      {currentVolatilityStats.avgMaturity > 0
                        ? `${currentVolatilityStats.avgMaturity.toFixed(2)} Yr`
                        : "0.0"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed">
            Note: Volatility metrics are calculated weekly over a rolling 2-year
            period against the {factsheetMeta.profile.benchmarkName}.
          </div>
        </div>
      </div>

      {/* EDUCATIONAL METRIC EXPLANATIONS */}
      <div className="bg-slate-900/40 border border-slate-850/60 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full p-5 flex justify-between items-center text-left hover:bg-slate-900/60 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle size={20} className="text-teal-400" />
            <h4 className="text-sm font-black text-slate-200 tracking-tight">
              Understanding Volatility and Factsheet Metrics
            </h4>
          </div>
          {showExplanation ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </button>
        {showExplanation && (
          <div className="p-6 border-t border-slate-850/60 bg-slate-950/20 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alpha */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Alpha (α)</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Outperformance
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>α = Rₚ - [ R_f + β ( R_m - R_f ) ]</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    Measures risk-adjusted outperformance (CAPM model).
                    Represents the value added by the fund manager relative to
                    the benchmark{" "}
                    {factsheetMeta.profile.benchmarkName
                      .replace("Index Fund Direct", "")
                      .trim()}{" "}
                    after accounting for risk.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: Rₚ = Portfolio XIRR, R_f = Risk-free rate (6.0%), R_m
                    = Benchmark return, β = Beta
                  </p>
                </div>
              </div>

              {/* Sharpe Ratio */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Sharpe Ratio</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Risk-Adjusted Return
                  </span>
                </div>
                <div className="flex items-center gap-2 text-teal-400 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>Sharpe =</span>
                  <div className="flex items-center gap-2">
                    <span>( Rₚ - R_f )</span>
                    <span className="text-slate-500">/</span>
                    <span>σₚ</span>
                  </div>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    Shows risk-adjusted return. It measures how much excess
                    return you get per unit of total volatility. A higher Sharpe
                    ratio indicates better investment efficiency.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: Rₚ = Portfolio Return, R_f = Risk-free rate (6.0%),
                    σₚ = Annualized Standard Deviation
                  </p>
                </div>
              </div>

              {/* Beta */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Beta (β)</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Market Sensitivity
                  </span>
                </div>
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>β = Cov(Rₚ, R_m) / Var(R_m)</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    Measures sensitivity to market movements. A Beta of 1.0
                    means the fund moves in line with the benchmark. Beta of
                    0.95 means it fluctuates 5% less than the market.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: Rₚ = Weekly returns of fund, R_m = Weekly returns of
                    benchmark
                  </p>
                </div>
              </div>

              {/* Standard Deviation */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">
                    Standard Deviation (σ)
                  </span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Total Risk
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>σ = √[ Σ(R_i - R̄)² / (n - 1) ] × √52</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    Measures overall price volatility. Represents how much the
                    fund's returns deviate from its average returns. Higher
                    values represent greater price fluctuations.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: R_i = Weekly return, R̄ = Average weekly return, n =
                    104 weeks
                  </p>
                </div>
              </div>

              {/* Mean Return */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Mean Return</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Average Return
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>Mean Return = R̄ × 52</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    The annualized average return of the mutual fund over the
                    calculated rolling period, computed as average weekly
                    returns multiplied by 52 weeks.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: R̄ = Average weekly return
                  </p>
                </div>
              </div>

              {/* Debt Metrics */}
              {isDebt && (
                <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                    <span className="font-bold text-slate-200">
                      YTM / Duration / Maturity
                    </span>
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                      Debt Specifics
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                    <span>Δ Price ≈ - Duration × Δy</span>
                  </div>
                  <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                    <p>
                      YTM is the yield if held to maturity. Modified Duration
                      measures bond price sensitivity to interest rate shifts (a
                      1% yield rise drops price by Duration %).
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      Where: Δ Price = Price change %, Δy = Yield change %
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* COMMENTS & GENERAL METRIC TABLE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SNAPSHOT FIELDS DETAIL */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl md:col-span-2 backdrop-blur-sm">
          <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-850 pb-2">
            <Layers size={18} className="text-teal-400" />
            <span>Excel Sheet Data Fields</span>
          </h3>

          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                {isStock ? "Quantity" : "Balance Units"}
              </div>
              <div className="font-mono text-slate-200 mt-0.5 font-bold">
                {isStock
                  ? holding.balanceUnits.toLocaleString("en-IN")
                  : holding.balanceUnits.toFixed(4)}
              </div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                Holding Period
              </div>
              <div className="text-slate-200 mt-0.5 font-bold">
                {holding.holdingDays} Days
                {holding.holdingDays >= 30
                  ? ` (${formatHoldingYearsAndDays(holding.holdingDays)})`
                  : ""}
              </div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                {isStock ? "Avg Purchase Price" : "Purchase NAV"}
              </div>
              <div className="font-mono text-slate-200 mt-0.5 font-bold">
                ₹{holding.purchaseNav.toFixed(4)}
              </div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                {isStock ? "Current Price" : "Current NAV"}
              </div>
              <div className="font-mono text-slate-200 mt-0.5 font-bold">
                ₹{holding.currentNav.toFixed(4)}
              </div>
            </div>
            {!isStock && (
              <>
                <div className="border-b border-slate-850/60 pb-2">
                  <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    Dividend Paid
                  </div>
                  <div className="font-mono text-slate-200 mt-0.5 font-bold">
                    ₹{(holding.dividend ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="border-b border-slate-850/60 pb-2">
                  <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    Report CAGR
                  </div>
                  <div className="text-slate-200 mt-0.5 font-black">
                    {holding.cagr !== null && holding.cagr !== undefined
                      ? `${holding.cagr.toFixed(2)}%`
                      : "-"}
                  </div>
                </div>
              </>
            )}
            {holding.freeQuantity !== undefined &&
              holding.freeQuantity !== null && (
                <div className="border-b border-slate-850/60 pb-2">
                  <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    Free Quantity
                  </div>
                  <div className="font-mono text-slate-200 mt-0.5 font-bold">
                    {holding.freeQuantity.toFixed(3)}
                  </div>
                </div>
              )}
            {holding.frozenQuantity !== undefined &&
              holding.frozenQuantity !== null &&
              holding.frozenQuantity > 0 && (
                <div className="border-b border-slate-850/60 pb-2">
                  <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    Frozen Quantity
                  </div>
                  <div className="font-mono text-slate-200 mt-0.5 font-bold text-red-400">
                    {holding.frozenQuantity.toFixed(3)}
                  </div>
                </div>
              )}
            {holding.pledgedQuantity !== undefined &&
              holding.pledgedQuantity !== null &&
              holding.pledgedQuantity > 0 && (
                <div className="border-b border-slate-850/60 pb-2">
                  <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    Pledged Quantity
                  </div>
                  <div className="font-mono text-slate-200 mt-0.5 font-bold text-amber-400">
                    {holding.pledgedQuantity.toFixed(3)}
                  </div>
                </div>
              )}
            {holding.lockinQuantity !== undefined &&
              holding.lockinQuantity !== null &&
              holding.lockinQuantity > 0 && (
                <>
                  <div className="border-b border-slate-850/60 pb-2">
                    <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                      Lock-in Quantity
                    </div>
                    <div className="font-mono text-slate-200 mt-0.5 font-bold text-teal-400">
                      {holding.lockinQuantity.toFixed(3)}
                    </div>
                  </div>
                  {holding.lockinDate && (
                    <div className="border-b border-slate-850/60 pb-2">
                      <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                        Lock-in Release Date
                      </div>
                      <div className="text-slate-200 mt-0.5 font-bold">
                        {new Date(holding.lockinDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                        {holding.balanceDescription &&
                          ` (${holding.balanceDescription})`}
                      </div>
                    </div>
                  )}
                </>
              )}
            <div className="col-span-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                Comments
              </div>
              <div className="text-slate-300 mt-1 italic text-xs bg-slate-950/40 p-3.5 border border-slate-850 rounded-xl leading-relaxed">
                {holding.comments || "No comments found in Excel file."}
              </div>
            </div>
          </div>
        </div>

        {/* BENCHMARK STATUS CARD */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-850 pb-2">
              <span>Benchmark Integration</span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-start gap-x-4 text-sm">
                <span className="text-slate-400 font-medium shrink-0">
                  Benchmark Fund:
                </span>
                <span className="font-semibold text-slate-200 text-right text-xs">
                  {factsheetMeta.profile.benchmarkFundName ||
                    factsheetMeta.profile.benchmarkName}
                  {factsheetMeta.profile.benchmarkCode
                    ? ` (${factsheetMeta.profile.benchmarkCode})`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between items-start gap-x-4 text-sm">
                <span className="text-slate-400 font-medium shrink-0">
                  Benchmark Index:
                </span>
                <span className="font-semibold text-slate-200 text-right text-xs">
                  {factsheetMeta.profile.benchmarkName || "Nifty 50 TRI"}
                </span>
              </div>
              <div className="flex justify-between items-center gap-x-4 text-sm">
                <span className="text-slate-400 font-medium shrink-0">
                  {isStock ? "Stock Symbol:" : "Scheme Code:"}
                </span>
                {holding.schemeCodeApi ? (
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/20 px-2.5 py-0.5 border border-emerald-900/40 rounded text-xs">
                    {holding.schemeCodeApi}
                  </span>
                ) : (
                  <span className="font-mono text-amber-500 bg-amber-950/20 px-2.5 py-0.5 border border-amber-900/40 rounded text-xs flex items-center gap-1 font-bold">
                    <AlertTriangle size={12} />
                    <span>Unmapped</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
                {isStock
                  ? `For stock holdings, we query historical daily price charts and metrics directly from Yahoo Finance API. Outperformance metrics are calculated against the ${factsheetMeta.profile.benchmarkName || "Nifty 50 TRI"}.`
                  : `When mapped, we download historical NAV details from \`api.mfapi.in\` dynamically. Transactions are mirrored into ${factsheetMeta.profile.benchmarkFundName || factsheetMeta.profile.benchmarkName} to compute true portfolio outperformance.`}
              </p>
            </div>
          </div>

          {!holding.schemeCodeApi && (
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300 mt-4 leading-relaxed font-semibold">
              {isStock
                ? "Ensure symbol is mapped correctly in the mapping tab to unlock stock metrics."
                : "Assign a Scheme Code in the mapping tab to unlock dynamic Alpha calculations."}
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION HISTORY SECTION */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="p-6 border-b border-slate-850 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
            <Calendar className="text-teal-400" size={18} />
            <span>
              Reconstructed Transaction History ({transactions.length})
            </span>
          </h3>
          <span className="text-slate-400 text-xs font-semibold">
            Calculated from chronological snapshots
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-850">
                <th className="p-4">Transaction Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">{isStock ? "Quantity" : "Units"}</th>
                <th className="p-4">{isStock ? "Price" : "NAV"}</th>
                <th className="p-4">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm font-medium">
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-500 font-semibold"
                  >
                    No transactions found for this holding.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-950/40 transition">
                    <td className="p-4">{formatNullableDate(tx.date)}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider ${tx.type === "BUY" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-red-950/80 text-red-400 border border-red-800/40"}`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold">
                      {isStock
                        ? tx.units.toLocaleString("en-IN")
                        : tx.units.toFixed(4)}
                    </td>
                    <td className="p-4 font-mono font-bold">
                      ₹{tx.nav.toFixed(4)}
                    </td>
                    <td className="p-4 font-mono font-black text-slate-200">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
