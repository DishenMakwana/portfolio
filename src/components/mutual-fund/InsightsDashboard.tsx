"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Lightbulb,
  TrendingUp,
  BarChart3,
  Users,
  CalendarRange,
  CalendarDays,
  Zap,
  Layers,
  LineChart,
  History,
} from "lucide-react";
import {
  getAmcName,
  mapAllocationAnalysisGroups,
  sortAllocationAnalysisData,
  futureValueGrowingAnnuity,
  getOverlapSubCategory,
} from "@/helpers/allocation";
import OverviewTab from "@/components/mutual-fund/insights/tabs/OverviewTab";
import FinancialYearSnapshotTab from "@/components/mutual-fund/insights/tabs/FinancialYearSnapshotTab";
import FundsTab from "@/components/mutual-fund/insights/tabs/FundsTab";
import MembersTab from "@/components/mutual-fund/insights/tabs/MembersTab";
import SipPlannerTab from "@/components/mutual-fund/insights/tabs/SipPlannerTab";
import ActionsTab from "@/components/mutual-fund/insights/tabs/ActionsTab";
import OverlapsTab from "@/components/mutual-fund/insights/tabs/OverlapsTab";
import AmcAnalysisTab from "@/components/mutual-fund/insights/tabs/AmcAnalysisTab";
import CategoryAnalysisTab from "@/components/mutual-fund/insights/tabs/CategoryAnalysisTab";
import SoldFundsTab from "@/components/mutual-fund/insights/tabs/SoldFundsTab";
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
  type SubMetricItem,
  ALLOCATION_ANALYSIS_SORT_KEYS,
  CAT_PALETTE,
  FALLBACK_DOT_CLASS,
  CAT_DOT_CLASSES,
  FALLBACK_GRADIENT_CLASS,
  CAT_GRADIENT_CLASSES,
  FALLBACK_BADGE_CLASS,
  CAT_BADGE_CLASSES,
} from "@/types/insights";

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
      "fy-snapshot",
      "funds",
      "members",
      "sip",
      "actions",
      "overlaps",
      "amc",
      "category",
      "sold",
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
    { id: "fy-snapshot", label: "FY Snapshot", icon: CalendarDays },
    { id: "funds", label: "Funds", icon: TrendingUp },
    { id: "members", label: "Members", icon: Users },
    { id: "sip", label: "SIP Planner", icon: CalendarRange },
    { id: "actions", label: "Actions", icon: Zap },
    { id: "overlaps", label: "Overlaps", icon: Layers },
    { id: "amc", label: "AMC Analysis", icon: LineChart },
    { id: "category", label: "Category Allocation", icon: Layers },
    { id: "sold", label: "Past Sold Funds", icon: History },
  ];

  // Decompiled reverse engineering portfolio insights
  const reverseInsights = useMemo(() => {
    let ashokVal = 0;
    let totalMsfl = 0;
    const msflStocks: Record<string, number> = {};
    for (const h of data.msflHoldings || []) {
      const val = (h.quantity || 0) * (h.currentPrice || 0);
      totalMsfl += val;
      if (
        h.symbol.toLowerCase().includes("ashokley") ||
        h.symbol.toLowerCase().includes("ashok")
      ) {
        ashokVal += val;
      }
      msflStocks[h.symbol] = (msflStocks[h.symbol] || 0) + val;
    }

    const sortedMsflStocks = Object.entries(msflStocks).sort(
      (a, b) => b[1] - a[1]
    );
    const top3Val = sortedMsflStocks.slice(0, 3).reduce((s, [, v]) => s + v, 0);

    let totalRegularVal = 0;
    const catMap: Record<string, string[]> = {};

    for (const s of data.schemes) {
      if (
        s.scheme.toLowerCase().includes("reg") ||
        s.scheme.toLowerCase().includes("regular")
      ) {
        totalRegularVal += s.current;
      }

      if (!catMap[s.category]) catMap[s.category] = [];
      catMap[s.category].push(s.scheme);
    }

    const overlaps: CategoryOverlap[] = [];
    for (const [cat, funds] of Object.entries(catMap)) {
      if (funds.length > 1) {
        overlaps.push({ category: cat, count: funds.length, funds });
      }
    }
    overlaps.sort((a, b) => b.count - a.count);

    let sonalbenCurrent = 0;
    for (const s of data.schemes) {
      for (const h of s.holdings) {
        if (h.memberName.toLowerCase().includes("sonal")) {
          sonalbenCurrent += h.current;
        }
      }
    }
    const sonalbenPct =
      data.totals.current > 0
        ? (sonalbenCurrent / data.totals.current) * 100
        : 0;
    const ashokPct = totalMsfl > 0 ? (ashokVal / totalMsfl) * 100 : 0;
    const top3MsflPct = totalMsfl > 0 ? (top3Val / totalMsfl) * 100 : 0;
    const annualDrag = totalRegularVal * 0.01;

    return {
      ashokPct,
      top3MsflPct,
      totalRegularVal,
      annualDrag,
      overlaps,
      sonalbenPct,
    };
  }, [data.msflHoldings, data.schemes, data.totals.current]);

  // Aggregate member total SIPs
  const memberSipTotals = useMemo(() => {
    const map: Record<string, { sipsCount: number; totalAmount: number }> = {};
    for (const sip of data.sips) {
      if (!map[sip.member]) {
        map[sip.member] = { sipsCount: 0, totalAmount: 0 };
      }
      map[sip.member].sipsCount += 1;
      map[sip.member].totalAmount += sip.monthlyAmount;
    }
    return map;
  }, [data.sips]);

  // Group mutual funds by Asset Sub-Category
  const subCategoryGroups = useMemo(() => {
    const groups: Record<string, SubCategoryGroupItem[]> = {};

    for (const s of data.schemes) {
      const subCat = getOverlapSubCategory(s.scheme, s.category);
      if (!groups[subCat]) {
        groups[subCat] = [];
      }

      const holders = Array.from(new Set(s.holdings.map((h) => h.memberName)));
      let weightedDaysSum = 0;
      let totalInvested = 0;
      for (const h of s.holdings) {
        weightedDaysSum += (h.holdingDays || 0) * (h.current || 0);
        totalInvested += h.current || 0;
      }
      const avgHoldingDays =
        totalInvested > 0 ? weightedDaysSum / totalInvested : 0;

      groups[subCat].push({
        schemeName: s.scheme,
        cagr: s.avgCagr,
        holders,
        totalValue: s.current,
        avgHoldingDays,
      });
    }

    for (const catName of Object.keys(groups)) {
      groups[catName].sort((a, b) => b.cagr - a.cagr);
    }

    return groups;
  }, [data.schemes]);

  // Calculate totals and weighted averages per sub-category
  const subCategoryTotals = useMemo(() => {
    const totals: Record<
      string,
      {
        totalValueSum: number;
        avgHoldingDays: number;
        avgCagr: number;
      }
    > = {};

    for (const [catName, schemes] of Object.entries(subCategoryGroups)) {
      let totalVal = 0;
      let weightedDays = 0;
      let weightedCagr = 0;

      for (const s of schemes) {
        totalVal += s.totalValue;
        weightedDays += s.avgHoldingDays * s.totalValue;
        weightedCagr += s.cagr * s.totalValue;
      }

      totals[catName] = {
        totalValueSum: totalVal,
        avgHoldingDays: totalVal > 0 ? weightedDays / totalVal : 0,
        avgCagr: totalVal > 0 ? weightedCagr / totalVal : 0,
      };
    }

    return totals;
  }, [subCategoryGroups]);

  // AMC analysis points
  const amcData = useMemo<AmcPoint[]>(() => {
    const schemes = data?.schemes || [];
    const totalCurrent = data?.totals?.current || 0;
    const rawMap: Record<
      string,
      {
        invested: number;
        current: number;
        gain: number;
        weightedCagrSum: number;
        weightedHoldingDaysSum: number;
        totalCagrWeight: number;
        totalHoldingDaysWeight: number;
      }
    > = {};

    schemes.forEach((s) => {
      const name = getAmcName(s.scheme);
      if (!rawMap[name]) {
        rawMap[name] = {
          invested: 0,
          current: 0,
          gain: 0,
          weightedCagrSum: 0,
          weightedHoldingDaysSum: 0,
          totalCagrWeight: 0,
          totalHoldingDaysWeight: 0,
        };
      }

      rawMap[name].invested += s.invested || 0;
      rawMap[name].current += s.current || 0;
      rawMap[name].gain += s.gain || 0;

      (s.holdings || []).forEach((h) => {
        const weight = h.current > 0 ? h.current : h.invested;
        if (weight > 0) {
          rawMap[name].weightedCagrSum += (h.cagr || 0) * weight;
          rawMap[name].totalCagrWeight += weight;

          rawMap[name].weightedHoldingDaysSum += (h.holdingDays || 0) * weight;
          rawMap[name].totalHoldingDaysWeight += weight;
        }
      });
    });

    const groups: AllocationAnalysisGroup[] = Object.entries(rawMap).map(
      ([name, item]) => ({
        name,
        ...item,
      })
    );

    return mapAllocationAnalysisGroups(groups, totalCurrent);
  }, [data.schemes, data.totals.current]);

  // Category analysis points
  const categoryData = useMemo<AmcPoint[]>(() => {
    const schemes = data?.schemes || [];
    const totalCurrent = data?.totals?.current || 0;
    const rawMap: Record<
      string,
      {
        invested: number;
        current: number;
        gain: number;
        weightedCagrSum: number;
        weightedHoldingDaysSum: number;
        totalCagrWeight: number;
        totalHoldingDaysWeight: number;
      }
    > = {};

    schemes.forEach((s) => {
      const name = s.category;
      if (!rawMap[name]) {
        rawMap[name] = {
          invested: 0,
          current: 0,
          gain: 0,
          weightedCagrSum: 0,
          weightedHoldingDaysSum: 0,
          totalCagrWeight: 0,
          totalHoldingDaysWeight: 0,
        };
      }

      rawMap[name].invested += s.invested || 0;
      rawMap[name].current += s.current || 0;
      rawMap[name].gain += s.gain || 0;

      (s.holdings || []).forEach((h) => {
        const weight = h.current > 0 ? h.current : h.invested;
        if (weight > 0) {
          rawMap[name].weightedCagrSum += (h.cagr || 0) * weight;
          rawMap[name].totalCagrWeight += weight;

          rawMap[name].weightedHoldingDaysSum += (h.holdingDays || 0) * weight;
          rawMap[name].totalHoldingDaysWeight += weight;
        }
      });
    });

    const groups: AllocationAnalysisGroup[] = Object.entries(rawMap).map(
      ([name, item]) => ({
        name,
        ...item,
      })
    );

    return mapAllocationAnalysisGroups(groups, totalCurrent);
  }, [data.schemes, data.totals.current]);

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

  const niftyBenchmark = data.benchmarkReturns.cagr3Y ?? 12;

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
      new Set(
        data.schemes
          .filter(
            (s) =>
              ((s.invested ?? 0) > 0 || (s.current ?? 0) > 0) &&
              s.avgCagr < niftyBenchmark
          )
          .map((s) => s.scheme)
      ),
    [data.schemes, niftyBenchmark]
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

  const weightedCagr =
    data.memberCagrs.length > 0
      ? data.memberCagrs.reduce((s, m) => s + m.cagr, 0) /
        data.memberCagrs.length
      : 0;
  const hasNiftyBenchmark = data.benchmarkReturns.cagr3Y !== null;
  const benchmarkLabel = hasNiftyBenchmark
    ? `Nifty 3Y CAGR ${niftyBenchmark.toFixed(2)}%`
    : "Fallback target 12.00%";
  const benchmarkDelta = weightedCagr - niftyBenchmark;

  const portfolioXirr = data.totals.portfolioXirr ?? 0;
  const benchmarkXirr = data.totals.benchmarkXirr ?? 0;
  const xirrAlpha = portfolioXirr - benchmarkXirr;

  const getXirrGrade = (val: number) => {
    if (val >= 15) return { grade: "A", text: "Excellent" };
    if (val >= 12) return { grade: "B+", text: "Good" };
    if (val >= 8) return { grade: "B", text: "Average" };
    return { grade: "C", text: "Below Average" };
  };
  const xirrRating = getXirrGrade(portfolioXirr);

  const cagrSubMetrics: SubMetricItem[] = [
    {
      label: "Diversification",
      score: data.totals.uniqueSchemes >= 20 ? "Good" : "OK",
      ok: true,
    },
    {
      label: "Outperformance",
      score: `${benchmarkDelta >= 0 ? "+" : ""}${benchmarkDelta.toFixed(1)}%`,
      ok: benchmarkDelta >= 0,
    },
    {
      label: "Watchlist Items",
      score: `${watchlistSchemes.size} funds`,
      ok: watchlistSchemes.size <= 3,
    },
  ];

  const xirrSubMetrics: SubMetricItem[] = [
    {
      label: "Outperformance",
      score: `${xirrAlpha >= 0 ? "+" : ""}${xirrAlpha.toFixed(1)}%`,
      ok: xirrAlpha >= 0,
    },
    {
      label: "Benchmark",
      score: "UTI Nifty 50",
      ok: true,
    },
    {
      label: "XIRR Status",
      score: portfolioXirr >= 12 ? "Healthy" : "Weak",
      ok: portfolioXirr >= 12,
    },
  ];

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

      {/* Navigation Tab Bar */}
      <div className="w-full overflow-x-auto no-scrollbar scroll-smooth py-1">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-850 backdrop-blur-md min-w-max shadow-inner">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer select-none ${
                  active
                    ? "text-emerald-400 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/30 rounded-xl"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <tab.icon
                  size={15}
                  className={`relative z-10 ${
                    active ? "text-emerald-400" : "text-slate-400"
                  }`}
                />
                <span className="relative z-10 whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
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
            <OverviewTab
              data={data}
              weightedCagr={weightedCagr}
              benchmarkDelta={benchmarkDelta}
              benchmarkLabel={benchmarkLabel}
              portfolioXirr={portfolioXirr}
              benchmarkXirr={benchmarkXirr}
              xirrRating={xirrRating}
              cagrSubMetrics={cagrSubMetrics}
              xirrSubMetrics={xirrSubMetrics}
              memberSipTotals={memberSipTotals}
              getCategoryDotClass={getCategoryDotClass}
              getCategoryGradientClass={getCategoryGradientClass}
              getCategoryColor={getCategoryColor}
              getXirrGrade={getXirrGrade}
            />
          )}

          {/* ── FY SNAPSHOT ──────────────────────────────────────────────────── */}
          {activeTab === "fy-snapshot" && (
            <FinancialYearSnapshotTab
              snapshot={data.currentFinancialYearSnapshot}
            />
          )}

          {/* ── FUNDS ─────────────────────────────────────────────────────────── */}
          {activeTab === "funds" && (
            <FundsTab
              schemes={filteredSchemes}
              filterCategory={filterCategory}
              onFilterChange={setFilterCategory}
              sort={sort}
              onSort={handleSort}
              top5Schemes={top5Schemes}
              watchlistSchemes={watchlistSchemes}
              expandedSchemes={expandedSchemes}
              onToggleExpand={toggleSchemeExpanded}
              getCategoryBadgeClass={getCategoryBadgeClass}
              niftyBenchmark={niftyBenchmark}
              totalCount={data.schemes.length}
              mfCount={
                data.schemes.filter(
                  (s) =>
                    !(
                      s.scheme.toLowerCase().includes("sif") ||
                      s.category.toLowerCase().includes("sif")
                    )
                ).length
              }
              sifCount={
                data.schemes.filter(
                  (s) =>
                    s.scheme.toLowerCase().includes("sif") ||
                    s.category.toLowerCase().includes("sif")
                ).length
              }
            />
          )}

          {/* ── MEMBERS ───────────────────────────────────────────────────────── */}
          {activeTab === "members" && (
            <MembersTab
              memberCagrs={data.memberCagrs}
              niftyBenchmark={niftyBenchmark}
            />
          )}

          {/* ── SIP PLANNER ───────────────────────────────────────────────────── */}
          {activeTab === "sip" && (
            <SipPlannerTab
              baseSip={baseSip}
              projectionRows={projectionRows}
              stepUpPct={stepUpPct}
              onStepUpChange={setStepUpPct}
            />
          )}

          {/* ── ACTIONS ───────────────────────────────────────────────────────── */}
          {activeTab === "actions" && (
            <ActionsTab
              scaleUpFunds={scaleUpFunds}
              watchlistFunds={watchlistFunds}
              actionMonths={actionMonths}
              reverseInsights={reverseInsights}
            />
          )}

          {/* ── OVERLAPS ──────────────────────────────────────────────────────── */}
          {activeTab === "overlaps" && (
            <OverlapsTab
              subCategoryGroups={subCategoryGroups}
              subCategoryTotals={subCategoryTotals}
            />
          )}

          {/* ── AMC ANALYSIS ──────────────────────────────────────────────────── */}
          {activeTab === "amc" && (
            <AmcAnalysisTab
              analysisData={sortedAmcData}
              niftyBenchmark={niftyBenchmark}
              sortKey={amcSortKey}
              sortDir={amcSortDir}
              onSort={handleAmcSort}
            />
          )}

          {/* ── CATEGORY ALLOCATION ────────────────────────────────────────────── */}
          {activeTab === "category" && (
            <CategoryAnalysisTab
              analysisData={sortedCategoryData}
              niftyBenchmark={niftyBenchmark}
              sortKey={categorySortKey}
              sortDir={categorySortDir}
              onSort={handleCategorySort}
            />
          )}

          {/* ── PAST SOLD FUNDS ────────────────────────────────────────────────── */}
          {activeTab === "sold" && (
            <SoldFundsTab
              soldHoldings={data.soldHoldings || []}
              partiallySoldHoldings={data.partiallySoldHoldings || []}
              getCategoryDotClass={getCategoryDotClass}
              getCategoryBadgeClass={getCategoryBadgeClass}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
