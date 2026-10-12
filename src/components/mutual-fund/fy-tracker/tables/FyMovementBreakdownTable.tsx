"use client";

import { useMemo } from "react";
import { Layers } from "lucide-react";
import { formatFyTableValue } from "@/helpers/formatters";
import type { FyMovementBreakdownTableProps } from "@/types/insights";

export function FyMovementBreakdownTable({
  snapshot,
  selectedFy,
  isPending,
}: FyMovementBreakdownTableProps) {
  const hasDebtOthersActivity = useMemo(() => {
    const snapshotRows = snapshot.rows.filter(
      (row) => row.label !== "XIRR (%)"
    );
    return snapshotRows.some((row) => row.debtOthers !== 0);
  }, [snapshot.rows]);

  return (
    <div
      className={`rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-6 shadow-xl space-y-4 transition-opacity duration-200 ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Movement Breakdown — {selectedFy.label}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Asset class breakdown of opening balance, buys, sells, closing
              balance, Abs Return, XIRR &amp; CAGR
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1.5">
          {selectedFy.startDate} to {selectedFy.endDate}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-teal-500/20 text-teal-200">
              <th className="px-4 py-3 text-left font-bold whitespace-nowrap">
                Movement
              </th>
              <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                Equity
              </th>
              <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                Hybrid
              </th>
              <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                Debt &amp; Others
              </th>
              <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.map((row) => {
              const isPercentRow =
                row.label === "XIRR (%)" || row.label === "Abs Return (%)";
              const isEmphasis =
                row.label === "Opening Balance" ||
                row.label === "Closing Balance" ||
                row.label === "Net Gain";

              const values = isPercentRow
                ? [
                    row.equityXirr || 0,
                    row.hybridXirr || 0,
                    hasDebtOthersActivity
                      ? row.debtOthersXirr || 0
                      : Number.NaN,
                    row.totalXirr || 0,
                  ]
                : [row.equity, row.hybrid, row.debtOthers, row.total];

              return (
                <tr
                  key={row.label}
                  className={
                    isPercentRow
                      ? "border-b border-slate-800/70 last:border-b-0 bg-teal-500/15 text-teal-200 font-semibold"
                      : isEmphasis
                        ? "border-b border-slate-800/70 last:border-b-0 text-slate-100 font-bold"
                        : "border-b border-slate-800/70 last:border-b-0 text-slate-300"
                  }
                >
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">
                    {row.label}
                  </td>
                  {values.map((value, index) => (
                    <td
                      key={row.label + "-" + index}
                      className={
                        !isPercentRow && value < 0
                          ? "px-4 py-3 text-right tabular-nums whitespace-nowrap text-rose-400"
                          : "px-4 py-3 text-right tabular-nums whitespace-nowrap"
                      }
                    >
                      {formatFyTableValue(value, isPercentRow)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
