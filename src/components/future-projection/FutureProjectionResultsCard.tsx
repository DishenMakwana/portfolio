"use client";

import { Clock, Sparkles } from "lucide-react";
import { formatCroreOrLakh } from "@/helpers/futureProjection";
import type { FutureProjectionResultsCardProps } from "@/types/futureProjection";

export function FutureProjectionResultsCard({
  summary,
  targetAmount,
}: FutureProjectionResultsCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-teal-950/40 border border-teal-500/20 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-400 mb-2">
          <Clock className="w-4 h-4" />
          <span>ESTIMATED TIME TO GOAL</span>
        </div>

        <div className="mt-1">
          <div className="text-3xl font-black text-slate-100 tracking-tight">
            {summary.yearsToGoal}{" "}
            <span className="text-lg font-bold text-slate-400">Years</span>{" "}
            {summary.monthsToGoal > 0 && (
              <>
                {summary.monthsToGoal}{" "}
                <span className="text-lg font-bold text-slate-400">Months</span>
              </>
            )}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Year: {summary.targetYear}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Target Goal:</span>
          <span className="font-extrabold text-amber-400">
            {formatCroreOrLakh(targetAmount)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Total Capital Invested:</span>
          <span className="font-extrabold text-slate-200">
            {formatCroreOrLakh(summary.totalInvestedAtGoal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Wealth Created (Returns):</span>
          <span className="font-extrabold text-emerald-400">
            {formatCroreOrLakh(summary.totalReturnsAtGoal)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
          <span className="text-slate-400">
            Purchasing Power (Inflation Adj):
          </span>
          <span className="font-extrabold text-indigo-300">
            {formatCroreOrLakh(summary.inflationAdjustedTargetValue)}
          </span>
        </div>
      </div>
    </div>
  );
}
