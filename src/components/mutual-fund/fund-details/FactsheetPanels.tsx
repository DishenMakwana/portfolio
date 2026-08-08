"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  PieChart,
  Activity,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
  TrendingDown,
  Receipt,
  Coins,
  Scale,
} from "lucide-react";
import {
  formatNullableDate,
  formatHoldingYearsAndDays,
  formatCurrency,
} from "@/helpers/formatters";
import { FactsheetPanelsProps } from "@/types/fund-details";

function getCurrentFinancialYearLabel(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = (startYear + 1).toString().slice(-2);
  return `FY ${startYear}-${endYearShort}`;
}

function getTxFinancialYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown";
  let d: Date;
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts[0].length === 4) {
      d = new Date(`${dateStr}T00:00:00`);
    } else if (parts[2]?.length === 4) {
      const [day, month, year] = parts;
      const monthIdx = isNaN(Number(month))
        ? new Date(`${month} 1, 2000`).getMonth()
        : Number(month) - 1;
      d = new Date(Number(year), monthIdx, Number(day));
    } else {
      d = new Date(dateStr);
    }
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) {
    const match = dateStr.match(/\b(20\d\d|19\d\d)\b/);
    if (match) {
      const yr = Number(match[1]);
      return `FY ${yr}-${(yr + 1).toString().slice(-2)}`;
    }
    return "Unknown";
  }

  const month = d.getMonth();
  const year = d.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = (startYear + 1).toString().slice(-2);
  return `FY ${startYear}-${endYearShort}`;
}

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

  // Current Financial Year label (e.g., "FY 2026-27")
  const currentFYLabel = useMemo(() => getCurrentFinancialYearLabel(), []);

  // Group transactions count by Financial Year
  const fyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((tx) => {
      const fy = getTxFinancialYear(tx.date);
      counts[fy] = (counts[fy] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  // Unique list of Financial Years in descending order
  const availableFYs = useMemo(() => {
    return Object.keys(fyCounts).sort((a, b) => b.localeCompare(a));
  }, [fyCounts]);

  // Determine default Financial Year filter (Current FY if transactions exist, else latest available FY)
  const defaultFY = useMemo(() => {
    if (fyCounts[currentFYLabel]) return currentFYLabel;
    if (availableFYs.length > 0) return availableFYs[0];
    return currentFYLabel;
  }, [currentFYLabel, fyCounts, availableFYs]);

  // Transaction History Pagination & Filtering State (Defaults to Current Financial Year)
  const [selectedFY, setSelectedFY] = useState<string>(defaultFY);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sync selectedFY when defaultFY changes or transactions update
  useEffect(() => {
    if (selectedFY !== "ALL" && !fyCounts[selectedFY]) {
      setSelectedFY(defaultFY);
      setCurrentPage(1);
    }
  }, [transactions, defaultFY, selectedFY, fyCounts]);

  // Filter transactions by selected Financial Year
  const filteredTransactions = useMemo(() => {
    if (selectedFY === "ALL") return transactions;
    return transactions.filter(
      (tx) => getTxFinancialYear(tx.date) === selectedFY
    );
  }, [transactions, selectedFY]);

  // Calculate total pages
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize)
  );

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Summary totals for Buy, Sell, Stamp Duty & Realised PnL
  const txSummary = useMemo(() => {
    let buySum = 0;
    let sellSum = 0;
    let stampDutySum = 0;
    let sttSum = 0;

    transactions.forEach((tx) => {
      const type = (tx.type || "").toUpperCase();
      const amt = tx.amount || 0;
      const stamp = (tx as any).stampDuty || 0;
      const stt = (tx as any).stt || 0;

      if (type === "BUY" || type === "PURCHASE" || type === "SIP") {
        buySum += amt;
      } else if (type === "SELL" || type === "REDEMPTION" || type === "SWP") {
        sellSum += amt;
      }
      stampDutySum += stamp;
      sttSum += stt;
    });

    const netCapitalDeployed = buySum - sellSum;
    const totalDutyAndTax = stampDutySum + sttSum;
    const realizedCapitalGains =
      sellSum > 0
        ? Math.max(
            0,
            (holding.purchaseValue || 0) - netCapitalDeployed - totalDutyAndTax
          )
        : 0;
    const finalTotalValuation =
      netCapitalDeployed + realizedCapitalGains + totalDutyAndTax;

    return {
      buySum,
      sellSum,
      netCapitalDeployed,
      stampDutySum,
      sttSum,
      totalDutyAndTax,
      realisedProfit: sellSum - buySum,
      realizedCapitalGains,
      finalTotalValuation,
    };
  }, [transactions, holding.purchaseValue]);

  const handleFYChange = (fy: string) => {
    setSelectedFY(fy);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

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
                  <span className="font-bold text-slate-200">
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
                    <span className="font-bold text-slate-200">
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
                    <span className="text-teal-400">
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
                    <span className="text-purple-400">
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
                    <span className="text-amber-400">
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
                    <span className="text-blue-400">
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
                    <span className="text-slate-400">
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

        {/* PANEL 3: ADVANCED RATIOS */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-teal-400" />
                <span>Advanced Ratios</span>
              </div>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 relative">
              {/* Left Column: Valuation & Outperformance */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-950/40 px-3.5 py-2.5 border border-slate-850 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    P/E Ratio
                  </span>
                  <span className="text-sm font-black text-slate-100">
                    {currentVolatilityStats.peRatio !== undefined
                      ? currentVolatilityStats.peRatio.toFixed(2)
                      : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-3.5 py-2.5 border border-slate-850 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    P/B Ratio
                  </span>
                  <span className="text-sm font-black text-slate-100">
                    {currentVolatilityStats.pbRatio !== undefined
                      ? currentVolatilityStats.pbRatio.toFixed(2)
                      : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-3.5 py-2.5 border border-slate-850 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    Alpha
                  </span>
                  <span
                    className={`text-sm font-black ${currentVolatilityStats.alpha >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {currentVolatilityStats.alpha.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Middle vertical divider */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-800/80 -translate-x-1/2" />

              {/* Right Column: Risk & Volatility Ratios */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-950/40 px-3.5 py-2.5 border border-slate-850 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    Beta
                  </span>
                  <span className="text-sm font-black text-indigo-400">
                    {currentVolatilityStats.beta.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-3.5 py-2.5 border border-slate-850 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    Sharpe
                  </span>
                  <span className="text-sm font-black text-teal-400">
                    {(currentVolatilityStats.sharpe ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-3.5 py-2.5 border border-slate-850 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    Sortino
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {(currentVolatilityStats.sortino ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-5 leading-relaxed">
            Note: Advanced ratios include price valuation metrics and rolling
            2-year risk-adjusted return ratios calculated against{" "}
            {factsheetMeta.profile.benchmarkName}.
          </div>
        </div>
      </div>

      {/* EDUCATIONAL METRIC EXPLANATIONS & ADVANCED RATIO FORMULAS */}
      <div className="bg-slate-900/40 border border-slate-850/60 rounded-2xl overflow-hidden shadow-lg mt-6">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full p-5 flex justify-between items-center text-left hover:bg-slate-900/60 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle size={20} className="text-teal-400" />
            <h4 className="text-sm font-black text-slate-200 tracking-tight">
              Understanding Volatility and Advanced Ratio Metrics
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
                <div className="flex items-center gap-2 text-emerald-400 text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
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
                    Where: Rₚ = Portfolio XIRR, R_f = Risk-free rate (6.5%), R_m
                    = Benchmark return, β = Beta
                  </p>
                </div>
              </div>

              {/* Sharpe Ratio */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Sharpe Ratio</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Total Risk-Adjusted Return
                  </span>
                </div>
                <div className="flex items-center gap-2 text-teal-400 text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>Sharpe = ( Rₚ - R_f ) / σₚ</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    Shows risk-adjusted return. It measures how much excess
                    return you get per unit of total volatility. A higher Sharpe
                    ratio indicates better investment efficiency.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: Rₚ = Portfolio Return, R_f = Risk-free rate (6.5%),
                    σₚ = Annualized Standard Deviation
                  </p>
                </div>
              </div>

              {/* Sortino Ratio */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">
                    Sortino Ratio
                  </span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Downside Risk-Adjusted Return
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>Sortino = ( Rₚ - R_f ) / σ_downside</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    Measures excess return per unit of harmful downside risk
                    only. Unlike Sharpe, Sortino ignores positive upside
                    volatility and only penalizes negative return swings below
                    the risk-free rate.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: Rₚ = Portfolio Return, R_f = Risk-free rate (6.5%),
                    σ_downside = Annualized Downside Deviation
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
                <div className="flex items-center gap-2 text-indigo-400 text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
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
                    Total Volatility
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
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

              {/* Valuation Ratios (P/E & P/B) */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">
                    P/E & P/B Ratios
                  </span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Fund Valuation
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>P/E = Σ ( w_i × PE_i ), P/B = Σ ( w_i × PB_i )</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>
                    Weighted average Price-to-Earnings and Price-to-Book
                    multipliers of underlying equity stocks. Indicates whether
                    the fund follows a Growth (higher PE/PB) or Value (lower
                    PE/PB) investment strategy.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Where: w_i = Stock weight, PE_i / PB_i = Stock valuation
                    multiple
                  </p>
                </div>
              </div>

              {/* Debt Metrics (YTM / Duration / Maturity) */}
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
                  <div className="flex items-center gap-2 text-slate-200 text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
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
              <div className="text-slate-200 mt-0.5 font-bold">
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
              <div className="text-slate-200 mt-0.5 font-bold">
                ₹{holding.purchaseNav.toFixed(4)}
              </div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                {isStock ? "Current Price" : "Current NAV"}
              </div>
              <div className="text-slate-200 mt-0.5 font-bold">
                ₹{holding.currentNav.toFixed(4)}
              </div>
            </div>
            {!isStock && (
              <>
                <div className="border-b border-slate-850/60 pb-2">
                  <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    Dividend Paid
                  </div>
                  <div className="text-slate-200 mt-0.5 font-bold">
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
                  <div className="text-slate-200 mt-0.5 font-bold">
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
                  <div className="text-slate-200 mt-0.5 font-bold text-red-400">
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
                  <div className="text-slate-200 mt-0.5 font-bold text-amber-400">
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
                    <div className="text-slate-200 mt-0.5 font-bold text-teal-400">
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
                  <span className="text-emerald-400 font-bold bg-emerald-950/20 px-2.5 py-0.5 border border-emerald-900/40 rounded text-xs">
                    {holding.schemeCodeApi}
                  </span>
                ) : (
                  <span className="text-amber-500 bg-amber-950/20 px-2.5 py-0.5 border border-amber-900/40 rounded text-xs flex items-center gap-1 font-bold">
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

      {/* TRANSACTION METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Buy Value */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5 h-8">
            <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Total Fund Buy
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm sm:text-base lg:text-lg font-black text-blue-400 tracking-tight whitespace-nowrap">
              {formatCurrency(txSummary.buySum)}
            </div>
            <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
              Purchases & SIP inflows
            </div>
          </div>
        </div>

        {/* Card 2: Total Sell Value */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5 h-8">
            <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Total Fund Sell
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
              <TrendingDown size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm sm:text-base lg:text-lg font-black text-rose-400 tracking-tight whitespace-nowrap">
              {formatCurrency(txSummary.sellSum)}
            </div>
            <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
              Redemptions & sales
            </div>
          </div>
        </div>

        {/* Card 3: Realized Capital Gains */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5 h-8">
            <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Realized Gains
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
              <Coins size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm sm:text-base lg:text-lg font-black text-purple-400 tracking-tight whitespace-nowrap">
              {formatCurrency(txSummary.realizedCapitalGains)}
            </div>
            <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
              Profit from past sales
            </div>
          </div>
        </div>

        {/* Card 4: Dynamic Stamp Duty & STT Card */}
        {(() => {
          const hasStamp = txSummary.stampDutySum > 0;
          const hasStt = txSummary.sttSum > 0;

          let title = "Stamp Duty Paid";
          let subtext = "Govt stamp duty tax";

          if (hasStamp && hasStt) {
            title = "Stamp & STT Paid";
            subtext = `Stamp & STT charges`;
          } else if (hasStt && !hasStamp) {
            title = "STT Paid";
            subtext = "Securities Tax (STT)";
          } else if (hasStamp && !hasStt) {
            title = "Stamp Duty Paid";
            subtext = "Govt stamp duty tax";
          }

          return (
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
              <div className="flex items-center justify-between gap-1.5 h-8">
                <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  {title}
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Receipt size={15} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm sm:text-base lg:text-lg font-black text-amber-400 tracking-tight whitespace-nowrap">
                  {formatCurrency(txSummary.totalDutyAndTax)}
                </div>
                <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
                  {subtext}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Card 5: CAS Purchase Value (Final Total Card) */}
        {(() => {
          const isFullySold = (holding.balanceUnits ?? 0) <= 0.0001;
          return (
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
              <div className="flex items-center justify-between gap-1.5 h-8">
                <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  CAS Purchase Val
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Scale size={15} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-400 tracking-tight whitespace-nowrap">
                  {formatCurrency(
                    isFullySold ? 0 : txSummary.finalTotalValuation
                  )}
                </div>
                <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
                  {isFullySold
                    ? "Fully Redeemed (0 Active Units)"
                    : "Buy - Sell + Gains + Tax"}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* TRANSACTION HISTORY SECTION */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="p-6 border-b border-slate-850 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
              <Calendar className="text-teal-400" size={18} />
              <span>Transaction History ({transactions.length})</span>
            </h3>
            <span className="text-slate-400 text-xs font-semibold">
              Complete SOA & statement ledger
            </span>
          </div>

          {/* FINANCIAL YEAR FILTER PILLS */}
          {availableFYs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-850/80">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={12} className="text-teal-400" /> Filter FY:
              </span>

              {/* Current Financial Year Pill */}
              {availableFYs.includes(currentFYLabel) && (
                <button
                  onClick={() => handleFYChange(currentFYLabel)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                    selectedFY === currentFYLabel
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20"
                      : "bg-teal-950/40 text-teal-400 border border-teal-800/60 hover:bg-teal-900/40"
                  }`}
                >
                  <span>{currentFYLabel} (Current FY)</span>
                  <span className="bg-slate-950/40 px-1.5 py-0.5 text-[10px] rounded font-black">
                    {fyCounts[currentFYLabel]}
                  </span>
                </button>
              )}

              {/* Other Financial Years */}
              {availableFYs
                .filter((fy) => fy !== currentFYLabel)
                .map((fy) => (
                  <button
                    key={fy}
                    onClick={() => handleFYChange(fy)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                      selectedFY === fy
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20"
                        : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {fy} ({fyCounts[fy]})
                  </button>
                ))}

              {/* All Transactions Pill */}
              <button
                onClick={() => handleFYChange("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                  selectedFY === "ALL"
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700"
                }`}
              >
                All Transactions ({transactions.length})
              </button>
            </div>
          )}
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
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-500 font-semibold"
                  >
                    No transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-950/40 transition">
                    <td className="p-4">{formatNullableDate(tx.date)}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider ${
                          tx.type === "BUY"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                            : "bg-red-950/80 text-red-400 border border-red-800/40"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-bold">
                      {isStock
                        ? Math.abs(tx.units).toLocaleString("en-IN")
                        : Math.abs(tx.units).toFixed(4)}
                    </td>
                    <td className="p-4 font-bold">₹{tx.nav.toFixed(4)}</td>
                    <td className="p-4 font-black text-slate-200">
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {filteredTransactions.length > 0 && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-200">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-200">
                {Math.min(currentPage * pageSize, filteredTransactions.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-teal-400">
                {filteredTransactions.length}
              </span>{" "}
              transactions
              {selectedFY !== "ALL" && (
                <span className="text-slate-500 ml-1">
                  (Filtered for {selectedFY}
                  {selectedFY === currentFYLabel ? " - Current FY" : ""})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Page size buttons */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-bold mr-1">Show:</span>
                {[10, 25, 50].map((size) => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={`px-2.5 py-1 rounded text-xs font-extrabold transition ${
                      pageSize === size
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                        : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <button
                  onClick={() =>
                    handlePageSizeChange(
                      Math.max(filteredTransactions.length, 100)
                    )
                  }
                  className={`px-2.5 py-1 rounded text-xs font-extrabold transition ${
                    pageSize >= 100
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                      : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  All
                </button>
              </div>

              {/* Prev / Next Page controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="text-xs font-bold text-slate-300 px-2">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
