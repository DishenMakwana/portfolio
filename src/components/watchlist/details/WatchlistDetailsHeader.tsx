"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import NotificationBellDropdown from "@/components/shared/NotificationBellDropdown";
import { formatNullableDate } from "@/helpers/formatters";
import type { WatchlistDetailsHeaderProps } from "@/types/watchlist";

export default function WatchlistDetailsHeader({
  fund,
  onRefreshGroww,
  isRefreshingGroww,
}: WatchlistDetailsHeaderProps) {
  const cleanCategory = fund.category || "Equity";

  // Compute category rank pill (e.g. 3Y, 5Y, or 1Y horizon)
  const rankSummary = (() => {
    if (!fund.rankings || fund.rankings.length === 0) return null;
    const parseRank = (val: string | undefined): number | null => {
      if (!val || val === "--") return null;
      const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
      return isNaN(num) ? null : num;
    };

    const r3Y = fund.rankings.find((r) => r.horizon === "3Y");
    const r5Y = fund.rankings.find((r) => r.horizon === "5Y");
    const r1Y = fund.rankings.find((r) => r.horizon === "1Y");

    const parsed3Y = parseRank(r3Y?.categoryRank);
    const parsed5Y = parseRank(r5Y?.categoryRank);
    const parsed1Y = parseRank(r1Y?.categoryRank);

    const primary =
      parsed3Y !== null
        ? { rank: parsed3Y, horizon: "3Y" }
        : parsed5Y !== null
          ? { rank: parsed5Y, horizon: "5Y" }
          : parsed1Y !== null
            ? { rank: parsed1Y, horizon: "1Y" }
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

    const titleText = `Category: ${cleanCategory}\n${fund.rankings
      .filter((r) => r.categoryRank && r.categoryRank !== "--")
      .map((r) => `${r.horizon}: #${r.categoryRank}`)
      .join(" • ")}`;

    return { primary, rankPillClass, rankText, titleText };
  })();

  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-6 gap-4">
      {/* Left Side: Back Button, Fund Name, Category, Category Rank, AMC */}
      <div className="flex items-center gap-4">
        <Link
          href="/watchlist"
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 p-2.5 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center shadow-md hover:scale-105 active:scale-95 shrink-0"
          title="Back to Watchlist"
        >
          <ArrowLeft size={20} />
        </Link>

        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {fund.schemeName || "Unknown Scheme"}
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
          </div>

          {fund.fundHouse && (
            <div className="text-slate-400 mt-1.5 text-xs sm:text-sm font-medium">
              AMC: <strong className="text-slate-300">{fund.fundHouse}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Snapshot Date, Notification Button, Refresh Data Button */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-xs sm:text-sm text-slate-400 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl font-medium shadow-inner flex items-center gap-2">
          <Calendar size={16} className="text-teal-400" />
          <span>
            Snapshot Date:{" "}
            <strong className="text-slate-200">
              {formatNullableDate(fund.asOfDate || fund.athDate || null)}
            </strong>
          </span>
        </div>

        <NotificationBellDropdown />

        <button
          onClick={onRefreshGroww}
          disabled={isRefreshingGroww}
          className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition duration-200 flex items-center gap-2 shadow-md hover:shadow-teal-950/40 disabled:opacity-50 cursor-pointer"
          title="Force refresh database & cache"
        >
          <RefreshCw
            size={14}
            className={isRefreshingGroww ? "animate-spin" : ""}
          />
          <span>{isRefreshingGroww ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </div>
    </header>
  );
}
