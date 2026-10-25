"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { refreshSchemeCategoryRankingAction } from "@/actions/fundRankings";
import { calculate52WeekRange } from "@/helpers/range52Week";
import { calculateFactsheetTransactionSummary } from "@/helpers/transactions";
import type { NavPoint } from "@/types/alpha";
import type {
  FactsheetPanelsProps,
  SchemeCategoryRankingsData,
} from "@/types/fund-details";

import FactsheetSchemeProfileCard from "./FactsheetSchemeProfileCard";
import FactsheetAssetCompositionCard from "./FactsheetAssetCompositionCard";
import FactsheetMarketCapSplitCard from "./FactsheetMarketCapSplitCard";
import FactsheetGeneralMetricsAndBenchmarkCard from "./FactsheetGeneralMetricsAndBenchmarkCard";
import FactsheetTransactionMetricsCards from "./FactsheetTransactionMetricsCards";
import FactsheetTransactionHistorySection from "./FactsheetTransactionHistorySection";

import FundReturnsAndRankingsCard from "./FundReturnsAndRankingsCard";
import FundRollingReturnsCard from "./FundRollingReturnsCard";
import FundAdvancedRatiosCard from "./FundAdvancedRatiosCard";
import FundAthOpportunityCard from "./FundAthOpportunityCard";
import Range52WeekCard from "@/components/shared/Range52WeekCard";
import FundYoyReturnsCard from "./FundYoyReturnsCard";
import FundCaptureRatioCard from "@/components/shared/FundCaptureRatioCard";
import { StockInsightsPanels } from "./StockInsightsPanels";
import WatchlistVroRiskCard from "@/components/watchlist/details/WatchlistVroRiskCard";
import WatchlistVroReturnsCard from "@/components/watchlist/details/WatchlistVroReturnsCard";
import WatchlistPortfolioBreakdownCard from "@/components/watchlist/details/WatchlistPortfolioBreakdownCard";

