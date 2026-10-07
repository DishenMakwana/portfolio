import { formatCurrency, formatPercent } from "@/helpers/formatters";
import type { MsflHoldingsTotalRowProps } from "@/types/msfl";

export default function MsflHoldingsTotalRow({
  stockTotals,
  filteredCount,
}: MsflHoldingsTotalRowProps) {
  return (
    <tr className="bg-slate-950/80 border-t border-slate-700 font-bold text-slate-200">
      <td className="p-4 text-center text-slate-500">-</td>
      <td className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">
        Total / Weighted Avg
        <div className="text-[10px] text-slate-500 font-semibold normal-case mt-0.5">
          {filteredCount} {filteredCount === 1 ? "Stock" : "Stocks"}
        </div>
      </td>
      <td className="p-4 text-right text-slate-400">-</td>
      <td className="p-4 text-right text-slate-400">-</td>
      <td className="p-4 text-right text-slate-300 font-bold">
        {formatCurrency(stockTotals.totalInvestedSum)}
      </td>
      <td className="p-4 text-right text-teal-400 text-base font-black">
        {formatCurrency(stockTotals.totalValueSum)}
      </td>
      <td className="p-4 text-right">
        <div
          className={
            stockTotals.totalPnlSum >= 0 ? "text-emerald-400" : "text-red-400"
          }
        >
          {formatCurrency(stockTotals.totalPnlSum)}
        </div>
        <div
          className={`text-[11px] ${stockTotals.totalPnlSum >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}
        >
          {stockTotals.totalPnlPct >= 0 ? "+" : ""}
          {stockTotals.totalPnlPct.toFixed(1)}% Abs
        </div>
      </td>
      <td
        className={`p-4 text-right ${stockTotals.avgXirr >= 0 ? "text-teal-400" : "text-red-400"}`}
      >
        {formatPercent(stockTotals.avgXirr)}
      </td>
      <td className="p-4 text-right">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs ${stockTotals.avgAlpha >= 0 ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-red-950/80 text-red-400 border border-red-800/40"}`}
        >
          {stockTotals.avgAlpha >= 0 ? "+" : ""}
          {stockTotals.avgAlpha.toFixed(2)}%
        </span>
      </td>
      <td className="p-4 text-right text-slate-400">-</td>
      <td className="p-4 text-center text-slate-500">-</td>
    </tr>
  );
}
