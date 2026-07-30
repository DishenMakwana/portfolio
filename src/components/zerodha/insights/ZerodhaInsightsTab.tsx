"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Layers, LineChart } from "lucide-react";
import {
  formatMetricDiff,
  formatInrCompact,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import type { ZerodhaInsightsTabProps } from "@/types/zerodha";
import type {
  AllocationAnalysisSortKey,
  AmcPoint,
  SubCategoryGroupItem,
  AllocationAnalysisGroup,
} from "@/types/insights";
import {
  getAmcName,
  mapAllocationAnalysisGroups,
  sortAllocationAnalysisData,
  getOverlapSubCategory,
} from "@/helpers/allocation";
import AllocationAnalysisTab from "@/components/shared/AllocationAnalysisTab";
import ZerodhaCagrLeaderboardChart from "./ZerodhaCagrLeaderboardChart";
import ZerodhaInsightsHeroCards from "./ZerodhaInsightsHeroCards";
import ZerodhaInsightsBenchmarkCard from "./ZerodhaInsightsBenchmarkCard";
import ZerodhaInsightsSummaryCard from "./ZerodhaInsightsSummaryCard";
import ZerodhaInsightsOutperformersGrid from "./ZerodhaInsightsOutperformersGrid";

export default function ZerodhaInsightsTab({ data }: ZerodhaInsightsTabProps) {
  const { insights, totals, holdings } = data;

  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "amc" | "category" | "overlaps"
  >("overview");

  const [cagrAssetType, setCagrAssetType] = useState<"mutual_fund" | "equity">(
    "mutual_fund"
  );

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

  // Stocks specific in-depth computations
  const stockHoldings = useMemo(
    () => holdings.filter((h) => h.holdingType === "equity"),
    [holdings]
  );
  const stockInvested = totals.stocksInvested;
  const stockGain = totals.stocksGain;
  const stockAbsReturn =
    stockInvested > 0 ? (stockGain / stockInvested) * 100 : 0;

  const stocksInvestedDiff = previousSnapshot?.stocksInvestedChange ?? null;
  const stocksCurrentValueDiff =
    previousSnapshot?.stocksCurrentValueChange ?? null;

  const stockInvestedDiffFormatted = formatMetricDiff(
    stocksInvestedDiff,
    "Stock cost basis",
    "text-slate-400"
  );
  const stockCurrentValueDiffFormatted = formatMetricDiff(
    stocksCurrentValueDiff,
    "Current value of stocks",
    "text-teal-400"
  );

  const stockHoldingsWithCagr = useMemo(() => {
    return stockHoldings
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
  }, [stockHoldings]);

  const stockWeightedCagr = useMemo(() => {
    return stockHoldingsWithCagr.length > 0
      ? stockHoldingsWithCagr.reduce(
          (sum, h) => sum + h.cagr * h.currentValue,
          0
        ) / stockHoldingsWithCagr.reduce((sum, h) => sum + h.currentValue, 0)
      : null;
  }, [stockHoldingsWithCagr]);

  const stockCagrDelta =
    stockWeightedCagr !== null ? stockWeightedCagr - benchmark : null;
  const stockBeatsBenchmark =
    stockWeightedCagr !== null && stockWeightedCagr >= benchmark;

  const beatingStocks = useMemo(() => {
    return stockHoldingsWithCagr
      .filter((h) => h.cagr >= benchmark)
      .sort((a, b) => b.cagr - a.cagr);
  }, [stockHoldingsWithCagr, benchmark]);

  const laggingStocks = useMemo(() => {
    return stockHoldingsWithCagr
      .filter((h) => h.cagr < benchmark)
      .sort((a, b) => a.cagr - b.cagr);
  }, [stockHoldingsWithCagr, benchmark]);

  const topStockPerformer =
    stockHoldingsWithCagr.length > 0 ? stockHoldingsWithCagr[0] : null;

  // Active derived values based on selected cagrAssetType
  const activeHoldingsWithCagr =
    cagrAssetType === "mutual_fund"
      ? mfHoldingsWithCagr
      : stockHoldingsWithCagr;
  const activeWeightedCagr =
    cagrAssetType === "mutual_fund" ? mfWeightedCagr : stockWeightedCagr;
  const activeCagrDelta =
    cagrAssetType === "mutual_fund" ? mfCagrDelta : stockCagrDelta;
  const activeBeatsBenchmark =
    cagrAssetType === "mutual_fund" ? beatsBenchmark : stockBeatsBenchmark;
  const activeBeatingList =
    cagrAssetType === "mutual_fund" ? beatingFunds : beatingStocks;
  const activeLaggingList =
    cagrAssetType === "mutual_fund" ? laggingFunds : laggingStocks;
  const activeTopPerformer =
    cagrAssetType === "mutual_fund" ? topPerformer : topStockPerformer;
  const activeHoldingsCount =
    cagrAssetType === "mutual_fund" ? mfHoldings.length : stockHoldings.length;
  const activeTotalInvested =
    cagrAssetType === "mutual_fund"
      ? totals.fundsInvested
      : totals.stocksInvested;
  const activeCurrentValue =
    cagrAssetType === "mutual_fund"
      ? totals.fundsCurrentValue
      : totals.stocksCurrentValue;
  const activeTotalGain =
    cagrAssetType === "mutual_fund" ? totals.fundsGain : totals.stocksGain;
  const activeAbsReturn =
    cagrAssetType === "mutual_fund" ? mfAbsReturn : stockAbsReturn;
  const activeInvestedDiff =
    cagrAssetType === "mutual_fund" ? investedDiff : stockInvestedDiffFormatted;
  const activeCurrentValueDiff =
    cagrAssetType === "mutual_fund"
      ? currentValueDiff
      : stockCurrentValueDiffFormatted;
  const assetTypeLabel = cagrAssetType === "mutual_fund" ? "MF" : "Stock";
  const assetTypeFullLabel =
    cagrAssetType === "mutual_fund" ? "Mutual Fund" : "Stock";
  const assetTypePlural =
    cagrAssetType === "mutual_fund" ? "Mutual Funds" : "Stocks";

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
      {/* Hero metric cards with Asset View Selector */}
      <ZerodhaInsightsHeroCards
        cagrAssetType={cagrAssetType}
        setCagrAssetType={setCagrAssetType}
        mfCount={mfHoldings.length}
        stockCount={stockHoldings.length}
        activeTotalInvested={activeTotalInvested}
        activeCurrentValue={activeCurrentValue}
        activeTotalGain={activeTotalGain}
        activeAbsReturn={activeAbsReturn}
        activeWeightedCagr={activeWeightedCagr}
        activeCagrDelta={activeCagrDelta}
        activeInvestedDiff={activeInvestedDiff}
        activeCurrentValueDiff={activeCurrentValueDiff}
        benchmarkLabel={benchmarkLabel}
        assetTypeLabel={assetTypeLabel}
      />

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
                <ZerodhaInsightsBenchmarkCard
                  activeBeatsBenchmark={activeBeatsBenchmark}
                  assetTypeFullLabel={assetTypeFullLabel}
                  assetTypeLabel={assetTypeLabel}
                  activeWeightedCagr={activeWeightedCagr}
                  benchmark={benchmark}
                />

                {/* Right Column: Portfolio Summary Stats */}
                <ZerodhaInsightsSummaryCard
                  assetTypeFullLabel={assetTypeFullLabel}
                  cagrAssetType={cagrAssetType}
                  activeHoldingsCount={activeHoldingsCount}
                  activeCurrentValue={activeCurrentValue}
                  activeTopPerformer={activeTopPerformer}
                />
              </div>

              {/* CAGR Leaderboard SVG Chart with Asset Type Toggle Header */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={15} className="text-teal-400" />
                    {cagrAssetType === "mutual_fund"
                      ? "Mutual Funds CAGR Performance"
                      : "Stocks CAGR Performance"}
                  </h3>

                  {/* Toggle buttons right inside Chart Header */}
                  <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800/80 p-1 rounded-xl shadow-inner shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setCagrAssetType("mutual_fund")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition duration-200 cursor-pointer ${
                        cagrAssetType === "mutual_fund"
                          ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50 scale-105"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                      }`}
                    >
                      Mutual Funds
                    </button>
                    <button
                      onClick={() => setCagrAssetType("equity")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition duration-200 cursor-pointer ${
                        cagrAssetType === "equity"
                          ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50 scale-105"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                      }`}
                    >
                      Stocks
                    </button>
                  </div>
                </div>

                {activeHoldingsWithCagr.length > 0 ? (
                  <ZerodhaCagrLeaderboardChart
                    holdings={activeHoldingsWithCagr.slice(0, 10)}
                    niftyBenchmark={benchmark}
                    cagrAssetType={cagrAssetType}
                  />
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No {assetTypePlural} with CAGR history found in this
                    snapshot.
                  </div>
                )}
              </div>

              {/* Beating vs Lagging breakdown grid */}
              <ZerodhaInsightsOutperformersGrid
                activeBeatingList={activeBeatingList}
                activeLaggingList={activeLaggingList}
                assetTypePlural={assetTypePlural}
              />
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
