"use client";

import { motion } from "framer-motion";
import { Users, PieChart as PieIcon, Activity } from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import DeltaBadge from "@/components/shared/DeltaBadge";
import {
  OVERVIEW_BG_CLASSES,
  type OverviewMemberAndSubCategorySectionProps,
} from "@/types/overview";

export default function OverviewMemberAndSubCategorySection({
  memberSummaries,
  totalCurrentValue,
  capAllocation,
  diversityInsights,
  concentrationInsights,
  topFund,
  worstFund,
  sortField,
  sortOrder,
  toggleSort,
  renderSortIcon,
}: OverviewMemberAndSubCategorySectionProps) {
  const sortedMembers = [...memberSummaries].sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "invested") {
      comparison = a.invested - b.invested;
    } else if (sortField === "currentValue") {
      comparison = a.currentValue - b.currentValue;
    } else if (sortField === "gain") {
      comparison = a.gain - b.gain;
    } else if (sortField === "cagr") {
      comparison = a.cagr - b.cagr;
    } else if (sortField === "xirr") {
      comparison = a.xirr - b.xirr;
    } else if (sortField === "alpha") {
      comparison = a.alpha - b.alpha;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const sortedSubCats = [...capAllocation].sort((a, b) => b.value - a.value);

  const fundCount = diversityInsights.schemeCount;
  const status =
    fundCount <= 5
      ? "Under-diversified"
      : fundCount <= 15
        ? "Optimal Mix"
        : "Over-diversified";
  const statusColor =
    fundCount <= 5
      ? "text-amber-400"
      : fundCount <= 15
        ? "text-emerald-400"
        : "text-blue-400";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* Investor Allocation Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
          <Users size={15} className="text-teal-400" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">
            Investor Allocation
          </h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-950/60">
              <th
                onClick={() => toggleSort("name")}
                className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
              >
                Investor {renderSortIcon("name")}
              </th>
              <th
                onClick={() => toggleSort("currentValue")}
                className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
              >
                Current Value {renderSortIcon("currentValue")}
              </th>
              <th
                onClick={() => toggleSort("currentValue")}
                className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
              >
                Share {renderSortIcon("currentValue")}
              </th>
              <th
                onClick={() => toggleSort("xirr")}
                className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
              >
                XIRR {renderSortIcon("xirr")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {sortedMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-6 text-center text-slate-500 text-xs"
                >
                  No data
                </td>
              </tr>
            ) : (
              sortedMembers.map((m, i) => {
                const share =
                  totalCurrentValue > 0
                    ? (m.currentValue / totalCurrentValue) * 100
                    : 0;
                return (
                  <tr
                    key={m.name}
                    className={
                      i % 2 === 0 ? "bg-transparent" : "bg-slate-950/30"
                    }
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${OVERVIEW_BG_CLASSES[i % OVERVIEW_BG_CLASSES.length]}`}
                        />
                        <span className="font-semibold text-slate-200">
                          {m.name}
                        </span>
                      </div>
                      {m.pan && (
                        <div className="text-[10px] text-slate-500 ml-4">
                          {m.pan}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-100">
                      {formatCurrency(m.currentValue)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-teal-400 font-semibold">
                        {share.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`font-bold text-xs ${m.xirr >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {formatPercent(m.xirr)}
                      </span>
                      <div className="mt-1">
                        <DeltaBadge delta={m.xirrDelta} label="" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Column 2: Sub Category Allocation + Insights */}
      <div className="space-y-5">
        {/* Sub Category Allocation Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
            <PieIcon size={15} className="text-violet-400" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">
              Sub Category Allocation
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-950/60">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Current Value
                </th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedSubCats.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-6 text-center text-slate-500 text-xs"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                sortedSubCats.map((cat, i) => {
                  const share =
                    totalCurrentValue > 0
                      ? (cat.value / totalCurrentValue) * 100
                      : 0;
                  return (
                    <tr
                      key={cat.name}
                      className={
                        i % 2 === 0 ? "bg-transparent" : "bg-slate-950/30"
                      }
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${OVERVIEW_BG_CLASSES[i % OVERVIEW_BG_CLASSES.length]}`}
                          />
                          <span className="font-semibold text-slate-200">
                            {cat.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-100">
                        {formatCurrency(cat.value)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-violet-400 font-semibold">
                          {share.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </motion.div>

        {/* Portfolio Insights Card */}
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
              <div className={`text-[10px] font-bold ${statusColor}`}>
                {status}
              </div>
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
                  {topFund.schemeName} ({topFund.absoluteReturn.toFixed(1)}%
                  abs)
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
      </div>
    </div>
  );
}
