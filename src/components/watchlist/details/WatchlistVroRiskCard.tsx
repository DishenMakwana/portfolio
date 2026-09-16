"use client";

import { ShieldAlert, Info, RotateCw } from "lucide-react";
import type {
  WatchlistVroRiskCardProps,
  WatchlistVroRiskRow,
} from "@/types/watchlist";

export default function WatchlistVroRiskCard({
  riskData,
  onOpenVroModal,
  onSyncVro,
  isRefreshingVro = false,
  lastVroSyncedAt,
}: WatchlistVroRiskCardProps) {
  if (!riskData || !riskData.rows || riskData.rows.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100">
              Risk Measures & Analysis
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Value Research Online
          </span>
        </div>

        <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Info className="w-8 h-8 text-slate-600" />
          <p className="text-sm">
            No Value Research Online risk measures synced yet.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onSyncVro ? () => onSyncVro() : onOpenVroModal}
              disabled={isRefreshingVro}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-xs font-bold text-slate-200 transition-all hover:text-emerald-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  lastVroSyncedAt
                    ? "bg-emerald-400 shadow-xs shadow-emerald-500/50"
                    : "bg-amber-400"
                }`}
              />
              <RotateCw
                size={13}
                className={`text-emerald-400 group-hover:rotate-180 transition-transform ${isRefreshingVro ? "animate-spin" : ""}`}
              />
              <span>
                {isRefreshingVro ? "Syncing VRO…" : "Sync Value Research"}
              </span>
            </button>
            {onOpenVroModal && (
              <button
                type="button"
                onClick={onOpenVroModal}
                disabled={isRefreshingVro}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition underline underline-offset-2"
              >
                Set Custom URL
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isVeryHigh = riskData.riskClassification
    ?.toLowerCase()
    .includes("very high");
  const isHigh = riskData.riskClassification?.toLowerCase().includes("high");

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header matching Return Over Time (%) design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-teal-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-slate-100">
                Risk Measures (%)
              </h2>
              {riskData.riskClassification && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isVeryHigh
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : isHigh
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-teal-500/15 text-teal-300 border-teal-500/30"
                  }`}
                >
                  {riskData.riskClassification}
                </span>
              )}
            </div>
            {riskData.riskClassification && (
              <p className="text-xs text-slate-400 mt-0.5">
                This fund has been classified as having{" "}
                <span
                  className={
                    isVeryHigh
                      ? "text-rose-400 font-semibold"
                      : isHigh
                        ? "text-amber-400 font-semibold"
                        : "text-teal-300 font-semibold"
                  }
                >
                  {riskData.riskClassification}
                </span>
                .
              </p>
            )}
          </div>
        </div>
        {/* Groww-style VRO Sync Button */}
        <div className="flex flex-col items-end gap-1 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onSyncVro ? () => onSyncVro() : onOpenVroModal}
              disabled={isRefreshingVro}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-xs font-bold text-slate-200 transition-all hover:text-emerald-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
              title={
                lastVroSyncedAt
                  ? "VRO data is synced. Click to refresh."
                  : "No VRO data yet. Click to sync from Value Research Online."
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${lastVroSyncedAt ? "bg-emerald-400 shadow-xs shadow-emerald-500/50" : "bg-amber-400"}`}
              />
              <RotateCw
                size={13}
                className={`text-emerald-400 group-hover:rotate-180 transition-transform ${isRefreshingVro ? "animate-spin" : ""}`}
              />
              <span>{isRefreshingVro ? "Syncing VRO…" : "Sync VRO"}</span>
            </button>
            {onOpenVroModal && (
              <button
                type="button"
                onClick={onOpenVroModal}
                disabled={isRefreshingVro}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition underline underline-offset-2 p-1"
                title="Edit Value Research URL"
              >
                Edit URL
              </button>
            )}
          </div>
          {lastVroSyncedAt && (
            <span className="text-[10px] text-teal-400/70 font-medium">
              ✓ Synced {new Date(lastVroSyncedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
              <th className="py-3 px-3">Fund / Measure</th>
              <th className="py-3 px-3 text-right">Mean Return (%)</th>
              <th className="py-3 px-3 text-right">Std Dev (%)</th>
              <th className="py-3 px-3 text-right">Sharpe (%)</th>
              <th className="py-3 px-3 text-right">Sortino (%)</th>
              <th className="py-3 px-3 text-right">Beta (%)</th>
              <th className="py-3 px-3 text-right">Alpha (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
            {riskData.rows.map((row: WatchlistVroRiskRow, idx: number) => {
              const isRankRow =
                row.label.toLowerCase().includes("rank within category") ||
                row.label.toLowerCase().includes("rank");
              const isTotalFundsRow =
                row.label.toLowerCase().includes("number of funds") ||
                row.label.toLowerCase().includes("funds in category");
              const isFundRow = idx === 0 && !isRankRow && !isTotalFundsRow;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/30 transition ${
                    isFundRow
                      ? "bg-slate-950/60 font-semibold text-slate-100"
                      : isRankRow
                        ? "text-teal-300 font-bold bg-teal-500/5"
                        : isTotalFundsRow
                          ? "text-slate-400 font-medium"
                          : "text-slate-300 font-medium"
                  }`}
                >
                  <td className="py-3 px-3 font-sans font-medium text-slate-200">
                    {row.label}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {row.meanReturn || "--"}
                  </td>
                  <td className="py-3 px-3 text-right">{row.stdDev || "--"}</td>
                  <td className="py-3 px-3 text-right">{row.sharpe || "--"}</td>
                  <td className="py-3 px-3 text-right">
                    {row.sortino || "--"}
                  </td>
                  <td className="py-3 px-3 text-right">{row.beta || "--"}</td>
                  <td className="py-3 px-3 text-right">{row.alpha || "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note & As on date */}
      <div className="mt-4 pt-3 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          Risk measures calculated using calendar month returns for the last
          three years.
        </span>
        {riskData.asOfDate && <span>As on {riskData.asOfDate}</span>}
      </div>
    </div>
  );
}
