"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Award,
  Sparkles,
  Layers,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { formatPercent } from "@/helpers/formatters";
import type { RollingHorizon } from "@/types/rollingReturns";
import type {
  FundRollingReturnsCardProps,
  CustomRollingTooltipProps,
} from "@/types/fund-details";

function CustomRollingTooltip({
  active,
  payload,
  benchmarkName,
  horizonLabel,
}: CustomRollingTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  // Format date DD-MM-YY
  let displayDate = data.date;
  const parts = data.date.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      displayDate = `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
    } else if (parts[2].length === 4) {
      displayDate = `${parts[0]}-${parts[1]}-${parts[2].slice(-2)}`;
    }
  }

  const isAlphaPositive = (data.alpha ?? 0) >= 0;

  return (
    <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-slate-300">
        <span>Window End: {displayDate}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-semibold">
          {horizonLabel} Rolling
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
            <span className="text-slate-300 font-medium">
              Fund Rolling CAGR:
            </span>
          </div>
          <span className="font-black text-teal-300">
            {formatPercent(data.fundRollingReturn)}
          </span>
        </div>

        {data.benchRollingReturn !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
              <span className="text-slate-400 font-medium truncate max-w-[130px]">
                {benchmarkName}:
              </span>
            </div>
            <span className="font-bold text-indigo-300">
              {formatPercent(data.benchRollingReturn)}
            </span>
          </div>
        )}

        {data.alpha !== null && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium">Rolling Alpha:</span>
            <span
              className={`font-black ${isAlphaPositive ? "text-emerald-400" : "text-rose-400"}`}
            >
              {isAlphaPositive ? "+" : ""}
              {data.alpha}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FundRollingReturnsCard({
  rollingReturns,
  holdingName,
  isStock = false,
}: FundRollingReturnsCardProps) {
  // Priority order: default 5y -> fallback 3y -> fallback 1y
  const defaultHorizon: RollingHorizon = useMemo(() => {
    if (rollingReturns?.statsByHorizon?.["5y"]?.totalObservations) {
      return "5y";
    }
    if (rollingReturns?.statsByHorizon?.["3y"]?.totalObservations) {
      return "3y";
    }
    if (rollingReturns?.statsByHorizon?.["1y"]?.totalObservations) {
      return "1y";
    }
    return "1y";
  }, [rollingReturns]);

  const [selectedHorizon, setSelectedHorizon] =
    useState<RollingHorizon>(defaultHorizon);

  // Sync / Fallback automatically when data changes or if selected horizon has 0 observations
  useEffect(() => {
    const currentObs =
      rollingReturns?.statsByHorizon?.[selectedHorizon]?.totalObservations || 0;
    if (currentObs === 0) {
      setSelectedHorizon(defaultHorizon);
    }
  }, [rollingReturns, selectedHorizon, defaultHorizon]);

  const horizons: Array<{ key: RollingHorizon; label: string }> = [
    { key: "1y", label: "1 Year" },
    { key: "3y", label: "3 Years" },
    { key: "5y", label: "5 Years" },
  ];

  const activeStats = rollingReturns?.statsByHorizon[selectedHorizon];
  const activeChartData =
    rollingReturns?.chartDataByHorizon[selectedHorizon] || [];
  const benchmarkName = rollingReturns?.benchmarkName || "Benchmark";
  const folioCagr = rollingReturns?.folioCagr;

  // Calculate dynamic Y-axis domain with minimum 15% top & bottom headroom padding per standard
  const yDomain = useMemo(() => {
    if (activeChartData.length === 0) return [0, 20];
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const d of activeChartData) {
      if (d.fundRollingReturn < minVal) minVal = d.fundRollingReturn;
      if (d.fundRollingReturn > maxVal) maxVal = d.fundRollingReturn;
      if (d.benchRollingReturn !== null) {
        if (d.benchRollingReturn < minVal) minVal = d.benchRollingReturn;
        if (d.benchRollingReturn > maxVal) maxVal = d.benchRollingReturn;
      }
    }

    if (!Number.isFinite(minVal)) minVal = 0;
    if (!Number.isFinite(maxVal)) maxVal = 20;

    const range = maxVal - minVal;
    const padding = Math.max(range * 0.15, 5);
    const calculatedMin = Math.floor((minVal - padding) / 5) * 5;
    const calculatedMax = Math.ceil((maxVal + padding) / 5) * 5;

    return [calculatedMin, calculatedMax];
  }, [activeChartData]);

  const hasAnyData =
    Boolean(rollingReturns?.hasSufficientHistory) &&
    ((rollingReturns?.statsByHorizon?.["1y"]?.totalObservations || 0) > 0 ||
      (rollingReturns?.statsByHorizon?.["3y"]?.totalObservations || 0) > 0 ||
      (rollingReturns?.statsByHorizon?.["5y"]?.totalObservations || 0) > 0);

  if (!rollingReturns || !hasAnyData) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <Calendar className="mx-auto w-10 h-10 text-slate-600 mb-2" />
        <h4 className="text-sm font-bold text-slate-200">
          Insufficient Historical Data for Rolling Returns
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Rolling return analysis requires at least 1 year of daily NAV history.
        </p>
      </div>
    );
  }

  const activeLabel =
    horizons.find((h) => h.key === selectedHorizon)?.label || "3 Years";

  return (
    <div className="space-y-6">
      {/* ── Main Rolling Returns Card ── */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Rolling Returns Analysis
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    Point-to-Point Bias Free
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Evaluates annualized compound returns across all historical{" "}
                  {activeLabel.toLowerCase()} holding periods for this{" "}
                  {isStock ? "equity asset" : "fund"}.
                </p>
              </div>
            </div>
          </div>

          {/* Horizon Switcher Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
            {horizons.map((h) => {
              const obsCount =
                rollingReturns.statsByHorizon[h.key]?.totalObservations || 0;
              const isDisabled = obsCount === 0;
              return (
                <button
                  key={h.key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSelectedHorizon(h.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedHorizon === h.key
                      ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-black"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{h.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top 4 KPI Metrics for Selected Horizon */}
        {activeStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Average Rolling CAGR */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Average {activeLabel} Return
                </span>
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Percent size={14} />
                </div>
              </div>
              <div className="mt-2.5 text-lg sm:text-xl font-black text-teal-300 tracking-tight">
                {formatPercent(activeStats.avgReturn)}
              </div>
              <div className="text-[10px] xl:text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between font-medium">
                <span>
                  Median:{" "}
                  <strong className="text-slate-200 font-bold">
                    {formatPercent(activeStats.medianReturn)}
                  </strong>
                </span>
                <span>
                  Index:{" "}
                  <strong className="text-slate-300 font-bold">
                    {activeStats.benchAvgReturn !== null
                      ? formatPercent(activeStats.benchAvgReturn)
                      : "—"}
                  </strong>
                </span>
              </div>
            </div>

            {/* 2. Min / Max Spread */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Return Range (Min / Max)
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Layers size={14} />
                </div>
              </div>
              <div className="mt-2.5 text-lg sm:text-xl font-black text-slate-100 tracking-tight flex items-center gap-1.5">
                <span
                  className={
                    activeStats.minReturn >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {formatPercent(activeStats.minReturn)}
                </span>
                <span className="text-slate-500 text-sm font-normal">to</span>
                <span className="text-emerald-400">
                  {formatPercent(activeStats.maxReturn)}
                </span>
              </div>
              <div className="text-[10px] xl:text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between font-medium">
                <span>
                  Spread:{" "}
                  <strong className="text-slate-200 font-bold">
                    {(activeStats.maxReturn - activeStats.minReturn).toFixed(2)}
                    %
                  </strong>
                </span>
                <span>
                  Std Dev:{" "}
                  <strong className="text-slate-300 font-bold">
                    ±{activeStats.stdDev}%
                  </strong>
                </span>
              </div>
            </div>

            {/* 3. Probability of Positive Return */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Positive Return Odds
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  <ShieldCheck size={14} />
                </div>
              </div>
              <div className="mt-2.5 text-lg sm:text-xl font-black text-emerald-400 tracking-tight flex items-center gap-1.5">
                <span>{activeStats.positivePeriodsPct}%</span>
                {activeStats.positivePeriodsPct >= 95 && (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                )}
              </div>
              <div className="text-[10px] xl:text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between font-medium">
                <span>
                  &gt;12% Return:{" "}
                  <strong className="text-slate-200 font-bold">
                    {activeStats.above12Pct}%
                  </strong>
                </span>
                <span>
                  &gt;15% Return:{" "}
                  <strong className="text-slate-300 font-bold">
                    {activeStats.above15Pct}%
                  </strong>
                </span>
              </div>
            </div>

            {/* 4. Alpha & Outperformance */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Beat Benchmark Rate
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Award size={14} />
                </div>
              </div>
              <div className="mt-2.5 text-lg sm:text-xl font-black text-amber-400 tracking-tight">
                {activeStats.outperformancePct}%
              </div>
              <div className="text-[10px] xl:text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between font-medium">
                <span>
                  Avg Alpha:{" "}
                  <strong
                    className={
                      (activeStats.avgAlpha || 0) >= 0
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    {activeStats.avgAlpha !== null
                      ? `${activeStats.avgAlpha >= 0 ? "+" : ""}${activeStats.avgAlpha}%`
                      : "—"}
                  </strong>
                </span>
                <span>
                  Windows:{" "}
                  <strong className="text-slate-300 font-bold">
                    {activeStats.totalObservations}d
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Folio Realized CAGR Context Banner */}
        {folioCagr !== null &&
          folioCagr !== undefined &&
          activeStats &&
          activeStats.totalObservations > 0 && (
            <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-teal-400 shrink-0" />
                <span className="text-slate-200">
                  Your Folio Realized CAGR is{" "}
                  <strong className="text-teal-300 font-black text-sm">
                    {formatPercent(folioCagr)}
                  </strong>
                  {folioCagr >= activeStats.medianReturn ? (
                    <span className="text-emerald-400 font-semibold ml-1">
                      (Outperforming the fund&apos;s historical median of{" "}
                      {formatPercent(activeStats.medianReturn)})
                    </span>
                  ) : (
                    <span className="text-slate-400 ml-1">
                      (Fund historical median:{" "}
                      {formatPercent(activeStats.medianReturn)})
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30 shrink-0 self-start sm:self-auto">
                {activeStats.totalObservations} Windows Analyzed
              </span>
            </div>
          )}

        {/* Interactive Chart */}
        {activeChartData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="fundRollingGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={(val: string) => {
                    if (!val) return "";
                    const parts = val.split("-");
                    if (parts.length === 3) {
                      // Format YYYY-MM-DD -> DD-MM-YY
                      if (parts[0].length === 4) {
                        return `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
                      }
                      // Format DD-MM-YYYY -> DD-MM-YY
                      if (parts[2].length === 4) {
                        return `${parts[0]}-${parts[1]}-${parts[2].slice(-2)}`;
                      }
                    }
                    return val;
                  }}
                />
                <YAxis
                  domain={yDomain}
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  content={
                    <CustomRollingTooltip
                      benchmarkName={benchmarkName}
                      horizonLabel={activeLabel}
                    />
                  }
                />
                <ReferenceLine
                  y={0}
                  stroke="#64748b"
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="fundRollingReturn"
                  name={`${holdingName || "Fund"} ${activeLabel}`}
                  stroke="#14b8a6"
                  strokeWidth={2.2}
                  fill="url(#fundRollingGradient)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchRollingReturn"
                  name={`${benchmarkName} ${activeLabel}`}
                  stroke="#818cf8"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500">
            No rolling data points available for {activeLabel} horizon.
          </div>
        )}
      </div>

      {/* ── Rolling Return Probability & Consistency Matrix Table ── */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-teal-400" />
            <h4 className="text-sm font-bold text-slate-100">
              Rolling Return Probability & Consistency Matrix
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Benchmark: {benchmarkName}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5">Horizon</th>
                <th className="px-3.5 py-2.5">Observations</th>
                <th className="px-3.5 py-2.5">Average CAGR</th>
                <th className="px-3.5 py-2.5">Median CAGR</th>
                <th className="px-3.5 py-2.5">Min Return</th>
                <th className="px-3.5 py-2.5">Max Return</th>
                <th className="px-3.5 py-2.5">% Positive</th>
                <th className="px-3.5 py-2.5">% &gt; 12% Return</th>
                <th className="px-3.5 py-2.5">Beat Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {horizons.map((h) => {
                const s = rollingReturns.statsByHorizon[h.key];
                if (!s || s.totalObservations === 0) {
                  return (
                    <tr key={h.key} className="text-slate-500">
                      <td className="px-3.5 py-3 font-bold text-slate-300">
                        {h.label} Rolling
                      </td>
                      <td colSpan={8} className="px-3.5 py-3 text-slate-500">
                        Insufficient history for {h.label} horizon
                      </td>
                    </tr>
                  );
                }

                const isCurrent = selectedHorizon === h.key;

                return (
                  <tr
                    key={h.key}
                    onClick={() => setSelectedHorizon(h.key)}
                    className={`transition cursor-pointer hover:bg-slate-800/50 ${
                      isCurrent ? "bg-teal-500/10" : ""
                    }`}
                  >
                    <td className="px-3.5 py-3 font-bold text-slate-200 flex items-center gap-1.5">
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                      )}
                      <span>{h.label} Rolling</span>
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-400">
                      {s.totalObservations} days
                    </td>
                    <td className="px-3.5 py-3 font-bold text-teal-300">
                      {formatPercent(s.avgReturn)}
                      {s.benchAvgReturn !== null && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Index: {formatPercent(s.benchAvgReturn)}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-100">
                      {formatPercent(s.medianReturn)}
                    </td>
                    <td className="px-3.5 py-3 font-semibold">
                      <span
                        className={
                          s.minReturn >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {formatPercent(s.minReturn)}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-emerald-400">
                      {formatPercent(s.maxReturn)}
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          s.positivePeriodsPct >= 95
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : s.positivePeriodsPct >= 80
                              ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {s.positivePeriodsPct}%
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-200">
                      {s.above12Pct}%
                    </td>
                    <td className="px-3.5 py-3 font-bold text-amber-400">
                      {s.outperformancePct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
