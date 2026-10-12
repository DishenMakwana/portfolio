"use client";

import type { CustomFyTrendTooltipProps } from "@/types/insights";

export function FyTrendTooltip({
  active,
  payload,
  label,
  metric,
}: CustomFyTrendTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const isAlphaPositive = dataPoint.alpha >= 0;

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-md min-w-[220px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
          <p className="text-xs font-extrabold text-slate-200">{label}</p>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isAlphaPositive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            Alpha: {isAlphaPositive ? "+" : ""}
            {dataPoint.alpha.toFixed(2)}%
          </span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              My Investment {metric.toUpperCase()}:
            </span>
            <span className="font-extrabold text-emerald-400">
              {dataPoint.portfolio.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              Nifty 50 Benchmark:
            </span>
            <span className="font-bold text-blue-400">
              {dataPoint.benchmark.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
