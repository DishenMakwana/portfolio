"use client";

import { Shield, IndianRupee, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatIndianAmount } from "@/helpers/formatters";
import type { JourneyHeaderSummaryProps } from "@/types/journey";

export default function JourneyHeaderSummary({
  currentValue,
  netInvestment,
  periodGain,
  periodGainPct,
}: JourneyHeaderSummaryProps) {
  const isPositive = periodGain >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {/* 1. Invested Value */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-5 shadow-xl hover:border-indigo-500/40 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Invested Value
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Shield size={17} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight font-mono">
            {formatCurrency(netInvestment)}
          </div>
          <div className="text-xs font-semibold mt-2 text-slate-400">
            Net Invested Capital
          </div>
        </div>
      </div>

      {/* 2. Current Value */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl hover:border-teal-500/40 transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Current Value
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <IndianRupee size={17} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight font-mono">
            {formatCurrency(currentValue)}
          </div>
          <div className="text-xs font-semibold mt-2 text-teal-400">
            Portfolio Market Valuation
          </div>
        </div>
      </div>

      {/* 3. Period Gain */}
      <div
        className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${
          isPositive
            ? "border-emerald-500/20 hover:border-emerald-500/40"
            : "border-rose-500/20 hover:border-rose-500/40"
        } rounded-2xl p-5 shadow-xl transition-all duration-200`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            isPositive ? "from-emerald-500/10" : "from-rose-500/10"
          } to-transparent pointer-events-none`}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Period Gain
            </span>
            <div
              className={`p-2 rounded-xl border ${
                isPositive
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp size={17} />
              ) : (
                <TrendingDown size={17} />
              )}
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight font-mono">
            {isPositive ? "+" : ""}
            {formatIndianAmount(periodGain)}
          </div>
          <div
            className={`text-xs font-semibold mt-2 ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {periodGainPct > 0 ? "+" : ""}
            {periodGainPct}% Absolute Return
          </div>
        </div>
      </div>
    </div>
  );
}
