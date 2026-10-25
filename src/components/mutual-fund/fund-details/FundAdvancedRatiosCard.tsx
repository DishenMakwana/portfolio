"use client";

import { useState } from "react";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { refreshSchemeCategoryRankingAction } from "@/actions/fundRankings";
import { syncBenchmarkCategoryRatiosAction } from "@/actions/categoryRatios";
import { isCacheFresh } from "@/helpers/dates";
import { formatDateSlashDDMMYYYY } from "@/helpers/formatters";
import type {
  CategoryBenchmarkRatios,
  FundAdvancedRatiosCardProps,
} from "@/types/fund-details";
import toast from "react-hot-toast";
import FundAdvancedRatiosHeader from "@/components/mutual-fund/fund-details/FundAdvancedRatiosHeader";
import FundAdvancedValuationRatiosPanel from "@/components/mutual-fund/fund-details/FundAdvancedValuationRatiosPanel";
import FundAdvancedRiskRatiosPanel from "@/components/mutual-fund/fund-details/FundAdvancedRiskRatiosPanel";
import FundAdvancedSensitivityRatiosPanel from "@/components/mutual-fund/fund-details/FundAdvancedSensitivityRatiosPanel";
import FundAdvancedRatiosMethodologyGuide from "@/components/mutual-fund/fund-details/FundAdvancedRatiosMethodologyGuide";

