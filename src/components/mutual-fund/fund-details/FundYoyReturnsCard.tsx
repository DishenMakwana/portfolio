"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  CalendarRange,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { calculateYoyReturns } from "@/helpers/yoyReturns";
import { formatPercent } from "@/helpers/formatters";
import type {
  FundYoyReturnsCardProps,
  CustomYoyTooltipProps,
} from "@/types/fund-details";

function CustomYoyTooltip({
  active,
  payload,
  label,
  isStock,
}: CustomYoyTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  if (!item) return null;

  const isAlphaPositive = item.alpha !== null && item.alpha >= 0;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
      <div className="text-slate-300 font-bold border-b border-slate-800 pb-1.5 flex items-center justify-between">
        <span>{label || item.periodLabel}</span>
        {item.alpha !== null && (
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isAlphaPositive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            Alpha: {isAlphaPositive ? "+" : ""}
            {item.alpha.toFixed(2)}%
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-teal-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            {isStock ? "Stock" : "Fund"} Return:
          </span>
          <span className="font-extrabold text-slate-100">
            {formatPercent(item.fundReturn)}
          </span>
        </div>

        {item.benchmarkReturn !== null && (
          <div className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-1.5">
            <span className="text-indigo-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Benchmark:
            </span>
            <span className="font-bold text-slate-100">
              {formatPercent(item.benchmarkReturn)}
            </span>
          </div>
        )}

        <div className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1 flex justify-between">
          <span>Start: ₹{item.startNav.toFixed(2)}</span>
          <span>End: ₹{item.endNav.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default function FundYoyReturnsCard({
  navHistory,
  benchmarkNavHistory = [],
  benchmarkName = "Benchmark Index",
  isStock = false,
}: FundYoyReturnsCardProps) {
  const [mode, setMode] = useState<"CY" | "FY">("CY");

  const yoyData = useMemo(() => {
    return calculateYoyReturns(navHistory, benchmarkNavHistory, mode);
  }, [navHistory, benchmarkNavHistory, mode]);

  // Chart data in chronological order (left to right)
  const chartData = useMemo(() => {
    return [...yoyData].reverse();
  }, [yoyData]);

  // Calculate dynamic Y-axis domain with 15% headroom padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-10, 10];
    let min = 0;
    let max = 0;
    for (const d of chartData) {
      if (d.fundReturn < min) min = d.fundReturn;
      if (d.fundReturn > max) max = d.fundReturn;
      if (d.benchmarkReturn !== null) {
        if (d.benchmarkReturn < min) min = d.benchmarkReturn;
        if (d.benchmarkReturn > max) max = d.benchmarkReturn;
      }
    }
    const range = Math.max(max - min, 10);
    const padding = Math.max(range * 0.15, 5);
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (yoyData.length === 0) return null;
    let positiveYears = 0;
    let beatingYears = 0;
    let benchmarkYears = 0;
    const totalYears = yoyData.length;
    let bestYear = yoyData[0];
    let worstYear = yoyData[0];

    for (const item of yoyData) {
      if (item.fundReturn > 0) positiveYears++;
      if (item.benchmarkReturn !== null) {
        benchmarkYears++;
        if (item.alpha !== null && item.alpha > 0) beatingYears++;
      }
      if (item.fundReturn > bestYear.fundReturn) bestYear = item;
      if (item.fundReturn < worstYear.fundReturn) worstYear = item;
    }

    const winRate =
      benchmarkYears > 0 ? (beatingYears / benchmarkYears) * 100 : 0;
    return {
      positiveYears,
      beatingYears,
      benchmarkYears,
      totalYears,
      bestYear,
      worstYear,
      winRate,
    };
  }, [yoyData]);

  if (yoyData.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <CalendarRange size={16} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100">
              Year-on-Year (YoY) Annual Returns
            </h3>
            <div
              className="text-slate-400 hover:text-slate-300 transition-colors cursor-help"
              title="Discrete annual holding period returns calculated from daily historical prices/NAVs"
            >
              <Info size={14} />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {mode === "CY"
                ? "Calendar Year (Jan–Dec)"
                : "Financial Year (Apr–Mar)"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Historical annual discrete performance vs {benchmarkName}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("CY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === "CY"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Calendar Year (CY)
          </button>
          <button
            type="button"
            onClick={() => setMode("FY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === "FY"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Financial Year (FY)
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      {summaryStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Positive Years
            </span>
            <div className="mt-1">
              <span className="text-lg font-black text-emerald-400">
                {summaryStats.positiveYears} / {summaryStats.totalYears}
              </span>
              <span className="text-[10px] text-slate-500 ml-1">
                (
                {(
                  (summaryStats.positiveYears / summaryStats.totalYears) *
                  100
                ).toFixed(0)}
                %)
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Beat Benchmark
            </span>
            <div className="mt-1">
              <span className="text-lg font-black text-teal-400">
                {summaryStats.beatingYears} / {summaryStats.benchmarkYears}
              </span>
              <span className="text-[10px] text-slate-500 ml-1">
                ({summaryStats.winRate.toFixed(0)}% win rate)
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Best Year
            </span>
            <div className="mt-1">
              <span
                className={`text-lg font-black ${
                  summaryStats.bestYear.fundReturn >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {summaryStats.bestYear.fundReturn >= 0 ? "+" : ""}
                {summaryStats.bestYear.fundReturn.toFixed(2)}%
              </span>
              <div className="text-[10px] text-slate-400 font-medium">
                {summaryStats.bestYear.periodLabel}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Worst Year
            </span>
            <div className="mt-1">
              <span
                className={`text-lg font-black ${
                  summaryStats.worstYear.fundReturn >= 0
                    ? "text-slate-100"
                    : "text-rose-400"
                }`}
              >
                {summaryStats.worstYear.fundReturn >= 0 ? "+" : ""}
                {summaryStats.worstYear.fundReturn.toFixed(2)}%
              </span>
              <div className="text-[10px] text-slate-400 font-medium">
                {summaryStats.worstYear.periodLabel}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Comparison Bar Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-medium px-1">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-teal-400 inline-block shadow-sm" />
              <span className="text-slate-300 font-semibold">
                {isStock ? "Stock Return" : "Fund Return"} (%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-500/80 inline-block shadow-sm" />
              <span className="text-slate-400">Benchmark Return (%)</span>
            </div>
          </div>
          <span className="text-slate-500 text-[11px]">
            {chartData.length} Periods Recorded
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="periodLabel"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={yDomain}
                tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <Tooltip
                cursor={{ fill: "rgba(51, 65, 85, 0.25)", radius: 6 }}
                content={<CustomYoyTooltip isStock={isStock} />}
              />
              <Bar
                dataKey="fundReturn"
                name={isStock ? "Stock Return" : "Fund Return"}
                fill="#2dd4bf"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="benchmarkReturn"
                name="Benchmark Return"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Discrete YoY Breakdown Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-300 border-b border-slate-800 text-[11px]">
              <th className="py-2.5 px-3 font-bold">Year / Period</th>
              <th className="py-2.5 px-3 text-right font-bold">
                Start {isStock ? "Price" : "NAV"}
              </th>
              <th className="py-2.5 px-3 text-right font-bold">
                End {isStock ? "Price" : "NAV"}
              </th>
              <th className="py-2.5 px-3 text-right font-bold">
                {isStock ? "Stock" : "Fund"} Return
              </th>
              <th className="py-2.5 px-3 text-right font-bold">Benchmark</th>
              <th className="py-2.5 px-3 text-right font-bold">
                Alpha (Excess)
              </th>
              <th className="py-2.5 px-3 text-center font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {yoyData.map((row) => {
              const isPositive = row.fundReturn >= 0;
              const isAlphaPos = row.alpha !== null && row.alpha >= 0;

              return (
                <tr
                  key={row.periodLabel}
                  className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{row.periodLabel}</span>
                      {row.isPartial && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                          Partial
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-400 whitespace-nowrap">
                    ₹{row.startNav.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-200 font-semibold whitespace-nowrap">
                    ₹{row.endNav.toFixed(2)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right tabular-nums font-bold whitespace-nowrap ${
                      isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {row.fundReturn.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-300 font-medium whitespace-nowrap">
                    {row.benchmarkReturn !== null ? (
                      <>
                        {row.benchmarkReturn >= 0 ? "+" : ""}
                        {row.benchmarkReturn.toFixed(2)}%
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right tabular-nums font-bold whitespace-nowrap ${
                      row.alpha === null
                        ? "text-slate-500"
                        : isAlphaPos
                          ? "text-emerald-400"
                          : "text-rose-400"
                    }`}
                  >
                    {row.alpha !== null ? (
                      <>
                        {isAlphaPos ? "+" : ""}
                        {row.alpha.toFixed(2)}%
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {row.alpha === null ? (
                      <span className="text-slate-500">-</span>
                    ) : isAlphaPos ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <ArrowUpRight size={12} />
                        Outperformed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <ArrowDownRight size={12} />
                        Lagged
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
