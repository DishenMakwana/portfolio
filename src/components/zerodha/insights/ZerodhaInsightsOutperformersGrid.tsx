"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { ZerodhaInsightsOutperformersGridProps } from "@/types/zerodha";

export default function ZerodhaInsightsOutperformersGrid({
  activeBeatingList,
  activeLaggingList,
  assetTypePlural,
}: ZerodhaInsightsOutperformersGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Outperforming Nifty */}
      <section className="rounded-2xl border border-emerald-500/10 bg-slate-900/70 p-5 shadow-xl">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-400">
          <CheckCircle2 size={16} />
          Outperforming Nifty ({activeBeatingList.length})
        </h3>
        <div className="space-y-3">
          {activeBeatingList.length > 0 ? (
            activeBeatingList.map((f) => (
              <div
                key={f.symbol}
                className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-200">
                    {f.symbol}
                  </p>
                  <p className="text-xs text-slate-500">
                    Gain: {formatCurrency(f.unrealizedPnl)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-black text-emerald-400">
                  {f.cagr.toFixed(2)}% CAGR
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
              No {assetTypePlural.toLowerCase()} beating the nifty benchmark.
            </div>
          )}
        </div>
      </section>

      {/* Lagging Nifty */}
      <section className="rounded-2xl border border-rose-500/10 bg-slate-900/70 p-5 shadow-xl">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-rose-400">
          <AlertTriangle size={16} />
          Underperforming Nifty ({activeLaggingList.length})
        </h3>
        <div className="space-y-3">
          {activeLaggingList.length > 0 ? (
            activeLaggingList.map((f) => (
              <div
                key={f.symbol}
                className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-200">
                    {f.symbol}
                  </p>
                  <p className="text-xs text-slate-500">
                    Gain: {formatCurrency(f.unrealizedPnl)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-black text-rose-400">
                  {f.cagr.toFixed(2)}% CAGR
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
              All {assetTypePlural.toLowerCase()} outperforming the nifty
              benchmark.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
