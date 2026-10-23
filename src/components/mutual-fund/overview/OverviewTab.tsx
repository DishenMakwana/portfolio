"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTableSort } from "@/helpers/useTableSort";
import {
  INVESTOR_SORT_FIELDS,
  type OverviewTabProps,
  type InvestorSortField,
} from "@/types/overview";
import CardErrorBoundary from "@/components/shared/CardErrorBoundary";
import OverviewHeroCards from "./OverviewHeroCards";
import OverviewBenchmarkCards from "./OverviewBenchmarkCards";
import OverviewAthCorrectionCards from "./OverviewAthCorrectionCards";
import OverviewAllocationPanels from "./OverviewAllocationPanels";
import OverviewMarketCapCard from "./OverviewMarketCapCard";
import OverviewMemberAndSubCategorySection from "./OverviewMemberAndSubCategorySection";

const OverviewGrowthChart = dynamic(() => import("./OverviewGrowthChart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 flex items-center justify-center text-slate-500 text-sm">
      Loading growth chart...
    </div>
  ),
});

const OverviewXirrChart = dynamic(() => import("./OverviewXirrChart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 flex items-center justify-center text-slate-500 text-sm">
      Loading XIRR chart...
    </div>
  ),
});

export default function OverviewTab({
  totals,
  metricDeltas,
  timelineData,
  categoryAllocation,
  amcAllocation,
  capAllocation,
  memberSummaries,
  holdings,
  athData,
}: OverviewTabProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const reportId = searchParams?.get("reportId");
  const reportIdParam = reportId ? `?reportId=${reportId}` : "";

  // Sort state for Investor Table with URL synchronization
  const {
    sortField: investorSortField,
    sortOrder: investorSortOrder,
    handleSort: toggleInvestorSort,
    renderSortIcon: renderInvestorSortIcon,
  } = useTableSort<InvestorSortField>({
    defaultField: "currentValue",
    defaultOrder: "desc",
    sortParamKey: "investorSort",
    orderParamKey: "investorOrder",
    allowedFields: INVESTOR_SORT_FIELDS,
  });

  const activeHoldings = useMemo(() => {
    return holdings.filter(
      (h) => (h.currentValue ?? 0) > 0 && (h.balanceUnits ?? 0) > 0.0001
    );
  }, [holdings]);

  const portfolioCagr = useMemo(() => {
    if (totals.cagr !== undefined && totals.cagr !== null) {
      return totals.cagr;
    }
    const withCagr = activeHoldings.filter(
      (h) => h.cagr !== undefined && h.cagr !== null
    );
    if (!withCagr.length || !totals.currentValue) return null;
    const weightedSum = withCagr.reduce(
      (acc, h) => acc + (h.cagr || 0) * h.currentValue,
      0
    );
    return weightedSum / totals.currentValue;
  }, [activeHoldings, totals.cagr, totals.currentValue]);

  const { topFund, worstFund } = useMemo(() => {
    if (!activeHoldings.length)
      return { topFund: undefined, worstFund: undefined };
    const sorted = [...activeHoldings].sort(
      (a, b) => b.absoluteReturn - a.absoluteReturn
    );
    return {
      topFund: sorted[0],
      worstFund: sorted[sorted.length - 1],
    };
  }, [activeHoldings]);

  const taxEstimate = useMemo(() => {
    // Calculate per-member LTCG & STCG so each active member gets their ₹1.25L Section 112A exemption
    const memberGains = new Map<string, { ltcg: number; stcg: number }>();
    for (const h of activeHoldings) {
      const mName = h.memberName?.trim() || "Default";
      const current = memberGains.get(mName) || { ltcg: 0, stcg: 0 };
      const gain = Math.max(h.gain, 0);
      if (h.holdingDays >= 365) {
        current.ltcg += gain;
      } else {
        current.stcg += gain;
      }
      memberGains.set(mName, current);
    }

    let totalLtcg = 0;
    let totalStcg = 0;
    let totalTaxableLtcg = 0;
    const memberExemption = 125000;

    for (const { ltcg, stcg } of memberGains.values()) {
      totalLtcg += ltcg;
      totalStcg += stcg;
      totalTaxableLtcg += Math.max(0, ltcg - memberExemption);
    }

    if (memberGains.size === 0) {
      totalTaxableLtcg = Math.max(0, totalLtcg - memberExemption);
    }

    return {
      ltcgEstimate: totalLtcg,
      stcgEstimate: totalStcg,
      taxableLtcg: totalTaxableLtcg,
      totalTaxEstimate: totalTaxableLtcg * 0.125 + totalStcg * 0.2,
    };
  }, [activeHoldings]);

  const diversityInsights = useMemo(() => {
    return {
      categoryCount: categoryAllocation.length,
      amcCount: amcAllocation.length,
      schemeCount: activeHoldings.length,
    };
  }, [categoryAllocation, amcAllocation, activeHoldings]);

  const activeInvested = useMemo(() => {
    return (
      activeHoldings.reduce((acc, h) => acc + (h.purchaseValue || 0), 0) ||
      totals.invested ||
      1
    );
  }, [activeHoldings, totals.invested]);

  const avgHoldingDays = useMemo(() => {
    return activeHoldings.length > 0
      ? Math.round(
          activeHoldings.reduce(
            (acc, h) => acc + (h.holdingDays || 0) * (h.purchaseValue || 0),
            0
          ) / activeInvested
        )
      : 0;
  }, [activeHoldings, activeInvested]);

  const concentrationInsights = useMemo(() => {
    const totalVal = totals.currentValue || 1;
    const topCatName = categoryAllocation[0]?.name || "—";
    const topCatVal = categoryAllocation[0]?.value || 0;
    const topAmcName = amcAllocation[0]?.name || "—";
    const topAmcVal = amcAllocation[0]?.value || 0;

    return {
      topCategory: topCatName,
      categoryPct: (topCatVal / totalVal) * 100,
      topAmc: topAmcName,
      amcPct: (topAmcVal / totalVal) * 100,
      avgDays: avgHoldingDays,
    };
  }, [totals.currentValue, categoryAllocation, amcAllocation, avgHoldingDays]);

  const benchmarkLabel = "UTI Nifty 50 Index Direct";
  const mfCagrDelta = metricDeltas.cagr;
  const cagrAlpha =
    portfolioCagr !== null && totals.benchmarkXirr !== undefined
      ? portfolioCagr - totals.benchmarkXirr
      : null;

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ROW 1: KPI Hero Cards */}
      <OverviewHeroCards
        totals={totals}
        topFund={topFund}
        worstFund={worstFund}
        insights={{ weightedCagr: portfolioCagr }}
        benchmarkLabel={benchmarkLabel}
        mfCagrDelta={mfCagrDelta}
        metricDeltas={{
          currentValueDiff: metricDeltas.currentValueDiff,
          investedDiff: metricDeltas.investedDiff,
        }}
        reportIdParam={reportIdParam}
      />

      {/* ROW 2: Benchmark & Alpha Cards */}
      <OverviewBenchmarkCards
        totals={totals}
        metricDeltas={metricDeltas}
        benchmarkLabel={benchmarkLabel}
        mfCagrDelta={mfCagrDelta}
        cagrAlpha={cagrAlpha}
        portfolioCagr={portfolioCagr}
        avgHoldingDays={avgHoldingDays}
        reportIdParam={reportIdParam}
      />

      {/* ROW 3: All-Time High (ATH) & Correction Cards */}
      {athData && (
        <OverviewAthCorrectionCards
          athData={athData}
          reportIdParam={reportIdParam}
        />
      )}

      {/* ROW 4: Growth Timeline Chart */}
      <CardErrorBoundary title="Portfolio Growth Timeline">
        <OverviewGrowthChart
          timelineData={timelineData}
          totals={totals}
          metricDeltas={metricDeltas}
        />
      </CardErrorBoundary>

      {/* ROW 5: XIRR Timeline Chart */}
      <CardErrorBoundary title="Portfolio XIRR Timeline">
        <OverviewXirrChart timelineData={timelineData} />
      </CardErrorBoundary>

      {/* ROW 6: Market Cap Distribution Breakdown (Layout 1) */}
      <OverviewMarketCapCard
        holdings={activeHoldings}
        totalCurrentValue={totals.currentValue}
        reportId={reportId ? parseInt(reportId, 10) : undefined}
      />

      {/* ROW 7: Category, AMC & Tax Allocation Panels */}
      <OverviewAllocationPanels
        categoryAllocation={categoryAllocation}
        amcAllocation={amcAllocation}
        totals={totals}
        taxEstimate={taxEstimate}
        metricDeltas={metricDeltas}
      />

      {/* ROW 6: Investor Allocation & Sub Category Breakdown Section */}
      <OverviewMemberAndSubCategorySection
        memberSummaries={memberSummaries}
        totalCurrentValue={totals.currentValue}
        capAllocation={capAllocation}
        diversityInsights={diversityInsights}
        concentrationInsights={concentrationInsights}
        topFund={topFund}
        worstFund={worstFund}
        holdings={holdings}
        sortField={investorSortField}
        sortOrder={investorSortOrder}
        toggleSort={toggleInvestorSort}
        renderSortIcon={renderInvestorSortIcon}
      />
    </motion.div>
  );
}
