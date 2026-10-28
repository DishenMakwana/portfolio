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
  Sparkles,
  Scale,
  Award,
  Coins,
  ArrowLeftRight,
  Compass,
  Rocket,
  Milestone,
} from "lucide-react";
import {
  calculateAmcAllocationData,
  calculateCategoryAllocationData,
  sortAllocationAnalysisData,
  futureValueGrowingAnnuity,
} from "@/helpers/allocation";
import {
  calculateSubCategoryGroups,
  calculateSubCategoryTotals,
} from "@/helpers/overlaps";
import {
  calculateReverseInsights,
  filterScaleUpFunds,
  filterWatchlistFunds,
  filterZeroValueFunds,
  generateActionMonths,
} from "@/helpers/actions";
import OverviewTab from "@/components/mutual-fund/insights/tabs/OverviewTab";
import FundsTab from "@/components/mutual-fund/insights/tabs/FundsTab";
import CategoryAlphaTab from "@/components/mutual-fund/insights/tabs/CategoryAlphaTab";
import SwitchAdvisorTab from "@/components/mutual-fund/insights/tabs/SwitchAdvisorTab";
import PortfolioRollingTab from "@/components/mutual-fund/insights/tabs/PortfolioRollingTab";
import TaxHarvestingTab from "@/components/mutual-fund/insights/tabs/TaxHarvestingTab";
import SifInsightsTab from "@/components/mutual-fund/insights/tabs/SifInsightsTab";
import HybridFundsSection from "@/components/mutual-fund/insights/tabs/HybridFundsSection";
import MembersTab from "@/components/mutual-fund/insights/tabs/MembersTab";
import SipPlannerTab from "@/components/mutual-fund/insights/tabs/SipPlannerTab";
import ActionsTab from "@/components/mutual-fund/insights/tabs/ActionsTab";
import OverlapsTab from "@/components/mutual-fund/insights/tabs/OverlapsTab";
import AmcAnalysisTab from "@/components/mutual-fund/insights/tabs/AmcAnalysisTab";
import CategoryAnalysisTab from "@/components/mutual-fund/insights/tabs/CategoryAnalysisTab";
import SoldFundsTab from "@/components/mutual-fund/insights/tabs/SoldFundsTab";
import NiftyAnalysisClient from "@/components/mutual-fund/nifty-analysis/NiftyAnalysisClient";
import FyTrackerClient from "@/components/mutual-fund/fy-tracker/FyTrackerClient";
import FutureProjectionClient from "@/components/future-projection/FutureProjectionClient";
import JourneyTab from "@/components/mutual-fund/insights/tabs/JourneyTab";
import HeaderClient from "@/components/shared/HeaderClient";
import InsightsHeaderBanner from "@/components/mutual-fund/insights/InsightsHeaderBanner";
import { useTableSort } from "@/helpers/useTableSort";
import {
  buildCategoryPaletteIndexes,
  getCategoryColor as getCategoryColorHelper,
  getCategoryDotClass as getCategoryDotClassHelper,
  getCategoryGradientClass as getCategoryGradientClassHelper,
  getCategoryBadgeClass as getCategoryBadgeClassHelper,
  getXirrGrade,
  aggregateMemberSipTotals,
  calculateOverviewScores,
} from "@/helpers/insights";
import {
  type Tab,
  type SortKey,
  type SortState,
  type InsightsDashboardProps,
  type AmcPoint,
  type AllocationAnalysisSortKey,
  ALLOCATION_ANALYSIS_SORT_KEYS,
  type InsightsSubTabMetaItem,
} from "@/types/insights";

