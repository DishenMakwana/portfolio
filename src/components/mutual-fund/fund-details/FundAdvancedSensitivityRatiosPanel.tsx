import type { FundAdvancedSensitivityRatiosPanelProps } from "@/types/fund-details";

export default function FundAdvancedSensitivityRatiosPanel({
  stdDev,
  rSquared,
  catStdDev,
  catRSquared,
}: FundAdvancedSensitivityRatiosPanelProps) {
  return (
    <>
      {/* Card 9: Standard Deviation */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
        <div>
          <div className="flex justify-between items-center text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Std Deviation (σ)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
              Volatility
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-xl sm:text-2xl font-black text-sky-400 tracking-tight tabular-nums">
              {stdDev != null ? `${stdDev.toFixed(2)}%` : "--"}
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20">
              🛡️ Lower is Calmer
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 ">
            Cat Avg: {catStdDev != null ? `${catStdDev.toFixed(2)}%` : "--"}
          </span>
          {catStdDev != null && stdDev != null ? (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                stdDev <= catStdDev
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {stdDev <= catStdDev ? "Calmer Volatility" : "Higher Volatility"}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium">
              Annualized σ
            </span>
          )}
        </div>
      </div>

      {/* Card 10: R-Squared */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
        <div>
          <div className="flex justify-between items-center text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              R-Squared (R²)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
              Index Fit
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-xl sm:text-2xl font-black text-indigo-400 tracking-tight tabular-nums">
              {rSquared != null
                ? `${rSquared > 1.0 ? rSquared.toFixed(1) : (rSquared * 100).toFixed(1)}%`
                : "--"}
            </div>
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${
                rSquared != null && (rSquared >= 80 || rSquared >= 0.8)
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/20"
              }`}
            >
              {rSquared != null && (rSquared >= 80 || rSquared >= 0.8)
                ? "🟢 High Fit (>80%)"
                : "🟡 Active Divergence"}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 ">
            Cat Avg: {catRSquared != null ? `${catRSquared.toFixed(1)}%` : "--"}
          </span>
          {rSquared != null ? (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                rSquared >= 80 || rSquared >= 0.8
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {rSquared >= 80 || rSquared >= 0.8
                ? "Reliable Beta/Alpha"
                : "Active Selection"}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium">
              Corr² vs Index
            </span>
          )}
        </div>
      </div>
    </>
  );
}
