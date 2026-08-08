"use client";

import { useMemo } from "react";
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
  holdings = [],
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

  const topMember = [...memberSummaries].sort(
    (a, b) => b.currentValue - a.currentValue
  )[0];
  const topMemberPct =
    topMember && totalCurrentValue > 0
      ? (topMember.currentValue / totalCurrentValue) * 100
      : 0;

  const categoryPerformance = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];
    const catMap: Record<
      string,
      { name: string; invested: number; value: number; gain: number }
    > = {};
    for (const h of holdings) {
      const catName = h.category || "Uncategorized";
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, invested: 0, value: 0, gain: 0 };
      }
      catMap[catName].invested += h.purchaseValue || 0;
      catMap[catName].value += h.currentValue || 0;
      catMap[catName].gain += h.gain || 0;
    }
    const list = Object.values(catMap).map((c) => ({
      name: c.name,
      invested: c.invested,
      value: c.value,
      gain: c.gain,
      absReturn: c.invested > 0 ? (c.gain / c.invested) * 100 : 0,
    }));
    return list.sort((a, b) => b.absReturn - a.absReturn);
  }, [holdings]);

  const categoryPerfMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoryPerformance) {
      map.set(c.name, c.absReturn);
    }
    return map;
  }, [categoryPerformance]);

  const topCategoryPerf = categoryPerformance[0] || null;
  const worstCategoryPerf =
    categoryPerformance.length > 1
      ? categoryPerformance[categoryPerformance.length - 1]
      : null;

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
      {/* Column 1 (Left): Investor Allocation Table + Portfolio Insights */}
      <div className="space-y-5">
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
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${OVERVIEW_BG_CLASSES[i % OVERVIEW_BG_CLASSES.length]}`}
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-200">
                                {m.name}
                              </span>
                              {(m.accountStatus?.toUpperCase() === "DECEASED" ||
                                m.name === "SHAILESH RAMJIBHAI MAKWANA") && (
                                <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] px-1.5 py-0.2 rounded font-extrabold tracking-wide uppercase">
                                  Died
                                </span>
                              )}
                            </div>
                            {m.pan && (
                              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                                PAN: {m.pan}
                              </span>
                            )}
                          </div>
                        </div>
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
                          className={`font-bold text-xs ${m.xirr === 0 ? "text-slate-400" : m.xirr >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {m.xirr !== 0 ? formatPercent(m.xirr) : "0.00%"}
                        </span>
                        <div className="mt-1">
                          {m.xirrDelta !== null &&
                            m.xirrDelta !== undefined && (
                              <DeltaBadge delta={m.xirrDelta} label="" />
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </motion.div>

        {/* Portfolio Insights & Health Card (Left Side) */}
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

      {/* Column 2 (Right): Category Allocation Breakdown */}
      <div className="space-y-5">
        {/* Category Allocation Breakdown Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
            <PieIcon size={15} className="text-violet-400" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">
              Category Allocation Breakdown
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
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Abs Return
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedSubCats.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
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
                  const absReturn = categoryPerfMap.get(cat.name) ?? null;
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
                      <td className="px-5 py-3 text-right">
                        {absReturn !== null ? (
                          <span
                            className={`font-semibold ${
                              absReturn >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {absReturn >= 0 ? "+" : ""}
                            {absReturn.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </motion.div>

        {/* Portfolio Category & Structure Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
              <Activity size={15} className="text-teal-400" />
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
                  {topCategoryPerf.name} ({topCategoryPerf.absReturn.toFixed(1)}
                  % abs)
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
                  {worstCategoryPerf.name} (
                  {worstCategoryPerf.absReturn.toFixed(1)}% abs)
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