const INSIGHTS_SUB_TAB_META: Record<Tab, InsightsSubTabMetaItem> = {
  overview: { label: "Overview", icon: BarChart3 },
  members: { label: "Members CAGR", icon: Users },
  funds: { label: "Funds Performance", icon: TrendingUp },
  category: { label: "Category Allocation", icon: Layers },
  amc: { label: "AMC Analysis", icon: LineChart },
  "category-alpha": { label: "Category Alpha", icon: Award },
  "switch-advisor": { label: "Switch Advisor", icon: ArrowLeftRight },
  "portfolio-rolling": { label: "Portfolio Rolling Returns", icon: LineChart },
  "tax-harvesting": { label: "Tax Harvesting (LTCG / STCG)", icon: Coins },
  sold: { label: "Past Sold Funds", icon: History },
  overlaps: { label: "Category Overlaps", icon: Layers },
  actions: { label: "Action Plan", icon: Zap },
  sip: { label: "SIP Planner", icon: CalendarRange },
  "nifty-trajectory": { label: "Nifty Trajectory", icon: Compass },
  "fy-tracker": { label: "FY Investment Tracker", icon: CalendarRange },
  "future-projection": { label: "Future Projection", icon: Rocket },
  sif: { label: "SIF Strategies & Comparative Guide", icon: Sparkles },
  hybrid: { label: "Hybrid Funds Guide", icon: Scale },
  journey: { label: "Investment Journey", icon: Milestone },
};

