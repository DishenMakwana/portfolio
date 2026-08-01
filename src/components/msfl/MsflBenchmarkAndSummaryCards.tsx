"use client";

import { motion } from "framer-motion";
import { Target, BriefcaseBusiness } from "lucide-react";
import DeltaBadge from "@/components/shared/DeltaBadge";
import { formatCurrency, formatPercent } from "@/helpers/formatters";
import type { MsflBenchmarkAndSummaryCardsProps } from "@/types/msfl";

export default function MsflBenchmarkAndSummaryCards({
  totals,
  metricDeltas,
  holdingsCount,
  topPerformer,
}: MsflBenchmarkAndSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Benchmark comparison card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest">
            XIRR vs Benchmark
          </h4>
          <div className="bg-teal-500/10 p-1.5 rounded-lg">
            <Target size={14} className="text-teal-400" />
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Your Portfolio</span>
              <span className="flex items-center gap-2 font-bold text-teal-400">
                {formatPercent(totals.portfolioXirr)}
                <DeltaBadge delta={metricDeltas.portfolioXirr} label="" />
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(Math.max(totals.portfolioXirr, 0) * 2.5, 100)}%`,
                }}
                transition={{ delay: 0.3, duration: 0.7 }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Nifty 50 Index</span>
              <span className="flex items-center gap-2 font-bold text-violet-400">
                {formatPercent(totals.benchmarkXirr)}
                <DeltaBadge delta={metricDeltas.benchmarkXirr} label="" />
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(Math.max(totals.benchmarkXirr, 0) * 2.5, 100)}%`,
                }}
                transition={{ delay: 0.4, duration: 0.7 }}
              />
            </div>
          </div>
          <div
            className={`text-center text-[11px] font-bold py-1.5 rounded-lg ${
              totals.alpha >= 0
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            <span>
              Alpha: {totals.alpha >= 0 ? "+" : ""}
              {totals.alpha.toFixed(2)}% —{" "}
              {totals.alpha >= 0 ? "Beating the market" : "Lagging behind"}
            </span>
            <span className="ml-2 inline-flex align-middle">
              <DeltaBadge delta={metricDeltas.alpha} label="" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Portfolio Summary Stats */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between shadow-xl">
        <div>
          <h3 className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BriefcaseBusiness size={15} className="text-indigo-400" />
            Portfolio Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Unique Stocks
              </p>
              <p className="text-xl font-extrabold text-slate-100 mt-1">
                {holdingsCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Average / Stock
              </p>
              <p className="text-xl font-extrabold text-slate-100 mt-1">
                {holdingsCount > 0
                  ? formatCurrency(totals.currentValue / holdingsCount)
                  : "₹0"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Top Performing Stock
            </p>
            <p className="text-sm font-bold text-slate-200 mt-0.5 truncate max-w-[200px]">
              {topPerformer ? topPerformer.symbol : "None"}
            </p>
          </div>
          <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {topPerformer && typeof topPerformer.cagr === "number"
              ? `${topPerformer.cagr.toFixed(2)}% CAGR`
              : "N/A"}
          </span>
        </div>
      </section>
    </div>
  );
}
