"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { globalRefreshAction } from "@/actions/portfolio";
import { FundDetailsClientProps } from "@/types/fund-details";
import FundDetailsHeader from "./FundDetailsHeader";
import FundDetailsMetricCards from "./FundDetailsMetricCards";
import HistoricalReturnsChartCard from "./HistoricalReturnsChartCard";
import FactsheetPanels from "./FactsheetPanels";

export default function FundDetailsClient({
  holding,
  transactions,
  metrics,
  factsheetMeta,
  volatilityStats,
  chartData,
  earliestFundDateStr,
  earliestBenchDateStr,
  schemeCodeApi,
  benchmarkCode,
  holdingType,
  source,
}: FundDetailsClientProps) {
  const router = useRouter();
  const [isRefreshingGlobal, setIsRefreshingGlobal] = useState(false);

  const handleGlobalRefresh = async (): Promise<void> => {
    if (isRefreshingGlobal) return;
    setIsRefreshingGlobal(true);
    try {
      const res = await globalRefreshAction();
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to refresh global cache:", err);
    } finally {
      setIsRefreshingGlobal(false);
    }
  };

  const isStock = holding.holdingType === "equity";
  const cleanCategory = holding.category || "N/A";
  const hasHoldingDays =
    Number.isFinite(holding.holdingDays) && holding.holdingDays > 0;
  const isDebt = (holding.category || "").toLowerCase().includes("debt");
  const cat = (holding.category || "").toLowerCase();
  const isApproximateProxy =
    cat.includes("multi asset") ||
    cat.includes("sif") ||
    cat.includes("specialised");

  const currentVolatilityStats = volatilityStats || {
    alpha: metrics.alpha,
    sharpe: 0,
    sortino: 0,
    beta: 1.0,
    stdDev: 0,
    mean: 0,
    ytm: 0,
    modifiedDuration: 0,
    avgMaturity: 0,
  };

  const currentChartData = chartData || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Header Bar */}
      <FundDetailsHeader
        holding={holding}
        isStock={isStock}
        cleanCategory={cleanCategory}
        isRefreshingGlobal={isRefreshingGlobal}
        onGlobalRefresh={handleGlobalRefresh}
        onBack={() => router.back()}
      />

      {/* 2. Top Summary Metric Cards */}
      <FundDetailsMetricCards
        holding={holding}
        metrics={metrics}
        hasHoldingDays={hasHoldingDays}
        isStock={isStock}
      />

      {/* 3. Historical Returns Analysis Section (Chart + High/Low Summary) */}
      <HistoricalReturnsChartCard
        holding={holding}
        transactions={transactions}
        factsheetMeta={factsheetMeta}
        currentChartData={currentChartData}
        earliestFundDateStr={earliestFundDateStr}
        earliestBenchDateStr={earliestBenchDateStr}
        isStock={isStock}
        isApproximateProxy={isApproximateProxy}
        schemeCodeApi={schemeCodeApi}
        benchmarkCode={benchmarkCode}
        holdingType={holdingType}
        source={source}
      />

      {/* 4. Bottom Factsheet Panels & Transaction History */}
      <FactsheetPanels
        holding={holding}
        transactions={transactions}
        factsheetMeta={factsheetMeta}
        currentVolatilityStats={currentVolatilityStats}
        cleanCategory={cleanCategory}
        isStock={isStock}
        isDebt={isDebt}
      />
    </div>
  );
}
