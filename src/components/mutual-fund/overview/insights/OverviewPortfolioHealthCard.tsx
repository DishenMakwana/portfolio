"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { formatHoldingYearsAndDays } from "@/helpers/formatters";
import type { OverviewPortfolioHealthCardProps } from "@/types/overview";

export default function OverviewPortfolioHealthCard({
  fundCount,
  status,
  statusColor,
  concentrationInsights,
  topFund,
  worstFund,
}: OverviewPortfolioHealthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-3 hover:border-slate-700/80 transition-all duration-300"
    >
      <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
        <Activity size={15} className="text-violet-400 animate-pulse" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">
          Portfolio Insights & Health
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Diversification */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Diversification
          </div>
          <div className="text-base font-extrabold text-slate-100">
            {fundCount} Funds
          </div>
          <div className={`text-[10px] font-bold ${statusColor}`}>{status}</div>
        </div>

        {/* Concentration */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Top AMC Exposure
          </div>
          <div
            className="text-sm font-extrabold text-slate-100 leading-snug"
            title={concentrationInsights.topAmc}
          >
            {concentrationInsights.topAmc}
          </div>
          <div className="text-[10px] text-teal-400 font-bold">
            {concentrationInsights.amcPct.toFixed(1)}% share
          </div>
        </div>

        {/* Top Category Exposure */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Top Category
          </div>
          <div
            className="text-sm font-extrabold text-slate-100 leading-snug"
            title={concentrationInsights.topCategory}
          >
            {concentrationInsights.topCategory}
          </div>
          <div className="text-[10px] text-violet-400 font-bold">
            {concentrationInsights.categoryPct.toFixed(1)}% share
          </div>
        </div>

        {/* Avg Holding Period */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Avg Holding Age
          </div>
          <div className="text-base font-extrabold text-slate-100">
            {concentrationInsights.avgDays} Days
          </div>
          <div className="text-[10px] text-slate-500">
            {formatHoldingYearsAndDays(concentrationInsights.avgDays)
              ? `${formatHoldingYearsAndDays(concentrationInsights.avgDays)} • per scheme`
              : "per mutual fund scheme"}
          </div>
        </div>
      </div>

      {/* Quick Performance Summary */}
      {topFund && worstFund && (
        <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-400 font-medium shrink-0">
              Top Performer
            </span>
            <span
              className="text-emerald-400 font-bold text-right leading-snug"
              title={topFund.schemeName || ""}
            >
              {topFund.schemeName} ({topFund.absoluteReturn.toFixed(1)}% abs)
            </span>
          </div>
          <div className="flex justify-between items-center gap-2 border-t border-slate-800/50 pt-2">
            <span className="text-slate-400 font-medium shrink-0">
              Underperformer
            </span>
            <span
              className="text-red-400 font-bold text-right leading-snug"
              title={worstFund.schemeName || ""}
            >
              {worstFund.schemeName} ({worstFund.absoluteReturn.toFixed(1)}%
              abs)
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
