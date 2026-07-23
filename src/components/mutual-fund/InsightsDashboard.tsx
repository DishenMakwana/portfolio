"use client";

import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Lightbulb,
  TrendingUp,
  IndianRupee,
  BarChart3,
  Users,
  CalendarRange,
  Zap,
  Star,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Layers,
  LineChart,
} from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import DonutChart from "@/components/shared/DonutChart";
import MembersBarChart from "@/components/shared/MembersBarChart";
import {
  getAmcName,
  mapAllocationAnalysisGroups,
  sortAllocationAnalysisData,
  futureValueGrowingAnnuity,
  getOverlapSubCategory,
} from "@/helpers/allocation";
import AllocationAnalysisTab from "@/components/shared/AllocationAnalysisTab";
import {
  type Tab,
  type SortKey,
  type SortState,
  type InsightsDashboardProps,
  type CategoryOverlap,
  type SubCategoryGroupItem,
  type AmcPoint,
  type AllocationAnalysisGroup,
  type AllocationAnalysisSortKey,
  ALLOCATION_ANALYSIS_SORT_KEYS,
  CAT_PALETTE,
  FALLBACK_DOT_CLASS,
  CAT_DOT_CLASSES,
  FALLBACK_GRADIENT_CLASS,
  CAT_GRADIENT_CLASSES,
  FALLBACK_BADGE_CLASS,
  CAT_BADGE_CLASSES,
} from "@/types/insights";
import {
  formatInrCompact,
  formatPct,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";

const SCHEME_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "scheme", label: "Fund" },
  { key: "category", label: "Category" },
  { key: "invested", label: "Invested" },
  { key: "current", label: "Current" },
  { key: "gain", label: "Gain" },
  { key: "absReturn", label: "Abs %" },
  { key: "avgCagr", label: "CAGR %" },
  { key: "memberCount", label: "Members" },
];

function getAllocationAnalysisSortKey(
  rawSortKey: string | null
): AllocationAnalysisSortKey {
  return ALLOCATION_ANALYSIS_SORT_KEYS.includes(
    rawSortKey as AllocationAnalysisSortKey
  )
    ? (rawSortKey as AllocationAnalysisSortKey)
    : "current";
}

