"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Layers, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, formatPercent } from "@/helpers/formatters";
import { calculatePortfolioMarketCap } from "@/helpers/marketCap";
import { syncActiveFundsMarketCapAction } from "@/actions/fundRankings";
import type { OverviewMarketCapCardProps } from "@/types/marketCap";
import type { OverviewHolding } from "@/types/portfolio";

export default function OverviewMarketCapCard({
  holdings,
  totalCurrentValue,
  reportId,
  onMarketCapDataUpdated,
  hideSyncButton = false,
}: OverviewMarketCapCardProps): React.JSX.Element {
  const router = useRouter();
  const [currentHoldings, setCurrentHoldings] =
    useState<OverviewHolding[]>(holdings);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    setCurrentHoldings(holdings);
  }, [holdings]);

  const analysis = useMemo(
    () => calculatePortfolioMarketCap(currentHoldings, totalCurrentValue),
    [currentHoldings, totalCurrentValue]
  );

  const handleSyncMarketCap = async (): Promise<void> => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading(
      "Fetching Market Cap Split for active funds (5 in parallel)..."
    );

    try {
      const res = await syncActiveFundsMarketCapAction(reportId);
      if (res.success && res.holdings && res.holdings.length > 0) {
        if (reportId !== undefined) {
          setCurrentHoldings(res.holdings);
          onMarketCapDataUpdated?.(res.holdings);
        }
        router.refresh();
        toast.success(
          `Successfully updated Market Cap Split for active funds!`,
          { id: toastId }
        );
      } else if (res.success) {
        router.refresh();
        toast.success("Market Cap Split synced successfully!", { id: toastId });
      } else {
        toast.error(res.error || "Failed to sync Market Cap Split data", {
          id: toastId,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Sync failed: ${message}`, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                Market Cap Distribution
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                Equity Breakdown
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Market capital risk breakdown & weight across market tiers
            </p>
          </div>
        </div>

        {/* Action Controls & Dynamic Risk Profile Badge */}
        <div className="flex items-center self-start sm:self-auto gap-2 shrink-0 transition-all flex-wrap">
          {!hideSyncButton && (
            <button
              onClick={handleSyncMarketCap}
              disabled={isSyncing}
              type="button"
              title="Fetch and update real-time Market Cap Split for all active funds (5 in parallel)"
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-sm shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                isSyncing
                  ? "bg-sky-500/20 text-sky-200 border-sky-500/40 animate-pulse cursor-not-allowed"
                  : "bg-slate-800/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-200 border-slate-700/70 hover:border-sky-500/40 active:scale-95"
              }`}
            >
              <RefreshCw
                size={13}
                className={`shrink-0 ${isSyncing ? "animate-spin text-sky-400" : "text-slate-400"}`}
              />
              <span>
                {isSyncing ? "Syncing (5x Parallel)..." : "Sync Market Cap"}
              </span>
            </button>
          )}

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-sm shadow-sm ${analysis.riskProfile.badgeClass}`}
          >
            <ShieldAlert size={13} className="shrink-0" />
            <span>{analysis.riskProfile.label}</span>
          </div>
        </div>
      </div>

      {/* Segmented Progress Ribbon Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs text-slate-400 font-medium mb-2">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Sparkles size={13} className="text-sky-300" />
            <span>Cap Weight Proportion</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Total Value: {formatCurrency(analysis.totalPortfolioValue)}
          </span>
        </div>

        {/* Stacked multi-color bar */}
        <div className="w-full h-3.5 bg-slate-950/80 rounded-full p-0.5 border border-slate-800/80 flex overflow-hidden gap-0.5 shadow-inner">
          {analysis.items.map((item) => {
            if (item.allocationPct <= 0.2) return null;
            return (
              <motion.div
                key={item.key}
                initial={{ width: 0 }}
                animate={{ width: `${item.allocationPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full ${item.barClass} first:rounded-l-full last:rounded-r-full transition-all`}
                title={`${item.label}: ${item.allocationPct.toFixed(1)}% (${formatCurrency(item.currentValue)})`}
              />
            );
          })}
        </div>
      </div>

      {/* Bento Grid Cards */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          analysis.items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        } gap-4`}
      >
        {analysis.items.map((item) => (
          <div
            key={item.key}
            className={`p-4 rounded-xl border ${item.borderClass} ${item.bgClass} flex flex-col justify-between transition-all duration-200 shadow-md group`}
          >
            {/* Top row: Label + Fund Count */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${item.barClass} shrink-0`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-bold ${item.textClass} tracking-tight`}
                  >
                    {item.label}
                  </span>
                </div>
              </div>

              {/* Middle row: Value & Percentage */}
              <div className="flex items-baseline justify-between gap-2 mt-1 mb-2">
                <span className="text-base sm:text-lg font-extrabold text-slate-100 tabular-nums tracking-tight">
                  {formatCurrency(item.currentValue)}
                </span>
                <span className="text-xs font-bold text-slate-300 tabular-nums">
                  ({formatPercent(item.allocationPct)})
                </span>
              </div>
            </div>

            {/* Bottom row: Progress line + Subtext Description */}
            <div className="mt-2 pt-2 border-t border-slate-800/40">
              <div className="w-full bg-slate-900/90 h-1.5 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(item.allocationPct, 100)}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={`h-full ${item.barClass} rounded-full`}
                />
              </div>
              <p className="text-[11px] text-slate-400 italic leading-snug">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
