"use client";

import { useState, useMemo } from "react";
import { refreshSchemeCategoryRankingAction } from "@/actions/fundRankings";
import { fetchVroFundDataAction } from "@/actions/watchlist";
import WatchlistDetailsHeader from "./WatchlistDetailsHeader";
import WatchlistVroRiskCard from "./WatchlistVroRiskCard";
import WatchlistVroReturnsCard from "./WatchlistVroReturnsCard";
import WatchlistPortfolioBreakdownCard from "./WatchlistPortfolioBreakdownCard";
import WatchlistAthOpportunityCard from "./WatchlistAthOpportunityCard";
import WatchlistPerformanceChartCard from "./WatchlistPerformanceChartCard";
import WatchlistSchemeProfilePanels from "./WatchlistSchemeProfilePanels";
import FundAdvancedRatiosCard from "@/components/mutual-fund/fund-details/FundAdvancedRatiosCard";
import FundRollingReturnsCard from "@/components/mutual-fund/fund-details/FundRollingReturnsCard";
import FundYoyReturnsCard from "@/components/mutual-fund/fund-details/FundYoyReturnsCard";
import VroUrlModal from "./VroUrlModal";
import type { SchemeCategoryRankingsData } from "@/types/fund-details";
import type { VolatilityMeasures } from "@/types/portfolio";
import type {
  WatchlistAdvancedRatios,
  WatchlistDetailsClientProps,
  WatchlistFundDetails,
} from "@/types/watchlist";

