"use client";

import { motion } from "framer-motion";
import { IndianRupee } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { OverviewCapitalGainsCardProps } from "@/types/overview";

export default function OverviewCapitalGainsCard({
  taxEstimate,
}: OverviewCapitalGainsCardProps) {
  const ltcgGain = Math.max(taxEstimate.ltcgEstimate, 0);
  const stcgGain = Math.max(taxEstimate.stcgEstimate, 0);
  const taxableLtcg = taxEstimate.taxableLtcg ?? Math.max(ltcgGain - 125000, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-amber-400 inline-block" />
          Capital Gains
        </h4>
        <div className="bg-amber-500/10 p-1.5 rounded-lg">
          <IndianRupee size={14} className="text-amber-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
        {/* LTCG */}
        <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-slate-800/80 space-y-1 min-w-0 overflow-hidden">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            LTCG &gt;1 yr
          </div>
          <div
            className="text-xs sm:text-sm md:text-base font-extrabold text-slate-100 tabular-nums leading-tight truncate tracking-tight"
            title={formatCurrency(ltcgGain)}
          >
            {formatCurrency(ltcgGain)}
          </div>
          <div className="flex items-start gap-1 mt-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0 mt-1" />
            <span className="text-[9px] sm:text-[10px] text-emerald-400 font-medium leading-tight">
              Exempt up to ₹1.25L / person
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium truncate">
            Taxable:{" "}
            <span className="text-slate-300">
              {formatCurrency(taxableLtcg)}
            </span>
          </div>
        </div>
        {/* STCG */}
        <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-amber-500/20 space-y-1 min-w-0 overflow-hidden">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            STCG ≤1 yr
          </div>
          <div
            className="text-xs sm:text-sm md:text-base font-extrabold text-amber-400 tabular-nums leading-tight truncate tracking-tight"
            title={formatCurrency(stcgGain)}
          >
            {formatCurrency(stcgGain)}
          </div>
          <div className="flex items-start gap-1 mt-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0 mt-1" />
            <span className="text-[9px] sm:text-[10px] text-amber-400 font-medium leading-tight">
              Flat 20% tax
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium truncate">
            Tax est:{" "}
            <span className="text-amber-300/80">
              {formatCurrency(stcgGain * 0.2)}
            </span>
          </div>
        </div>
      </div>
      {/* Total */}
      <div className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-2.5 border border-slate-700/40 min-w-0 gap-2 overflow-hidden">
        <span className="text-xs text-slate-400 font-medium shrink-0">
          Total Gains
        </span>
        <span
          className="text-xs sm:text-sm md:text-base font-extrabold text-slate-100 tabular-nums truncate tracking-tight text-right"
          title={formatCurrency(ltcgGain + stcgGain)}
        >
          {formatCurrency(ltcgGain + stcgGain)}
        </span>
      </div>
    </motion.div>
  );
}
