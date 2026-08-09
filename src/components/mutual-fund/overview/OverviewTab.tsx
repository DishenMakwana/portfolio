"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { OverviewTabProps } from "@/types/overview";
import OverviewHeroCards from "./OverviewHeroCards";
import OverviewBenchmarkCards from "./OverviewBenchmarkCards";
import OverviewGrowthChart from "./OverviewGrowthChart";
import OverviewXirrChart from "./OverviewXirrChart";
import OverviewAllocationPanels from "./OverviewAllocationPanels";
import OverviewMemberAndSubCategorySection from "./OverviewMemberAndSubCategorySection";

export default function OverviewTab({
  totals,
  metricDeltas,
  timelineData,
  categoryAllocation,
  amcAllocation,
  capAllocation,
  memberSummaries,
  holdings,
}: OverviewTabProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const reportId = searchParams?.get("reportId");
  const reportIdParam = reportId ? `?reportId=${reportId}` : "";

  // Sort state for Investor Table
  const [investorSortField, setInvestorSortField] = useState<
    "name" | "invested" | "currentValue" | "gain" | "cagr" | "xirr" | "alpha"
  >("currentValue");
  const [investorSortOrder, setInvestorSortOrder] = useState<"asc" | "desc">(
    "desc"
  );

  const toggleInvestorSort = (
    field:
      "name" | "invested" | "currentValue" | "gain" | "cagr" | "xirr" | "alpha"
  ) => {
    if (investorSortField === field) {
      setInvestorSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setInvestorSortField(field);
      setInvestorSortOrder("desc");
    }
  };

  const renderInvestorSortIcon = (
    field:
      "name" | "invested" | "currentValue" | "gain" | "cagr" | "xirr" | "alpha"
  ) => {
    if (investorSortField !== field) return null;
    return investorSortOrder === "asc" ? (
      <ChevronUp size={12} className="inline ml-0.5 text-teal-400" />
    ) : (
      <ChevronDown size={12} className="inline ml-0.5 text-teal-400" />
    );
  };

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
    let ltcg = 0;
    let stcg = 0;
    for (const h of activeHoldings) {
      const gain = Math.max(h.gain, 0);
      if (h.holdingDays >= 365) {
        ltcg += gain;
      } else {
        stcg += gain;
      }
    }
    return {
      ltcgEstimate: ltcg,
      stcgEstimate: stcg,
      totalTaxEstimate: Math.max(ltcg - 125000, 0) * 0.125 + stcg * 0.2,
    };
  }, [activeHoldings]);

  const diversityInsights = useMemo(() => {
    return {
      categoryCount: categoryAllocation.length,
      amcCount: amcAllocation.length,
      schemeCount: activeHoldings.length,
    };
  }, [categoryAllocation, amcAllocation, activeHoldings]);

  const concentrationInsights = useMemo(() => {
    const totalVal = totals.currentValue || 1;
    const topCatName = categoryAllocation[0]?.name || "—";
    const topCatVal = categoryAllocation[0]?.value || 0;
    const topAmcName = amcAllocation[0]?.name || "—";
    const topAmcVal = amcAllocation[0]?.value || 0;
    const weightedDays = activeHoldings.reduce(
      (acc, h) => acc + h.holdingDays * h.currentValue,
      0
    );
    const avgDays = activeHoldings.length
      ? Math.round(weightedDays / totalVal)
      : 0;

    return {
      topCategory: topCatName,
      categoryPct: (topCatVal / totalVal) * 100,
      topAmc: topAmcName,
      amcPct: (topAmcVal / totalVal) * 100,
      avgDays,
    };
  }, [totals.currentValue, categoryAllocation, amcAllocation, activeHoldings]);

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
        reportIdParam={reportIdParam}
      />

      {/* ROW 3: Growth Timeline Chart */}
      <OverviewGrowthChart
        timelineData={timelineData}
        totals={totals}
        metricDeltas={metricDeltas}
      />

      {/* ROW 4: XIRR Timeline Chart */}
      <OverviewXirrChart timelineData={timelineData} />

      {/* ROW 5: Category, AMC & Tax Allocation Panels */}
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