export default function FundAdvancedRatiosCard({
  schemeCode,
  categoryName,
  advancedRatios,
  categoryRatios: initialCategoryRatios,
  volatilityStats,
  benchmarkName,
  lastScrapedAt,
  onDataUpdated,
}: FundAdvancedRatiosCardProps) {
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localCategoryRatios, setLocalCategoryRatios] = useState<
    CategoryBenchmarkRatios | null | undefined
  >(initialCategoryRatios);

  const activeCategoryRatios = localCategoryRatios || initialCategoryRatios;

  const isFresh =
    Boolean(lastScrapedAt && isCacheFresh(lastScrapedAt)) &&
    Boolean(
      activeCategoryRatios?.lastSyncedAt &&
      isCacheFresh(activeCategoryRatios.lastSyncedAt)
    );

  const handleSyncAll = async () => {
    if (isRefreshing || !schemeCode) return;
    setIsRefreshing(true);
    const toastId = toast.loading(
      "Syncing fund and category benchmark ratios..."
    );
    try {
      const [fundRes, catRes] = await Promise.all([
        refreshSchemeCategoryRankingAction(schemeCode),
        categoryName
          ? syncBenchmarkCategoryRatiosAction(categoryName, schemeCode)
          : Promise.resolve({ success: true, data: null }),
      ]);

      if (fundRes.success && fundRes.data) {
        if (catRes.success && catRes.data) {
          fundRes.data.categoryRatios = catRes.data;
          setLocalCategoryRatios(catRes.data);
        }
        if (onDataUpdated) {
          onDataUpdated(fundRes.data);
        }
        toast.success("Ratios and category benchmarks synced!", {
          id: toastId,
        });
      } else if (catRes.success && catRes.data) {
        setLocalCategoryRatios(catRes.data);
        toast.success("Category benchmark ratios updated!", { id: toastId });
      } else {
        toast.error(fundRes.error || "Failed to update data", { id: toastId });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error: ${msg}`, { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fund level values
  const top5 = advancedRatios?.top5 ?? "--";
  const top20 = advancedRatios?.top20 ?? "--";
  const peRatio = advancedRatios?.peRatio ?? volatilityStats.peRatio;
  const pbRatio = advancedRatios?.pbRatio ?? volatilityStats.pbRatio;

  const alpha =
    advancedRatios?.alpha ??
    (volatilityStats.alpha !== undefined
      ? Number(volatilityStats.alpha.toFixed(2))
      : undefined);
  const beta =
    advancedRatios?.beta ??
    (volatilityStats.beta !== undefined
      ? Number(volatilityStats.beta.toFixed(2))
      : undefined);
  const sharpe =
    advancedRatios?.sharpe ??
    (volatilityStats.sharpe !== undefined
      ? Number(volatilityStats.sharpe.toFixed(2))
      : undefined);
  const sortino =
    advancedRatios?.sortino ??
    (volatilityStats.sortino !== undefined
      ? Number(volatilityStats.sortino.toFixed(2))
      : undefined);

  const stdDev =
    advancedRatios?.stdDev ??
    (volatilityStats.stdDev !== undefined
      ? Number(volatilityStats.stdDev.toFixed(2))
      : undefined);

  const rSquared =
    advancedRatios?.rSquared ??
    (volatilityStats.rSquared !== undefined
      ? Number(volatilityStats.rSquared.toFixed(2))
      : undefined);

  // Category average benchmark values
  const catPe = activeCategoryRatios?.peRatio;
  const catPb = activeCategoryRatios?.pbRatio;
  const catAlpha = activeCategoryRatios?.alpha;
  const catBeta = activeCategoryRatios?.beta;
  const catSharpe = activeCategoryRatios?.sharpe;
  const catSortino = activeCategoryRatios?.sortino;
  const catStdDev = activeCategoryRatios?.stdDev;
  const catRSquared = activeCategoryRatios?.rSquared;
  const catTop5 = activeCategoryRatios?.top5;
  const catTop20 = activeCategoryRatios?.top20;

  const displayCategory = categoryName || "Equity Mutual Fund";
  const sourceLabel =
    activeCategoryRatios?.source === "scraped_external"
      ? "Market Benchmark"
      : "Peer Category Avg";

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      <FundAdvancedRatiosHeader
        displayCategory={displayCategory}
        sourceLabel={sourceLabel}
        sourceType={activeCategoryRatios?.source}
        schemeCode={schemeCode}
        isRefreshing={isRefreshing}
        isFresh={isFresh}
        onSyncAll={handleSyncAll}
      />

      {/* 2-Panel Structured Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FundAdvancedValuationRatiosPanel
          top5={top5}
          top20={top20}
          peRatio={peRatio}
          pbRatio={pbRatio}
          catTop5={catTop5}
          catTop20={catTop20}
          catPe={catPe}
          catPb={catPb}
        />

        {/* Panel 2: Risk-Adjusted Performance & Volatility */}
        <div className="bg-slate-950/40 border border-slate-855/80 rounded-xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-855/70 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" />
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                Risk-Adjusted Return Ratios
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">
              3Y Rolling vs Benchmark
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FundAdvancedRiskRatiosPanel
              alpha={alpha}
              beta={beta}
              sharpe={sharpe}
              sortino={sortino}
              catAlpha={catAlpha}
              catBeta={catBeta}
              catSharpe={catSharpe}
              catSortino={catSortino}
            />
            <FundAdvancedSensitivityRatiosPanel
              stdDev={stdDev}
              rSquared={rSquared}
              catStdDev={catStdDev}
              catRSquared={catRSquared}
            />
          </div>
        </div>
      </div>

      <FundAdvancedRatiosMethodologyGuide
        isOpen={showExplanation}
        onToggle={() => setShowExplanation(!showExplanation)}
      />

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-855/60 gap-1.5">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-teal-400/70" />
          <span>
            Benchmark: {benchmarkName || "Category Benchmark"} | Valuation &
            Volatility Analytics
          </span>
        </div>
        <div className="flex items-center gap-3">
          {activeCategoryRatios?.lastSyncedAt && (
            <span>
              Benchmark updated:{" "}
              {formatDateSlashDDMMYYYY(activeCategoryRatios.lastSyncedAt)}
            </span>
          )}
          {lastScrapedAt && (
            <span>Fund synced: {formatDateSlashDDMMYYYY(lastScrapedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
