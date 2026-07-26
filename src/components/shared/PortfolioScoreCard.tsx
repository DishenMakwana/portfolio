"use client";

import { motion } from "framer-motion";
import type { PortfolioScoreCardProps } from "@/types/insights";

export default function PortfolioScoreCard({
  title,
  grade,
  statusText,
  primaryValueText,
  progressValue,
  subMetrics,
}: PortfolioScoreCardProps) {
  return (
    <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
        {title}
      </h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-teal-400 flex items-center justify-center bg-teal-500/10">
          <span className="text-xl font-extrabold text-teal-300">{grade}</span>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-100">{statusText}</p>
          <p className="text-xs text-slate-400">{primaryValueText}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min((progressValue / 20) * 100, 100)}%`,
            }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
          />
        </div>
        <span className="text-xs text-teal-400 font-bold">
          {progressValue.toFixed(1)}% / 20%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {subMetrics.map((item) => (
          <div
            key={item.label}
            className="text-center p-2 rounded-xl bg-slate-900/50 border border-slate-800/60"
          >
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p
              className={`text-xs font-bold ${item.ok ? "text-emerald-400" : "text-amber-400"}`}
            >
              {item.score}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
