"use client";

import { Zap } from "lucide-react";
import type { FutureProjectionScenariosProps } from "@/types/futureProjection";

export function FutureProjectionScenarios({
  scenarios,
}: FutureProjectionScenariosProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
          Goal Speed-up Scenarios (&quot;What-If?&quot;)
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {scenarios.map((sc, idx) => {
          const isFaster = sc.timeDifferenceMonths > 0;
          const diffYears = Math.floor(Math.abs(sc.timeDifferenceMonths) / 12);
          const diffMonths = Math.abs(sc.timeDifferenceMonths) % 12;

          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg hover:border-teal-500/30 transition-all"
            >
              <div className="text-xs font-bold text-slate-200 mb-0.5">
                {sc.title}
              </div>
              <div className="text-[11px] text-slate-400 mb-2">
                {sc.subtitle}
              </div>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-100">
                  {sc.yearsToGoal} Years{" "}
                  {sc.monthsToGoal > 0 ? `${sc.monthsToGoal} Months` : ""}
                </span>
                {isFaster && (
                  <span className="text-xs font-extrabold text-emerald-400">
                    (
                    {diffYears > 0
                      ? `${diffYears} ${diffYears === 1 ? "Year" : "Years"} `
                      : ""}
                    {diffMonths} {diffMonths === 1 ? "Month" : "Months"}{" "}
                    faster!)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
