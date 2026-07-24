"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  TrendingUp,
  Award,
  Layers,
  LineChart,
} from "lucide-react";
import {
  formatCurrency,
  formatNullablePercent,
  formatInrCompact,
  formatHoldingYearsAndDays,
  formatMetricDiff,
} from "@/helpers/formatters";
import type { ZerodhaInsightsTabProps } from "@/types/zerodha";
import type {
  AllocationAnalysisSortKey,
  AmcPoint,
  SubCategoryGroupItem,
  AllocationAnalysisGroup,
} from "@/types/insights";
import MetricCard from "@/components/shared/MetricCard";
import {
  getAmcName,
  mapAllocationAnalysisGroups,
  sortAllocationAnalysisData,
  getOverlapSubCategory,
} from "@/helpers/allocation";
import AllocationAnalysisTab from "@/components/shared/AllocationAnalysisTab";

function getShortFundName(fullName: string): string {
  const parts = fullName.split(" ");
  if (parts.length > 1) {
    const p1 = parts[1].toLowerCase();
    if (
      p1 === "pru" ||
      p1 === "india" ||
      p1 === "nifty" ||
      p1 === "select" ||
      p1 === "large"
    ) {
      return `${parts[0]} ${parts[1]} ${parts[2] || ""}`.trim();
    }
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

// ─── SVG Mutual Funds CAGR Leaderboard Chart ──────────────────────────────────

function MfLeaderboardChart({
  mfHoldings,
  niftyBenchmark,
}: {
  mfHoldings: Array<{ symbol: string; cagr: number }>;
  niftyBenchmark: number;
}) {
  const [hoveredBar, setHoveredBar] = useState<{
    x: number;
    y: number;
    symbol: string;
    cagr: number;
  } | null>(null);

  const maxCagr = Math.max(...mfHoldings.map((m) => m.cagr), 0);
  const minCagr = Math.min(...mfHoldings.map((m) => m.cagr), 0);
  const chartH = 300;
  const barW = 60;
  const minGap = 28;
  const padX = 65;
  const padY = 40;
  const benchmark = niftyBenchmark;

  // Set bounds for Y scale
  const yMax = Math.max(maxCagr, benchmark, 1) * 1.15;
  const yMin = minCagr < 0 ? minCagr * 1.35 : 0; // Pad negative side slightly to prevent text clipping
  const totalRange = yMax - yMin;

  const getY = (v: number) =>
    padY + chartH - ((v - yMin) / totalRange) * chartH;

  const zeroY = getY(0);
  const benchmarkY = getY(benchmark);

  const n = mfHoldings.length;
  // Calculate dynamic width based on number of bars to support horizontal scroll on narrow views
  const neededW = padX * 2 + n * (barW + minGap) - minGap;
  const totalW = Math.max(800, neededW);
  const gap = n > 1 ? (totalW - padX * 2 - n * barW) / (n - 1) : 30;

  return (
    <div className="overflow-x-auto select-none relative">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + padY * 2 + 60}`}
        className="w-full min-w-[700px] h-[440px]"
      >
        {/* Grid lines */}
        {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 75, 100, 150].map(
          (v) => {
            if (v > yMax || v < yMin) return null;
            const y = getY(v);
            return (
              <g key={v}>
                <line
                  x1={padX}
                  y1={y}
                  x2={totalW - padX}
                  y2={y}
                  stroke={v === 0 ? "#475569" : "#1e293b"}
                  strokeWidth={v === 0 ? "1.5" : "1"}
                  strokeOpacity={v === 0 ? "0.8" : "1"}
                />
                <text
                  x={padX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill={v === 0 ? "#94a3b8" : "#475569"}
                  fontWeight={v === 0 ? "bold" : "normal"}
                >
                  {v}%
                </text>
              </g>
            );
          }
        )}

        {/* Benchmark line */}
        <line
          x1={padX}
          y1={benchmarkY}
          x2={totalW - padX}
          y2={benchmarkY}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="5,3"
        />
        <text
          x={totalW - padX + 4}
          y={benchmarkY + 3}
          fontSize="9"
          fill="#f59e0b"
          fontWeight="bold"
        >
          Nifty {benchmark.toFixed(1)}%
        </text>

        {/* Bars */}
        {mfHoldings.map((m, i) => {
          const x = padX + i * (barW + gap);
          const valY = getY(m.cagr);
          const isNegative = m.cagr < 0;

          const rectY = isNegative ? zeroY : valY;
          const rectH = isNegative ? valY - zeroY : zeroY - valY;

          const isTop = i === 0;
          const shortLabelName = getShortFundName(m.symbol);

          const isHovered = hoveredBar?.symbol === m.symbol;

          return (
            <g
              key={m.symbol}
              onMouseEnter={() =>
                setHoveredBar({
                  x,
                  y: valY,
                  symbol: m.symbol,
                  cagr: m.cagr,
                })
              }
              onMouseLeave={() => setHoveredBar(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={rectY}
                width={barW}
                height={Math.max(2, rectH)}
                rx="6"
                fill={
                  isTop
                    ? "url(#topGrad)"
                    : m.cagr >= niftyBenchmark
                      ? "url(#goodGrad)"
                      : "url(#lowGrad)"
                }
                className={`transition-[opacity,filter] duration-200 ${
                  isTop ? "drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" : ""
                } ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              />
              <text
                x={x + barW / 2}
                y={isNegative ? valY + 12 : valY - 6}
                textAnchor="middle"
                fontSize="9"
                fill={isNegative ? "#f87171" : "#94a3b8"}
                fontWeight="bold"
                className={`transition-opacity duration-200 ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              >
                {m.cagr.toFixed(1)}%
              </text>
              <text
                x={x + barW / 2}
                y={padY + chartH + 16}
                textAnchor="middle"
                fontSize="8.5"
                fill="#64748b"
                fontWeight="bold"
                className={`transition-opacity duration-200 ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              >
                {shortLabelName}
              </text>
            </g>
          );
        })}

        {/* Custom SVG Tooltip */}
        {hoveredBar &&
          (() => {
            const tooltipX = Math.max(
              5,
              Math.min(hoveredBar.x + barW / 2 - 85, totalW - 175)
            );
            const isNegative = hoveredBar.cagr < 0;
            const tooltipY = isNegative
              ? Math.min(hoveredBar.y + 15, chartH + padY * 2 - 15)
              : Math.max(hoveredBar.y - 70, 5);
            return (
              <g className="pointer-events-none">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width="170"
                  height="58"
                  rx="8"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                  className="drop-shadow-[0_10px_15px_rgba(0,0,0,0.65)]"
                />
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 18}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {getShortFundName(hoveredBar.symbol)}
                </text>
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 33}
                  textAnchor="middle"
                  fill="#14b8a6"
                  fontSize="9"
                  fontWeight="extrabold"
                >
                  CAGR: {hoveredBar.cagr.toFixed(2)}%
                </text>
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 46}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="7"
                >
                  {hoveredBar.cagr >= niftyBenchmark
                    ? "🏆 Outperforming Nifty"
                    : "Below Nifty"}
                </text>
              </g>
            );
          })()}

        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id="goodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ZerodhaInsightsTab({ data }: ZerodhaInsightsTabProps) {
  const { insights, totals, holdings } = data;

  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "amc" | "category" | "overlaps"
  >("overview");

  // AMC sorting state
  const [amcSortKey, setAmcSortKey] =
    useState<AllocationAnalysisSortKey>("weight");
  const [amcSortDir, setAmcSortDir] = useState<"asc" | "desc">("desc");

  // Category sorting state
  const [categorySortKey, setCategorySortKey] =
    useState<AllocationAnalysisSortKey>("weight");
  const [categorySortDir, setCategorySortDir] = useState<"asc" | "desc">(
    "desc"
  );

  const handleAmcSort = (key: AllocationAnalysisSortKey) => {
    if (amcSortKey === key) {
      setAmcSortDir(amcSortDir === "asc" ? "desc" : "asc");
    } else {
      setAmcSortKey(key);
      setAmcSortDir("desc");
    }
  };

  const handleCategorySort = (key: AllocationAnalysisSortKey) => {
    if (categorySortKey === key) {
      setCategorySortDir(categorySortDir === "asc" ? "desc" : "asc");
    } else {
      setCategorySortKey(key);
      setCategorySortDir("desc");
    }
  };

  const benchmark = insights.benchmarkReturns.cagr3Y ?? 12;
  const benchmarkLabel =
    insights.benchmarkReturns.cagr3Y === null
      ? "Fallback target 12.00%"
      : `Nifty 50 3Y CAGR ${benchmark.toFixed(2)}%`;

  // Mutual Funds specific in-depth computations
  const mfHoldings = holdings.filter((h) => h.holdingType === "mutual_fund");
  const mfInvested = totals.fundsInvested;
  const mfGain = totals.fundsGain;
  const mfAbsReturn = mfInvested > 0 ? (mfGain / mfInvested) * 100 : 0;

  const previousSnapshot = insights.previousSnapshot;
  const fundsInvestedDiff = previousSnapshot?.fundsInvestedChange ?? null;
  const fundsCurrentValueDiff =
    previousSnapshot?.fundsCurrentValueChange ?? null;

  const investedDiff = formatMetricDiff(
    fundsInvestedDiff,
    "Mutual Fund cost basis",
    "text-slate-400"
  );
  const currentValueDiff = formatMetricDiff(
    fundsCurrentValueDiff,
    "Current value of MFs",
    "text-teal-400"
  );

  const mfHoldingsWithCagr = useMemo(() => {
    return mfHoldings
      .filter((h) => typeof h.cagr === "number" && h.currentValue > 0)
      .map((h) => ({
        symbol: h.symbol,
        cagr: h.cagr as number,
        currentValue: h.currentValue,
        investedValue: h.investedValue,
        unrealizedPnl: h.unrealizedPnl,
        holdingDays: h.holdingDays || 0,
        xirr: h.xirr || 0,
        benchmarkXirr: h.benchmarkXirr || 0,
      }))
      .sort((a, b) => b.cagr - a.cagr);
  }, [mfHoldings]);

  const mfWeightedCagr = useMemo(() => {
    return mfHoldingsWithCagr.length > 0
      ? mfHoldingsWithCagr.reduce(
          (sum, h) => sum + h.cagr * h.currentValue,
          0
        ) / mfHoldingsWithCagr.reduce((sum, h) => sum + h.currentValue, 0)
      : null;
  }, [mfHoldingsWithCagr]);

  const mfCagrDelta =
    mfWeightedCagr !== null ? mfWeightedCagr - benchmark : null;
  const beatsBenchmark = mfWeightedCagr !== null && mfWeightedCagr >= benchmark;

  // Beating vs Lagging Mutual Funds lists
  const beatingFunds = useMemo(() => {
    return mfHoldingsWithCagr
      .filter((h) => h.cagr >= benchmark)
      .sort((a, b) => b.cagr - a.cagr);
  }, [mfHoldingsWithCagr, benchmark]);

  const laggingFunds = useMemo(() => {
    return mfHoldingsWithCagr
      .filter((h) => h.cagr < benchmark)
      .sort((a, b) => a.cagr - b.cagr);
  }, [mfHoldingsWithCagr, benchmark]);

  // Top performer fund
  const topPerformer =
    mfHoldingsWithCagr.length > 0 ? mfHoldingsWithCagr[0] : null;

  // --- Graph-level Calculations (AMC & Category) ---
  const amcData = useMemo<AmcPoint[]>(() => {
    const amcMap = new Map<string, AllocationAnalysisGroup>();
    const totalMfCurrent = mfHoldingsWithCagr.reduce(
      (sum, h) => sum + h.currentValue,
      0
    );

    for (const h of mfHoldingsWithCagr) {
      const amcName = getAmcName(h.symbol);
      const existing = amcMap.get(amcName) || {
        name: amcName,
        invested: 0,
        current: 0,
        gain: 0,
        weightedCagrSum: 0,
        weightedHoldingDaysSum: 0,
        totalCagrWeight: 0,
        totalHoldingDaysWeight: 0,
      };

      existing.invested += h.investedValue;
      existing.current += h.currentValue;
      existing.gain += h.unrealizedPnl;

      existing.weightedCagrSum += h.cagr * h.currentValue;
      existing.totalCagrWeight += h.currentValue;

      existing.weightedHoldingDaysSum += h.holdingDays * h.currentValue;
      existing.totalHoldingDaysWeight += h.currentValue;

      amcMap.set(amcName, existing);
    }

    return mapAllocationAnalysisGroups(
      Array.from(amcMap.values()),
      totalMfCurrent
    );
  }, [mfHoldingsWithCagr]);

  const categoryData = useMemo<AmcPoint[]>(() => {
    const categoryMap = new Map<string, AllocationAnalysisGroup>();
    const totalMfCurrent = mfHoldingsWithCagr.reduce(
      (sum, h) => sum + h.currentValue,
      0
    );

    for (const h of mfHoldingsWithCagr) {
      const parentHolding = holdings.find((x) => x.symbol === h.symbol);
      const categoryName = parentHolding?.instrumentType || "Uncategorized";
      const existing = categoryMap.get(categoryName) || {
        name: categoryName,
        invested: 0,
        current: 0,
        gain: 0,
        weightedCagrSum: 0,
        weightedHoldingDaysSum: 0,
        totalCagrWeight: 0,
        totalHoldingDaysWeight: 0,
      };

      existing.invested += h.investedValue;
      existing.current += h.currentValue;
      existing.gain += h.unrealizedPnl;

      existing.weightedCagrSum += h.cagr * h.currentValue;
      existing.totalCagrWeight += h.currentValue;

      existing.weightedHoldingDaysSum += h.holdingDays * h.currentValue;
      existing.totalHoldingDaysWeight += h.currentValue;

      categoryMap.set(categoryName, existing);
    }

    return mapAllocationAnalysisGroups(
      Array.from(categoryMap.values()),
      totalMfCurrent
    );
  }, [holdings, mfHoldingsWithCagr]);

  const sortedAmcData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(amcData, amcSortKey, amcSortDir);
  }, [amcData, amcSortKey, amcSortDir]);

  const sortedCategoryData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(
      categoryData,
      categorySortKey,
      categorySortDir
    );
  }, [categoryData, categorySortKey, categorySortDir]);

  // --- Overlap Calculations ---
  const subCategoryGroups = useMemo(() => {
    const groups: Record<string, SubCategoryGroupItem[]> = {};

    for (const h of mfHoldingsWithCagr) {
      const parentHolding = holdings.find((x) => x.symbol === h.symbol);
      const name = h.symbol;
      const subCat = getOverlapSubCategory(
        name,
        parentHolding?.instrumentType || ""
      );

      if (!groups[subCat]) {
        groups[subCat] = [];
      }

      groups[subCat].push({
        schemeName: name,
        cagr: h.cagr,
        holders: ["Self"],
        totalValue: h.currentValue,
        avgHoldingDays: h.holdingDays,
      });
    }

    // Sort funds in each category by CAGR descending
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => b.cagr - a.cagr);
    }

    return groups;
  }, [mfHoldingsWithCagr, holdings]);

  const subCategoryTotals = useMemo(() => {
    const totals: Record<
      string,
      {
        totalValueSum: number;
        avgCagr: number;
        avgHoldingDays: number;
      }
    > = {};

    for (const [categoryName, schemes] of Object.entries(subCategoryGroups)) {
      if (schemes.length === 0) continue;
      const totalValueSum = schemes.reduce((sum, s) => sum + s.totalValue, 0);
      const avgCagr =
        totalValueSum > 0
          ? schemes.reduce((sum, s) => sum + s.cagr * s.totalValue, 0) /
            totalValueSum
          : 0;
      const avgHoldingDays =
        totalValueSum > 0
          ? schemes.reduce(
              (sum, s) => sum + (s.avgHoldingDays || 0) * s.totalValue,
              0
            ) / totalValueSum
          : 0;

      totals[categoryName] = {
        totalValueSum,
        avgCagr,
        avgHoldingDays,
      };
    }

    return totals;
  }, [subCategoryGroups]);

  return (
    <div className="space-y-6">
      {/* Mutual Funds Hero metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="MF Total Invested"
          value={formatCurrency(totals.fundsInvested)}
          sub={investedDiff.sub}
          subColor={investedDiff.subColor}
          icon={BriefcaseBusiness}
          accentColor="indigo"
        />
        <MetricCard
          label="MF Current Value"
          value={formatCurrency(totals.fundsCurrentValue)}
          sub={currentValueDiff.sub}
          subColor={currentValueDiff.subColor}
          icon={TrendingUp}
          accentColor="teal"
        />
        <MetricCard
          label="MF Total Gain"
          value={formatCurrency(totals.fundsGain)}
          sub={`${formatNullablePercent(mfAbsReturn)} absolute return`}
          icon={TrendingUp}
          accentColor={totals.fundsGain >= 0 ? "emerald" : "rose"}
        />
        <MetricCard
          label="MF Weighted CAGR"
          value={
            mfWeightedCagr !== null ? `${mfWeightedCagr.toFixed(2)}%` : "N/A"
          }
          sub={
            mfCagrDelta === null
              ? benchmarkLabel
              : `${formatNullablePercent(mfCagrDelta)} vs benchmark`
          }
          icon={BarChart3}
          accentColor="amber"
        />
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="border-b border-slate-800/60 flex items-center gap-6 text-sm font-bold text-slate-400 overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "amc", label: "AMC Analysis", icon: LineChart },
          { id: "category", label: "Category Allocation", icon: Layers },
          { id: "overlaps", label: "Overlaps", icon: Layers },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`py-3 relative cursor-pointer hover:text-slate-200 transition flex items-center gap-1.5 ${
              activeSubTab === tab.id ? "text-teal-400" : ""
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeSubTab === tab.id && (
              <motion.div
                layoutId="zerodhaInsightsActiveSubTab"
                className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400"
              />
            )}
          </button>
        ))}
      </div>

      {/* SUB-TAB CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {activeSubTab === "overview" && (
            <div className="space-y-6">
              {/* Balanced 2-Column Section for Benchmark comparison + Portfolio Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Benchmark beats card */}
                <section
                  className={`rounded-2xl border p-5 flex flex-col justify-between shadow-xl backdrop-blur-md transition ${
                    beatsBenchmark
                      ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30"
                      : "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30"
                  }`}
                >
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {beatsBenchmark ? (
                        <Award className="text-emerald-400" size={15} />
                      ) : (
                        <AlertTriangle className="text-amber-400" size={15} />
                      )}
                      Benchmark Comparison
                    </h3>
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 ${
                          beatsBenchmark
                            ? "border-emerald-400 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : "border-amber-400 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        }`}
                      >
                        {beatsBenchmark ? "BEAT" : "LAG"}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-100 leading-tight">
                          {beatsBenchmark
                            ? "Your Mutual Fund portfolio beats the Nifty 50."
                            : "Your Mutual Fund portfolio lags the Nifty 50 Index."}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          MF CAGR is{" "}
                          <span
                            className={`font-bold ${beatsBenchmark ? "text-emerald-400" : "text-amber-400"}`}
                          >
                            {mfWeightedCagr !== null
                              ? `${mfWeightedCagr.toFixed(2)}%`
                              : "0.00%"}
                          </span>{" "}
                          vs Nifty benchmark's{" "}
                          <span className="font-bold text-slate-300">
                            {benchmark.toFixed(2)}%
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Comparison visual bar */}
                  <div className="space-y-1.5 mt-5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Weighted Return Spread</span>
                      <span
                        className={
                          beatsBenchmark ? "text-emerald-400" : "text-amber-400"
                        }
                      >
                        {mfWeightedCagr !== null
                          ? mfWeightedCagr.toFixed(2)
                          : "0.00"}
                        % / {benchmark.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/30">
                      {/* CAGR progress fill (Green) */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, ((mfWeightedCagr || 0) / Math.max(mfWeightedCagr || 0, benchmark, 1)) * 90)}%`,
                        }}
                        transition={{ duration: 0.8 }}
                        className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 ${
                          beatsBenchmark ? "z-10" : "z-20"
                        }`}
                      />

                      {/* Benchmark target fill (Yellow/Amber) */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, (benchmark / Math.max(mfWeightedCagr || 0, benchmark, 1)) * 90)}%`,
                        }}
                        transition={{ duration: 0.8 }}
                        className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 ${
                          beatsBenchmark ? "z-20" : "z-10"
                        }`}
                      />

                      {/* Benchmark target line indicator */}
                      <motion.div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-30"
                        animate={{
                          left: `${Math.min(100, (benchmark / Math.max(mfWeightedCagr || 0, benchmark, 1)) * 90)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>MF Portfolio</span>
                      <span>Nifty Index Line</span>
                    </div>
                  </div>
                </section>

                {/* Right Column: Portfolio Summary Stats */}
                <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between shadow-xl">
                  <div>
                    <h3 className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <BriefcaseBusiness
                        size={15}
                        className="text-indigo-400"
                      />
                      Mutual Fund Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Unique Schemes
                        </p>
                        <p className="text-xl font-extrabold text-slate-100 mt-1">
                          {mfHoldings.length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Average / Scheme
                        </p>
                        <p className="text-xl font-extrabold text-slate-100 mt-1">
                          {mfHoldings.length > 0
                            ? formatCurrency(
                                totals.fundsCurrentValue / mfHoldings.length
                              )
                            : "₹0"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Top Performing Scheme
                      </p>
                      <p className="text-sm font-bold text-slate-200 mt-0.5 break-words">
                        {topPerformer ? topPerformer.symbol : "None"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {topPerformer
                        ? `${topPerformer.cagr.toFixed(2)}% CAGR`
                        : "N/A"}
                    </span>
                  </div>
                </section>
              </div>

              {/* MF CAGR Leaderboard SVG Chart */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart3 size={15} className="text-teal-400" />
                  Mutual Funds CAGR Performance
                </h3>
                {mfHoldingsWithCagr.length > 0 ? (
                  <MfLeaderboardChart
                    mfHoldings={mfHoldingsWithCagr.slice(0, 10)}
                    niftyBenchmark={benchmark}
                  />
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No Mutual Funds with CAGR history found in this snapshot.
                  </div>
                )}
              </div>

              {/* Beating vs Lagging breakdown grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Beating Nifty */}
                <section className="rounded-2xl border border-emerald-500/10 bg-slate-900/70 p-5 shadow-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-400">
                    <CheckCircle2 size={16} />
                    Outperforming Nifty ({beatingFunds.length})
                  </h3>
                  <div className="space-y-3">
                    {beatingFunds.length > 0 ? (
                      beatingFunds.map((f) => (
                        <div
                          key={f.symbol}
                          className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-200">
                              {f.symbol}
                            </p>
                            <p className="text-xs text-slate-500">
                              Gain: {formatCurrency(f.unrealizedPnl)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-black text-emerald-400">
                            {f.cagr.toFixed(2)}% CAGR
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No mutual funds beating the nifty benchmark.
                      </div>
                    )}
                  </div>
                </section>

                {/* Lagging Nifty */}
                <section className="rounded-2xl border border-rose-500/10 bg-slate-900/70 p-5 shadow-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-rose-400">
                    <AlertTriangle size={16} />
                    Underperforming Nifty ({laggingFunds.length})
                  </h3>
                  <div className="space-y-3">
                    {laggingFunds.length > 0 ? (
                      laggingFunds.map((f) => (
                        <div
                          key={f.symbol}
                          className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-200">
                              {f.symbol}
                            </p>
                            <p className="text-xs text-slate-500">
                              Gain: {formatCurrency(f.unrealizedPnl)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-black text-rose-400">
                            {f.cagr.toFixed(2)}% CAGR
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        All mutual funds outperforming the nifty benchmark.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeSubTab === "amc" && (
            <AllocationAnalysisTab
              analysisData={sortedAmcData}
              niftyBenchmark={benchmark}
              sortKey={amcSortKey}
              sortDir={amcSortDir}
              onSort={handleAmcSort}
              entityLabel="AMC"
              entityDescription="Asset Management Company (AMC)"
              title="AMC Exposure & Performance Analysis"
              downloadPrefix="zerodha_amc"
            />
          )}

          {activeSubTab === "category" && (
            <AllocationAnalysisTab
              analysisData={sortedCategoryData}
              niftyBenchmark={benchmark}
              sortKey={categorySortKey}
              sortDir={categorySortDir}
              onSort={handleCategorySort}
              entityLabel="Category"
              entityDescription="mutual fund category"
              title="Category Allocation & Performance Analysis"
              downloadPrefix="zerodha_category"
            />
          )}

          {activeSubTab === "overlaps" && (
            <div className="space-y-6">
              {/* Overlaps Header Card */}
              <div className="rounded-2xl border border-teal-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <Layers className="text-teal-400" size={18} />
                  <h2 className="text-base font-bold text-slate-100">
                    Category Overlaps & Lumpsum Priorities
                  </h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This overview groups all your mutual funds into asset
                  sub-categories. The best performing fund in each group
                  (highest CAGR) is highlighted as the{" "}
                  <strong>Lumpsum Priority choice</strong> to help consolidate
                  allocations.
                </p>
              </div>

              {/* Sub-Category Grids */}
              <div className="grid gap-6">
                {Object.entries(subCategoryGroups).map(
                  ([categoryName, schemes]) => {
                    if (schemes.length === 0) return null;
                    return (
                      <div
                        key={categoryName}
                        className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4"
                      >
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                          {categoryName} ({schemes.length} Funds)
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-800">
                            <thead>
                              <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="pb-3 pr-4">Scheme Name</th>
                                <th className="pb-3 px-4 text-right">Value</th>
                                <th className="pb-3 px-4 text-right">
                                  Holding Period
                                </th>
                                <th className="pb-3 px-4 text-right">
                                  Avg CAGR
                                </th>
                                <th className="pb-3 pl-4 text-right">
                                  Action / Recommendation
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-sm">
                              {schemes.map((s, idx) => {
                                const isWinner =
                                  idx === 0 && schemes.length > 1;
                                const isRegular =
                                  s.schemeName.toLowerCase().includes("reg") ||
                                  s.schemeName
                                    .toLowerCase()
                                    .includes("regular");

                                let recTag = "Consolidate / Switch";
                                let tagClass =
                                  "bg-slate-800/50 text-slate-400 border-slate-700/50";
                                if (isWinner) {
                                  if (s.avgHoldingDays < 365) {
                                    recTag = "🏆 Priority (Short History ⚠️)";
                                    tagClass =
                                      "bg-amber-500/15 text-amber-300 border-amber-500/25 font-semibold";
                                  } else {
                                    recTag = "🏆 Lumpsum Priority";
                                    tagClass =
                                      "bg-teal-500/15 text-teal-300 border-teal-500/20 font-bold";
                                  }
                                } else if (schemes.length === 1) {
                                  recTag = "Single Fund";
                                  tagClass =
                                    "bg-slate-800/60 text-slate-300 border-slate-700";
                                } else if (s.cagr < 8) {
                                  recTag = "Avoid / Underperforming";
                                  tagClass =
                                    "bg-rose-500/15 text-rose-400 border-rose-500/20";
                                }

                                return (
                                  <tr
                                    key={s.schemeName}
                                    className="hover:bg-slate-800/20 transition-colors"
                                  >
                                    <td
                                      className="py-3 pr-4 font-semibold text-slate-200"
                                      title={s.schemeName}
                                    >
                                      {s.schemeName}
                                      {isRegular && (
                                        <span className="text-[10px] ml-2 px-1 py-0.25 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded uppercase">
                                          Reg
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-300">
                                      {formatInrCompact(s.totalValue)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-xs text-slate-400">
                                      <div className="font-bold text-slate-200">
                                        {Math.round(
                                          s.avgHoldingDays
                                        ).toLocaleString("en-IN")}{" "}
                                        {Math.round(s.avgHoldingDays) === 1
                                          ? "day"
                                          : "days"}
                                      </div>
                                      {s.avgHoldingDays >= 30 && (
                                        <div className="text-[10px] mt-0.5 text-slate-500">
                                          {formatHoldingYearsAndDays(
                                            s.avgHoldingDays
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td
                                      className={`py-3 px-4 text-right font-bold ${
                                        s.cagr >= 15
                                          ? "text-emerald-400"
                                          : s.cagr >= 10
                                            ? "text-amber-400"
                                            : "text-rose-400"
                                      }`}
                                    >
                                      {s.cagr.toFixed(2)}%
                                    </td>
                                    <td className="py-3 pl-4 text-right">
                                      <span
                                        className={`inline-block px-2.5 py-1 text-xs border rounded-lg ${tagClass}`}
                                      >
                                        {recTag}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Total / Average Row */}
                              {(() => {
                                const totals = subCategoryTotals[categoryName];
                                if (!totals) return null;
                                return (
                                  <tr className="bg-slate-900/90 border-t-2 border-slate-800 font-bold text-slate-200">
                                    <td className="py-4 pr-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                      <div>Total / Weighted Avg</div>
                                      <div className="text-[10px] text-slate-500 font-semibold normal-case mt-0.5">
                                        {schemes.length}{" "}
                                        {schemes.length === 1
                                          ? "Fund"
                                          : "Funds"}
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-right text-teal-400 font-black text-sm">
                                      {formatInrCompact(totals.totalValueSum)}
                                    </td>
                                    <td className="py-4 px-4 text-right text-xs text-slate-300 font-bold">
                                      <div>
                                        {Math.round(
                                          totals.avgHoldingDays
                                        ).toLocaleString("en-IN")}{" "}
                                        days
                                      </div>
                                      {totals.avgHoldingDays >= 30 && (
                                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                          {formatHoldingYearsAndDays(
                                            totals.avgHoldingDays
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 text-right text-indigo-400 font-black text-sm">
                                      {totals.avgCagr.toFixed(2)}%
                                    </td>
                                    <td className="py-4 pl-4 text-right pr-4">
                                      <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 font-bold uppercase tracking-wider">
                                        Summary
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
