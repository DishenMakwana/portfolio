"use client";

import { BriefcaseBusiness } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { ZerodhaInsightsSummaryCardProps } from "@/types/zerodha";

export default function ZerodhaInsightsSummaryCard({
  assetTypeFullLabel,
  cagrAssetType,
  activeHoldingsCount,
  activeCurrentValue,
  activeTopPerformer,
}: ZerodhaInsightsSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between shadow-xl">
      <div>
        <h3 className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <BriefcaseBusiness size={15} className="text-indigo-400" />
          {assetTypeFullLabel} Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {cagrAssetType === "mutual_fund"
                ? "Unique Schemes"
                : "Unique Stocks"}
            </p>
            <p className="text-xl font-extrabold text-slate-100 mt-1">
              {activeHoldingsCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {cagrAssetType === "mutual_fund"
                ? "Average / Scheme"
                : "Average / Stock"}
            </p>
            <p className="text-xl font-extrabold text-slate-100 mt-1">
              {activeHoldingsCount > 0
                ? formatCurrency(activeCurrentValue / activeHoldingsCount)
                : "₹0"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {cagrAssetType === "mutual_fund"
              ? "Top Performing Scheme"
              : "Top Performing Stock"}
          </p>
          <p className="text-sm font-bold text-slate-200 mt-0.5 break-words">
            {activeTopPerformer ? activeTopPerformer.symbol : "None"}
          </p>
        </div>
        <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {activeTopPerformer
            ? `${activeTopPerformer.cagr.toFixed(2)}% CAGR`
            : "N/A"}
        </span>
      </div>
    </section>
  );
}
