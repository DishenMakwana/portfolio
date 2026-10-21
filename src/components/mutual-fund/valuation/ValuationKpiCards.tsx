import { Wallet, TrendingUp, ArrowUpRight, Clock, Layers } from "lucide-react";
import {
  formatIndianAmount,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import type { ValuationKpiCardsProps } from "@/types/valuation";

export default function ValuationKpiCards({
  summary,
  asOfDate,
}: ValuationKpiCardsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* 1. Purchase Value */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-slate-700/40 hover:border-slate-600/60 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Purchase</span>
              <span>Value</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-800/60 shrink-0 border border-slate-700/40">
              <Wallet size={15} className="text-slate-300" />
            </div>
          </div>
          <div className="text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold text-slate-100 leading-tight tracking-tight truncate">
            {formatIndianAmount(summary.totalPurchaseValue, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-slate-400 truncate">
            {summary.folioCount} Active Folios
          </div>
        </div>
      </div>

      {/* 2. Current Value */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 hover:border-teal-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Current</span>
              <span>Value</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-teal-500/10 shrink-0 border border-teal-500/20">
              <TrendingUp size={15} className="text-teal-400" />
            </div>
          </div>
          <div className="text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold text-teal-300 leading-tight tracking-tight truncate">
            {formatIndianAmount(summary.totalCurrentValue, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-teal-400/80 truncate">
            As of {asOfDate}
          </div>
        </div>
      </div>

      {/* 3. Net Gain */}
      <div
        className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${
          summary.totalGain >= 0
            ? "border-emerald-500/20 hover:border-emerald-500/40"
            : "border-rose-500/20 hover:border-rose-500/40"
        } rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            summary.totalGain >= 0 ? "from-emerald-500/10" : "from-rose-500/10"
          } to-transparent pointer-events-none`}
        />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div
              className={`text-[11px] font-bold uppercase tracking-wider leading-[1.25] h-7 flex flex-col justify-center ${
                summary.totalGain >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              <span>Net</span>
              <span>Gain</span>
            </div>
            <div
              className={`p-1.5 sm:p-2 rounded-xl shrink-0 border ${
                summary.totalGain >= 0
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-rose-500/10 border-rose-500/20"
              }`}
            >
              <ArrowUpRight
                size={15}
                className={
                  summary.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
                }
              />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold leading-tight tracking-tight truncate ${
              summary.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {summary.totalGain >= 0 ? "+" : ""}
            {formatIndianAmount(summary.totalGain, 0)}
          </div>
          <div
            className={`text-xs font-semibold mt-1.5 truncate ${
              summary.totalGain >= 0
                ? "text-emerald-400/80"
                : "text-rose-400/80"
            }`}
          >
            Unrealized Return
          </div>
        </div>
      </div>

      {/* 4. Avg Holding */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-slate-700/40 hover:border-slate-600/60 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Avg</span>
              <span>Holding</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-800/60 shrink-0 border border-slate-700/40">
              <Clock size={15} className="text-slate-300" />
            </div>
          </div>
          <div className="text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold text-slate-100 leading-tight tracking-tight truncate">
            {summary.weightedHoldingDays.toLocaleString("en-IN")}{" "}
            <span className="text-xs font-normal text-slate-400">days</span>
          </div>
          <div className="text-xs font-semibold mt-1.5 text-slate-400 truncate">
            {formatHoldingYearsAndDays(summary.weightedHoldingDays)}
          </div>
        </div>
      </div>

      {/* 5. Abs Return */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Abs</span>
              <span>Return</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/10 shrink-0 border border-indigo-500/20">
              <Layers size={15} className="text-indigo-400" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold leading-tight tracking-tight truncate ${
              summary.absReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {summary.absReturnPct >= 0 ? "+" : ""}
            {summary.absReturnPct.toFixed(2)}%
          </div>
          <div className="text-xs font-semibold mt-1.5 text-indigo-400/80 truncate">
            Simple Absolute
          </div>
        </div>
      </div>

      {/* 6. Portfolio CAGR */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/30 hover:border-teal-500/50 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Portfolio</span>
              <span>CAGR</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-teal-500/10 shrink-0 border border-teal-500/20">
              <TrendingUp size={15} className="text-teal-400" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold leading-tight tracking-tight truncate ${
              summary.cagrPct >= 0 ? "text-teal-400" : "text-rose-400"
            }`}
          >
            {summary.cagrPct >= 0 ? "+" : ""}
            {summary.cagrPct.toFixed(2)}%
          </div>
          <div className="text-xs font-semibold mt-1.5 text-teal-400/80 truncate">
            Weighted Annualized
          </div>
        </div>
      </div>

      {/* 7. Portfolio XIRR */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Portfolio</span>
              <span>XIRR</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 shrink-0 border border-emerald-500/20">
              <TrendingUp size={15} className="text-emerald-400" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold leading-tight tracking-tight truncate ${
              summary.xirrPct >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {summary.xirrPct >= 0 ? "+" : ""}
            {summary.xirrPct.toFixed(2)}%
          </div>
          <div className="text-xs font-semibold mt-1.5 text-emerald-400/80 truncate">
            Internal Rate of Return
          </div>
        </div>
      </div>
    </div>
  );
}
