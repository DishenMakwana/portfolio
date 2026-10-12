"use client";

import { History } from "lucide-react";
import { formatInrCompact } from "@/helpers/formatters";
import type { FyMultiYearComparisonTableProps } from "@/types/insights";

export function FyMultiYearComparisonTable({
  comparisonRows,
  selectedFyLabel,
  metric,
  onFyChange,
}: FyMultiYearComparisonTableProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-teal-400">
          <History size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            Multi-Year Financial Year Comparison
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Side-by-side historical performance across all financial years
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-hidden">
        <table className="w-full table-fixed text-xs text-left border-collapse">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8.5%]" />
            <col className="w-[9.5%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700 text-[10px] sm:text-[11px]">
              <th className="py-2.5 px-1 sm:px-2 text-left font-bold truncate">
                Financial Year
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                Opening
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                Invested
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                Sold
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                Closing
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                Net Gain
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                Abs Ret
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                XIRR
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                CAGR
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate text-blue-400">
                Nifty 50 ({metric.toUpperCase()})
              </th>
              <th className="py-2.5 px-1 sm:px-2 text-right font-bold truncate">
                Alpha
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => {
              const isSelected = row.fyLabel === selectedFyLabel;
              const benchVal =
                metric === "xirr" ? row.benchmarkXirr : row.benchmarkCagr;
              const portVal = metric === "xirr" ? row.xirr : row.cagr;
              const alphaVal = portVal - benchVal;
              return (
                <tr
                  key={row.fyLabel}
                  onClick={() => onFyChange(row.fyLabel)}
                  className={`cursor-pointer transition-colors border-b border-slate-800/70 last:border-b-0 ${
                    isSelected
                      ? "bg-teal-500/10 text-teal-200 font-semibold"
                      : "hover:bg-slate-800/50 text-slate-300"
                  }`}
                >
                  <td className="py-2.5 px-1 sm:px-2 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-bold text-[11px] sm:text-xs">
                      {row.fyLabel}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] bg-teal-500/20 border border-teal-500/30 text-teal-300 px-1 py-0.2 rounded-full font-semibold">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-semibold">
                    {formatInrCompact(row.openingValuation)}
                  </td>
                  <td className="py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap text-emerald-400">
                    {formatInrCompact(row.fyInvested)}
                  </td>
                  <td className="py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap text-rose-400">
                    {formatInrCompact(row.fySold)}
                  </td>
                  <td className="py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-bold">
                    {formatInrCompact(row.closingValuation)}
                  </td>
                  <td
                    className={`py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-bold ${
                      row.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatInrCompact(row.netGain, true)}
                  </td>
                  <td
                    className={`py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-semibold ${
                      row.absReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {row.absReturn.toFixed(2)}%
                  </td>
                  <td
                    className={`py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-semibold ${
                      row.xirr >= 0 ? "text-teal-400" : "text-rose-400"
                    }`}
                  >
                    {row.xirr.toFixed(2)}%
                  </td>
                  <td
                    className={`py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-semibold ${
                      row.cagr >= 0 ? "text-teal-400" : "text-rose-400"
                    }`}
                  >
                    {row.cagr.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-semibold text-blue-400">
                    {benchVal.toFixed(2)}%
                  </td>
                  <td
                    className={`py-2.5 px-1 sm:px-2 text-right tabular-nums whitespace-nowrap font-bold ${
                      alphaVal >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {alphaVal >= 0 ? "+" : ""}
                    {alphaVal.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
