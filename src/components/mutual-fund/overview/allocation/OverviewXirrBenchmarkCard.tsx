"use client";

import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { formatPercent } from "@/helpers/formatters";
import DeltaBadge from "@/components/shared/DeltaBadge";
import type { OverviewXirrBenchmarkCardProps } from "@/types/overview";

export default function OverviewXirrBenchmarkCard({
  portfolioXirr,
  benchmarkXirr,
  alpha,
  metricDeltas,
}: OverviewXirrBenchmarkCardProps) {
  const isAlphaPositive = alpha >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
          XIRR vs Benchmark
        </h4>
        <div className="bg-teal-500/10 p-1.5 rounded-lg">
          <Target size={14} className="text-teal-400" />
        </div>
      </div>
      <div className="space-y-4">
        {/* Portfolio */}
        <div>
          <div className="flex justify-between items-baseline text-xs mb-2">
            <span className="text-slate-400 font-medium">Your Portfolio</span>
            <span className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-teal-400 tabular-nums leading-none">
                {formatPercent(portfolioXirr)}
              </span>
              <DeltaBadge delta={metricDeltas.portfolioXirr} label="" />
            </span>
          </div>
          <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(Math.max(portfolioXirr, 0) * 2.5, 100)}%`,
              }}
              transition={{ delay: 0.6, duration: 0.7 }}
            />
          </div>
        </div>
        {/* Benchmark */}
        <div>
          <div className="flex justify-between items-baseline text-xs mb-2">
            <span className="text-slate-400 font-medium">Nifty 50 Index</span>
            <span className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-violet-400 tabular-nums leading-none">
                {formatPercent(benchmarkXirr)}
              </span>
              <DeltaBadge delta={metricDeltas.benchmarkXirr} label="" />
            </span>
          </div>
          <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(Math.max(benchmarkXirr, 0) * 2.5, 100)}%`,
              }}
              transition={{ delay: 0.65, duration: 0.7 }}
            />
          </div>
        </div>
        {/* Alpha banner */}
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${
            isAlphaPositive
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          <div className="flex flex-col">
            <span
              className={`text-[10px] uppercase tracking-widest font-semibold ${
                isAlphaPositive ? "text-emerald-500/60" : "text-red-500/60"
              }`}
            >
              Alpha
            </span>
            <span
              className={`text-lg font-extrabold tabular-nums ${
                isAlphaPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {alpha >= 0 ? "+" : ""}
              {alpha.toFixed(2)}%
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-xs font-semibold ${
                isAlphaPositive ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {isAlphaPositive ? "Beating market 🏆" : "Lagging behind"}
            </span>
            <DeltaBadge delta={metricDeltas.alpha} label="" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
