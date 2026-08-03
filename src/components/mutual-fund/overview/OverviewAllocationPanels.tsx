"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Sector, Tooltip, ResponsiveContainer } from "recharts";
import type { PieSectorDataItem } from "recharts";
import { IndianRupee, Target } from "lucide-react";
import { formatCurrency, formatPercent } from "@/helpers/formatters";
import DeltaBadge from "@/components/shared/DeltaBadge";
import {
  OVERVIEW_COLORS,
  OVERVIEW_BG_CLASSES,
  OVERVIEW_GRAD_CLASSES,
  type OverviewAllocationPanelsProps,
} from "@/types/overview";

export default function OverviewAllocationPanels({
  categoryAllocation,
  amcAllocation,
  totals,
  taxEstimate,
  metricDeltas,
}: OverviewAllocationPanelsProps) {
  const totalCurrentValue = totals.currentValue || 1;
  const isAlphaPositive = totals.alpha >= 0;

  const ltcgGain = Math.max(taxEstimate.ltcgEstimate, 0);
  const stcgGain = Math.max(taxEstimate.stcgEstimate, 0);
  const taxableLtcg = Math.max(ltcgGain - 125000, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Category Donut */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
      >
        <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
          <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
          Category Allocation
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryAllocation}
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                shape={(props: PieSectorDataItem & { index: number }) => (
                  <Sector
                    {...props}
                    fill={OVERVIEW_COLORS[props.index % OVERVIEW_COLORS.length]}
                  />
                )}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl text-xs font-bold text-slate-100 flex flex-col gap-0.5">
                      <span className="text-slate-400 font-medium">
                        {payload[0].name}
                      </span>
                      <span>{formatCurrency(Number(payload[0].value))}</span>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 mt-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar [scrollbar-gutter:stable]">
          {categoryAllocation.map((cat, i) => {
            const pct =
              totalCurrentValue > 0 ? (cat.value / totalCurrentValue) * 100 : 0;
            return (
              <div
                key={cat.name}
                className="flex items-center justify-between text-xs py-1"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${OVERVIEW_BG_CLASSES[i % OVERVIEW_BG_CLASSES.length]}`}
                  />
                  <span className="text-slate-300 leading-snug">
                    {cat.name}
                  </span>
                </div>
                <div className="flex flex-col items-end ml-2 shrink-0">
                  <span className="text-slate-400 font-semibold">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                    {formatCurrency(cat.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* AMC Bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col"
      >
        <h4 className="font-bold text-slate-100 mb-5 flex items-center gap-2 text-xs uppercase tracking-widest">
          <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
          AMC Exposure
        </h4>
        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar [scrollbar-gutter:stable]">
          {amcAllocation.map((amc, i) => {
            const pct =
              totalCurrentValue > 0 ? (amc.value / totalCurrentValue) * 100 : 0;
            return (
              <div key={amc.name}>
                <div className="flex justify-between gap-3 text-xs mb-2">
                  <span className="font-medium text-slate-200 leading-snug">
                    {amc.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-500 tabular-nums text-[10px]">
                      {formatCurrency(amc.value)}
                    </span>
                    <span className="text-slate-300 font-bold tabular-nums w-10 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${OVERVIEW_GRAD_CLASSES[i % OVERVIEW_GRAD_CLASSES.length]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      delay: 0.5 + i * 0.05,
                      duration: 0.6,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Tax + XIRR Comparison */}
      <div className="flex flex-col gap-4">
        {/* Capital Gains */}
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
            <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-slate-800/80 space-y-1 min-w-0">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                LTCG &gt;1 yr
              </div>
              <div
                className="text-[11px] xs:text-xs sm:text-sm md:text-base xl:text-lg font-extrabold text-slate-100 tabular-nums leading-tight whitespace-nowrap tracking-tight overflow-hidden"
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
              <div className="text-[10px] text-slate-500 font-medium">
                Taxable:{" "}
                <span className="text-slate-300">
                  {formatCurrency(taxableLtcg)}
                </span>
              </div>
            </div>
            {/* STCG */}
            <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-amber-500/20 space-y-1 min-w-0">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                STCG ≤1 yr
              </div>
              <div
                className="text-[11px] xs:text-xs sm:text-sm md:text-base xl:text-lg font-extrabold text-amber-400 tabular-nums leading-tight whitespace-nowrap tracking-tight overflow-hidden"
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
              <div className="text-[10px] text-slate-500 font-medium">
                Tax est:{" "}
                <span className="text-amber-300/80">
                  {formatCurrency(stcgGain * 0.2)}
                </span>
              </div>
            </div>
          </div>
          {/* Total */}
          <div className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-2.5 border border-slate-700/40 min-w-0 gap-2">
            <span className="text-xs text-slate-400 font-medium shrink-0">
              Total Gains
            </span>
            <span
              className="text-sm sm:text-base font-extrabold text-slate-100 tabular-nums truncate tracking-tight text-right"
              title={formatCurrency(ltcgGain + stcgGain)}
            >
              {formatCurrency(ltcgGain + stcgGain)}
            </span>
          </div>
        </motion.div>

        {/* XIRR Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
              XIRR vs Benchmark
            </h4>
            <div className="bg-teal-500/10 p-1.5 rounded-lg">
              <Target size={14} className="text-teal-400" />
            </div>
          </div>
          <div className="space-y-4">
            {/* Portfolio */}
            <div>
              <div className="flex justify-between items-baseline text-xs mb-2">
                <span className="text-slate-400 font-medium">
                  Your Portfolio
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-teal-400 tabular-nums leading-none">
                    {formatPercent(totals.portfolioXirr)}
                  </span>
                  <DeltaBadge delta={metricDeltas.portfolioXirr} label="" />
                </span>
              </div>
              <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(Math.max(totals.portfolioXirr, 0) * 2.5, 100)}%`,
                  }}
                  transition={{ delay: 0.6, duration: 0.7 }}
                />
              </div>
            </div>
            {/* Benchmark */}
            <div>
              <div className="flex justify-between items-baseline text-xs mb-2">
                <span className="text-slate-400 font-medium">
                  Nifty 50 Index
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-violet-400 tabular-nums leading-none">
                    {formatPercent(totals.benchmarkXirr)}
                  </span>
                  <DeltaBadge delta={metricDeltas.benchmarkXirr} label="" />
                </span>
              </div>
              <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(Math.max(totals.benchmarkXirr, 0) * 2.5, 100)}%`,
                  }}
                  transition={{ delay: 0.65, duration: 0.7 }}
                />
              </div>
            </div>
            {/* Alpha banner */}
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${isAlphaPositive ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}
            >
              <div className="flex flex-col">
                <span
                  className={`text-[10px] uppercase tracking-widest font-semibold ${isAlphaPositive ? "text-emerald-500/60" : "text-red-500/60"}`}
                >
                  Alpha
                </span>
                <span
                  className={`text-lg font-extrabold tabular-nums ${isAlphaPositive ? "text-emerald-400" : "text-red-400"}`}
                >
                  {totals.alpha >= 0 ? "+" : ""}
                  {totals.alpha.toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-xs font-semibold ${isAlphaPositive ? "text-emerald-300" : "text-red-300"}`}
                >
                  {isAlphaPositive ? "Beating market 🏆" : "Lagging behind"}
                </span>
                <DeltaBadge delta={metricDeltas.alpha} label="" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
