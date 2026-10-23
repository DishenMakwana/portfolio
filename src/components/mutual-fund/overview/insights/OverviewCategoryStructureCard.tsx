"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { OverviewCategoryStructureCardProps } from "@/types/overview";

export default function OverviewCategoryStructureCard({
  diversityInsights,
  topMember,
  topMemberPct,
  topCategoryPerf,
  worstCategoryPerf,
}: OverviewCategoryStructureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
          <Activity size={15} className="text-teal-400 animate-pulse" />
          Category & Asset Structure Insights
        </h4>
        <span className="text-[10px] font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
          Portfolio Overview
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Asset Classes Count */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Asset Categories
          </div>
          <div className="text-base font-extrabold text-slate-100">
            {diversityInsights.categoryCount} Categories
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            across {diversityInsights.amcCount} Fund Houses
          </div>
        </div>

        {/* Top Investor Contribution */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Primary Applicant
          </div>
          <div
            className="text-sm font-extrabold text-slate-100 truncate"
            title={topMember?.name}
          >
            {topMember?.name || "—"}
          </div>
          <div className="text-[10px] text-teal-400 font-bold">
            {topMemberPct.toFixed(1)}% of Total Portfolio
          </div>
        </div>
      </div>

      {/* Top & Underperforming Categories */}
      {topCategoryPerf && worstCategoryPerf && (
        <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-400 font-medium shrink-0">
              Top Category Performer
            </span>
            <span
              className="text-emerald-400 font-bold text-right leading-snug"
              title={topCategoryPerf.name}
            >
              {topCategoryPerf.name} ({topCategoryPerf.absReturn.toFixed(1)}%
              abs)
            </span>
          </div>
          <div className="flex justify-between items-center gap-2 border-t border-slate-800/50 pt-2">
            <span className="text-slate-400 font-medium shrink-0">
              Category Underperformer
            </span>
            <span
              className="text-red-400 font-bold text-right leading-snug"
              title={worstCategoryPerf.name}
            >
              {worstCategoryPerf.name} ({worstCategoryPerf.absReturn.toFixed(1)}
              % abs)
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
