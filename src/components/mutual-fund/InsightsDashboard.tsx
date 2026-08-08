"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Lightbulb,
  BarChart3,
  TrendingUp,
  Users,
  CalendarRange,
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
  CAT_DOT_CLASSES,
  CAT_GRADIENT_CLASSES,
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

const INSIGHTS_SUB_TAB_META: Record<
  Tab,
  { label: string; icon: React.ElementType }
> = {
  overview: { label: "Overview", icon: BarChart3 },
  funds: { label: "Funds Performance", icon: TrendingUp },
  members: { label: "Members CAGR", icon: Users },
  sip: { label: "SIP Planner", icon: CalendarRange },
  actions: { label: "Action Plan", icon: Zap },
  overlaps: { label: "Category Overlaps", icon: Layers },
  amc: { label: "AMC Analysis", icon: LineChart },
  category: { label: "Category Allocation", icon: Layers },
  sold: { label: "Past Sold Funds", icon: History },
};

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
      "sold",
    ].includes(tabParam)
      ? tabParam
      : "overview";

  const currentMeta =
    INSIGHTS_SUB_TAB_META[activeTab] || INSIGHTS_SUB_TAB_META.overview;
  const MetaIcon = currentMeta.icon;

  const initialCategory = searchParams.get("category") || "All";
  const initialSortKey = (searchParams.get("sort") as SortKey) || "avgCagr";
  const initialSortDir =
    (searchParams.get("order") as "asc" | "desc") || "desc";

  const [filterCategory, setFilterCategory] = useState<string>(initialCategory);
  const [sort, setSort] = useState<SortState>({
    key: initialSortKey,
    dir: initialSortDir,
  });
  const [stepUpPct, setStepUpPct] = useState(10);
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setFilterCategory(searchParams.get("category") || "All");
    const sKey = (searchParams.get("sort") as SortKey) || "avgCagr";
    const sDir = (searchParams.get("order") as "asc" | "desc") || "desc";
    setSort({ key: sKey, dir: sDir });
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "All") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleFilterCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    updateUrl({ category: cat });
  };

  const handleSortChange = (key: SortKey) => {
    let dir: "asc" | "desc" = "desc";
    if (sort.key === key) {
      dir = sort.dir === "asc" ? "desc" : "asc";
    }
    const nextSort = { key, dir };
    setSort(nextSort);
    updateUrl({ sort: key, order: dir });
  };

  const toggleSchemeExpanded = (schemeName: string) => {
    const next = new Set(expandedSchemes);
    if (next.has(schemeName)) {
      next.delete(schemeName);
    } else {
      next.add(schemeName);
    }
    setExpandedSchemes(next);
  };

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
  // For the Members leaderboard CAGR filter: point-to-point Nifty CAGR from
  // the family's first investment date to today (not a fixed 3Y window).
  const membersBenchmarkCagr =
    data.totals.benchmarkCagrSinceInception ?? niftyBenchmark;

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

  // Category palette index — mapped across all categories (active, zero balance, sold)
  const catPaletteIndexes = useMemo(() => {
    const map: Record<string, number> = {};
    let currentIndex = 0;

    // 1. Index active categories from categoryAllocation
    data.categoryAllocation.forEach((c) => {
      if (c.category && map[c.category] === undefined) {
        map[c.category] = currentIndex % CAT_PALETTE.length;
        currentIndex++;
      }
    });

    // 2. Index categories from schemes (includes zero balance funds)
    data.schemes.forEach((s) => {
      if (s.category && map[s.category] === undefined) {
        map[s.category] = currentIndex % CAT_PALETTE.length;
        currentIndex++;
      }
    });

    // 3. Index categories from soldHoldings
    data.soldHoldings?.forEach((s) => {
      if (s.schemeCategory && map[s.schemeCategory] === undefined) {
        map[s.schemeCategory] = currentIndex % CAT_PALETTE.length;
        currentIndex++;
      }
    });

    return map;
  }, [data.categoryAllocation, data.schemes, data.soldHoldings]);

  const getCategoryPaletteIndex = (category: string): number => {
    if (catPaletteIndexes[category] !== undefined) {
      return catPaletteIndexes[category];
    }
    // Deterministic string hash fallback so no category ever falls back to plain gray
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = (hash << 5) - hash + category.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % CAT_PALETTE.length;
  };

  const getCategoryColor = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return CAT_PALETTE[index];
  };

  const getCategoryDotClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return CAT_DOT_CLASSES[index];
  };

  const getCategoryGradientClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return CAT_GRADIENT_CLASSES[index];
  };

  const getCategoryBadgeClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return CAT_BADGE_CLASSES[index];
  };

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
  const scaleUpFunds = data.schemes
    .filter((s) => s.current > 0 && s.avgCagr >= 15)
    .slice(0, 5);
  const watchlistFunds = data.schemes.filter(
    (s) => s.current > 0 && s.avgCagr < 8
  );
  const zeroValueFunds = data.schemes.filter(
    (s) => s.current <= 0 || s.invested <= 0
  );

  const actionMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, 6 + i, 1); // Jul 2026 → Jun 2027
    return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Dynamic Top Header Bar */}
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb size={16} className="text-teal-400" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Investment Insights
          </span>
          <span className="text-slate-600 font-bold text-xs">/</span>
          <div className="flex items-center gap-1.5 text-xs text-teal-300 font-extrabold tracking-wider uppercase bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-md shadow-sm">
            <MetaIcon size={13} className="text-teal-400" />
            <span>{currentMeta.label}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header Banner */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <MetaIcon size={22} className="text-teal-400" />
            Investment Insights — {currentMeta.label}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            As of{" "}
            <span className="text-teal-400 font-semibold">
              {data.reportDate}
            </span>{" "}
            · {data.totals.memberCount} members · {data.totals.uniqueSchemes}{" "}
            schemes
          </p>
        </div>

        {/* Tab Content Panels (Full Width - Navigated via AppSidebar Tree) */}
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

            {/* ── FUNDS ─────────────────────────────────────────────────────────── */}
            {activeTab === "funds" && (
              <FundsTab
                schemes={filteredSchemes}
                filterCategory={filterCategory}
                onFilterChange={handleFilterCategoryChange}
                sort={sort}
                onSort={handleSortChange}
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
                niftyBenchmark={membersBenchmarkCagr}
                benchmarkXirr={benchmarkXirr}
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
                zeroValueFunds={zeroValueFunds}
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
    </div>
  );
}
