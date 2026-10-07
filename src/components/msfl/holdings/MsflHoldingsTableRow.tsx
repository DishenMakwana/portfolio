import { formatCurrency } from "@/helpers/formatters";
import { isUnlistedStock } from "@/lib/stockApi";
import type { MsflHoldingsTableRowProps } from "@/types/msfl";

export default function MsflHoldingsTableRow({
  holding: h,
  rank,
  onSelectHolding,
  onEditMapping,
}: MsflHoldingsTableRowProps) {
  return (
    <tr
      onClick={() => onSelectHolding(h.id)}
      className="hover:bg-slate-950/45 transition cursor-pointer select-none"
    >
      <td className="p-4 text-center text-xs font-bold text-slate-500">
        {rank}
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-0.5">
          <div className="font-bold text-slate-100 flex items-center gap-2">
            <span>{h.symbol}</span>
            {h.tradingStatus && h.tradingStatus !== "Active" ? (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase leading-none border ${
                  h.tradingStatus.includes("SUSPENDED") ||
                  h.tradingStatus.includes("DELETED") ||
                  h.tradingStatus.includes("NOT LISTED")
                    ? "bg-rose-950/80 text-rose-400 border-rose-800/40"
                    : "bg-amber-950/80 text-amber-400 border-amber-800/40"
                }`}
              >
                {h.tradingStatus}
              </span>
            ) : isUnlistedStock(h.symbol) ? (
              <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase leading-none">
                Unlisted
              </span>
            ) : null}
          </div>
          {h.isin && (
            <span className="text-[10px] text-slate-500 tracking-wider">
              {h.isin}
            </span>
          )}
        </div>
      </td>
      <td className="p-4 text-right whitespace-nowrap">
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="font-semibold text-slate-200">{h.quantity}</span>
            {h.faceValue !== null && h.faceValue !== undefined && (
              <span className="text-[10px] text-slate-500 font-medium">
                (FV: ₹{h.faceValue})
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {formatCurrency(h.averagePrice)}
          </span>
        </div>
      </td>
      {/* Current NAV & 1D Change */}
      <td className="p-4 text-right whitespace-nowrap">
        <div className="flex flex-col items-end">
          <span className="font-bold text-slate-100">
            {formatCurrency(h.currentPrice)}
          </span>
          {h.oneDayChangePct !== null && h.oneDayChangePct !== undefined ? (
            <span
              className={`text-[11px] font-semibold ${
                h.oneDayChangePct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {h.oneDayChangePct >= 0 ? "+" : ""}
              {h.oneDayChangePct.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">—</span>
          )}
        </div>
      </td>
      <td className="p-4 text-right font-medium text-slate-400">
        {formatCurrency(h.investedValue)}
      </td>
      <td className="p-4 text-right font-bold text-slate-100">
        {formatCurrency(h.currentValue)}
      </td>
      <td className="p-4 text-right">
        <div
          className={`font-semibold ${h.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {formatCurrency(h.unrealizedPnl)}
        </div>
        <div
          className={`text-[11px] ${h.unrealizedPnl >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}
        >
          {h.unrealizedPnlPct >= 0 ? "+" : ""}
          {h.unrealizedPnlPct.toFixed(1)}%
        </div>
      </td>
      <td
        className={`p-4 text-right font-bold ${h.cagr !== null && h.cagr !== undefined && h.cagr >= 0 ? "text-teal-400" : h.cagr !== null && h.cagr !== undefined ? "text-red-400" : "text-slate-400"}`}
      >
        {h.cagr !== null && h.cagr !== undefined
          ? `${h.cagr.toFixed(2)}%`
          : "-"}
      </td>
      <td className="p-4 text-right">
        {h.alpha !== null && h.alpha !== undefined ? (
          <span
            className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${h.alpha >= 0 ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-red-950/80 text-red-400 border border-red-800/40"}`}
          >
            {h.alpha >= 0 ? "+" : ""}
            {h.alpha.toFixed(2)}%
          </span>
        ) : (
          "-"
        )}
      </td>
      {/* ATH & DIP */}
      <td className="p-4 whitespace-nowrap">
        {h.athNav && h.athNav > 0 ? (
          <div className="flex flex-col items-start gap-1">
            {/* Buy Dip Tag if opportunity */}
            {(h.isLumpsumOpportunity ||
              (h.athCorrectionPct !== null &&
                h.athCorrectionPct !== undefined &&
                h.athCorrectionPct <= -5.0)) && (
              <span
                title="Down ≥5% from 52-Week High — Prime Lumpsum Opportunity"
                className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50 inline-flex items-center gap-0.5 shadow-sm shadow-amber-500/10"
              >
                🔥 Buy Dip
              </span>
            )}
            {/* Pct Correction */}
            <span
              className={`font-bold text-xs px-1.5 py-0.5 rounded border ${
                h.isLumpsumOpportunity ||
                (h.athCorrectionPct !== null &&
                  h.athCorrectionPct !== undefined &&
                  h.athCorrectionPct <= -5.0)
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
            {/* CUR, ATH & days */}
            <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 mt-0.5 font-medium">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[10px]">CUR:</span>
                <span className="text-slate-200 font-semibold">
                  {formatCurrency(h.currentPrice)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[10px]">ATH:</span>
                <span className="text-slate-300">
                  {formatCurrency(h.athNav)}
                </span>
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
          <span className="text-slate-600">-</span>
        )}
      </td>
      <td className="p-4 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditMapping(h);
          }}
          className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-700 transition cursor-pointer"
        >
          Edit Ticker
        </button>
      </td>
    </tr>
  );
}