export default function FactsheetPanels({
  holding,
  transactions,
  athMetrics,
  factsheetMeta,
  currentVolatilityStats,
  cleanCategory,
  isStock,
  categoryRankingsData,
  schemeCodeApi,
  stockFundamentalsData,
  rollingReturns,
  chartData,
  fundNavHistory,
  benchNavHistory,
  vroRisk,
  vroReturns,
  vroPortfolio,
  lastVroSyncedAt,
  onOpenVroModal,
  onSyncVro,
  isRefreshingVro,
}: FactsheetPanelsProps) {
  const router = useRouter();
  const [rankingsData, setRankingsData] =
    useState<SchemeCategoryRankingsData | null>(categoryRankingsData || null);
  const [isRefreshingMarketCap, setIsRefreshingMarketCap] = useState(false);

  useEffect(() => {
    setRankingsData(categoryRankingsData || null);
  }, [categoryRankingsData]);

  const isSif =
    Boolean(schemeCodeApi?.startsWith("SIF-")) ||
    Boolean(holding.schemeCodeApi?.startsWith("SIF-")) ||
    (holding.category || "").toLowerCase().includes("sif") ||
    (cleanCategory || "").toLowerCase().includes("sif");

  // Use true full-history NAV datasets for YoY returns calculation
  const navHistory = useMemo<NavPoint[]>(() => {
    if (fundNavHistory && fundNavHistory.length > 0) return fundNavHistory;
    if (!chartData || chartData.length === 0) return [];
    return chartData.map((p) => ({
      date: p.date,
      nav: String(p.fundNav),
    }));
  }, [fundNavHistory, chartData]);

  // Calculate 52-Week High/Low range metrics from NAV history
  const range52WeekMetrics = useMemo(() => {
    return calculate52WeekRange(
      navHistory,
      holding.currentNav,
      factsheetMeta?.profile?.launchDate ? undefined : undefined
    );
  }, [navHistory, holding.currentNav, factsheetMeta?.profile?.launchDate]);

  const benchmarkNavHistory = useMemo<NavPoint[]>(() => {
    if (benchNavHistory && benchNavHistory.length > 0) return benchNavHistory;
    if (!chartData || chartData.length === 0) return [];
    return chartData
      .filter(
        (p) => p.benchNav !== null && p.benchNav !== undefined && p.benchNav > 0
      )
      .map((p) => ({
        date: p.date,
        nav: String(p.benchNav),
      }));
  }, [benchNavHistory, chartData]);

  const handleRefreshMarketCap = async (): Promise<void> => {
    const code = schemeCodeApi || holding.schemeCodeApi || "";
    if (!code || isRefreshingMarketCap) return;
    setIsRefreshingMarketCap(true);
    const toastId = toast.loading(
      "Updating Market Cap Split from Groww & VRO..."
    );
    try {
      const [growwRes] = await Promise.allSettled([
        refreshSchemeCategoryRankingAction(code),
        onSyncVro ? onSyncVro() : Promise.resolve(),
      ]);
      if (
        growwRes.status === "fulfilled" &&
        growwRes.value?.success &&
        growwRes.value.data
      ) {
        setRankingsData(growwRes.value.data);
      }
      toast.success("Market Cap Split synced successfully!", { id: toastId });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to refresh market cap: ${msg}`, { id: toastId });
    } finally {
      setIsRefreshingMarketCap(false);
    }
  };

  // Summary totals for Buy, Sell, Stamp Duty & Realised PnL
  const txSummary = useMemo(
    () =>
      calculateFactsheetTransactionSummary(transactions, holding.purchaseValue),
    [transactions, holding.purchaseValue]
  );

  return (
    <div className="space-y-8">
      {/* DETAILED FACTSHEET PANELS */}
      {isStock ? (
        <StockInsightsPanels
          stockData={stockFundamentalsData || null}
          symbol={
            schemeCodeApi || holding.schemeCodeApi || holding.schemeName || ""
          }
          currentPrice={holding.currentNav}
          sector={holding.sector || undefined}
          marketCapCategory={holding.marketCapCategory || undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PANEL 1: SCHEME PROFILE */}
          <FactsheetSchemeProfileCard
            factsheetMeta={factsheetMeta}
            cleanCategory={cleanCategory}
            rankingsData={rankingsData}
          />

          {/* PANEL 2: ASSET COMPOSITION */}
          <FactsheetAssetCompositionCard
            factsheetMeta={factsheetMeta}
            rankingsData={rankingsData}
            vroPortfolio={vroPortfolio}
          />

          {/* PANEL 3: MARKET CAP SPLIT */}
          <FactsheetMarketCapSplitCard
            factsheetMeta={factsheetMeta}
            rankingsData={rankingsData}
            vroPortfolio={vroPortfolio}
            schemeCodeApi={schemeCodeApi}
            holdingSchemeCodeApi={holding.schemeCodeApi}
            isRefreshingVro={isRefreshingVro}
            onRefreshMarketCap={handleRefreshMarketCap}
            isRefreshingMarketCap={isRefreshingMarketCap}
          />
        </div>
      )}

      {/* COMMENTS & GENERAL METRIC TABLE */}
      <FactsheetGeneralMetricsAndBenchmarkCard
        holding={holding}
        isStock={isStock}
        factsheetMeta={factsheetMeta}
      />

      {/* ALL-TIME HIGH (ATH) & LUMPSUM OPPORTUNITY ANALYSIS */}
      {athMetrics && (
        <FundAthOpportunityCard
          athMetrics={athMetrics}
          schemeName={holding.schemeName}
          isStock={isStock}
        />
      )}

      {/* 52-WEEK PRICE & NAV RANGE ANALYSIS */}
      {range52WeekMetrics && (
        <Range52WeekCard
          metrics={range52WeekMetrics}
          schemeName={holding.schemeName}
          isStock={isStock}
        />
      )}

      {/* ADVANCED RATIOS CARD */}
      {!isStock && !isSif && (
        <FundAdvancedRatiosCard
          schemeCode={schemeCodeApi || holding.schemeCodeApi || ""}
          schemeName={holding.schemeName || "Fund"}
          categoryName={cleanCategory}
          advancedRatios={rankingsData?.advancedRatios}
          categoryRatios={rankingsData?.categoryRatios}
          volatilityStats={currentVolatilityStats}
          benchmarkName={factsheetMeta.profile.benchmarkName}
          lastScrapedAt={rankingsData?.lastScrapedAt}
          onDataUpdated={(updated) => setRankingsData(updated)}
        />
      )}

      {/* RETURNS & CATEGORY RANKINGS CARD */}
      {!isStock && !isSif && (schemeCodeApi || holding.schemeCodeApi) && (
        <FundReturnsAndRankingsCard
          schemeCode={schemeCodeApi || holding.schemeCodeApi || ""}
          schemeName={holding.schemeName || "Fund"}
          categoryName={cleanCategory}
          initialRankingsData={rankingsData}
          onDataUpdated={(updated) => setRankingsData(updated)}
        />
      )}

      {/* MARKET CAPTURE RATIOS (UPSIDE VS DOWNSIDE) */}
      {navHistory.length > 0 && benchmarkNavHistory.length > 0 && (
        <FundCaptureRatioCard
          fundNavHistory={navHistory}
          benchNavHistory={benchmarkNavHistory}
          benchmarkName={
            factsheetMeta?.profile?.benchmarkFundName ||
            factsheetMeta?.profile?.benchmarkName ||
            "Benchmark"
          }
          schemeName={holding.schemeName || (isStock ? "Stock" : "Fund")}
        />
      )}

      {/* ROLLING RETURNS & PROBABILITY CONSISTENCY ANALYSIS */}
      {rollingReturns && (
        <FundRollingReturnsCard
          rollingReturns={rollingReturns}
          holdingName={holding.schemeName}
          isStock={isStock}
        />
      )}

      {/* YEAR-OVER-YEAR (YoY) ANNUAL RETURNS */}
      {navHistory.length > 0 && (
        <FundYoyReturnsCard
          navHistory={navHistory}
          benchmarkNavHistory={benchmarkNavHistory}
          benchmarkName={
            factsheetMeta?.profile?.benchmarkFundName ||
            factsheetMeta?.profile?.benchmarkName ||
            "Benchmark"
          }
          schemeName={holding.schemeName || (isStock ? "Stock" : "Fund")}
          isStock={isStock}
        />
      )}

      {/* VALUE RESEARCH ONLINE (VRO) RISK MEASURES, RETURNS & PORTFOLIO BREAKDOWN */}
      {!isStock && (
        <>
          {!isSif && (
            <WatchlistVroRiskCard
              riskData={vroRisk}
              onOpenVroModal={onOpenVroModal}
              onSyncVro={onSyncVro}
              isRefreshingVro={isRefreshingVro}
              lastVroSyncedAt={lastVroSyncedAt}
            />
          )}
          <WatchlistVroReturnsCard
            returnsData={vroReturns}
            onOpenVroModal={onOpenVroModal}
            onSyncVro={onSyncVro}
            isRefreshingVro={isRefreshingVro}
            lastVroSyncedAt={lastVroSyncedAt}
          />
          {!isSif && (
            <WatchlistPortfolioBreakdownCard
              vroPortfolio={vroPortfolio}
              onOpenVroModal={onOpenVroModal}
              onSyncVro={onSyncVro}
              isRefreshingVro={isRefreshingVro}
              lastVroSyncedAt={lastVroSyncedAt}
            />
          )}
        </>
      )}

      {/* TRANSACTION METRIC CARDS */}
      <FactsheetTransactionMetricsCards
        txSummary={txSummary}
        balanceUnits={holding.balanceUnits}
      />

      {/* TRANSACTION HISTORY SECTION */}
      <FactsheetTransactionHistorySection
        transactions={transactions}
        holding={holding}
        isStock={isStock}
      />
    </div>
  );
}
