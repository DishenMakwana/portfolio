"use client";

import type { NiftyChartLegendProps } from "@/types/nifty-analysis";

export function NiftyChartLegend({
  showValuationZones,
  tradeMode,
  currentNifty,
  weightedAvgNiftyEntry,
  niftyEntryBufferPct,
}: NiftyChartLegendProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-3 px-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs">
      {/* Left Side: Legend Item Colors */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/30" />
          <span className="text-slate-300 font-medium text-[11px]">
            {tradeMode === "BUY" ? "Above Current Spot" : "Sold Above Spot"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-2 ring-teal-500/30" />
          <span className="text-slate-300 font-medium text-[11px]">
            {tradeMode === "BUY" ? "Below Current Spot" : "Sold Below Spot"}
          </span>
        </div>

        {showValuationZones && (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/30" />
            <span className="text-sky-300 font-medium text-[11px]">
              Fair Value Band (90-97% ATH)
            </span>
          </div>
        )}
      </div>

      {/* Right Side: Key Reference Benchmark Values */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-400" />
          <span className="text-slate-400 text-[11px]">Spot:</span>
          <span className="text-emerald-400 font-bold  text-[11px]">
            {currentNifty.toLocaleString("en-IN")}
          </span>
        </div>

        {weightedAvgNiftyEntry > 0 && (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-sky-400" />
            <span className="text-slate-400 text-[11px]">
              {tradeMode === "BUY" ? "Avg Entry:" : "Avg Exit:"}
            </span>
            <span className="text-sky-400 font-bold  text-[11px]">
              {weightedAvgNiftyEntry.toLocaleString("en-IN")}{" "}
              <span className="text-slate-400 font-normal">
                ({niftyEntryBufferPct >= 0 ? "+" : ""}
                {niftyEntryBufferPct.toFixed(1)}%{" "}
                {tradeMode === "BUY" ? "buffer" : "vs Spot"})
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