export default function InsightsDashboard({ data }: InsightsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get active tab from URL query parameters, default to "overview"
  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab =
    tabParam &&
    [
      "overview",
      "funds",
      "members",
      "sip",
      "actions",
      "overlaps",
      "amc",
      "category",
    ].includes(tabParam)
      ? tabParam
      : "overview";

  const handleTabChange = (newTab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortState>({ key: "avgCagr", dir: "desc" });
  const [stepUpPct, setStepUpPct] = useState(10);
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(
    new Set()
  );

  const toggleSchemeExpanded = (schemeName: string) => {
    const next = new Set(expandedSchemes);
    if (next.has(schemeName)) {
      next.delete(schemeName);
    } else {
      next.add(schemeName);
    }
    setExpandedSchemes(next);
  };

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "funds", label: "Funds", icon: TrendingUp },
    { id: "members", label: "Members", icon: Users },
    { id: "sip", label: "SIP Planner", icon: CalendarRange },
    { id: "actions", label: "Actions", icon: Zap },
    { id: "overlaps", label: "Overlaps", icon: Layers },
    { id: "amc", label: "AMC Analysis", icon: LineChart },
    { id: "category", label: "Category Allocation", icon: Layers },
  ];

  // Decompiled reverse engineering portfolio insights
  const reverseInsights = useMemo(() => {
    let ashokVal = 0;
    let totalMsfl = 0;
    const msflStocks: Record<string, number> = {};
    for (const h of data.msflHoldings || []) {
      const val = (h.quantity || 0) * (h.currentPrice || 0);
      totalMsfl += val;
      if (h.symbol === "ASHOKLEY") {
        ashokVal = val;
      }
      msflStocks[h.symbol] = (msflStocks[h.symbol] || 0) + val;
    }
    const ashokPct = totalMsfl > 0 ? (ashokVal / totalMsfl) * 100 : 0;

    const sortedMsfl = Object.entries(msflStocks).sort((a, b) => b[1] - a[1]);
    const top3MsflVal = sortedMsfl
      .slice(0, 3)
      .reduce((sum, s) => sum + s[1], 0);
    const top3MsflPct = totalMsfl > 0 ? (top3MsflVal / totalMsfl) * 100 : 0;

    let totalRegularVal = 0;
    for (const s of data.schemes || []) {
      const name = s.scheme.toLowerCase();
      if (
        (name.includes("reg") || name.includes("regular")) &&
        !name.includes("direct")
      ) {
        totalRegularVal += s.current;
      }
    }
    const annualDrag = totalRegularVal * 0.01;

    const overlaps: CategoryOverlap[] = [];
    const catMap: Record<string, string[]> = {};
    for (const s of data.schemes || []) {
      if (!catMap[s.category]) {
        catMap[s.category] = [];
      }
      catMap[s.category].push(s.scheme);
    }
    for (const [cat, funds] of Object.entries(catMap)) {
      if (funds.length > 1) {
        overlaps.push({
          category: cat,
          count: funds.length,
          funds,
        });
      }
    }

    let sonalbenVal = 0;
    let totalMf = 0;
    for (const s of data.schemes || []) {
      totalMf += s.current;
      for (const h of s.holdings || []) {
        if (h.memberName.toLowerCase().includes("sonalben")) {
          sonalbenVal += h.current;
        }
      }
    }
    const sonalbenPct = totalMf > 0 ? (sonalbenVal / totalMf) * 100 : 0;

    return {
      ashokPct,
      top3MsflPct,
      totalRegularVal,
      annualDrag,
      overlaps: overlaps.sort((a, b) => b.count - a.count),
      sonalbenPct,
    };
  }, [data]);

  // Group mutual funds by category for overlap analysis
  const subCategoryGroups = useMemo(() => {
    const groups: Record<string, SubCategoryGroupItem[]> = {};

    for (const s of data.schemes || []) {
      const name = s.scheme;
      const subCat = getOverlapSubCategory(name, s.category);

      if (!groups[subCat]) {
        groups[subCat] = [];
      }

      const totalValue = s.current;
      const holders = s.holdings.map((h) => h.memberName);

      // Calculate weighted average holding days
      let totalHoldingDays = 0;
      let totalHoldingWeight = 0;
      for (const h of s.holdings) {
        totalHoldingDays += (h.holdingDays || 0) * h.current;
        totalHoldingWeight += h.current;
      }
      const avgHoldingDays =
        totalHoldingWeight > 0 ? totalHoldingDays / totalHoldingWeight : 0;

      groups[subCat].push({
        schemeName: name,
        cagr: s.avgCagr,
        holders,
        totalValue,
        avgHoldingDays,
      });
    }

    // Sort funds in each category by CAGR descending
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => b.cagr - a.cagr);
    }

    return groups;
  }, [data]);

  const amcData = useMemo<AmcPoint[]>(() => {
    const amcMap = new Map<string, AllocationAnalysisGroup>();

    let totalMfCurrent = 0;

    for (const s of data.schemes || []) {
      const amcName = getAmcName(s.scheme);
      totalMfCurrent += s.current;

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

      existing.invested += s.invested;
      existing.current += s.current;
      existing.gain += s.gain;

      existing.weightedCagrSum += s.avgCagr * s.current;
      existing.totalCagrWeight += s.current;

      for (const h of s.holdings || []) {
        if (h.holdingDays) {
          existing.weightedHoldingDaysSum += h.holdingDays * h.current;
          existing.totalHoldingDaysWeight += h.current;
        }
      }

      amcMap.set(amcName, existing);
    }

    return mapAllocationAnalysisGroups(
      Array.from(amcMap.values()),
      totalMfCurrent
    );
  }, [data]);

  const categoryData = useMemo<AmcPoint[]>(() => {
    const categoryMap = new Map<string, AllocationAnalysisGroup>();

    let totalMfCurrent = 0;

    for (const s of data.schemes || []) {
      const categoryName = s.category || "Uncategorized";
      totalMfCurrent += s.current;

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

      existing.invested += s.invested;
      existing.current += s.current;
      existing.gain += s.gain;

      existing.weightedCagrSum += s.avgCagr * s.current;
      existing.totalCagrWeight += s.current;

      for (const h of s.holdings || []) {
        if (h.holdingDays) {
          existing.weightedHoldingDaysSum += h.holdingDays * h.current;
          existing.totalHoldingDaysWeight += h.current;
        }
      }

      categoryMap.set(categoryName, existing);
    }

    return mapAllocationAnalysisGroups(
      Array.from(categoryMap.values()),
      totalMfCurrent
    );
  }, [data]);

  const rawAmcSort = searchParams.get("amcSort");
  const amcSortKey = getAllocationAnalysisSortKey(rawAmcSort);

  const rawAmcOrder = searchParams.get("amcOrder");
  const amcSortDir = (
    rawAmcOrder === "asc" || rawAmcOrder === "desc" ? rawAmcOrder : "desc"
  ) as "asc" | "desc";

  const sortedAmcData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(amcData, amcSortKey, amcSortDir);
  }, [amcData, amcSortKey, amcSortDir]);

  const rawCategorySort = searchParams.get("categorySort");
  const categorySortKey = getAllocationAnalysisSortKey(rawCategorySort);

  const rawCategoryOrder = searchParams.get("categoryOrder");
  const categorySortDir = (
    rawCategoryOrder === "asc" || rawCategoryOrder === "desc"
      ? rawCategoryOrder
      : "desc"
  ) as "asc" | "desc";

  const sortedCategoryData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(
      categoryData,
      categorySortKey,
      categorySortDir
    );
  }, [categoryData, categorySortKey, categorySortDir]);

  const handleAmcSort = (key: AllocationAnalysisSortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (amcSortKey === key) {
      params.set("amcOrder", amcSortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("amcSort", key);
      params.set("amcOrder", "desc");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCategorySort = (key: AllocationAnalysisSortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categorySortKey === key) {
      params.set("categoryOrder", categorySortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("categorySort", key);
      params.set("categoryOrder", "desc");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Sorted + filtered schemes
  const filteredSchemes = useMemo(() => {
    const base =
      filterCategory === "All"
        ? data.schemes
        : filterCategory === "MF"
          ? data.schemes.filter(
              (s) =>
                !(
                  s.scheme.toLowerCase().includes("sif") ||
                  s.category.toLowerCase().includes("sif")
                )
            )
          : data.schemes.filter(
              (s) =>
                s.scheme.toLowerCase().includes("sif") ||
                s.category.toLowerCase().includes("sif")
            );
    return [...base].sort((a, b) => {
      const av = a[sort.key as keyof typeof a] as number | string;
      const bv = b[sort.key as keyof typeof b] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [data.schemes, filterCategory, sort]);

  const top5Schemes = useMemo(
    () =>
      new Set(
        [...data.schemes]
          .sort((a, b) => b.avgCagr - a.avgCagr)
          .slice(0, 5)
          .map((s) => s.scheme)
      ),
    [data.schemes]
  );

  const watchlistSchemes = useMemo(
    () =>
      new Set(data.schemes.filter((s) => s.avgCagr < 8).map((s) => s.scheme)),
    [data.schemes]
  );

  // SIP Projection
  const baseSip = data.totals.totalMonthlySip;
  const projectionRows = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const year = i + 1;
      const monthlySip = baseSip * Math.pow(1 + stepUpPct / 100, i);
      const corpus = futureValueGrowingAnnuity(baseSip, 14, stepUpPct, year);
      return {
        year,
        monthlySip: Math.round(monthlySip),
        corpus: Math.round(corpus),
      };
    });
  }, [baseSip, stepUpPct]);

  // Category palette index — dynamically mapped from module-level palette constants
  const catPaletteIndexes = useMemo(() => {
    const map: Record<string, number> = {};
    data.categoryAllocation.forEach((c, i) => {
      map[c.category] = i % CAT_PALETTE.length;
    });
    return map;
  }, [data.categoryAllocation]);

  const getCategoryPaletteIndex = (category: string): number | null =>
    catPaletteIndexes[category] ?? null;

  const getCategoryColor = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null ? "#64748b" : CAT_PALETTE[index];
  };

  const getCategoryDotClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null ? FALLBACK_DOT_CLASS : CAT_DOT_CLASSES[index];
  };

  const getCategoryGradientClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null
      ? FALLBACK_GRADIENT_CLASS
      : CAT_GRADIENT_CLASSES[index];
  };

  const getCategoryBadgeClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null ? FALLBACK_BADGE_CLASS : CAT_BADGE_CLASSES[index];
  };

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col)
      return <ChevronsUpDown size={12} className="text-slate-600" />;
    return sort.dir === "asc" ? (
      <ChevronUp size={12} className="text-teal-400" />
    ) : (
      <ChevronDown size={12} className="text-teal-400" />
    );
  }

  const weightedCagr =
    data.memberCagrs.length > 0
      ? data.memberCagrs.reduce((s, m) => s + m.cagr, 0) /
        data.memberCagrs.length
      : 0;
  const niftyBenchmark = data.benchmarkReturns.cagr3Y ?? 12;
  const hasNiftyBenchmark = data.benchmarkReturns.cagr3Y !== null;
  const benchmarkLabel = hasNiftyBenchmark
    ? `Nifty 3Y CAGR ${niftyBenchmark.toFixed(2)}%`
    : "Fallback target 12.00%";
  const benchmarkDelta = weightedCagr - niftyBenchmark;

  // Action items
  const scaleUpFunds = data.schemes.filter((s) => s.avgCagr >= 15).slice(0, 5);
  const watchlistFunds = data.schemes.filter((s) => s.avgCagr < 8);

  const actionMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, 6 + i, 1); // Jul 2026 → Jun 2027
    return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Lightbulb size={22} className="text-teal-400" />
          Investment Insights
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          As of{" "}
          <span className="text-teal-400 font-semibold">{data.reportDate}</span>{" "}
          · {data.totals.memberCount} members · {data.totals.uniqueSchemes}{" "}
          schemes
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/70 rounded-xl border border-slate-800/80 backdrop-blur-md w-fit">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                active ? "text-teal-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="tabPill"
                  className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon size={14} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Hero Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Invested"
                  value={formatInrCompact(data.totals.invested)}
                  icon={IndianRupee}
                  accentColor="indigo"
                />
                <MetricCard
                  label="Current Value"
                  value={formatInrCompact(data.totals.current)}
                  sub={`+${formatInrCompact(data.totals.gain)} gain`}
                  icon={TrendingUp}
                  accentColor="teal"
                />
                <MetricCard
                  label="Total Gain"
                  value={formatInrCompact(data.totals.gain)}
                  sub={`${formatPct(data.totals.absReturn)} absolute`}
                  icon={TrendingUp}
                  accentColor={data.totals.gain >= 0 ? "emerald" : "rose"}
                />
                <MetricCard
                  label="Weighted CAGR"
                  value={`${weightedCagr.toFixed(2)}%`}
                  sub={`${benchmarkDelta >= 0 ? "+" : ""}${benchmarkDelta.toFixed(2)}% vs benchmark`}
                  icon={BarChart3}
                  accentColor="amber"
                />
              </div>

              {/* Category Allocation + Donut */}
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                    Category Allocation
                  </h2>
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider pb-2 mb-2 border-b border-slate-800/40">
                    <span className="pl-4">Category / Fund Name</span>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span className="hidden sm:inline w-20 text-right">
                        Amount
                      </span>
                      <span className="w-24 text-right">Absolute Return</span>
                      <span className="w-16 text-right">Allocation</span>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar [scrollbar-gutter:stable]">
                    {data.categoryAllocation.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDotClass(cat.category)}`}
                            />
                            <span
                              className="font-semibold text-slate-200 truncate"
                              title={cat.category}
                            >
                              {cat.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="text-slate-500 hidden sm:inline w-20 text-right">
                              {formatInrCompact(cat.current)}
                            </span>
                            <span
                              className={`font-semibold text-xs w-24 text-right ${
                                cat.gain >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {cat.absReturn}%
                            </span>
                            <span className="font-bold text-slate-300 w-16 text-right tabular-nums">
                              {cat.allocation}%
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.allocation}%` }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            className={`h-full rounded-full ${getCategoryGradientClass(cat.category)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Donut */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 flex flex-col shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Allocation Mix
                  </h2>
                  <div className="flex justify-center">
                    <div className="w-36 h-36">
                      <DonutChart
                        slices={data.categoryAllocation.map((c) => ({
                          label: c.category,
                          value: c.allocation,
                          color: getCategoryColor(c.category),
                        }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
                    {data.categoryAllocation.map((c) => (
                      <div key={c.category} className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDotClass(c.category)}`}
                        />
                        <span
                          className="text-xs text-slate-400 truncate flex-1"
                          title={c.category}
                        >
                          {c.category}
                        </span>
                        <span className="text-xs font-semibold text-slate-300 tabular-nums shrink-0">
                          {c.allocation}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Portfolio Health + SIP Summary */}
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Health Score */}
                <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Portfolio Health Score
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-teal-400 flex items-center justify-center bg-teal-500/10">
                      <span className="text-xl font-extrabold text-teal-300">
                        B+
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-100">Good</p>
                      <p className="text-xs text-slate-400">
                        {weightedCagr.toFixed(1)}% avg CAGR vs {benchmarkLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min((weightedCagr / 20) * 100, 100)}%`,
                        }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-teal-400 font-bold">
                      {weightedCagr.toFixed(1)}% / 20%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {[
                      {
                        label: "Diversification",
                        score: data.totals.uniqueSchemes >= 20 ? "Good" : "OK",
                        ok: true,
                      },
                      {
                        label: "SIP Discipline",
                        score: "Active",
                        ok: true,
                      },
                      {
                        label: "Watchlist Items",
                        score: `${watchlistSchemes.size} funds`,
                        ok: watchlistSchemes.size <= 3,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="text-center p-2 rounded-xl bg-slate-900/50 border border-slate-800/60"
                      >
                        <p className="text-xs text-slate-500 mb-1">
                          {item.label}
                        </p>
                        <p
                          className={`text-xs font-bold ${item.ok ? "text-emerald-400" : "text-amber-400"}`}
                        >
                          {item.score}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SIP Summary */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    SIP Summary
                  </h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-100">
                      {formatInrCompact(data.totals.totalMonthlySip)}
                    </span>
                    <span className="text-slate-500 text-sm">/ month</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Active across {new Set(data.sips.map((s) => s.member)).size}{" "}
                    members · {data.sips.length} mandates
                  </p>
                  <div className="space-y-2 mt-2">
                    {Array.from(new Set(data.sips.map((s) => s.member))).map(
                      (member) => {
                        const memberSips = data.sips.filter(
                          (s) => s.member === member
                        );
                        const total = memberSips.reduce(
                          (s, m) => s + m.monthlyAmount,
                          0
                        );
                        const shortName = member.split(" ")[0];
                        return (
                          <div
                            key={member}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-400">{shortName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                {memberSips.length} SIPs
                              </span>
                              <span className="font-semibold text-teal-300">
                                {formatInrCompact(total)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FUNDS ─────────────────────────────────────────────────────────── */}
          {activeTab === "funds" && (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { key: "All", label: "All", count: data.schemes.length },
                  {
                    key: "MF",
                    label: "MF",
                    count: data.schemes.filter(
                      (s) =>
                        !(
                          s.scheme.toLowerCase().includes("sif") ||
                          s.category.toLowerCase().includes("sif")
                        )
                    ).length,
                  },
                  {
                    key: "SIF",
                    label: "SIF",
                    count: data.schemes.filter(
                      (s) =>
                        s.scheme.toLowerCase().includes("sif") ||
                        s.category.toLowerCase().includes("sif")
                    ).length,
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterCategory(item.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      filterCategory === item.key
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                        : "bg-slate-900/50 text-slate-400 border border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {item.label}
                    <span className="ml-1.5 text-xs opacity-60">
                      ({item.count})
                    </span>
                  </button>
                ))}
                <span className="ml-auto text-xs text-slate-500">
                  {filteredSchemes.length} funds
                </span>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        {SCHEME_COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
                            onClick={() => handleSort(col.key)}
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              <SortIcon col={col.key} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredSchemes.map((s, i) => {
                        const isTop = top5Schemes.has(s.scheme);
                        const isWatch = watchlistSchemes.has(s.scheme);
                        const isExpanded = expandedSchemes.has(s.scheme);
                        return (
                          <Fragment key={s.scheme}>
                            <motion.tr
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className={`transition-colors group cursor-pointer ${
                                isWatch
                                  ? "bg-rose-500/10 hover:bg-rose-500/20"
                                  : "hover:bg-slate-700/20"
                              }`}
                              onClick={() => toggleSchemeExpanded(s.scheme)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-200 truncate max-w-[280px]">
                                      {s.scheme}
                                      {isTop && (
                                        <Star
                                          size={12}
                                          className="inline ml-1 text-amber-400 fill-amber-400"
                                        />
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap border ${getCategoryBadgeClass(s.category)}`}
                                >
                                  {s.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                {formatInrCompact(s.invested)}
                              </td>
                              <td className="px-4 py-3 text-slate-200 font-mono text-xs font-semibold">
                                {formatInrCompact(s.current)}
                              </td>
                              <td className="px-4 py-3 text-emerald-400 font-mono text-xs font-semibold">
                                {formatInrCompact(s.gain)}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-300">
                                {s.absReturn.toFixed(1)}%
                              </td>
                              <td
                                className={`px-4 py-3 text-xs font-mono font-bold ${
                                  s.avgCagr >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {s.avgCagr.toFixed(2)}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSchemeExpanded(s.scheme);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer select-none ${
                                    isExpanded
                                      ? "bg-teal-500/15 border-teal-500/30 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.1)]"
                                      : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                  }`}
                                >
                                  {s.memberCount}{" "}
                                  {s.memberCount === 1 ? "member" : "members"}
                                  {s.holdings.length > s.memberCount && (
                                    <span className="text-[10px] opacity-75 font-normal ml-1">
                                      {s.holdings.length}{" "}
                                      {s.holdings.length === 1
                                        ? "folio"
                                        : "folios"}
                                    </span>
                                  )}
                                  <motion.span
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown size={11} />
                                  </motion.span>
                                </button>
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <tr
                                key={`${s.scheme}-expanded`}
                                className="bg-slate-900/40"
                              >
                                <td colSpan={8} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-6 py-4 flex flex-col gap-3.5 border-t border-slate-800/40 bg-slate-900/10">
                                      <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                                        <Users
                                          size={12}
                                          className="text-teal-400 animate-pulse"
                                        />
                                        <span>
                                          Holdings Breakdown by Family Member
                                          (Click card for details)
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {s.holdings.map((hold) => (
                                          <Link
                                            key={hold.holdingId}
                                            href={`/fund/${hold.holdingId}`}
                                            className="flex flex-col p-3.5 rounded-xl border border-slate-750 bg-slate-950/40 hover:border-teal-500/50 hover:bg-slate-950/75 transition-all duration-200 group shadow-md"
                                          >
                                            <div className="font-bold text-slate-100 group-hover:text-teal-300 transition-colors break-words text-sm sm:text-base leading-tight">
                                              {hold.memberName}
                                            </div>
                                            <div className="mt-2.5 flex items-center gap-3">
                                              <span
                                                className={`text-[10px] px-2 py-0.5 rounded font-black shrink-0 ${
                                                  (hold.cagr ?? 0) >=
                                                  niftyBenchmark
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                }`}
                                              >
                                                {hold.cagr !== null &&
                                                hold.cagr !== undefined
                                                  ? `${hold.cagr.toFixed(2)}%`
                                                  : "-"}{" "}
                                                CAGR
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                Folio: {hold.folioNo}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 mt-2.5 pt-2.5 border-t border-slate-800/50 text-xs text-slate-400">
                                              <div className="text-left">
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Invested
                                                </span>
                                                <span className="font-mono text-slate-300">
                                                  {formatInrCompact(
                                                    hold.invested
                                                  )}
                                                </span>
                                              </div>
                                              <div className="text-center">
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Current
                                                </span>
                                                <span className="font-mono text-slate-300 font-semibold">
                                                  {formatInrCompact(
                                                    hold.current
                                                  )}
                                                </span>
                                              </div>
                                              <div className="text-right">
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Gain
                                                </span>
                                                <span
                                                  className={`font-mono font-bold ${
                                                    hold.gain >= 0
                                                      ? "text-emerald-400"
                                                      : "text-rose-400"
                                                  }`}
                                                >
                                                  {formatInrCompact(hold.gain)}
                                                </span>
                                              </div>
                                            </div>
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBERS ───────────────────────────────────────────────────────── */}
          {activeTab === "members" && (
            <div className="space-y-6">
              {/* Bar Chart */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Member CAGR Leaderboard
                </h2>
                <MembersBarChart
                  memberCagrs={data.memberCagrs}
                  niftyBenchmark={niftyBenchmark}
                />
              </div>

              {/* Member Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.memberCagrs.map((m, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const medal = medals[i] ?? null;
                  const isTop = i === 0;
                  return (
                    <motion.div
                      key={m.memberName}
                      whileHover={{ y: -3 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className={`rounded-2xl border p-4 backdrop-blur-md space-y-3 relative overflow-hidden ${
                        isTop
                          ? "border-teal-500/25 bg-slate-900/75 shadow-[0_0_20px_rgba(20,184,166,0.06)]"
                          : "border-slate-800/80 bg-slate-900/70"
                      }`}
                    >
                      {isTop && (
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-slate-100 leading-tight truncate">
                            {medal} {m.memberName.split(" ")[0]}
                          </p>
                          <p className="text-xs text-slate-500 leading-normal break-words">
                            {m.memberName}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end shrink-0">
                          <span
                            className={`text-lg font-extrabold ${
                              m.cagr >= 15
                                ? "text-emerald-400"
                                : m.cagr >= niftyBenchmark
                                  ? "text-teal-400"
                                  : m.cagr >= 10
                                    ? "text-amber-400"
                                    : "text-rose-400"
                            }`}
                          >
                            {m.cagr.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      {/* Performance Comparison visual bar */}
                      <div className="space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <span>Weighted Return Spread</span>
                          <span
                            className={
                              m.cagr >= niftyBenchmark
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }
                          >
                            {m.cagr !== null ? m.cagr.toFixed(2) : "0.00"}% /{" "}
                            {niftyBenchmark.toFixed(2)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/30">
                          {/* CAGR progress fill (Green/Blue/Red) */}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, ((m.cagr || 0) / Math.max(m.cagr || 0, niftyBenchmark, 1)) * 90)}%`,
                            }}
                            transition={{ duration: 0.8 }}
                            className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r ${
                              isTop
                                ? "from-emerald-500 to-teal-400"
                                : m.cagr >= niftyBenchmark
                                  ? "from-blue-500 to-indigo-400"
                                  : "from-red-500 to-rose-400"
                            } ${m.cagr >= niftyBenchmark ? "z-10" : "z-20"}`}
                          />

                          {/* Benchmark target fill (Yellow/Amber) */}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, (niftyBenchmark / Math.max(m.cagr || 0, niftyBenchmark, 1)) * 90)}%`,
                            }}
                            transition={{ duration: 0.8 }}
                            className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 ${
                              m.cagr >= niftyBenchmark ? "z-20" : "z-10"
                            }`}
                          />

                          {/* Benchmark target line indicator */}
                          <motion.div
                            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-30"
                            animate={{
                              left: `${Math.min(100, (niftyBenchmark / Math.max(m.cagr || 0, niftyBenchmark, 1)) * 90)}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>MF Portfolio</span>
                          <span>Nifty Index Line</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {m.cagr >= niftyBenchmark ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 size={11} /> Above Nifty by{" "}
                            {(m.cagr - niftyBenchmark).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 font-medium">
                            <AlertTriangle size={11} /> Below Nifty by{" "}
                            {Math.abs(m.cagr - niftyBenchmark).toFixed(2)}%
                          </span>
                        )}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SIP PLANNER ───────────────────────────────────────────────────── */}
          {activeTab === "sip" && (
            <div className="space-y-6">
              {/* Step-Up Projection */}
              <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-5 space-y-5 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Step-Up Projection
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Annual Step-Up:{" "}
                    </span>
                    <span className="text-teal-300 font-extrabold text-lg w-12">
                      {stepUpPct}%
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={1}
                    value={stepUpPct}
                    onChange={(e) => setStepUpPct(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-teal-400 cursor-pointer"
                    id="step-up-slider"
                  />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>5%</span>
                    <span>15%</span>
                    <span>25%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Projection assumes 14% CAGR, {stepUpPct}% annual SIP step-up,
                  starting from {formatInrCompact(baseSip)}/mo
                </p>

                {/* Projection Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        {[
                          "Year",
                          "Monthly SIP",
                          "Annual SIP",
                          "Projected Corpus",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {projectionRows.map((row) => (
                        <motion.tr
                          key={row.year}
                          layout
                          className="hover:bg-slate-700/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-300">
                            Year {row.year}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-200">
                            {formatInrCompact(row.monthlySip)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">
                            {formatInrCompact(row.monthlySip * 12)}
                          </td>
                          <td className="px-4 py-3 font-bold text-teal-300">
                            {formatInrCompact(row.corpus)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIONS ───────────────────────────────────────────────────────── */}
          {activeTab === "actions" && (
            <div className="space-y-6">
              {/* Reverse Engineering & Strategic Portfolio Audit */}
              <div className="rounded-2xl border border-indigo-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-indigo-400 animate-pulse" />
                  Decompiled Portfolio Audit & Strategic Insights
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Ashok Leyland stock concentration */}
                  {reverseInsights.ashokPct > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Single-Stock Concentration
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                          High Risk
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        Ashok Leyland constitutes{" "}
                        <span className="text-rose-400 font-bold">
                          {reverseInsights.ashokPct.toFixed(1)}%
                        </span>{" "}
                        of your MSFL stock portfolio.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Top 3 stock positions in MSFL (Ashok Leyland, Reliance,
                        and NTPC) represent{" "}
                        <span className="text-slate-300 font-semibold">
                          {reverseInsights.top3MsflPct.toFixed(1)}%
                        </span>
                        . Scale back Ashok Leyland to under 15% of the account
                        to diversify sector risk.
                      </p>
                    </div>
                  )}

                  {/* Regular plan fee drag */}
                  {reverseInsights.totalRegularVal > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Expense Ratio Optimization
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                          Distributor Commission
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        You have{" "}
                        <span className="text-amber-400 font-bold">
                          {formatInrCompact(reverseInsights.totalRegularVal)}
                        </span>{" "}
                        locked in Regular Plans.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Switching to commission-free Direct Plans can save you
                        approximately{" "}
                        <span className="text-emerald-400 font-bold">
                          {formatInrCompact(reverseInsights.annualDrag)} every
                          single year
                        </span>
                        . Over 10 years compounding, this drag costs{" "}
                        <span className="text-slate-300 font-semibold">
                          ₹70 Lakhs+
                        </span>{" "}
                        in potential wealth.
                      </p>
                    </div>
                  )}

                  {/* Closet Indexing / Scheme overlaps */}
                  {reverseInsights.overlaps.length > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2 col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Closet Indexing & Scheme Redundancy
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
                          Portfolio Clutter
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        You hold multiple active schemes in overlapping
                        categories.
                      </p>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                        {reverseInsights.overlaps.slice(0, 3).map((ov) => (
                          <div
                            key={ov.category}
                            className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg"
                          >
                            <div className="flex justify-between text-xs font-bold text-slate-200">
                              <span>{ov.category}</span>
                              <span className="text-indigo-400">
                                {ov.count} Funds
                              </span>
                            </div>
                            <p
                              className="text-[10px] text-slate-500 mt-1 leading-normal truncate"
                              title={ov.funds.join(", ")}
                            >
                              {ov.funds.join(" · ")}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Consolidate these overlapping holdings. Holding 7
                        broad-market funds in identical styles dilutes active
                        outperformance and multiplies platform overhead. Keep
                        only 1 high-conviction fund per category.
                      </p>
                    </div>
                  )}

                  {/* Tax bracket optimization */}
                  {reverseInsights.sonalbenPct > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2 col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Tax Bracket Optimization
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold uppercase">
                          PAN Exposure
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        Sonalben holds{" "}
                        <span className="text-teal-400 font-bold">
                          {reverseInsights.sonalbenPct.toFixed(1)}%
                        </span>{" "}
                        of the family mutual fund assets.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        This concentrates the future capital gains tax liability
                        (12.5% LTCG) heavily under one PAN. Distribute future
                        SIP allocations or rebalanced proceeds under other
                        family members (e.g. Alpeshkumar who holds just 1.4%) to
                        utilize lower-income slabs and save tax outgo.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Scale Up */}
              <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  Scale Up — Top Performers
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scaleUpFunds.map((fund) => (
                    <motion.div
                      key={fund.scheme}
                      whileHover={{ y: -2 }}
                      className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 space-y-2 shadow-md hover:border-emerald-500/40 transition-colors"
                    >
                      <p className="text-sm font-bold text-slate-100 leading-tight">
                        {fund.scheme}
                      </p>
                      <p className="text-xs text-slate-500">{fund.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-extrabold text-lg">
                          {fund.avgCagr.toFixed(2)}%
                        </span>
                        <button
                          type="button"
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer font-semibold"
                        >
                          Increase SIP
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Watchlist */}
              <div className="rounded-2xl border border-rose-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-400" />
                  Watch List — Review These Funds
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {watchlistFunds.map((fund) => {
                    const isInsuranceLinked =
                      fund.scheme.toLowerCase().includes("lic") ||
                      fund.scheme.toLowerCase().includes("uli");
                    const isTooNew =
                      fund.avgCagr < 5 && fund.invested >= 5_00_000;
                    const tag = isInsuranceLinked
                      ? "Insurance-Linked"
                      : isTooNew
                        ? "Too New"
                        : "Underperforming";
                    const tagColor = isInsuranceLinked
                      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30";
                    return (
                      <motion.div
                        key={fund.scheme}
                        whileHover={{ y: -2 }}
                        className="rounded-xl border border-rose-500/20 bg-slate-900/60 p-4 space-y-2 shadow-md hover:border-rose-500/40 transition-colors"
                      >
                        <p className="text-sm font-bold text-slate-100 leading-tight">
                          {fund.scheme}
                        </p>
                        <p className="text-xs text-slate-500">
                          {fund.category}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-rose-400 font-extrabold text-lg">
                            {fund.avgCagr.toFixed(2)}%
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tagColor}`}
                          >
                            {tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {isInsuranceLinked
                            ? "Insurance-linked plan — consider pure equity alternatives."
                            : isTooNew
                              ? "Fund is relatively new — monitor closely."
                              : "CAGR below 8% threshold — review allocation."}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* 12-Month Action Calendar */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  12-Month Action Calendar
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {actionMonths.map((month, i) => {
                    const isQ = (i + 1) % 3 === 0;
                    const isReview = i === 5 || i === 11;
                    return (
                      <div
                        key={month}
                        className={`rounded-xl border p-3 text-center space-y-1 transition-all ${
                          isReview
                            ? "border-teal-500/30 bg-teal-500/10"
                            : isQ
                              ? "border-amber-500/20 bg-amber-500/5"
                              : "border-slate-800/60 bg-slate-900/55 hover:border-slate-700 transition-colors"
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-300">
                          {month}
                        </p>
                        <p className="text-xs text-slate-500">
                          {isReview
                            ? "📊 Review"
                            : isQ
                              ? "⚡ Step-Up"
                              : "✅ SIP"}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  📊 = Semi-annual portfolio review · ⚡ = Quarterly SIP step-up
                  check · ✅ = Regular SIP debit
                </p>
              </div>
            </div>
          )}

          {/* ── OVERLAPS ──────────────────────────────────────────────────────── */}
          {activeTab === "overlaps" && (
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
                  family allocations.
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
                                <th className="pb-3 px-4">Holders</th>
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
                                      {/* {isRegular && (
                                        <span className="text-[10px] ml-2 px-1 py-0.25 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded uppercase">
                                          Reg
                                        </span>
                                      )} */}
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 text-xs">
                                      {s.holders.join(", ")}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-300">
                                      {formatInrCompact(s.totalValue)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-xs text-slate-400">
                                      {formatHoldingYearsAndDays(
                                        s.avgHoldingDays
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-slate-100">
                                      {s.cagr.toFixed(2)}%
                                    </td>
                                    <td className="py-3 pl-4 text-right">
                                      <span
                                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${tagClass}`}
                                      >
                                        {recTag}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Total / Average Row */}
                              {schemes.length > 0 &&
                                (() => {
                                  const totalValueSum = schemes.reduce(
                                    (sum, s) => sum + s.totalValue,
                                    0
                                  );
                                  const avgCagr =
                                    totalValueSum > 0
                                      ? schemes.reduce(
                                          (sum, s) =>
                                            sum + s.cagr * s.totalValue,
                                          0
                                        ) / totalValueSum
                                      : 0;
                                  const avgHoldingDays =
                                    totalValueSum > 0
                                      ? schemes.reduce(
                                          (sum, s) =>
                                            sum +
                                            (s.avgHoldingDays || 0) *
                                              s.totalValue,
                                          0
                                        ) / totalValueSum
                                      : 0;
                                  return (
                                    <tr className="bg-slate-900/90 border-t-2 border-slate-800 font-bold text-slate-200">
                                      <td className="py-4 pr-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold pl-4">
                                        Total / Weighted Avg
                                      </td>
                                      <td className="py-4 px-4 text-xs text-slate-500 font-semibold">
                                        {schemes.length} Funds
                                      </td>
                                      <td className="py-4 px-4 text-right text-teal-400 font-black text-sm">
                                        {formatInrCompact(totalValueSum)}
                                      </td>
                                      <td className="py-4 px-4 text-right text-xs text-slate-300 font-bold">
                                        <div>
                                          {Math.round(
                                            avgHoldingDays
                                          ).toLocaleString("en-IN")}{" "}
                                          days
                                        </div>
                                        {avgHoldingDays >= 30 && (
                                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                            {formatHoldingYearsAndDays(
                                              avgHoldingDays
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-4 px-4 text-right text-indigo-400 font-black text-sm">
                                        {avgCagr.toFixed(2)}%
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

          {activeTab === "amc" && (
            <AllocationAnalysisTab
              analysisData={sortedAmcData}
              niftyBenchmark={niftyBenchmark}
              sortKey={amcSortKey}
              sortDir={amcSortDir}
              onSort={handleAmcSort}
              entityLabel="AMC"
              entityDescription="Asset Management Company (AMC)"
              title="AMC Exposure & Performance Analysis"
              downloadPrefix="amc"
            />
          )}

          {activeTab === "category" && (
            <AllocationAnalysisTab
              analysisData={sortedCategoryData}
              niftyBenchmark={niftyBenchmark}
              sortKey={categorySortKey}
              sortDir={categorySortDir}
              onSort={handleCategorySort}
              entityLabel="Category"
              entityDescription="mutual fund category"
              title="Category Allocation & Performance Analysis"
              downloadPrefix="category"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
