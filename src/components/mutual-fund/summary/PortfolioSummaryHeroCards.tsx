"use client";

import {
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  Sparkles,
  ArrowDownLeft,
} from "lucide-react";
import { formatIndianAmount } from "@/helpers/formatters";
import type { PortfolioSummaryHeroCardsProps } from "@/types/summary";

export default function PortfolioSummaryHeroCards({
  summary,
}: PortfolioSummaryHeroCardsProps) {
  const isGainPositive = summary.totalGain >= 0;

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
            {formatIndianAmount(summary.totalPurchase, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-slate-400 truncate">
            {summary.folioCount} Schemes / Folios
          </div>
        </div>
      </div>

      {/* 2. Switch In */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Switch</span>
              <span>In</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/10 shrink-0 border border-cyan-500/20">
              <ArrowLeftRight size={15} className="text-cyan-400" />
            </div>
          </div>
          <div className="text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold text-cyan-300 leading-tight tracking-tight truncate">
            {formatIndianAmount(summary.totalSwitchIn, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-cyan-400/80 truncate">
            STP / Transferred In
          </div>
        </div>
      </div>

      {/* 3. Redemptions */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Total</span>
              <span>Redemptions</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 shrink-0 border border-amber-500/20">
              <ArrowDownLeft size={15} className="text-amber-400" />
            </div>
          </div>
          <div className="text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold text-amber-300 leading-tight tracking-tight truncate">
            {formatIndianAmount(summary.totalRedemption, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-amber-400/80 truncate">
            Withdrawn Out
          </div>
        </div>
      </div>

      {/* 4. Switch Out */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Switch</span>
              <span>Out</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/10 shrink-0 border border-purple-500/20">
              <ArrowLeftRight size={15} className="text-purple-400" />
            </div>
          </div>
          <div className="text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold text-purple-300 leading-tight tracking-tight truncate">
            {formatIndianAmount(summary.totalSwitchOut, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-purple-400/80 truncate">
            Switched / STP Out
          </div>
        </div>
      </div>

      {/* 5. Current Value */}
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
            {formatIndianAmount(summary.totalCurrent, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-teal-400/80 truncate">
            Active Valuation
          </div>
        </div>
      </div>

      {/* 6. Total Gain */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Total</span>
              <span>Gain</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 shrink-0 border border-emerald-500/20">
              <Sparkles size={15} className="text-emerald-400" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold leading-tight tracking-tight truncate ${
              isGainPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isGainPositive ? "+" : ""}
            {formatIndianAmount(summary.totalGain, 0)}
          </div>
          <div className="text-xs font-semibold mt-1.5 text-emerald-400/80 truncate">
            Realized + Unrealized
          </div>
        </div>
      </div>

      {/* 7. Portfolio XIRR */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[135px]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 leading-[1.25] h-7 flex flex-col justify-center">
              <span>Portfolio</span>
              <span>XIRR</span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/10 shrink-0 border border-indigo-500/20">
              <TrendingUp size={15} className="text-indigo-400" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg lg:text-[19px] xl:text-xl font-extrabold leading-tight tracking-tight truncate ${
              summary.xirrPct >= 0 ? "text-indigo-300" : "text-rose-400"
            }`}
          >
            {summary.xirrPct.toFixed(2)}%
          </div>
          <div className="text-xs font-semibold mt-1.5 text-indigo-400/80 truncate">
            Annualised Return
          </div>
        </div>
      </div>
    </div>
  );
}
