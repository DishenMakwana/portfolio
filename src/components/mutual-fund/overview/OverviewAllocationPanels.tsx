"use client";

import OverviewCategoryDonutPanel from "./allocation/OverviewCategoryDonutPanel";
import OverviewAmcExposurePanel from "./allocation/OverviewAmcExposurePanel";
import OverviewCapitalGainsCard from "./allocation/OverviewCapitalGainsCard";
import OverviewXirrBenchmarkCard from "./allocation/OverviewXirrBenchmarkCard";
import type { OverviewAllocationPanelsProps } from "@/types/overview";

export default function OverviewAllocationPanels({
  categoryAllocation,
  amcAllocation,
  totals,
  taxEstimate,
  metricDeltas,
}: OverviewAllocationPanelsProps) {
  const totalCurrentValue = totals.currentValue || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Category Donut */}
      <OverviewCategoryDonutPanel
        categoryAllocation={categoryAllocation}
        totalCurrentValue={totalCurrentValue}
      />

      {/* AMC Bars */}
      <OverviewAmcExposurePanel
        amcAllocation={amcAllocation}
        totalCurrentValue={totalCurrentValue}
      />

      {/* Tax + XIRR Comparison */}
      <div className="flex flex-col gap-4">
        {/* Capital Gains */}
        <OverviewCapitalGainsCard taxEstimate={taxEstimate} />

        {/* XIRR Comparison */}
        <OverviewXirrBenchmarkCard
          portfolioXirr={totals.portfolioXirr}
          benchmarkXirr={totals.benchmarkXirr}
          alpha={totals.alpha}
          metricDeltas={metricDeltas}
        />
      </div>
    </div>
  );
}
