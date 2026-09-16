"use client";

import { Compass } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import {
  getLumpsumSignalBadgeClass,
  getLumpsumSignalLabel,
} from "@/helpers/watchlist";
import type { WatchlistAthOpportunityCardProps } from "@/types/watchlist";

export default function WatchlistAthOpportunityCard({
  fund,
}: WatchlistAthOpportunityCardProps) {
  const signalClass = getLumpsumSignalBadgeClass(fund.lumpsumSignal);
  const signalLabel = getLumpsumSignalLabel(
    fund.lumpsumSignal,
    fund.drawdownPct
  );

  const recoveryPct =
    fund.currentNav > 0 && fund.athNav > fund.currentNav
      ? ((fund.athNav - fund.currentNav) / fund.currentNav) * 100
      : 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-slate-100">
            ATH & Lumpsum Opportunity Analysis
          </h2>
        </div>
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-bold ${signalClass}`}
        >
          {signalLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* All Time High */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 flex flex-col">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            All-Time High (ATH)
          </span>
          <span className="text-lg font-bold font-mono text-slate-100">
            {formatCurrency(fund.athNav)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            Date: {fund.athDate || "N/A"}
          </span>
        </div>

        {/* Current NAV */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 flex flex-col">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Current NAV
          </span>
          <span className="text-lg font-bold font-mono text-slate-100">
            {formatCurrency(fund.currentNav)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            {fund.daysSinceAth} days since ATH
          </span>
        </div>

        {/* Drawdown */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 flex flex-col">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Discount / Drawdown
          </span>
          <span
            className={`text-lg font-bold font-mono ${
              fund.drawdownPct >= 10
                ? "text-rose-400"
                : fund.drawdownPct > 0.05
                  ? "text-yellow-300"
                  : "text-emerald-400"
            }`}
          >
            {fund.drawdownPct > 0.05
              ? `-${fund.drawdownPct.toFixed(2)}%`
              : "0.00% (ATH)"}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            From peak value
          </span>
        </div>

        {/* Recovery to ATH */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 flex flex-col">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Upside to ATH
          </span>
          <span className="text-lg font-bold font-mono text-emerald-400">
            +{recoveryPct.toFixed(2)}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            Required return
          </span>
        </div>
      </div>
    </div>
  );
}