export default function InsightsDashboard({
  data,
  niftyData,
  fyTrackerData,
  journeyData,
}: InsightsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get active tab from URL query parameters, default to "overview"
  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab: Tab =
    tabParam && tabParam in INSIGHTS_SUB_TAB_META ? tabParam : "overview";

  const currentMeta =
    INSIGHTS_SUB_TAB_META[activeTab] || INSIGHTS_SUB_TAB_META.overview;
  const MetaIcon = currentMeta.icon;

  const initialCategory = searchParams.get("category") || "All";
  const [filterCategory, setFilterCategory] = useState<string>(initialCategory);

  // Scheme table sorting with URL synchronization
  const {
    sortField: sortKey,
    sortOrder: sortDir,
    handleSort: handleSortChange,
  } = useTableSort<SortKey>({
    defaultField: "avgCagr",
    defaultOrder: "desc",
  });
  const sort = useMemo<SortState>(
    () => ({ key: sortKey, dir: sortDir }),
    [sortKey, sortDir]
  );

  const [stepUpPct, setStepUpPct] = useState(10);
  const [expectedCagr, setExpectedCagr] = useState(12);
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setFilterCategory(searchParams.get("category") || "All");
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "All") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  const handleFilterCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    updateUrl({ category: cat });
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
  const reverseInsights = useMemo(
    () =>
      calculateReverseInsights(
        data.msflHoldings || [],
        data.schemes,
        data.totals.current
      ),
    [data.msflHoldings, data.schemes, data.totals.current]
  );

  // Aggregate member total SIPs
  const memberSipTotals = useMemo(
    () => aggregateMemberSipTotals(data.sips),
    [data.sips]
  );

  // Group mutual funds by Asset Sub-Category
  const subCategoryGroups = useMemo(
    () => calculateSubCategoryGroups(data.schemes),
    [data.schemes]
  );

  // Calculate totals and weighted averages per sub-category
  const subCategoryTotals = useMemo(
    () => calculateSubCategoryTotals(subCategoryGroups),
    [subCategoryGroups]
  );

  // AMC analysis points
  const amcData = useMemo<AmcPoint[]>(() => {
    return calculateAmcAllocationData(
      data?.schemes || [],
      data?.totals?.current || 0
    );
  }, [data.schemes, data.totals.current]);

  // Category analysis points
  const categoryData = useMemo<AmcPoint[]>(() => {
    return calculateCategoryAllocationData(
      data?.schemes || [],
      data?.totals?.current || 0
    );
  }, [data.schemes, data.totals.current]);

  const {
    sortField: amcSortKey,
    sortOrder: amcSortDir,
    handleSort: handleAmcSort,
  } = useTableSort<AllocationAnalysisSortKey>({
    defaultField: "current",
    defaultOrder: "desc",
    sortParamKey: "amcSort",
    orderParamKey: "amcOrder",
    allowedFields: ALLOCATION_ANALYSIS_SORT_KEYS,
  });

  const sortedAmcData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(amcData, amcSortKey, amcSortDir);
  }, [amcData, amcSortKey, amcSortDir]);

  const {
    sortField: categorySortKey,
    sortOrder: categorySortDir,
    handleSort: handleCategorySort,
  } = useTableSort<AllocationAnalysisSortKey>({
    defaultField: "current",
    defaultOrder: "desc",
    sortParamKey: "categorySort",
    orderParamKey: "categoryOrder",
    allowedFields: ALLOCATION_ANALYSIS_SORT_KEYS,
  });

  const sortedCategoryData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(
      categoryData,
      categorySortKey,
      categorySortDir
    );
  }, [categoryData, categorySortKey, categorySortDir]);

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
      let cumulativeInvested = 0;
      for (let y = 0; y <= i; y++) {
        cumulativeInvested += baseSip * Math.pow(1 + stepUpPct / 100, y) * 12;
      }
      const monthlySip = baseSip * Math.pow(1 + stepUpPct / 100, i);
      const annualSip = monthlySip * 12;
      const corpus = futureValueGrowingAnnuity(
        baseSip,
        expectedCagr,
        stepUpPct,
        year
      );
      return {
        year,
        monthlySip: Math.round(monthlySip),
        annualSip: Math.round(annualSip),
        cumulativeInvested: Math.round(cumulativeInvested),
        corpus: Math.round(corpus),
      };
    });
  }, [baseSip, stepUpPct, expectedCagr]);

  // Category palette index — mapped across all categories (active, zero balance, sold)
  const catPaletteIndexes = useMemo(
    () =>
      buildCategoryPaletteIndexes(
        data.categoryAllocation,
        data.schemes,
        data.soldHoldings
      ),
    [data.categoryAllocation, data.schemes, data.soldHoldings]
  );

  const getCategoryColor = (category: string): string =>
    getCategoryColorHelper(category, catPaletteIndexes);

  const getCategoryDotClass = (category: string): string =>
    getCategoryDotClassHelper(category, catPaletteIndexes);

  const getCategoryGradientClass = (category: string): string =>
    getCategoryGradientClassHelper(category, catPaletteIndexes);

  const getCategoryBadgeClass = (category: string): string =>
    getCategoryBadgeClassHelper(category, catPaletteIndexes);

  const {
    weightedCagr,
    benchmarkLabel,
    benchmarkDelta,
    portfolioXirr,
    benchmarkXirr,
    xirrRating,
    cagrSubMetrics,
    xirrSubMetrics,
  } = useMemo(
    () => calculateOverviewScores(data, niftyBenchmark, watchlistSchemes.size),
    [data, niftyBenchmark, watchlistSchemes.size]
  );

  // Action items
  const scaleUpFunds = useMemo(
    () => filterScaleUpFunds(data.schemes),
    [data.schemes]
  );
  const watchlistFunds = useMemo(
    () => filterWatchlistFunds(data.schemes),
    [data.schemes]
  );
  const zeroValueFunds = useMemo(
    () => filterZeroValueFunds(data.schemes),
    [data.schemes]
  );
  const actionMonths = useMemo(() => generateActionMonths(), []);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Dynamic Top Header Bar */}
      <HeaderClient
        leftContent={
          <div className="flex items-center gap-2.5 min-w-0">
            <Lightbulb size={18} className="text-teal-400 shrink-0" />
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Investment Insights
            </span>
            <span className="text-slate-600 font-bold text-xs">/</span>
            <div className="flex items-center gap-1.5 text-xs text-teal-300 font-extrabold tracking-wider uppercase bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-md shadow-sm">
              <MetaIcon size={14} className="text-teal-400" />
              <span>{currentMeta.label}</span>
            </div>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header Banner */}
        <InsightsHeaderBanner
          reportDate={data.reportDate}
          memberCount={data.totals.memberCount}
          uniqueSchemes={data.totals.uniqueSchemes}
          icon={MetaIcon}
          title={`Investment Insights — ${currentMeta.label}`}
        />

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
                schemes={data.schemes}
                filterCategory={filterCategory}
                onFilterChange={handleFilterCategoryChange}
                sort={sort}
                onSort={handleSortChange}
                top5Schemes={top5Schemes}
                watchlistSchemes={watchlistSchemes}
                expandedSchemes={expandedSchemes}
                onToggleExpand={toggleSchemeExpanded}
                getCategoryBadgeClass={getCategoryBadgeClass}
                categoryRankingsMap={data.categoryRankingsMap}
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
                activeCount={
                  data.schemes.filter((s) => (s.current ?? 0) > 0.0001).length
                }
                notActiveCount={
                  data.schemes.filter((s) => (s.current ?? 0) <= 0.0001).length
                }
              />
            )}

            {/* ── 5Y CATEGORY ALPHA & REPLACEMENT REPORT ─────────────────────────── */}
            {activeTab === "category-alpha" && data.categoryAlphaReport && (
              <CategoryAlphaTab
                report={data.categoryAlphaReport}
                getCategoryBadgeClass={getCategoryBadgeClass}
              />
            )}

            {/* ── BENCHMARK LAGGARDS & SWITCH ADVISOR ────────────────────────────── */}
            {activeTab === "switch-advisor" && data.switchAdvisorReport && (
              <SwitchAdvisorTab
                report={data.switchAdvisorReport}
                getCategoryBadgeClass={getCategoryBadgeClass}
              />
            )}

            {/* ── MUTUAL FUND PORTFOLIO ROLLING RETURNS ─────────────────────────── */}
            {activeTab === "portfolio-rolling" && (
              <PortfolioRollingTab
                rollingReturns={data.portfolioRollingReturns}
              />
            )}

            {/* ── TAX HARVESTING (LTCG / STCG) ─────────────────────────────────── */}
            {activeTab === "tax-harvesting" && (
              <TaxHarvestingTab summary={data.taxHarvesting} />
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
                expectedCagr={expectedCagr}
                onCagrChange={setExpectedCagr}
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
                schemes={data.schemes}
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
                schemes={data.schemes}
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

            {/* ── SIF INSIGHTS & COMPARATIVE GUIDE ──────────────────────────────── */}
            {activeTab === "sif" && <SifInsightsTab data={data} />}

            {/* ── HYBRID FUNDS GUIDE ────────────────────────────────────────────── */}
            {activeTab === "hybrid" && <HybridFundsSection />}

            {/* ── NIFTY TRAJECTORY ──────────────────────────────────────────────── */}
            {activeTab === "nifty-trajectory" &&
              (niftyData ? (
                <NiftyAnalysisClient data={niftyData} />
              ) : (
                <div className="flex items-center justify-center min-h-[300px] text-slate-400 font-medium">
                  Loading Nifty Trajectory...
                </div>
              ))}

            {/* ── FY INVESTMENT TRACKER ─────────────────────────────────────────── */}
            {activeTab === "fy-tracker" &&
              (fyTrackerData ? (
                <FyTrackerClient initialData={fyTrackerData} />
              ) : (
                <div className="flex items-center justify-center min-h-[300px] text-slate-400 font-medium">
                  Loading FY Investment Tracker...
                </div>
              ))}

            {/* ── FUTURE PROJECTION ─────────────────────────────────────────────── */}
            {activeTab === "future-projection" && (
              <FutureProjectionClient
                initialPortfolioValue={data.totals.current || 0}
                initialInvestedCapital={data.totals.invested || 0}
                initialMonthlySip={data.totals.totalMonthlySip || 0}
                initialXirr={
                  data.totals.portfolioXirr || data.totals.portfolioCagr || 12
                }
              />
            )}

            {/* ── INVESTMENT JOURNEY ────────────────────────────────────────────── */}
            {activeTab === "journey" && (
              <JourneyTab initialData={journeyData} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