export default function WatchlistDetailsClient({
  initialFund,
}: WatchlistDetailsClientProps) {
  const [fund, setFund] = useState<WatchlistFundDetails>(initialFund);
  const [isRefreshingGroww, setIsRefreshingGroww] = useState(false);
  const [isRefreshingVro, setIsRefreshingVro] = useState(false);
  const [isVroModalOpen, setIsVroModalOpen] = useState(false);

  // Handle updated rankings / ratios data
  const handleRankingsUpdated = (updated: SchemeCategoryRankingsData) => {
    setFund((prev) => ({
      ...prev,
      growwSlug: updated.growwSlug || prev.growwSlug,
      marketCap: updated.marketCap || prev.marketCap,
      assetAllocation: updated.assetAllocation || prev.assetAllocation,
      exitLoadTax: updated.exitLoadTax || prev.exitLoadTax,
      advancedRatios:
        (updated.advancedRatios as WatchlistAdvancedRatios) ||
        prev.advancedRatios,
      categoryRatios: updated.categoryRatios || prev.categoryRatios,
      lastGrowwSyncedAt: updated.lastScrapedAt || prev.lastGrowwSyncedAt,
      rankings:
        updated.annualised?.horizons?.map((h) => ({
          horizon: h,
          fundReturn: updated.annualised?.fundReturns?.[h] || "--",
          categoryAvg: updated.annualised?.categoryAvg?.[h] || "--",
          categoryRank: updated.annualised?.categoryRank?.[h] || "--",
        })) || prev.rankings,
    }));
  };

  // Refresh Groww analytics (rankings, ratios, market cap)
  const handleRefreshGroww = async () => {
    if (isRefreshingGroww) return;
    setIsRefreshingGroww(true);
    try {
      const res = await refreshSchemeCategoryRankingAction(fund.schemeCode);
      if (res.success && res.data) {
        handleRankingsUpdated(res.data);
      }
    } catch (err) {
      console.error("Error refreshing Groww analytics:", err);
    } finally {
      setIsRefreshingGroww(false);
    }
  };

  // Sync Value Research Online data
  const handleSyncVro = async (vroUrl?: string) => {
    setIsRefreshingVro(true);
    try {
      const res = await fetchVroFundDataAction(fund.schemeCode, vroUrl);
      if (res.success && res.data) {
        setFund(res.data);
      }
    } catch (err) {
      console.error("Error syncing Value Research Online:", err);
    } finally {
      setIsRefreshingVro(false);
    }
  };

  const volatilityStats: VolatilityMeasures = useMemo(
    () => ({
      alpha: fund.advancedRatios?.alpha ?? 0,
      beta: fund.advancedRatios?.beta ?? 1,
      sharpe: fund.advancedRatios?.sharpe ?? 0,
      sortino: fund.advancedRatios?.sortino ?? 0,
      stdDev: fund.advancedRatios?.stdDev ?? 0,
      mean: 0,
      ytm: 0,
      modifiedDuration: 0,
      avgMaturity: 0,
      peRatio: fund.advancedRatios?.peRatio ?? undefined,
      pbRatio: fund.advancedRatios?.pbRatio ?? undefined,
      rSquared: fund.advancedRatios?.rSquared ?? undefined,
    }),
    [fund.advancedRatios]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Details Header (Minimalist & Focused) */}
      <WatchlistDetailsHeader
        fund={fund}
        onRefreshGroww={handleRefreshGroww}
        isRefreshingGroww={isRefreshingGroww}
      />

      {/* 2. Historical Returns Analysis & NAV Performance Trajectory Chart (with Benchmark) */}
      <WatchlistPerformanceChartCard fund={fund} />

      {/* 3. Scheme Profile, Equity/Debt/Cash & Market Cap Split Triad */}
      <WatchlistSchemeProfilePanels
        fund={fund}
        onRefreshGroww={handleRefreshGroww}
        isRefreshingGroww={isRefreshingGroww}
        onSyncVro={() => handleSyncVro()}
        isRefreshingVro={isRefreshingVro}
      />

      {/* 4. ATH Drawdown & Lumpsum Opportunity Analysis */}
      <WatchlistAthOpportunityCard fund={fund} />

      {/* 5. Advanced Ratios Card */}
      <FundAdvancedRatiosCard
        schemeCode={fund.schemeCode}
        schemeName={fund.schemeName}
        categoryName={fund.category || undefined}
        advancedRatios={fund.advancedRatios}
        categoryRatios={fund.categoryRatios}
        volatilityStats={volatilityStats}
        benchmarkName={fund.benchmarkName || "Benchmark"}
        lastScrapedAt={fund.lastGrowwSyncedAt || undefined}
        onDataUpdated={handleRankingsUpdated}
      />

      {/* 6. Rolling Returns Analysis & Rolling Return Probability & Consistency Matrix */}
      {fund.rollingReturns && (
        <FundRollingReturnsCard
          rollingReturns={fund.rollingReturns}
          holdingName={fund.schemeName}
          isStock={false}
        />
      )}

      {/* 7. Year-on-Year (YoY) Annual Returns */}
      {fund.navHistory && fund.navHistory.length > 0 && (
        <FundYoyReturnsCard
          navHistory={fund.navHistory}
          benchmarkNavHistory={fund.benchNavHistory || []}
          benchmarkName={
            fund.benchmarkFundName || fund.benchmarkName || "Benchmark"
          }
          schemeName={fund.schemeName}
          isStock={false}
        />
      )}

      {/* 8. Value Research Risk Measures Card */}
      <WatchlistVroRiskCard
        riskData={fund.vroRisk}
        onOpenVroModal={() => setIsVroModalOpen(true)}
        onSyncVro={() => handleSyncVro()}
        isRefreshingVro={isRefreshingVro}
        lastVroSyncedAt={fund.lastVroSyncedAt}
      />

      {/* 9. Value Research Return Over Time Card */}
      <WatchlistVroReturnsCard
        returnsData={fund.vroReturns}
        onOpenVroModal={() => setIsVroModalOpen(true)}
        onSyncVro={() => handleSyncVro()}
        isRefreshingVro={isRefreshingVro}
        lastVroSyncedAt={fund.lastVroSyncedAt}
      />

      {/* 10. Portfolio Breakdown: Sectors & Top Company Holdings */}
      <WatchlistPortfolioBreakdownCard
        vroPortfolio={fund.vroPortfolio}
        growwTopHoldings={fund.topHoldings}
      />

      {/* VRO URL Modal */}
      <VroUrlModal
        isOpen={isVroModalOpen}
        onClose={() => setIsVroModalOpen(false)}
        schemeCode={fund.schemeCode}
        schemeName={fund.schemeName}
        currentVroUrl={fund.vroUrl}
        onSync={handleSyncVro}
        isSyncing={isRefreshingVro}
      />
    </div>
  );
}
