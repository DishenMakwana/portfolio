import FolioBadge from "@/components/shared/FolioBadge";
import {
  formatCurrency,
  formatPercent,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import { isUnlistedStock } from "@/lib/stockApi";
import type { HoldingsTableRowProps } from "@/types/holdings";

export default function HoldingsTableRow({
  holding: h,
  rank,
  categoryRankingsMap,
  onRowClick,
}: HoldingsTableRowProps) {
  const rankInfo = h.schemeCodeApi
    ? categoryRankingsMap?.[h.schemeCodeApi]
    : null;

  const benchXirr =
    h.benchmarkXirr !== null && h.benchmarkXirr !== undefined
      ? h.benchmarkXirr
      : typeof h.alpha === "number" &&
          typeof h.xirr === "number" &&
          (h.alpha !== 0 || h.xirr !== 0)
        ? h.xirr - h.alpha
        : null;

  return (
    <tr
      onClick={onRowClick}
      className="transition cursor-pointer select-none hover:bg-slate-950/45"
    >
      <td className="p-4 w-12 text-center text-xs font-bold text-slate-500">
        {rank}
      </td>
      <td className="p-4">
        <div className="font-bold text-slate-100">{h.schemeName}</div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-1">
          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
            {h.category}
          </span>
          {(() => {
            if (!rankInfo?.primaryRank) return null;

            const { rank: catRank, horizon } = rankInfo.primaryRank;
            const rankPillClass =
              catRank === 1
                ? "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10"
                : catRank <= 5
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                  : catRank <= 15
                    ? "bg-sky-950/70 text-sky-300 border-sky-500/30"
                    : "bg-slate-850/90 text-slate-300 border-slate-700/60";

            const rankText =
              catRank === 1
                ? `🏆 #1 in Cat (${horizon})`
                : catRank <= 5
                  ? `⭐ #${catRank} (${horizon})`
                  : `Rank #${catRank} (${horizon})`;

            const titleText = `Category: ${rankInfo.categoryName || h.category}\n${Object.entries(
              rankInfo.allRanks
            )
              .filter(([, r]) => r && r !== "--")
              .map(([hz, r]) => `${hz}: #${r}`)
              .join(" • ")}`;

            return (
              <span
                title={titleText}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${rankPillClass}`}
              >
                {rankText}
              </span>
            );
          })()}
          <FolioBadge folioNo={h.folioNo} />
          {h.balanceUnits <= 0.0001 && (
            <span className="bg-amber-950/80 text-amber-400 border border-amber-800/40 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
              Inactive / Sold
            </span>
          )}
          {isUnlistedStock(h.schemeName) && (
            <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase animate-pulse">
              Unlisted
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
          <span>Units: {h.balanceUnits.toFixed(3)}</span>
          <span>• NAV: ₹{h.currentNav.toFixed(2)}</span>
        </div>
      </td>
      <td className="p-4 font-medium text-slate-200">{h.memberName}</td>
      <td className="p-4 font-bold text-slate-100">
        <div>{formatCurrency(h.currentValue)}</div>
        <div className="text-[11px] text-slate-500 font-normal">
          Cost: {formatCurrency(h.purchaseValue)}
        </div>
      </td>
      <td className="p-4">
        <div
          className={`font-semibold ${h.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {formatCurrency(h.gain)}
        </div>
        <div
          className={`text-[11px] ${h.gain >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}
        >
          {h.absoluteReturn.toFixed(1)}% Abs
        </div>
      </td>
      <td className="p-4 text-slate-200 whitespace-nowrap">
        <div className="font-bold">{h.holdingDays}</div>
        {h.holdingDays >= 30 && (
          <div className="text-[11px] text-slate-500 font-medium">
            {formatHoldingYearsAndDays(h.holdingDays)}
          </div>
        )}
      </td>
      <td className="p-4">
        <div
          className={`font-bold ${
            h.cagr >= 0 ? "text-teal-400" : "text-red-400"
          }`}
        >
          {formatPercent(h.cagr)}
        </div>
        {h.benchmarkCagr !== null && h.benchmarkCagr !== undefined && (
          <div className="text-[11px] text-slate-500 font-medium">
            CAVG: {formatPercent(h.benchmarkCagr)}
          </div>
        )}
      </td>
      <td className="p-4">
        <div
          className={`font-bold ${
            h.xirr >= 0 ? "text-teal-400" : "text-red-400"
          }`}
        >
          {formatPercent(h.xirr)}
        </div>
        {benchXirr !== null && (
          <div className="text-[11px] text-slate-500 font-medium">
            CAVG: {formatPercent(benchXirr)}
          </div>
        )}
      </td>
      <td className="p-4">
        <span
          className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${h.alpha >= 0 ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-red-950/80 text-red-400 border border-red-800/40"}`}
        >
          {h.alpha.toFixed(2)}%
        </span>
      </td>
      <td className="p-4 whitespace-nowrap">
        {h.athNav && h.athNav > 0 ? (
          <div className="flex flex-col items-start gap-1">
            {/* Buy Dip Tag if opportunity */}
            {h.isLumpsumOpportunity && (
              <span
                title="Down ≥5% from All-Time High — Prime Lumpsum Opportunity"
                className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50 inline-flex items-center gap-0.5 shadow-sm shadow-amber-500/10"
              >
                🔥 Buy Dip
              </span>
            )}
            {/* Pct Correction */}
            <span
              className={`font-bold text-xs px-1.5 py-0.5 rounded border ${
                h.isLumpsumOpportunity
                  ? "bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/10"
                  : (h.athCorrectionPct ?? 0) >= 0
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-950/80 text-amber-300 border-amber-500/40"
              }`}
            >
              {h.athCorrectionPct !== null && h.athCorrectionPct !== undefined
                ? h.athCorrectionPct >= 0
                  ? "At Peak"
                  : `${h.athCorrectionPct.toFixed(2)}%`
                : "-"}
            </span>
            {/* CUR & ATH & days */}
            <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 mt-0.5 font-medium">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[10px]">CUR:</span>
                <span className="text-slate-300">
                  ₹{h.currentNav.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[10px]">ATH:</span>
                <span className="text-slate-300">₹{h.athNav.toFixed(2)}</span>
              </div>
              {h.athDaysDiff !== null &&
                h.athDaysDiff !== undefined &&
                h.athDaysDiff > 0 && (
                  <div className="text-[10px] text-slate-500">
                    {h.athDaysDiff}d ago
                  </div>
                )}
            </div>
          </div>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        )}
      </td>
    </tr>
  );
}
