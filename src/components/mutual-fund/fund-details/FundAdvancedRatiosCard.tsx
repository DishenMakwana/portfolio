"use client";

import { useState } from "react";
import {
  Activity,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Info,
  RotateCw,
  PieChart,
  TrendingUp,
  Shield,
  Database,
  Globe,
  Waves,
} from "lucide-react";
import { refreshSchemeCategoryRankingAction } from "@/actions/fundRankings";
import { syncBenchmarkCategoryRatiosAction } from "@/actions/categoryRatios";
import { isCacheFresh } from "@/helpers/dates";
import type {
  CategoryBenchmarkRatios,
  FundAdvancedRatiosCardProps,
} from "@/types/fund-details";
import toast from "react-hot-toast";

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
      {/* Header Row with Sync Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Activity size={19} className="text-teal-400" />
            <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
              Advanced ratios
            </h3>
            <div
              className="text-slate-400 hover:text-slate-300 transition-colors cursor-help"
              title="Valuation ratios, portfolio concentration and rolling 3Y risk-adjusted volatility metrics vs category benchmarks"
            >
              <Info size={14} />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {displayCategory}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {activeCategoryRatios?.source === "scraped_external" ? (
                <Globe size={11} className="text-indigo-400" />
              ) : (
                <Database size={11} className="text-teal-400" />
              )}
              {sourceLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Valuation multiples, concentration metrics and risk-adjusted
            volatility measures compared to category averages
          </p>
        </div>

        {/* Sync / Refresh Button */}
        {schemeCode && (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={handleSyncAll}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-xs font-bold text-slate-200 transition-all hover:text-emerald-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
              title={
                isFresh
                  ? "Ratios & category benchmarks are fresh (24h TTL / synced today). Click to force refresh."
                  : "Ratios or category benchmarks are stale (>24h or prior calendar day). Click to sync latest data."
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isFresh
                    ? "bg-emerald-400 shadow-xs shadow-emerald-500/50"
                    : "bg-amber-400"
                }`}
              />
              <RotateCw
                size={13}
                className={`text-emerald-400 group-hover:rotate-180 transition-transform ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>
                {isRefreshing ? "Syncing..." : "Sync Ratios & Benchmarks"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 2-Panel Structured Metrics Grid (4 Cards each) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Portfolio Concentration & Valuation Multiples */}
        <div className="bg-slate-950/40 border border-slate-850/80 rounded-xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-850/70 pb-2.5">
            <div className="flex items-center gap-2">
              <PieChart size={15} className="text-sky-400" />
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                Portfolio & Valuation Multiples
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">
              Underlying Assets
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: Top 5 Concentration */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Top 5
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                    Holdings
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                    {top5}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-semibold border border-slate-700/80">
                    🛡️ Lower is Better
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg: {catTop5 || "--"}
                </span>
                {catTop5 && top5 !== "--" && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      parseFloat(top5) <= parseFloat(catTop5)
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {parseFloat(top5) <= parseFloat(catTop5)
                      ? "Diversified"
                      : "Concentrated"}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Top 20 Concentration */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Top 20
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                    Core
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                    {top20}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-semibold border border-slate-700/80">
                    🛡️ Lower is Better
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg: {catTop20 || "--"}
                </span>
                {catTop20 && top20 !== "--" && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      parseFloat(top20) <= parseFloat(catTop20)
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {parseFloat(top20) <= parseFloat(catTop20)
                      ? "Well Balanced"
                      : "Concentrated"}
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: P/E Ratio */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    P/E Ratio
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                    Valuation
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                    {peRatio != null ? peRatio.toFixed(2) : "--"}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    🟢 Lower = Value
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg: {catPe != null ? catPe.toFixed(2) : "--"}
                </span>
                {catPe != null && peRatio != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      peRatio <= catPe
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {peRatio <= catPe
                      ? `${(((catPe - peRatio) / catPe) * 100).toFixed(0)}% Discount`
                      : `${(((peRatio - catPe) / catPe) * 100).toFixed(0)}% Premium`}
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: P/B Ratio */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    P/B Ratio
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                    Book Value
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                    {pbRatio != null ? pbRatio.toFixed(2) : "--"}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    🟢 Lower = Value
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg: {catPb != null ? catPb.toFixed(2) : "--"}
                </span>
                {catPb != null && pbRatio != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      pbRatio <= catPb
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {pbRatio <= catPb
                      ? `${(((catPb - pbRatio) / catPb) * 100).toFixed(0)}% Discount`
                      : `${(((pbRatio - catPb) / catPb) * 100).toFixed(0)}% Premium`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Risk-Adjusted Performance & Volatility */}
        <div className="bg-slate-950/40 border border-slate-850/80 rounded-xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-850/70 pb-2.5">
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
            {/* Card 5: Alpha */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Alpha (α)
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                      alpha != null && alpha >= 0
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    Excess
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div
                    className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                      alpha != null
                        ? alpha >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {alpha != null
                      ? alpha >= 0
                        ? `+${alpha.toFixed(2)}%`
                        : `${alpha.toFixed(2)}%`
                      : "--"}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    🟢 Higher is Better
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg:{" "}
                  {catAlpha != null
                    ? `${catAlpha >= 0 ? "+" : ""}${catAlpha.toFixed(2)}%`
                    : "--"}
                </span>
                {catAlpha != null && alpha != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      alpha >= catAlpha
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {alpha >= catAlpha
                      ? `+${(alpha - catAlpha).toFixed(2)}% Excess`
                      : `${(alpha - catAlpha).toFixed(2)}% Lag`}
                  </span>
                )}
              </div>
            </div>

            {/* Card 6: Beta */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Beta (β)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                    Sensitivity
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-indigo-400 tracking-tight tabular-nums">
                    {beta != null ? beta.toFixed(2) : "--"}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                    🛡️ &lt; 1.0 Defensive
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg: {catBeta != null ? catBeta.toFixed(2) : "--"}
                </span>
                {catBeta != null && beta != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      beta <= catBeta
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {beta <= catBeta
                      ? "Calmer Market Risk"
                      : "Higher Volatility"}
                  </span>
                )}
              </div>
            </div>

            {/* Card 7: Sharpe Ratio */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Sharpe Ratio
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20">
                    Total Risk
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-teal-400 tracking-tight tabular-nums">
                    {sharpe != null ? sharpe.toFixed(2) : "--"}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20">
                    🟢 Higher is Better
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg: {catSharpe != null ? catSharpe.toFixed(2) : "--"}
                </span>
                {catSharpe != null && sharpe != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      sharpe >= catSharpe
                        ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {sharpe >= catSharpe
                      ? `+${(sharpe - catSharpe).toFixed(2)} Superior`
                      : "Standard"}
                  </span>
                )}
              </div>
            </div>

            {/* Card 8: Sortino Ratio */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Sortino Ratio
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    Downside
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight tabular-nums">
                    {sortino != null ? sortino.toFixed(2) : "--"}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    🟢 Higher is Better
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg: {catSortino != null ? catSortino.toFixed(2) : "--"}
                </span>
                {catSortino != null && sortino != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      sortino >= catSortino
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {sortino >= catSortino
                      ? `+${(sortino - catSortino).toFixed(2)} Drawdown Shield`
                      : "Standard"}
                  </span>
                )}
              </div>
            </div>

            {/* Card 9: Standard Deviation */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Std Deviation (σ)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                    Volatility
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-sky-400 tracking-tight tabular-nums">
                    {stdDev != null ? `${stdDev.toFixed(2)}%` : "--"}
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20">
                    🛡️ Lower is Calmer
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg:{" "}
                  {catStdDev != null ? `${catStdDev.toFixed(2)}%` : "--"}
                </span>
                {catStdDev != null && stdDev != null ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      stdDev <= catStdDev
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {stdDev <= catStdDev
                      ? "Calmer Volatility"
                      : "Higher Volatility"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Annualized σ
                  </span>
                )}
              </div>
            </div>

            {/* Card 10: R-Squared */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/70 transition-colors shadow-inner">
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    R-Squared (R²)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                    Index Fit
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-black text-indigo-400 tracking-tight tabular-nums">
                    {rSquared != null
                      ? `${rSquared > 1.0 ? rSquared.toFixed(1) : (rSquared * 100).toFixed(1)}%`
                      : "--"}
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${
                      rSquared != null && (rSquared >= 80 || rSquared >= 0.8)
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    }`}
                  >
                    {rSquared != null && (rSquared >= 80 || rSquared >= 0.8)
                      ? "🟢 High Fit (>80%)"
                      : "🟡 Active Divergence"}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Cat Avg:{" "}
                  {catRSquared != null ? `${catRSquared.toFixed(1)}%` : "--"}
                </span>
                {rSquared != null ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      rSquared >= 80 || rSquared >= 0.8
                        ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {rSquared >= 80 || rSquared >= 0.8
                      ? "Reliable Beta/Alpha"
                      : "Active Selection"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Corr² vs Index
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Part 3: Expandable Educational Section with Explicit Direction Indicators */}
      <div className="bg-slate-950/30 border border-slate-850/80 rounded-xl overflow-hidden shadow-xs">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-900/40 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-teal-400" />
            <h4 className="text-xs font-black text-slate-300 tracking-tight">
              Understanding Volatility, Advanced Ratios &amp; Valuation Formulas
            </h4>
          </div>
          {showExplanation ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>
        {showExplanation && (
          <div className="p-5 border-t border-slate-850/60 bg-slate-950/40 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alpha */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <TrendingUp size={14} className="text-purple-400" />
                    Alpha (α)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🟢 Higher is Better (&gt; 0)
                  </span>
                </div>
                <div className="text-[11px] font-mono text-purple-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: α = R_p - [R_f + β × (R_m - R_f)]
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Measures the active return
                  generated by the fund manager above CAPM market risk
                  expectation. An alpha of <strong>+3.00%</strong> means the
                  fund outperformed its risk-adjusted benchmark by 3% p.a.
                </p>
              </div>

              {/* Beta */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Activity size={14} className="text-indigo-400" />
                    Beta (β)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    🛡️ &lt; 1.0 = Defensive | &gt; 1.0 = Aggressive
                  </span>
                </div>
                <div className="text-[11px] font-mono text-indigo-300 bg-slate-950/60 p-2 rounded-lg border border-slate-855">
                  Formula: β = Cov(R_p, R_m) / Var(R_m)
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Measures the fund&apos;s
                  volatility sensitivity relative to the market index (1.00). A
                  beta of <strong>0.85</strong> means the fund is 15% less
                  volatile than the benchmark and cushions capital during
                  corrections.
                </p>
              </div>

              {/* Sharpe */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Activity size={14} className="text-teal-400" />
                    Sharpe Ratio
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    🟢 Higher is Better
                  </span>
                </div>
                <div className="text-[11px] font-mono text-teal-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: Sharpe = (R_p - R_f) / σ_p
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Quantifies excess return
                  earned per unit of total risk (standard deviation) above the
                  6.50% risk-free rate. A higher Sharpe ratio indicates superior
                  risk-reward efficiency.
                </p>
              </div>

              {/* Sortino */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Shield size={14} className="text-emerald-400" />
                    Sortino Ratio
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🟢 Higher is Better
                  </span>
                </div>
                <div className="text-[11px] font-mono text-emerald-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: Sortino = (R_p - R_f) / σ_downside
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Similar to Sharpe, but only
                  penalizes harmful negative downside volatility. Upside
                  volatility (positive price surges) is not penalized.
                </p>
              </div>

              {/* Standard Deviation */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Waves size={14} className="text-sky-400" />
                    Standard Deviation (σ)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    🛡️ Lower is Calmer
                  </span>
                </div>
                <div className="text-[11px] font-mono text-sky-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: σ_annual = σ_weekly × √52
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Quantifies the dispersion of
                  weekly returns from their mean. Lower standard deviation
                  indicates steadier, less turbulent compounding and smaller
                  drawdowns.
                </p>
              </div>

              {/* R-Squared */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Activity size={14} className="text-indigo-400" />
                    R-Squared (R²)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    🟢 &gt; 80% Reliable Benchmark
                  </span>
                </div>
                <div className="text-[11px] font-mono text-indigo-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: R² = [Corr(R_fund, R_bench)]²
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Percentage of the fund&apos;s
                  movements explained by the benchmark. An R² &gt; 80% confirms
                  Beta and Alpha are statistically reliable. Lower R² indicates
                  strong active divergence.
                </p>
              </div>

              {/* P/E & P/B Valuation */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <PieChart size={14} className="text-sky-400" />
                    Valuation Multiples (P/E &amp; P/B)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    🟢 Lower = Value / Discount | Higher = Growth
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Price-to-Earnings (P/E) and
                  Price-to-Book (P/B) reflect the valuation of the underlying
                  portfolio companies. A lower P/E relative to category average
                  provides a margin of safety and value orientation.
                </p>
              </div>

              {/* Concentration */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Shield size={14} className="text-amber-400" />
                    Portfolio Concentration (Top 5 &amp; 20)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    🛡️ Lower = Better Diversification
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Indicates how much of the
                  fund&apos;s total assets are concentrated in its top holdings.
                  Lower concentration reduces single-stock idiosyncratic risk.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-850/60 gap-1.5">
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
              {new Date(activeCategoryRatios.lastSyncedAt).toLocaleDateString()}
            </span>
          )}
          {lastScrapedAt && (
            <span>
              Fund synced: {new Date(lastScrapedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
