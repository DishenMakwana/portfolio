"use client";

import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import { formatNullableDate } from "@/helpers/formatters";
import { isUnlistedStock } from "@/lib/stockApi";
import NotificationBellDropdown from "@/components/shared/NotificationBellDropdown";
import FolioBadge from "@/components/shared/FolioBadge";
import { FundDetailsHeaderProps } from "@/types/fund-details";

export default function FundDetailsHeader({
  holding,
  isStock,
  cleanCategory,
  isRefreshingGlobal,
  onGlobalRefresh,
  onBack,
  categoryRankingsData,
}: FundDetailsHeaderProps) {
  const rankSummary = (() => {
    if (isStock || !categoryRankingsData?.annualised) return null;
    const ranks = categoryRankingsData.annualised.categoryRank || {};
    const parseRank = (val: string | undefined): number | null => {
      if (!val || val === "--") return null;
      const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
      return isNaN(num) ? null : num;
    };

    const r5Y = parseRank(ranks["5Y"]);
    const r3Y = parseRank(ranks["3Y"]);
    const r1Y = parseRank(ranks["1Y"]);
    const r10Y = parseRank(ranks["10Y"]);

    const primary =
      r5Y !== null
        ? { rank: r5Y, horizon: "5Y" }
        : r3Y !== null
          ? { rank: r3Y, horizon: "3Y" }
          : r1Y !== null
            ? { rank: r1Y, horizon: "1Y" }
            : r10Y !== null
              ? { rank: r10Y, horizon: "10Y" }
              : null;

    if (!primary) return null;

    const rankPillClass =
      primary.rank === 1
        ? "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10"
        : primary.rank <= 5
          ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
          : primary.rank <= 15
            ? "bg-sky-950/70 text-sky-300 border-sky-500/30"
            : "bg-slate-850/90 text-slate-300 border-slate-700/60";

    const rankText =
      primary.rank === 1
        ? `🏆 #1 in Cat (${primary.horizon})`
        : primary.rank <= 5
          ? `⭐ #${primary.rank} (${primary.horizon})`
          : `Rank #${primary.rank} (${primary.horizon})`;

    const titleText = `Category: ${categoryRankingsData.categoryName || cleanCategory}\n${Object.entries(
      ranks
    )
      .filter(([, r]) => r && r !== "--")
      .map(([hz, r]) => `${hz}: #${r}`)
      .join(" • ")}`;

    return { primary, rankPillClass, rankText, titleText };
  })();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 p-2.5 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center shadow-md hover:scale-105 active:scale-95"
          title="Go Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {holding.schemeName || "Unknown Scheme"}
            </h1>
            <span className="bg-slate-800/80 text-teal-400 border border-teal-950/60 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {cleanCategory}
            </span>
            {rankSummary && (
              <span
                title={rankSummary.titleText}
                className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border transition-colors ${rankSummary.rankPillClass}`}
              >
                {rankSummary.rankText}
              </span>
            )}
            {isUnlistedStock(holding.schemeName) && (
              <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Unlisted
              </span>
            )}
          </div>
          <div className="text-slate-400 mt-1.5 text-xs sm:text-sm font-medium space-y-1">
            <div>
              Holder:{" "}
              <strong className="text-slate-300">
                {holding.memberName || "Unknown Holder"}
              </strong>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {!isStock && <FolioBadge folioNo={holding.folioNo} />}
              {holding.isin && (
                <>
                  {!isStock && holding.folioNo && (
                    <span className="text-slate-700 font-extrabold">•</span>
                  )}
                  <span>
                    ISIN:{" "}
                    <span className="text-slate-300 font-bold">
                      {holding.isin}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-sm text-slate-400 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl font-medium shadow-inner flex items-center gap-2">
          <Calendar size={16} className="text-teal-400" />
          <span>
            Snapshot Date:{" "}
            <strong className="text-slate-200">
              {formatNullableDate(holding.asOfDate || null)}
            </strong>
          </span>
        </div>

        <NotificationBellDropdown />

        <button
          onClick={onGlobalRefresh}
          disabled={isRefreshingGlobal}
          className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition duration-200 flex items-center gap-2 shadow-md hover:shadow-teal-950/40 disabled:opacity-50 cursor-pointer"
          title="Force refresh database & cache"
        >
          <RefreshCw
            size={14}
            className={isRefreshingGlobal ? "animate-spin" : ""}
          />
          <span>{isRefreshingGlobal ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </div>
    </header>
  );
}
