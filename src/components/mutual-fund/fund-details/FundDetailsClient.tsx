"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { globalRefreshAction } from "@/actions/portfolio";
import { fetchVroFundDataAction } from "@/actions/watchlist";
import { FundDetailsClientProps } from "@/types/fund-details";
import FundDetailsHeader from "./FundDetailsHeader";
import FundDetailsMetricCards from "./FundDetailsMetricCards";
import HistoricalReturnsChartCard from "./HistoricalReturnsChartCard";
import FactsheetPanels from "./FactsheetPanels";
import VroUrlModal from "@/components/watchlist/details/VroUrlModal";

export default function FundDetailsClient({
  holding,
  transactions,
  metrics,
  athMetrics,
  factsheetMeta,
  volatilityStats,
  chartData,
  fundNavHistory,
  benchNavHistory,
  earliestFundDateStr,
  earliestBenchDateStr,
  schemeCodeApi,
  benchmarkCode,
  holdingType,
  source,
  categoryRankingsData,
  stockFundamentalsData,
  rollingReturns,
  vroRisk,
  vroReturns,
  vroPortfolio,
  vroUrl,
  lastVroSyncedAt,
}: FundDetailsClientProps) {
  const router = useRouter();
  const [isRefreshingGlobal, setIsRefreshingGlobal] = useState(false);
  const [currentVroRisk, setCurrentVroRisk] = useState(vroRisk);
  const [currentVroReturns, setCurrentVroReturns] = useState(vroReturns);
  const [currentVroPortfolio, setCurrentVroPortfolio] = useState(vroPortfolio);
  const [currentVroUrl, setCurrentVroUrl] = useState(vroUrl);
  const [currentLastVroSyncedAt, setCurrentLastVroSyncedAt] =
    useState(lastVroSyncedAt);
  const [isRefreshingVro, setIsRefreshingVro] = useState(false);
  const [isVroModalOpen, setIsVroModalOpen] = useState(false);

  const handleSyncVro = async (customUrl?: string): Promise<void> => {
    if (isRefreshingVro) return;
    setIsRefreshingVro(true);
    try {
      const code = schemeCodeApi || holding.schemeCodeApi || "";
      const res = await fetchVroFundDataAction(
        code,
        customUrl || currentVroUrl || undefined
      );
      if (res.success && res.data) {
        setCurrentVroRisk(res.data.vroRisk || null);
        setCurrentVroReturns(res.data.vroReturns || null);
        setCurrentVroPortfolio(res.data.vroPortfolio || null);
        setCurrentLastVroSyncedAt(res.data.lastVroSyncedAt || null);
        if (res.data.vroUrl) {
          setCurrentVroUrl(res.data.vroUrl);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to sync Value Research Online data:", err);
    } finally {
      setIsRefreshingVro(false);
    }
  };

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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <FundDetailsHeader
          holding={holding}
          isStock={isStock}
          cleanCategory={cleanCategory}
          isRefreshingGlobal={isRefreshingGlobal}
          onGlobalRefresh={handleGlobalRefresh}
          onBack={() => router.back()}
          categoryRankingsData={categoryRankingsData}
        />
      </motion.div>

      {/* 2. Top Summary Metric Cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
      >
        <FundDetailsMetricCards
          holding={holding}
          metrics={metrics}
          hasHoldingDays={hasHoldingDays}
          isStock={isStock}
        />
      </motion.div>

      {/* 3. Historical Returns Analysis Section (Chart + High/Low Summary) */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16, ease: "easeOut" }}
      >
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
      </motion.div>

      {/* 4. Bottom Factsheet Panels, Excel Fields, ATH & Lumpsum, Returns & Rankings, Rolling Returns & Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.24, ease: "easeOut" }}
      >
        <FactsheetPanels
          holding={holding}
          transactions={transactions}
          athMetrics={athMetrics}
          factsheetMeta={factsheetMeta}
          currentVolatilityStats={currentVolatilityStats}
          cleanCategory={cleanCategory}
          isStock={isStock}
          isDebt={isDebt}
          categoryRankingsData={categoryRankingsData}
          schemeCodeApi={schemeCodeApi}
          stockFundamentalsData={stockFundamentalsData}
          rollingReturns={rollingReturns}
          chartData={currentChartData}
          fundNavHistory={fundNavHistory}
          benchNavHistory={benchNavHistory}
          benchmarkCode={benchmarkCode}
          vroRisk={currentVroRisk}
          vroReturns={currentVroReturns}
          vroPortfolio={currentVroPortfolio}
          vroUrl={currentVroUrl}
          lastVroSyncedAt={currentLastVroSyncedAt}
          onOpenVroModal={() => setIsVroModalOpen(true)}
          onSyncVro={() => handleSyncVro()}
          isRefreshingVro={isRefreshingVro}
        />
      </motion.div>

      {/* Value Research Online URL Modal */}
      {!isStock && (
        <VroUrlModal
          isOpen={isVroModalOpen}
          onClose={() => setIsVroModalOpen(false)}
          schemeCode={schemeCodeApi || holding.schemeCodeApi || ""}
          schemeName={holding.schemeName || "Fund"}
          currentVroUrl={currentVroUrl || undefined}
          onSync={handleSyncVro}
          isSyncing={isRefreshingVro}
        />
      )}
    </div>
  );
}
