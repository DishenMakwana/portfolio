"use client";

import { Award } from "lucide-react";
import { formatCroreOrLakh } from "@/helpers/futureProjection";
import type { FutureProjectionMilestonesProps } from "@/types/futureProjection";

export function FutureProjectionMilestones({
  milestones,
  currentPortfolioValue,
}: FutureProjectionMilestonesProps) {
  const reachedMilestones = milestones.filter(
    (m) => m.targetAmount > currentPortfolioValue && m.isReached
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
          Portfolio Milestones Breakdown
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {reachedMilestones.map((m, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
              m.isReached
                ? "bg-slate-900/80 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                : "bg-slate-900/40 border-slate-800/80"
            }`}
          >
            <div className="text-xs font-bold text-slate-400 uppercase">
              Milestone
            </div>
            <div className="text-lg font-black text-amber-400 mt-0.5">
              {m.label}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Year:</span>
                <span className="font-extrabold text-slate-200">
                  {m.targetYear}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Needed:</span>
                <span className="font-extrabold text-emerald-400">
                  {m.yearsToReach} Yrs{" "}
                  {m.monthsToReach > 0 ? `${m.monthsToReach} Mos` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invested:</span>
                <span className="font-semibold text-slate-300">
                  {formatCroreOrLakh(m.totalInvested)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
