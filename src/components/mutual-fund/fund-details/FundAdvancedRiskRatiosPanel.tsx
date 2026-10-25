import type { FundAdvancedRiskRatiosPanelProps } from "@/types/fund-details";

export default function FundAdvancedRiskRatiosPanel({
  alpha,
  beta,
  sharpe,
  sortino,
  catAlpha,
  catBeta,
  catSharpe,
  catSortino,
}: FundAdvancedRiskRatiosPanelProps) {
  return (
    <>
      {/* Card 5: Alpha */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
        <div>
          <div className="flex justify-between items-center text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Alpha (α)
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                alpha != null && alpha >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              Excess
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div
              className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                alpha != null
                  ? alpha >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                  : "text-slate-400"
              }`}
            >
              {alpha != null
                ? alpha >= 0
                  ? `+${alpha.toFixed(2)}%`
                  : `${alpha.toFixed(2)}%`
                : "--"}
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              🟢 Higher is Better
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 ">
            Cat Avg:{" "}
            {catAlpha != null
              ? `${catAlpha >= 0 ? "+" : ""}${catAlpha.toFixed(2)}%`
              : "--"}
          </span>
          {catAlpha != null && alpha != null && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                alpha >= catAlpha
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {alpha >= catAlpha
                ? `+${(alpha - catAlpha).toFixed(2)}% Excess`
                : `${(alpha - catAlpha).toFixed(2)}% Lag`}
            </span>
          )}
        </div>
      </div>

      {/* Card 6: Beta */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
        <div>
          <div className="flex justify-between items-center text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Beta (β)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
              Sensitivity
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-xl sm:text-2xl font-black text-indigo-400 tracking-tight tabular-nums">
              {beta != null ? beta.toFixed(2) : "--"}
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
              🛡️ &lt; 1.0 Defensive
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 ">
            Cat Avg: {catBeta != null ? catBeta.toFixed(2) : "--"}
          </span>
          {catBeta != null && beta != null && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                beta <= catBeta
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {beta <= catBeta ? "Calmer Market Risk" : "Higher Volatility"}
            </span>
          )}
        </div>
      </div>

      {/* Card 7: Sharpe Ratio */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
        <div>
          <div className="flex justify-between items-center text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Sharpe Ratio
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20">
              Total Risk
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-xl sm:text-2xl font-black text-teal-400 tracking-tight tabular-nums">
              {sharpe != null ? sharpe.toFixed(2) : "--"}
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20">
              🟢 Higher is Better
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 ">
            Cat Avg: {catSharpe != null ? catSharpe.toFixed(2) : "--"}
          </span>
          {catSharpe != null && sharpe != null && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                sharpe >= catSharpe
                  ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {sharpe >= catSharpe
                ? `+${(sharpe - catSharpe).toFixed(2)} Superior`
                : "Standard"}
            </span>
          )}
        </div>
      </div>

      {/* Card 8: Sortino Ratio */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
        <div>
          <div className="flex justify-between items-center text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Sortino Ratio
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              Downside
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight tabular-nums">
              {sortino != null ? sortino.toFixed(2) : "--"}
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              🟢 Higher is Better
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 ">
            Cat Avg: {catSortino != null ? catSortino.toFixed(2) : "--"}
          </span>
          {catSortino != null && sortino != null && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                sortino >= catSortino
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {sortino >= catSortino
                ? `+${(sortino - catSortino).toFixed(2)} Drawdown Shield`
                : "Standard"}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
