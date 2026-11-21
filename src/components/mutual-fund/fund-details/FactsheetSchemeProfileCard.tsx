import { Layers, Trophy, Star, ExternalLink } from "lucide-react";
import { parseRank } from "@/helpers/watchlist";
import type { FactsheetSchemeProfileCardProps } from "@/types/fund-details";

export default function FactsheetSchemeProfileCard({
  factsheetMeta,
  cleanCategory,
  rankingsData,
  schemeName,
  vroUrl,
}: FactsheetSchemeProfileCardProps) {
  const ranks = rankingsData?.annualised?.categoryRank || {};
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

  const rankBadge = (() => {
    if (!primary) return null;
    const rankPillClass =
      primary.rank === 1
        ? "bg-amber-950/80 text-amber-300 border-amber-500/50"
        : primary.rank <= 5
          ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
          : primary.rank <= 15
            ? "bg-sky-950/70 text-sky-300 border-sky-500/30"
            : "bg-slate-850 text-slate-300 border-slate-700";

    const rankContent =
      primary.rank === 1 ? (
        <>
          <Trophy size={11} className="shrink-0 text-amber-400" />
          <span>#1 in Cat ({primary.horizon})</span>
        </>
      ) : primary.rank <= 5 ? (
        <>
          <Star size={11} className="shrink-0 text-amber-400" />
          <span>
            #{primary.rank} ({primary.horizon})
          </span>
        </>
      ) : (
        <span>
          Rank #{primary.rank} ({primary.horizon})
        </span>
      );

    return (
      <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
        <span className="text-slate-400 font-medium">Category Rank</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${rankPillClass}`}
        >
          {rankContent}
        </span>
      </div>
    );
  })();

  const expenseRatio = (
    rankingsData?.expenseRatio !== null &&
    rankingsData?.expenseRatio !== undefined
      ? rankingsData.expenseRatio
      : factsheetMeta.profile.expenseRatio
  ).toFixed(2);

  const growwSlug = rankingsData?.growwSlug;
  const growwLink =
    growwSlug && growwSlug !== "NOT_FOUND"
      ? `https://groww.in/mutual-funds/${growwSlug}`
      : schemeName
        ? `https://groww.in/search?q=${encodeURIComponent(schemeName)}`
        : null;

  const vroLink =
    vroUrl && vroUrl.trim()
      ? vroUrl.trim()
      : schemeName
        ? `https://www.valueresearchonline.com/funds/selector/primary-funds/?search=${encodeURIComponent(schemeName)}`
        : null;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
      <div>
        <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
          <Layers size={18} className="text-teal-400" />
          <span>Scheme Profile</span>
        </h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
            <span className="text-slate-400 font-medium">Launch Date</span>
            <span className="font-semibold text-slate-200">
              {factsheetMeta.profile.launchDate}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
            <span className="text-slate-400 font-medium">Fund Size(AUM)</span>
            <span className="font-bold text-slate-200">
              ₹{factsheetMeta.profile.corpusCr.toLocaleString("en-IN")} Cr
            </span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
            <span className="text-slate-400 font-medium">Category</span>
            <span className="font-semibold text-slate-200">
              {cleanCategory}
            </span>
          </div>

          {rankBadge}

          <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
            <span className="text-slate-400 font-medium">Expense Ratio</span>
            <span className="font-bold text-slate-200">{expenseRatio}%</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
            <span className="text-slate-400 font-medium">Scheme Type</span>
            <span className="font-semibold text-teal-400">Open-Ended</span>
          </div>

          <div className="flex justify-between items-start text-sm border-b border-slate-850/60 pb-2">
            <span className="text-slate-400 font-medium">Benchmark</span>
            <span className="font-semibold text-indigo-400 text-right text-xs max-w-[200px]">
              {factsheetMeta.profile.benchmarkName}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions & Research Links */}
      <div className="border-t border-slate-850 pt-4 mt-5 space-y-3">
        <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">
          Research Links
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {vroLink && (
            <a
              href={vroLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-teal-400 transition"
              title="Open Value Research Online"
            >
              <ExternalLink size={13} className="text-slate-400" />
              <span>Value Research</span>
            </a>
          )}

          {growwLink && (
            <a
              href={growwLink}
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
      </div>
    </div>
  );
}
