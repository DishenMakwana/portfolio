import { Activity, Info, RotateCw, Globe, Database } from "lucide-react";
import type { FundAdvancedRatiosHeaderProps } from "@/types/fund-details";

export default function FundAdvancedRatiosHeader({
  displayCategory,
  sourceLabel,
  sourceType,
  schemeCode,
  isRefreshing,
  isFresh,
  onSyncAll,
}: FundAdvancedRatiosHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Activity size={19} className="text-teal-400" />
          <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
            Advanced ratios
          </h3>
          <div
            className="text-slate-400 hover:text-slate-300 transition-colors cursor-help"
            title="Valuation ratios, portfolio concentration and rolling 3Y risk-adjusted volatility metrics vs category benchmarks"
          >
            <Info size={14} />
          </div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {displayCategory}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            {sourceType === "scraped_external" ? (
              <Globe size={11} className="text-indigo-400" />
            ) : (
              <Database size={11} className="text-teal-400" />
            )}
            {sourceLabel}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Valuation multiples, concentration metrics and risk-adjusted
          volatility measures compared to category averages
        </p>
      </div>

      {schemeCode && (
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={onSyncAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-xs font-bold text-slate-200 transition-all hover:text-emerald-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
            title={
              isFresh
                ? "Ratios & category benchmarks are fresh (24h TTL / synced today). Click to force refresh."
                : "Ratios or category benchmarks are stale (>24h or prior calendar day). Click to sync latest data."
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isFresh
                  ? "bg-emerald-400 shadow-xs shadow-emerald-500/50"
                  : "bg-amber-400"
              }`}
            />
            <RotateCw
              size={13}
              className={`text-emerald-400 group-hover:rotate-180 transition-transform ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span>
              {isRefreshing ? "Syncing..." : "Sync Ratios & Benchmarks"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
