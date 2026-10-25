import { Layers } from "lucide-react";
import { parseRank } from "@/helpers/watchlist";
import type { FactsheetSchemeProfileCardProps } from "@/types/fund-details";

export default function FactsheetSchemeProfileCard({
  factsheetMeta,
  cleanCategory,
  rankingsData,
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

    const rankText =
      primary.rank === 1
        ? `🏆 #1 in Cat (${primary.horizon})`
        : primary.rank <= 5
          ? `⭐ #${primary.rank} (${primary.horizon})`
          : `Rank #${primary.rank} (${primary.horizon})`;

    return (
      <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
        <span className="text-slate-400 font-medium">Category Rank</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${rankPillClass}`}
        >
          {rankText}
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
    </div>
  );
}
