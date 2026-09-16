"use client";

import { TrendingUp, Info, RotateCw } from "lucide-react";
import type {
  WatchlistVroReturnsCardProps,
  WatchlistVroReturnsRow,
} from "@/types/watchlist";

export default function WatchlistVroReturnsCard({
  returnsData,
  onOpenVroModal,
  onSyncVro,
  isRefreshingVro = false,
  lastVroSyncedAt,
}: WatchlistVroReturnsCardProps) {
  if (!returnsData || !returnsData.rows || returnsData.rows.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100">
              Return Over Time (%)
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Value Research Online
          </span>
        </div>

        <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Info className="w-8 h-8 text-slate-600" />
          <p className="text-sm">
            No Value Research Online return comparisons synced yet.
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

  const renderValue = (valStr: string, isRate: boolean) => {
    if (!valStr || valStr === "--" || valStr === "-") {
      return <span className="text-slate-500">--</span>;
    }
    if (!isRate) {
      return <span>{valStr}</span>;
    }
    const num = parseFloat(valStr);
    if (isNaN(num)) return <span>{valStr}</span>;

    const isPos = num >= 0;
    return (
      <span
        className={
          isPos
            ? "text-emerald-400 font-semibold"
            : "text-rose-400 font-semibold"
        }
      >
        {valStr}
      </span>
    );
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-400" />
          <h2 className="text-base md:text-lg font-bold text-slate-100">
            Return Over Time (%)
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Multi-Horizon Benchmark Comparison
        </span>
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
              <th className="py-3 px-3 min-w-[160px]">Fund name</th>
              <th className="py-3 px-2 text-right">YTD</th>
              <th className="py-3 px-2 text-right">1D</th>
              <th className="py-3 px-2 text-right">1M</th>
              <th className="py-3 px-2 text-right">3M</th>
              <th className="py-3 px-2 text-right">6M</th>
              <th className="py-3 px-2 text-right">1Y</th>
              <th className="py-3 px-2 text-right">3Y</th>
              <th className="py-3 px-2 text-right">5Y</th>
              <th className="py-3 px-2 text-right">7Y</th>
              <th className="py-3 px-2 text-right">10Y</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
            {returnsData.rows.map(
              (row: WatchlistVroReturnsRow, idx: number) => {
                const isRankRow =
                  row.label.toLowerCase().includes("rank within category") ||
                  row.label.toLowerCase().includes("rank");
                const isTotalFundsRow =
                  row.label.toLowerCase().includes("number of funds") ||
                  row.label.toLowerCase().includes("funds in category");
                const isFundRow = idx === 0 && !isRankRow && !isTotalFundsRow;
                const isRate = !isRankRow && !isTotalFundsRow;

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
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.ytd, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.oneDay, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.oneMonth, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.threeMonth, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.sixMonth, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.oneYear, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.threeYear, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.fiveYear, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.sevenYear, isRate)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {renderValue(row.tenYear, isRate)}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* Footer As of date */}
      {returnsData.asOfDate && (
        <div className="mt-4 pt-3 border-t border-slate-800/50 text-right text-[11px] text-slate-500">
          As on {returnsData.asOfDate}
        </div>
      )}
    </div>
  );
}
