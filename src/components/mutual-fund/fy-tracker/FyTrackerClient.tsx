"use client";

import { useState, useTransition, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getFyTrackerDataAction } from "@/actions/portfolio";
import { FyTrackerHeader } from "./FyTrackerHeader";
import { FyTrackerHeroCards } from "./FyTrackerHeroCards";
import { FyTrendChart } from "./chart/FyTrendChart";
import { FySinceInceptionTable } from "./tables/FySinceInceptionTable";
import { FyMovementBreakdownTable } from "./tables/FyMovementBreakdownTable";
import { FyMultiYearComparisonTable } from "./tables/FyMultiYearComparisonTable";
import type { FyTrackerClientProps, FyTrackerData } from "@/types/insights";

export default function FyTrackerClient({ initialData }: FyTrackerClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialMetric =
    (searchParams.get("metric") as "xirr" | "cagr") || "xirr";
  const [data, setData] = useState<FyTrackerData>(initialData);
  const [metric, setMetric] = useState<"xirr" | "cagr">(initialMetric);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    const m = searchParams.get("metric") as "xirr" | "cagr";
    if (m && (m === "xirr" || m === "cagr")) {
      setMetric(m);
    }
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
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
  };

  const handleMetricChange = (nextMetric: "xirr" | "cagr") => {
    setMetric(nextMetric);
    updateUrl({ metric: nextMetric === "xirr" ? null : nextMetric });
  };

  const handleFyChange = (label: string) => {
    updateUrl({ fy: label });
    startTransition(async () => {
      try {
        const freshData = await getFyTrackerDataAction(label);
        if (freshData) {
          setData(freshData);
        }
      } catch (err) {
        console.error("Failed to load FY data:", err);
      }
    });
  };

  const {
    selectedFy,
    summary,
    snapshot,
    sinceInceptionSnapshot,
    availableFys,
    comparisonRows,
    reportDate,
  } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header & FY Selector Bar ─── */}
      <FyTrackerHeader
        selectedFy={selectedFy}
        availableFys={availableFys}
        onFyChange={handleFyChange}
        isPending={isPending}
      />

      {/* ─── Top Key Metrics Cards (Matching Overview UI) ─── */}
      <FyTrackerHeroCards
        summary={summary}
        selectedFy={selectedFy}
        isPending={isPending}
      />

      {/* ─── FY Performance Trend Line Chart ─── */}
      <FyTrendChart
        comparisonRows={comparisonRows}
        metric={metric}
        onMetricChange={handleMetricChange}
      />

      {/* ─── Since Inception Movement & Asset Class Table ─── */}
      {sinceInceptionSnapshot && (
        <FySinceInceptionTable
          snapshot={sinceInceptionSnapshot}
          selectedFyEndDate={selectedFy.endDate}
          reportDate={reportDate}
        />
      )}

      {/* ─── Financial Year Movement & Asset Class Table ─── */}
      <FyMovementBreakdownTable
        snapshot={snapshot}
        selectedFy={selectedFy}
        isPending={isPending}
      />

      {/* ─── Multi-Year Historical Comparison Table ─── */}
      <FyMultiYearComparisonTable
        comparisonRows={comparisonRows}
        selectedFyLabel={selectedFy.label}
        metric={metric}
        onFyChange={handleFyChange}
      />
    </div>
  );
}
