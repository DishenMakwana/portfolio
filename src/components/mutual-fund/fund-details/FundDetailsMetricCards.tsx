"use client";

import {
  DollarSign,
  TrendingUp,
  Clock,
  Award,
  Zap,
  Target,
  Layers,
} from "lucide-react";
import {
  formatCurrency,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import { FundDetailsMetricCardsProps } from "@/types/fund-details";

export default function FundDetailsMetricCards({
  holding,
  metrics,
  hasHoldingDays,
  isStock,
}: FundDetailsMetricCardsProps) {
  const absoluteGain = holding.gain || 0;
  const isPositiveGain = absoluteGain >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* ROW 1: BASIC HOLDING STATS (4 CARDS) */}

      {/* 1. Total Invested */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Total Invested
          </span>
          <div className="p-2 bg-slate-800/80 rounded-xl text-teal-400">
            <DollarSign size={18} />
          </div>
        </div>
        <div className="text-xl font-black text-slate-100 tracking-tight">
          {formatCurrency(holding.purchaseValue)}
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
          {isStock ? "Avg Price" : "Avg NAV"}:{" "}
          <strong className="text-slate-200">
            ₹{holding.purchaseNav.toFixed(4)}
          </strong>
        </div>
      </div>

      {/* 2. Current Market Value */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Current Market Value
          </span>
          <div className="p-2 bg-slate-800/80 rounded-xl text-indigo-400">
            <Layers size={18} />
          </div>
        </div>
        <div className="text-xl font-black text-slate-100 tracking-tight">
          {formatCurrency(holding.currentValue)}
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
          {isStock ? "Current Price" : "Current NAV"}:{" "}
          <strong className="text-slate-200">
            ₹{holding.currentNav.toFixed(4)}
          </strong>
        </div>
      </div>

      {/* 3. Overall Return / P&L */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Overall Return (P&L)
          </span>
          <div
            className={`p-2 rounded-xl ${isPositiveGain ? "bg-emerald-950/60 text-emerald-400" : "bg-red-950/60 text-red-400"}`}
          >
            <TrendingUp size={18} />
          </div>
        </div>
        <div
          className={`text-xl font-black tracking-tight ${isPositiveGain ? "text-emerald-400" : "text-red-400"}`}
        >
          {isPositiveGain ? "+" : ""}
          {formatCurrency(absoluteGain)}
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1.5">
          <span>Absolute Return:</span>
          <span
            className={`font-bold ${holding.absoluteReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {holding.absoluteReturn >= 0 ? "+" : ""}
            {holding.absoluteReturn.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 4. Holding Period (Now in 1st Row!) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Holding Period
          </span>
          <div className="p-2 bg-slate-800/80 rounded-xl text-amber-400">
            <Clock size={18} />
          </div>
        </div>
        <div className="text-xl font-black text-slate-100 tracking-tight">
          {hasHoldingDays ? `${holding.holdingDays} Days` : "N/A"}
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
          {hasHoldingDays && holding.holdingDays >= 30
            ? formatHoldingYearsAndDays(holding.holdingDays)
            : "Since initial purchase"}
        </div>
      </div>

      {/* ROW 2: PERFORMANCE METRICS & BENCHMARK COMPARISON (4 CARDS) */}

      {/* 5. Portfolio XIRR */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Portfolio XIRR
          </span>
          <div className="p-2 bg-slate-800/80 rounded-xl text-teal-400">
            <Zap size={18} />
          </div>
        </div>
        <div className="text-xl font-black text-teal-400 tracking-tight">
          {metrics.portfolioXirr.toFixed(2)}%
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
          Money-weighted annualized return
        </div>
      </div>

      {/* 6. Benchmark XIRR (Separate Standalone Card!) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Benchmark XIRR
          </span>
          <div className="p-2 bg-slate-800/80 rounded-xl text-indigo-400">
            <Target size={18} />
          </div>
        </div>
        <div className="text-xl font-black text-indigo-400 tracking-tight">
          {metrics.benchmarkXirr.toFixed(2)}%
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
          Index money-weighted return
        </div>
      </div>

      {/* 7. Annualised CAGR */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Annualised CAGR
          </span>
          <div className="p-2 bg-slate-800/80 rounded-xl text-purple-400">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="text-xl font-black text-purple-400 tracking-tight">
          {holding.cagr !== null && holding.cagr !== undefined
            ? `${holding.cagr.toFixed(2)}%`
            : "N/A"}
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium">
          Point-to-point annual growth rate
        </div>
      </div>

      {/* 8. Generated Alpha (α) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Generated Alpha (α)
          </span>
          <div
            className={`p-2 rounded-xl ${metrics.alpha >= 0 ? "bg-emerald-950/60 text-emerald-400" : "bg-red-950/60 text-red-400"}`}
          >
            <Award size={18} />
          </div>
        </div>
        <div
          className={`text-xl font-black tracking-tight ${metrics.alpha >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {metrics.alpha >= 0 ? "+" : ""}
          {metrics.alpha.toFixed(2)}%
        </div>
        <div className="text-xs text-slate-400 mt-2 font-medium truncate">
          {metrics.alpha >= 0
            ? "Outperforming benchmark"
            : "Underperforming benchmark"}
        </div>
      </div>
    </div>
  );
}
