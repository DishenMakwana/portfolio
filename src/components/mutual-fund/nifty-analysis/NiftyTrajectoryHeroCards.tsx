"use client";

import {
  TrendingUp,
  TrendingDown,
  Shield,
  IndianRupee,
  Sparkles,
  Activity,
  Wallet,
  CalendarCheck,
} from "lucide-react";
import { formatIndianAmount } from "@/helpers/formatters";
import type {
  NiftyAnalysisSummary,
  NiftyTradeMode,
} from "@/types/nifty-analysis";

interface NiftyTrajectoryHeroCardsProps {
  summary: NiftyAnalysisSummary;
  tradeMode: NiftyTradeMode;
}

export default function NiftyTrajectoryHeroCards({
  summary,
  tradeMode,
}: NiftyTrajectoryHeroCardsProps) {
  if (tradeMode === "BUY") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. NIFTY 50 Spot */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 hover:border-teal-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Nifty 50 Spot
              </span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <TrendingUp size={18} className="text-teal-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {summary.currentNifty.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-xs font-medium mt-2.5 text-slate-400">
              Current index close · ATH:{" "}
              {summary.allTimeHighNifty.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* 2. Bought Above Spot (Total Invested) */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Bought Above Spot
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Shield size={18} className="text-indigo-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatIndianAmount(summary.higherNiftyInvestedAmount, 0)}
            </div>
            <div className="text-xs font-medium mt-2.5 text-indigo-400">
              {summary.higherNiftyInvestedPct.toFixed(1)}% of total portfolio
              capital invested at premium levels
            </div>
          </div>
        </div>

        {/* 3. Lumpsum Above Spot */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Lumpsum &gt; Spot
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Wallet size={18} className="text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatIndianAmount(summary.higherNiftyLumpsumAmount, 0)}
            </div>
            <div className="text-xs font-medium mt-2.5 text-amber-400">
              {summary.higherNiftyLumpsumPct.toFixed(1)}% of high-entry capital
              deployed via direct buys & transfers
            </div>
          </div>
        </div>

        {/* 4. SIP Above Spot */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                SIP &gt; Spot
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <CalendarCheck size={18} className="text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatIndianAmount(summary.higherNiftySipAmount, 0)}
            </div>
            <div className="text-xs font-medium mt-2.5 text-purple-400">
              {summary.higherNiftySipPct.toFixed(1)}% of high-entry capital via
              automated monthly SIP instalments
            </div>
          </div>
        </div>

        {/* 5. Current Value of Higher Buys */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 hover:border-teal-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Current Value
              </span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <IndianRupee size={18} className="text-teal-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatIndianAmount(summary.higherNiftyCurrentValue, 0)}
            </div>
            <div className="text-xs font-medium mt-2.5 text-slate-400">
              Present portfolio market valuation of all investments made above
              current spot
            </div>
          </div>
        </div>

        {/* 6. Gain on High Buys */}
        <div
          className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${
            summary.higherNiftyTotalGain >= 0
              ? "border-emerald-500/20 hover:border-emerald-500/40"
              : "border-red-500/20 hover:border-red-500/40"
          } rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              summary.higherNiftyTotalGain >= 0
                ? "from-emerald-500/10"
                : "from-red-500/10"
            } to-transparent pointer-events-none`}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Gain on High Buys
              </span>
              <div
                className={`p-2 rounded-xl ${
                  summary.higherNiftyTotalGain >= 0
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {summary.higherNiftyTotalGain >= 0 ? (
                  <TrendingUp size={18} className="text-emerald-400" />
                ) : (
                  <TrendingDown size={18} className="text-red-400" />
                )}
              </div>
            </div>
            <div
              className={`text-2xl font-extrabold leading-tight tracking-tight ${
                summary.higherNiftyTotalGain >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {summary.higherNiftyTotalGain >= 0 ? "+" : ""}
              {formatIndianAmount(summary.higherNiftyTotalGain, 0)}
            </div>
            <div className="text-xs font-medium mt-2.5 text-slate-400">
              Total unrealized profit generated across above-spot transactions
            </div>
          </div>
        </div>

        {/* 7. Avg XIRR of Higher Buys */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 hover:border-teal-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Avg XIRR (High Buys)
              </span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <Sparkles size={18} className="text-teal-400" />
              </div>
            </div>
            <div
              className={`text-2xl font-extrabold leading-tight tracking-tight ${
                summary.higherNiftyAvgXirr >= 0
                  ? "text-teal-400"
                  : "text-red-400"
              }`}
            >
              {summary.higherNiftyAvgXirr >= 0 ? "+" : ""}
              {summary.higherNiftyAvgXirr.toFixed(2)}%
            </div>
            <div className="text-xs font-medium mt-2.5 text-slate-400">
              Annualized return on high-entry buys vs{" "}
              {summary.allPurchasesAvgXirr.toFixed(2)}% overall portfolio
              average
            </div>
          </div>
        </div>

        {/* 8. High-Level Count */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                High Buys Count
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Activity size={18} className="text-indigo-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {summary.higherNiftyTransactionsCount} /{" "}
              {summary.totalTransactionsCount}
            </div>
            <div className="text-xs font-medium mt-2.5 text-indigo-400">
              {summary.higherNiftyTransactionsPct.toFixed(1)}% of all buy
              transactions were made above today&apos;s Nifty level
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SELL MODE
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. NIFTY 50 Spot */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 hover:border-teal-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Nifty 50 Spot
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <TrendingUp size={18} className="text-teal-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {summary.currentNifty.toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs font-medium mt-2.5 text-slate-400">
            ATH: {summary.allTimeHighNifty.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* 2. Total Sold Proceeds */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Total Sold Proceeds
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <IndianRupee size={18} className="text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatIndianAmount(summary.totalInvestedAmount, 0)}
          </div>
          <div className="text-xs font-medium mt-2.5 text-slate-400">
            Across {summary.totalTransactionsCount} total sell & redemption
            records
          </div>
        </div>
      </div>

      {/* 3. Sold Above Current Spot */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Sold Above Current Spot
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Shield size={18} className="text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatIndianAmount(summary.higherNiftyInvestedAmount, 0)}
          </div>
          <div className="text-xs font-medium mt-2.5 text-amber-400">
            {summary.higherNiftyInvestedPct.toFixed(1)}% of all proceeds
            redeemed when NIFTY was higher
          </div>
        </div>
      </div>

      {/* 4. Peak Zone Exits (>97% ATH) */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Peak Zone Exits (&gt;97% ATH)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Sparkles size={18} className="text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatIndianAmount(summary.peakBuysInvestedAmount, 0)}
          </div>
          <div className="text-xs font-medium mt-2.5 text-amber-400">
            {summary.peakBuysCount} redemptions executed near market peaks
          </div>
        </div>
      </div>

      {/* 5. Fair Value Exits (90-97% ATH) */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-sky-500/20 hover:border-sky-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Fair Value Exits
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Activity size={18} className="text-sky-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatIndianAmount(
              Math.max(
                0,
                summary.totalInvestedAmount -
                  summary.peakBuysInvestedAmount -
                  summary.dipBuysInvestedAmount
              ),
              0
            )}
          </div>
          <div className="text-xs font-medium mt-2.5 text-sky-400">
            Redemptions executed in standard 90-97% ATH market zone
          </div>
        </div>
      </div>

      {/* 6. Deep Dip Exits (<90% ATH) */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-rose-500/20 hover:border-rose-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Dip Zone Exits (&lt;90% ATH)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <TrendingDown size={18} className="text-rose-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatIndianAmount(summary.dipBuysInvestedAmount, 0)}
          </div>
          <div className="text-xs font-medium mt-2.5 text-rose-400">
            {summary.dipBuysCount} redemptions executed during market drawdowns
          </div>
        </div>
      </div>

      {/* 7. Sells Above Spot Count */}
      <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              High Exit Count
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Activity size={18} className="text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {summary.higherNiftyTransactionsCount} /{" "}
            {summary.totalTransactionsCount}
          </div>
          <div className="text-xs font-medium mt-2.5 text-indigo-400">
            {summary.higherNiftyTransactionsPct.toFixed(1)}% of all sells
            executed at higher index levels than today
          </div>
        </div>
      </div>
    </div>
  );
}
