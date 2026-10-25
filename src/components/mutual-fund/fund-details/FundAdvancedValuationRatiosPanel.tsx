import { PieChart } from "lucide-react";
import type { FundAdvancedValuationRatiosPanelProps } from "@/types/fund-details";

export default function FundAdvancedValuationRatiosPanel({
  top5,
  top20,
  peRatio,
  pbRatio,
  catTop5,
  catTop20,
  catPe,
  catPb,
}: FundAdvancedValuationRatiosPanelProps) {
  return (
    <div className="bg-slate-950/40 border border-slate-855/80 rounded-xl p-4 sm:p-5 space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-855/70 pb-2.5">
        <div className="flex items-center gap-2">
          <PieChart size={15} className="text-sky-400" />
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
            Portfolio & Valuation Multiples
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-semibold">
          Underlying Assets
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card 1: Top 5 Concentration */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Top 5
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                Holdings
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                {top5}
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-semibold border border-slate-700/80">
                🛡️ Lower is Better
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 ">
              Cat Avg: {catTop5 || "--"}
            </span>
            {catTop5 && top5 !== "--" && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  parseFloat(top5) <= parseFloat(catTop5)
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {parseFloat(top5) <= parseFloat(catTop5)
                  ? "Diversified"
                  : "Concentrated"}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Top 20 Concentration */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Top 20
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                Core
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                {top20}
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-semibold border border-slate-700/80">
                🛡️ Lower is Better
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 ">
              Cat Avg: {catTop20 || "--"}
            </span>
            {catTop20 && top20 !== "--" && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  parseFloat(top20) <= parseFloat(catTop20)
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {parseFloat(top20) <= parseFloat(catTop20)
                  ? "Well Balanced"
                  : "Concentrated"}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: P/E Ratio */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                P/E Ratio
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                Valuation
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                {peRatio != null ? peRatio.toFixed(2) : "--"}
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                🟢 Lower = Value
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 ">
              Cat Avg: {catPe != null ? catPe.toFixed(2) : "--"}
            </span>
            {catPe != null && peRatio != null && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  peRatio <= catPe
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {peRatio <= catPe
                  ? `${(((catPe - peRatio) / catPe) * 100).toFixed(0)}% Discount`
                  : `${(((peRatio - catPe) / catPe) * 100).toFixed(0)}% Premium`}
              </span>
            )}
          </div>
        </div>

        {/* Card 4: P/B Ratio */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                P/B Ratio
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                Book Value
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                {pbRatio != null ? pbRatio.toFixed(2) : "--"}
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                🟢 Lower = Value
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 ">
              Cat Avg: {catPb != null ? catPb.toFixed(2) : "--"}
            </span>
            {catPb != null && pbRatio != null && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  pbRatio <= catPb
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {pbRatio <= catPb
                  ? `${(((catPb - pbRatio) / catPb) * 100).toFixed(0)}% Discount`
                  : `${(((pbRatio - catPb) / catPb) * 100).toFixed(0)}% Premium`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
