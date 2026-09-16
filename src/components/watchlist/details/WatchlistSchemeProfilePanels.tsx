"use client";

import { Layers, PieChart, ExternalLink, RotateCw } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/helpers/formatters";
import type {
  WatchlistFundDetails,
  WatchlistSchemeProfilePanelsProps,
} from "@/types/watchlist";

const DEFAULT_TAX_IMPLICATION =
  "If you redeem within one year, returns are taxed at 20%. If you redeem after one year, returns exceeding Rs 1.25 lakh in a financial year are taxed at 12.5%.";

const DEFAULT_EXIT_LOAD =
  "Exit load for units in excess of 10% of the investment,1% will be charged for redemption within 1 year.";

function parseRank(val: string | undefined): number | null {
  if (!val || val === "--") return null;
  const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? null : num;
}

function resolvePrimaryRank(rankings?: WatchlistFundDetails["rankings"]): {
  rank: number;
  horizon: string;
  pillClass: string;
  text: string;
} | null {
  if (!rankings || rankings.length === 0) return null;

  const getRank = (h: string) => {
    const item = rankings.find((r) => r.horizon === h);
    const num = parseRank(item?.categoryRank);
    return num !== null ? { rank: num, horizon: h } : null;
  };

  const primary =
    getRank("3Y") ?? getRank("5Y") ?? getRank("1Y") ?? getRank("10Y");
  if (!primary) return null;

  const pillClass =
    primary.rank === 1
      ? "bg-amber-950/80 text-amber-300 border-amber-500/50"
      : primary.rank <= 5
        ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
        : primary.rank <= 15
          ? "bg-sky-950/70 text-sky-300 border-sky-500/30"
          : "bg-slate-850 text-slate-300 border-slate-700";

  const text =
    primary.rank === 1
      ? `🏆 #1 in Cat (${primary.horizon})`
      : primary.rank <= 5
        ? `⭐ #${primary.rank} (${primary.horizon})`
        : `Rank #${primary.rank} (${primary.horizon})`;

  return { ...primary, pillClass, text };
}

