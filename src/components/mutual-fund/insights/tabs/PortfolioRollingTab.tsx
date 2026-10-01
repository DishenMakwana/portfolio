"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Award,
  CheckCircle2,
  HelpCircle,
  Layers,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import type {
  PortfolioRollingTabProps,
  CustomPortfolioRollingTooltipProps,
  RollingHorizon,
} from "@/types/rollingReturns";
import { formatPercent } from "@/helpers/formatters";

const HORIZON_OPTIONS: Array<{ key: RollingHorizon; label: string }> = [
  { key: "1y", label: "1 Year" },
  { key: "3y", label: "3 Years" },
  { key: "5y", label: "5 Years" },
];

function CustomPortfolioRollingTooltip({
  active,
  payload,
  benchmarkName = "NIFTY 50 TRI",
  horizonLabel = "3 Years",
}: CustomPortfolioRollingTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

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
              MF Portfolio CAGR:
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

export default function PortfolioRollingTab({
  rollingReturns,
}: PortfolioRollingTabProps) {
  const [selectedMember, setSelectedMember] = useState<string>("ALL");

  const isAllMembers = selectedMember === "ALL";
  const globalStats = rollingReturns?.statsByHorizon;
  const memberData = rollingReturns?.memberData || {};
  const activeStatsByHorizon = isAllMembers
    ? globalStats
    : memberData[selectedMember]?.statsByHorizon || globalStats;

  // Auto-fallback: default 5y -> fallback 3y -> fallback 1y
  const defaultHorizon: RollingHorizon = useMemo(() => {
    if (activeStatsByHorizon?.["5y"]?.totalObservations) {
      return "5y";
    }
    if (activeStatsByHorizon?.["3y"]?.totalObservations) {
      return "3y";
    }
    if (activeStatsByHorizon?.["1y"]?.totalObservations) {
      return "1y";
    }
    return "1y";
  }, [activeStatsByHorizon]);

  const [selectedHorizon, setSelectedHorizon] =
    useState<RollingHorizon>(defaultHorizon);

  // Sync selected horizon when active member or data changes
  useEffect(() => {
    const currentObs =
      activeStatsByHorizon?.[selectedHorizon]?.totalObservations || 0;
    if (currentObs === 0) {
      setSelectedHorizon(defaultHorizon);
    }
  }, [activeStatsByHorizon, selectedHorizon, defaultHorizon]);

  const hasAnyData =
    Boolean(rollingReturns?.hasSufficientHistory) &&
    ((activeStatsByHorizon?.["1y"]?.totalObservations || 0) > 0 ||
      (activeStatsByHorizon?.["3y"]?.totalObservations || 0) > 0 ||
      (activeStatsByHorizon?.["5y"]?.totalObservations || 0) > 0);

  if (!rollingReturns || !hasAnyData) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center backdrop-blur-sm">
        <Activity size={32} className="text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-200">
          Rolling Returns Unavailable
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Historical NAV data is being synchronized for your mutual fund
          portfolio. Please refresh your cache to view full rolling analytics.
        </p>
      </div>
    );
  }

  const {
    chartDataByHorizon: globalChartData,
    benchmarkName,
    portfolioCagr: globalCagr,
    members = [],
  } = rollingReturns;

  const activeChartDataByHorizon = isAllMembers
    ? globalChartData
    : memberData[selectedMember]?.chartDataByHorizon || globalChartData;
  const activePortfolioCagr = isAllMembers
    ? globalCagr
    : (memberData[selectedMember]?.portfolioCagr ?? globalCagr);

  const activeStats = activeStatsByHorizon?.[selectedHorizon];
  const activeChartData = activeChartDataByHorizon?.[selectedHorizon] || [];
  const activeLabel =
    HORIZON_OPTIONS.find((h) => h.key === selectedHorizon)?.label || "3 Years";

  // Calculate 15% dynamic Y-axis headroom padding per AGENTS.md
  let yDomain: [number, number] = [-10, 40];
  if (activeChartData.length > 0) {
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const d of activeChartData) {
      if (Number.isFinite(d.fundRollingReturn)) {
        minVal = Math.min(minVal, d.fundRollingReturn);
        maxVal = Math.max(maxVal, d.fundRollingReturn);
      }
      if (
        d.benchRollingReturn !== null &&
        Number.isFinite(d.benchRollingReturn)
      ) {
        minVal = Math.min(minVal, d.benchRollingReturn);
        maxVal = Math.max(maxVal, d.benchRollingReturn);
      }
    }

    if (minVal !== Infinity && maxVal !== -Infinity) {
      const range = maxVal - minVal;
      const padding = Math.max(range * 0.15, 5);
      const computedMin = Math.floor((minVal - padding) / 5) * 5;
      const computedMax = Math.ceil((maxVal + padding) / 5) * 5;
      yDomain = [computedMin, computedMax];
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Main Interactive Chart Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
        {/* Header with Title & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-850 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-lg font-black text-slate-100 tracking-tight">
                Mutual Fund Portfolio Rolling Returns
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/25">
                Point-to-Point Bias Free
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium max-w-2xl">
              Evaluates annualized compound returns across all historical{" "}
              {activeLabel.toLowerCase()} holding windows for your consolidated
              mutual fund investments vs{" "}
              <strong className="text-slate-300 font-bold">
                {benchmarkName}
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-col sm:items-end items-start gap-2.5 shrink-0">
            {/* Member Filter Dropdown */}
            {members.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl p-1.5 px-2.5">
                <User size={13} className="text-slate-400 shrink-0" />
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 font-bold focus:outline-none cursor-pointer pr-2"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">
                    Consolidated (All Members)
                  </option>
                  {members.map((m) => (
                    <option
                      key={m}
                      value={m}
                      className="bg-slate-900 text-slate-200"
                    >
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Horizon Switcher Pills */}
            <div className="flex items-center bg-slate-950/70 border border-slate-800 rounded-xl p-1 shrink-0">
              {HORIZON_OPTIONS.map((h) => {
                const isSelected = selectedHorizon === h.key;
                return (
                  <button
                    key={h.key}
                    onClick={() => setSelectedHorizon(h.key)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
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

        {/* Realized CAGR Comparison Banner */}
        {activePortfolioCagr !== null &&
          activePortfolioCagr !== undefined &&
          activeStats &&
          activeStats.totalObservations > 0 && (
            <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-teal-400 shrink-0" />
                <span className="text-slate-200">
                  {isAllMembers
                    ? "Your Consolidated MF Portfolio Realized CAGR is "
                    : `${selectedMember}'s MF Portfolio Realized CAGR is `}
                  <strong className="text-teal-300 font-black text-sm">
                    {formatPercent(activePortfolioCagr)}
                  </strong>
                  {activePortfolioCagr >= activeStats.medianReturn ? (
                    <span className="text-emerald-400 font-semibold ml-1">
                      (Outperforming historical rolling median of{" "}
                      {formatPercent(activeStats.medianReturn)})
                    </span>
                  ) : (
                    <span className="text-slate-400 ml-1">
                      (Historical rolling median:{" "}
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

        {/* Time-Series Area & Line Chart */}
        {activeChartData.length > 0 ? (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="portfolioRollingGradient"
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
                      if (parts[0].length === 4) {
                        return `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
                      }
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
                    <CustomPortfolioRollingTooltip
                      benchmarkName={benchmarkName}
                      horizonLabel={activeLabel}
                    />
                  }
                />
                {/* 0% Baseline */}
                <Line
                  type="monotone"
                  dataKey={() => 0}
                  stroke="#475569"
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                {/* Benchmark Index Rolling Line */}
                <Line
                  type="monotone"
                  dataKey="benchRollingReturn"
                  name={benchmarkName}
                  stroke="#818cf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                {/* Portfolio Rolling CAGR Gradient Area */}
                <Area
                  type="monotone"
                  dataKey="fundRollingReturn"
                  name="MF Portfolio"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#portfolioRollingGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            <Activity size={24} className="mb-2 text-slate-600" />
            <span>
              Insufficient historical data for {activeLabel.toLowerCase()}{" "}
              rolling analysis.
            </span>
          </div>
        )}

        {/* Chart Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2 border-t border-slate-850">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-teal-400 inline-block shadow-sm" />
            <span className="font-semibold text-slate-200">
              {isAllMembers
                ? "Consolidated MF Portfolio"
                : `${selectedMember}'s MF Portfolio`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-400 inline-block" />
            <span className="font-semibold text-indigo-300">
              {benchmarkName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-600 inline-block" />
            <span>0% Baseline</span>
          </div>
        </div>
      </div>

      {/* 2. Probability & Consistency Matrix Table Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-100 tracking-tight">
                Portfolio Rolling Return Probability & Consistency Matrix
              </h4>
              <p className="text-[11px] text-slate-400">
                Cross-horizon comparison across 1Y, 3Y, and 5Y rolling windows
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                <th className="py-3 px-3">Horizon</th>
                <th className="py-3 px-3">Windows</th>
                <th className="py-3 px-3">Average</th>
                <th className="py-3 px-3">Median</th>
                <th className="py-3 px-3">Worst Period</th>
                <th className="py-3 px-3">Best Period</th>
                <th className="py-3 px-3">Volatility</th>
                <th className="py-3 px-3">Positive %</th>
                <th className="py-3 px-3">&gt; 12% Return</th>
                <th className="py-3 px-3">Beat Index</th>
                <th className="py-3 px-3">Avg Alpha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60">
              {HORIZON_OPTIONS.map((h) => {
                const s = activeStatsByHorizon?.[h.key];
                if (!s || s.totalObservations === 0) {
                  return (
                    <tr key={h.key} className="text-slate-500">
                      <td className="py-3 px-3 font-bold">{h.label}</td>
                      <td
                        colSpan={10}
                        className="py-3 px-3 text-center text-slate-600"
                      >
                        Insufficient history (&lt; {h.label})
                      </td>
                    </tr>
                  );
                }

                const isCurrentActive = selectedHorizon === h.key;

                return (
                  <tr
                    key={h.key}
                    onClick={() => setSelectedHorizon(h.key)}
                    className={`cursor-pointer transition-colors ${
                      isCurrentActive
                        ? "bg-teal-500/10 text-slate-100"
                        : "hover:bg-slate-800/30 text-slate-300"
                    }`}
                  >
                    <td className="py-3 px-3 font-black text-slate-200 flex items-center gap-1.5">
                      {isCurrentActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      )}
                      <span>{h.label}</span>
                    </td>
                    <td className="py-3 px-3  text-slate-400">
                      {s.totalObservations}
                    </td>
                    <td className="py-3 px-3 font-bold text-teal-300">
                      {formatPercent(s.avgReturn)}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-200">
                      {formatPercent(s.medianReturn)}
                    </td>
                    <td className="py-3 px-3 font-bold">
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
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {formatPercent(s.maxReturn)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 ">±{s.stdDev}%</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          s.positivePeriodsPct >= 95
                            ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
                            : s.positivePeriodsPct >= 80
                              ? "bg-teal-950/70 text-teal-300 border border-teal-500/30"
                              : "bg-amber-950/70 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {s.positivePeriodsPct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-200">
                      {s.above12Pct}%
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-300">
                      {s.outperformancePct}%
                    </td>
                    <td className="py-3 px-3 font-bold">
                      <span
                        className={
                          (s.avgAlpha ?? 0) >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {s.avgAlpha !== null
                          ? `${s.avgAlpha >= 0 ? "+" : ""}${s.avgAlpha}%`
                          : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Educational Methodology Explainer Card */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-slate-800/80 text-teal-400 shrink-0 mt-0.5">
            <HelpCircle size={18} />
          </div>
          <div className="space-y-1 text-xs">
            <h5 className="font-bold text-slate-200">
              Why Portfolio-Level Rolling Returns Matter
            </h5>
            <p className="text-slate-400 leading-relaxed">
              Standard point-to-point returns (like 1Y, 3Y, 5Y from today) are
              biased by whether today&apos;s market happens to be at an All-Time
              High or in a correction. Rolling returns calculate every possible
              entry and exit date across your portfolio&apos;s history, showing
              your true compounding reliability, worst-case downside floor, and
              long-term outperformance odds over Nifty 50 TRI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
