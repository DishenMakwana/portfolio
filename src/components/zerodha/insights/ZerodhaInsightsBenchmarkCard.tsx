"use client";

import { motion } from "framer-motion";
import { Award, AlertTriangle } from "lucide-react";
import type { ZerodhaInsightsBenchmarkCardProps } from "@/types/zerodha";

export default function ZerodhaInsightsBenchmarkCard({
  activeBeatsBenchmark,
  assetTypeFullLabel,
  assetTypeLabel,
  activeWeightedCagr,
  benchmark,
}: ZerodhaInsightsBenchmarkCardProps) {
  return (
    <section
      className={`rounded-2xl border p-5 flex flex-col justify-between shadow-xl backdrop-blur-md transition ${
        activeBeatsBenchmark
          ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30"
          : "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30"
      }`}
    >
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          {activeBeatsBenchmark ? (
            <Award className="text-emerald-400" size={15} />
          ) : (
            <AlertTriangle className="text-amber-400" size={15} />
          )}
          Benchmark Comparison ({assetTypeFullLabel})
        </h3>
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 ${
              activeBeatsBenchmark
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "border-amber-400 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            }`}
          >
            {activeBeatsBenchmark ? "BEAT" : "LAG"}
          </div>
          <div>
            <p className="text-base font-bold text-slate-100 leading-tight">
              {activeBeatsBenchmark
                ? `Your ${assetTypeFullLabel} portfolio beats the Nifty 50.`
                : `Your ${assetTypeFullLabel} portfolio lags the Nifty 50 Index.`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {assetTypeLabel} CAGR is{" "}
              <span
                className={`font-bold ${activeBeatsBenchmark ? "text-emerald-400" : "text-amber-400"}`}
              >
                {activeWeightedCagr !== null
                  ? `${activeWeightedCagr.toFixed(2)}%`
                  : "0.00%"}
              </span>{" "}
              vs Nifty benchmark's{" "}
              <span className="font-bold text-slate-300">
                {benchmark.toFixed(2)}%
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Performance Comparison visual bar */}
      <div className="space-y-1.5 mt-5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>Weighted Return Spread</span>
          <span
            className={
              activeBeatsBenchmark ? "text-emerald-400" : "text-amber-400"
            }
          >
            {activeWeightedCagr !== null
              ? activeWeightedCagr.toFixed(2)
              : "0.00"}
            % / {benchmark.toFixed(2)}%
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/30">
          {/* CAGR progress fill (Green) */}
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(100, ((activeWeightedCagr || 0) / Math.max(activeWeightedCagr || 0, benchmark, 1)) * 90)}%`,
            }}
            transition={{ duration: 0.8 }}
            className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 ${
              activeBeatsBenchmark ? "z-10" : "z-20"
            }`}
          />

          {/* Benchmark target fill (Yellow/Amber) */}
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(100, (benchmark / Math.max(activeWeightedCagr || 0, benchmark, 1)) * 90)}%`,
            }}
            transition={{ duration: 0.8 }}
            className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 ${
              activeBeatsBenchmark ? "z-20" : "z-10"
            }`}
          />

          {/* Benchmark target line indicator */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-30"
            animate={{
              left: `${Math.min(100, (benchmark / Math.max(activeWeightedCagr || 0, benchmark, 1)) * 90)}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider">
          <span>{assetTypeLabel} Portfolio</span>
          <span>Nifty Index Line</span>
        </div>
      </div>
    </section>
  );
}