export default function WatchlistSchemeProfilePanels({
  fund,
  onRefreshGroww,
  isRefreshingGroww,
  onSyncVro,
  isRefreshingVro,
}: WatchlistSchemeProfilePanelsProps) {
  const primaryRank = resolvePrimaryRank(fund.rankings);

  const assetEntries: Array<{
    label: string;
    value: number;
    colorClass: string;
    barBg: string;
  }> = [
    {
      label: "Equity",
      value: fund.assetAllocation?.equity ?? 0,
      colorClass: "text-indigo-400",
      barBg: "bg-indigo-500",
    },
    {
      label: "Debt",
      value: fund.assetAllocation?.debt ?? 0,
      colorClass: "text-sky-400",
      barBg: "bg-sky-500",
    },
    {
      label: "Cash",
      value: fund.assetAllocation?.cash ?? 0,
      colorClass: "text-emerald-400",
      barBg: "bg-emerald-500",
    },
  ];

  if (fund.assetAllocation?.realEstate && fund.assetAllocation.realEstate > 0) {
    assetEntries.push({
      label: "Real Estate",
      value: fund.assetAllocation.realEstate,
      colorClass: "text-amber-400",
      barBg: "bg-amber-500",
    });
  }

  if (
    fund.assetAllocation?.commodities &&
    fund.assetAllocation.commodities > 0
  ) {
    assetEntries.push({
      label: "Commodities",
      value: fund.assetAllocation.commodities,
      colorClass: "text-yellow-400",
      barBg: "bg-yellow-500",
    });
  }

  if (fund.assetAllocation?.others && fund.assetAllocation.others > 0) {
    assetEntries.push({
      label: "Others",
      value: fund.assetAllocation.others,
      colorClass: "text-slate-400",
      barBg: "bg-slate-500",
    });
  }

  const taxImplication =
    fund.exitLoadTax?.taxImplication?.trim() || DEFAULT_TAX_IMPLICATION;

  const exitLoadText =
    fund.exitLoadTax?.exitLoad?.trim() ||
    fund.exitLoad?.trim() ||
    DEFAULT_EXIT_LOAD;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* PANEL 1: SCHEME PROFILE */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
            <Layers size={18} className="text-teal-400" />
            <span>Scheme Profile</span>
          </h3>

          <div className="space-y-3">
            {/* AMFI Code */}
            <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-400 font-medium">AMFI Code</span>
              <span className="font-mono font-bold text-cyan-400">
                {fund.schemeCode}
              </span>
            </div>

            {/* ISIN */}
            {fund.isin && (
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
                <span className="text-slate-400 font-medium">ISIN</span>
                <span className="font-mono font-semibold text-slate-200">
                  {fund.isin}
                </span>
              </div>
            )}

            {/* Launch Date */}
            <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-400 font-medium">Launch Date</span>
              <span className="font-semibold text-slate-200">
                {fund.launchDate ? formatDate(fund.launchDate) : "—"}
              </span>
            </div>

            {/* Fund Size(AUM) */}
            <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-400 font-medium">Fund Size(AUM)</span>
              <span className="font-bold text-slate-200">
                {fund.aumCr != null && fund.aumCr > 0
                  ? `₹${fund.aumCr.toLocaleString("en-IN")} Cr`
                  : "—"}
              </span>
            </div>

            {/* Category */}
            <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-400 font-medium">Category</span>
              <span className="font-semibold text-slate-200">
                {fund.category || "—"}
              </span>
            </div>

            {/* Category Rank */}
            {primaryRank && (
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
                <span className="text-slate-400 font-medium">
                  Category Rank
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${primaryRank.pillClass}`}
                >
                  {primaryRank.text}
                </span>
              </div>
            )}

            {/* Expense Ratio */}
            <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-400 font-medium">Expense Ratio</span>
              <span className="font-bold text-slate-200">
                {fund.expenseRatio != null
                  ? `${fund.expenseRatio.toFixed(2)}%`
                  : "—"}
              </span>
            </div>

            {/* Scheme Type */}
            <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-400 font-medium">Scheme Type</span>
              <span className="font-semibold text-teal-400">
                {fund.schemeType || "Open-Ended"}
              </span>
            </div>

            {/* Benchmark */}
            <div className="flex justify-between items-start text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-400 font-medium">Benchmark</span>
              <span className="font-semibold text-indigo-400 text-right text-xs max-w-[200px]">
                {fund.benchmarkName || "—"}
              </span>
            </div>

            {/* Fund Manager */}
            {fund.fundManager && (
              <div className="flex justify-between items-start text-sm border-b border-slate-850/60 pb-2 last:border-b-0 last:pb-0">
                <span className="text-slate-400 font-medium">Fund Manager</span>
                <span className="font-semibold text-slate-300 text-right text-xs max-w-[200px]">
                  {fund.fundManager}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions & Research Links */}
        <div className="border-t border-slate-850 pt-4 mt-5 space-y-3">
          <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">
            Research Links
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {fund.vroUrl && (
              <a
                href={fund.vroUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-teal-400 transition"
                title="Open Value Research Online"
              >
                <ExternalLink size={13} className="text-slate-400" />
                <span>Value Research</span>
              </a>
            )}

            {fund.growwSlug && (
              <a
                href={`https://groww.in/mutual-funds/${fund.growwSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-emerald-400 transition"
                title="Open Groww fund page"
              >
                <ExternalLink size={13} className="text-slate-400" />
                <span>Groww</span>
              </a>
            )}
          </div>

          {fund.lastVroSyncedAt && (
            <div className="text-[10px] text-teal-400/80 font-medium">
              ✓ Value Research synced{" "}
              {new Date(fund.lastVroSyncedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* PANEL 2: ASSET COMPOSITION */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
            <PieChart size={18} className="text-teal-400" />
            <span>Equity / Debt / Cash split</span>
          </h3>

          <div className="space-y-4">
            {assetEntries.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">{item.label}</span>
                  <span className={`${item.colorClass} font-extrabold`}>
                    {item.value.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                  <motion.div
                    className={`${item.barBg} h-full rounded-full transition-all duration-500`}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.max(0, item.value))}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {/* TAX IMPLICATION */}
            <div className="border-t border-slate-850 pt-3.5 mt-4 text-left">
              <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1.5">
                TAX IMPLICATION
              </span>
              <div className="text-xs text-slate-300 bg-slate-950/50 p-3 border border-slate-800/80 rounded-xl leading-relaxed">
                {taxImplication}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed">
          Note: Portfolio allocations are scraped from latest fund holdings and
          factsheet reports.
        </div>
      </div>

      {/* PANEL 3: MARKET CAP SPLIT */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div>
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-5">
            <h3 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
              <PieChart size={18} className="text-teal-400" />
              <span>Market Cap Split (%)</span>
            </h3>
            <div className="flex items-center gap-2">
              {onRefreshGroww && (
                <button
                  type="button"
                  onClick={onRefreshGroww}
                  disabled={isRefreshingGroww || isRefreshingVro}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-emerald-400 hover:border-slate-700 transition disabled:opacity-50"
                  title="Sync Market Cap Data from Groww"
                >
                  <RotateCw
                    size={13}
                    className={
                      isRefreshingGroww ? "animate-spin text-emerald-400" : ""
                    }
                  />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {!fund.marketCap ||
            ((fund.marketCap.largeCap ?? 0) === 0 &&
              (fund.marketCap.midCap ?? 0) === 0 &&
              (fund.marketCap.smallCap ?? 0) === 0) ? (
              <div className="bg-slate-950/50 border border-dashed border-slate-800/80 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-3 font-medium">
                  Market cap split data is pending or not yet synced.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {onRefreshGroww && (
                    <button
                      type="button"
                      onClick={onRefreshGroww}
                      disabled={isRefreshingGroww || isRefreshingVro}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg hover:bg-emerald-900/40 transition disabled:opacity-50"
                    >
                      <RotateCw
                        size={12}
                        className={isRefreshingGroww ? "animate-spin" : ""}
                      />
                      <span>
                        {isRefreshingGroww
                          ? "Fetching Groww..."
                          : "Sync from Groww"}
                      </span>
                    </button>
                  )}
                  {onSyncVro && (
                    <button
                      type="button"
                      onClick={onSyncVro}
                      disabled={isRefreshingGroww || isRefreshingVro}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-400 bg-teal-950/40 border border-teal-800/50 rounded-lg hover:bg-teal-900/40 transition disabled:opacity-50"
                    >
                      <RotateCw
                        size={12}
                        className={isRefreshingVro ? "animate-spin" : ""}
                      />
                      <span>
                        {isRefreshingVro ? "Fetching VRO..." : "Sync from VRO"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Large Cap */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Large Cap</span>
                    <span className="text-sky-400 font-extrabold">
                      {(fund.marketCap?.largeCap ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-sky-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, fund.marketCap?.largeCap ?? 0))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Mid Cap */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Mid Cap</span>
                    <span className="text-emerald-400 font-extrabold">
                      {(fund.marketCap?.midCap ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, fund.marketCap?.midCap ?? 0))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Small Cap */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Small Cap</span>
                    <span className="text-amber-400 font-extrabold">
                      {(fund.marketCap?.smallCap ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, fund.marketCap?.smallCap ?? 0))}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Exit Load */}
            <div className="border-t border-slate-850 pt-3.5 mt-4 text-left">
              <div>
                <span className="text-xs text-slate-400 font-bold block mb-1.5">
                  Exit Load
                </span>
                <div className="text-xs text-slate-200 bg-slate-950/50 p-3 border border-slate-800/80 rounded-xl leading-relaxed font-medium">
                  {exitLoadText}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed flex items-center justify-between gap-2">
          <span>
            Note: Market capitalization split reflects underlying portfolio
            companies categorized into Large, Mid, and Small Cap.
          </span>
          {fund.vroPortfolio?.marketCap ? (
            <span className="text-teal-400 font-semibold shrink-0">
              Source: Value Research
            </span>
          ) : fund.growwSlug ? (
            <span className="text-emerald-400 font-semibold shrink-0">
              Source: Groww
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
