"use client";

import { useMemo } from "react";
import { useTableSort } from "@/helpers/useTableSort";
import {
  CATEGORY_PERFORMANCE_SORT_FIELDS,
  type CategoryPerformanceSortField,
  type OverviewMemberAndSubCategorySectionProps,
  type OverviewCategoryAggregateItem,
} from "@/types/overview";
import OverviewInvestorAllocationTable from "./insights/OverviewInvestorAllocationTable";
import OverviewPortfolioHealthCard from "./insights/OverviewPortfolioHealthCard";
import OverviewCategoryBreakdownTable from "./insights/OverviewCategoryBreakdownTable";
import OverviewCategoryStructureCard from "./insights/OverviewCategoryStructureCard";

export default function OverviewMemberAndSubCategorySection({
  memberSummaries,
  totalCurrentValue,
  capAllocation,
  diversityInsights,
  concentrationInsights,
  topFund,
  worstFund,
  holdings = [],
  sortField,
  sortOrder,
  toggleSort,
  renderSortIcon,
}: OverviewMemberAndSubCategorySectionProps) {
  const {
    sortField: catSortField,
    sortOrder: catSortOrder,
    handleSort: toggleCatSort,
    renderSortIcon: renderCatSortIcon,
  } = useTableSort<CategoryPerformanceSortField>({
    defaultField: "value",
    defaultOrder: "desc",
    sortParamKey: "catSort",
    orderParamKey: "catOrder",
    allowedFields: CATEGORY_PERFORMANCE_SORT_FIELDS,
  });

  const sortedMembers = [...memberSummaries].sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "invested") {
      comparison = a.invested - b.invested;
    } else if (sortField === "currentValue") {
      comparison = a.currentValue - b.currentValue;
    } else if (sortField === "gain") {
      comparison = a.gain - b.gain;
    } else if (sortField === "cagr") {
      comparison = a.cagr - b.cagr;
    } else if (sortField === "xirr") {
      comparison = a.xirr - b.xirr;
    } else if (sortField === "alpha") {
      comparison = a.alpha - b.alpha;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const categoryPerformance = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];
    const catMap: Record<string, OverviewCategoryAggregateItem> = {};
    for (const h of holdings) {
      const catName = h.category || "Uncategorized";
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, invested: 0, value: 0, gain: 0 };
      }
      catMap[catName].invested += h.purchaseValue || 0;
      catMap[catName].value += h.currentValue || 0;
      catMap[catName].gain += h.gain || 0;
    }
    const list = Object.values(catMap).map((c) => ({
      name: c.name,
      invested: c.invested,
      value: c.value,
      gain: c.gain,
      absReturn: c.invested > 0 ? (c.gain / c.invested) * 100 : 0,
    }));
    return list.sort((a, b) => b.absReturn - a.absReturn);
  }, [holdings]);

  const categoryPerfMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoryPerformance) {
      map.set(c.name, c.absReturn);
    }
    return map;
  }, [categoryPerformance]);

  const sortedSubCats = useMemo(() => {
    return [...capAllocation].sort((a, b) => {
      let comparison = 0;
      if (catSortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (catSortField === "value") {
        comparison = a.value - b.value;
      } else if (catSortField === "absReturn") {
        const retA = categoryPerfMap.get(a.name) ?? -Infinity;
        const retB = categoryPerfMap.get(b.name) ?? -Infinity;
        comparison = retA - retB;
      }
      return catSortOrder === "asc" ? comparison : -comparison;
    });
  }, [capAllocation, catSortField, catSortOrder, categoryPerfMap]);

  const topMember = [...memberSummaries].sort(
    (a, b) => b.currentValue - a.currentValue
  )[0];
  const topMemberPct =
    topMember && totalCurrentValue > 0
      ? (topMember.currentValue / totalCurrentValue) * 100
      : 0;

  const topCategoryPerf = categoryPerformance[0] || null;
  const worstCategoryPerf =
    categoryPerformance.length > 1
      ? categoryPerformance[categoryPerformance.length - 1]
      : null;

  const fundCount = diversityInsights.schemeCount;
  const status =
    fundCount <= 5
      ? "Under-diversified"
      : fundCount <= 15
        ? "Optimal Mix"
        : "Over-diversified";
  const statusColor =
    fundCount <= 5
      ? "text-amber-400"
      : fundCount <= 15
        ? "text-emerald-400"
        : "text-blue-400";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* Column 1 (Left): Investor Allocation Table + Portfolio Insights */}
      <div className="space-y-5">
        <OverviewInvestorAllocationTable
          sortedMembers={sortedMembers}
          totalCurrentValue={totalCurrentValue}
          toggleSort={toggleSort}
          renderSortIcon={renderSortIcon}
        />
        <OverviewPortfolioHealthCard
          fundCount={fundCount}
          status={status}
          statusColor={statusColor}
          concentrationInsights={concentrationInsights}
          topFund={topFund}
          worstFund={worstFund}
        />
      </div>

      {/* Column 2 (Right): Category Allocation Breakdown */}
      <div className="space-y-5">
        <OverviewCategoryBreakdownTable
          sortedSubCats={sortedSubCats}
          totalCurrentValue={totalCurrentValue}
          categoryPerfMap={categoryPerfMap}
          toggleCatSort={toggleCatSort}
          renderCatSortIcon={renderCatSortIcon}
        />
        <OverviewCategoryStructureCard
          diversityInsights={diversityInsights}
          topMember={topMember}
          topMemberPct={topMemberPct}
          topCategoryPerf={topCategoryPerf}
          worstCategoryPerf={worstCategoryPerf}
        />
      </div>
    </div>
  );
}
