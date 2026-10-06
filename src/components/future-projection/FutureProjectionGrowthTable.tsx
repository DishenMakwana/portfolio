"use client";

import { DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { formatCroreOrLakh } from "@/helpers/futureProjection";
import type { FutureProjectionGrowthTableProps } from "@/types/futureProjection";

export function FutureProjectionGrowthTable({
  yearlyBreakdown,
  showTable,
  onToggleTable,
}: FutureProjectionGrowthTableProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
      <button
        type="button"
        onClick={onToggleTable}
        className="w-full p-4 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/60 transition-all cursor-pointer border-b border-slate-800/80"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
            Year-by-Year Growth Table
          </h3>
          <span className="text-xs text-slate-400">
            ({yearlyBreakdown.length} Years Schedule)
          </span>
        </div>
        {showTable ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Starting Value</th>
                <th className="py-3 px-4">Added Capital</th>
                <th className="py-3 px-4">Returns Earned</th>
                <th className="py-3 px-4">Ending Value</th>
                <th className="py-3 px-4">Total Invested</th>
                <th className="py-3 px-4">Goal Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {yearlyBreakdown.map((row) => (
                <tr
                  key={row.year}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-slate-100">
                    {row.year === 0
                      ? `${row.calendarYear} (Running Year)`
                      : `Yr ${row.year} (${row.calendarYear})`}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {formatCroreOrLakh(row.startValue)}
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">
                    +{formatCroreOrLakh(row.annualContribution)}
                  </td>
                  <td className="py-3 px-4 text-teal-300 font-semibold">
                    +{formatCroreOrLakh(row.returnsEarned)}
                  </td>
                  <td className="py-3 px-4 font-extrabold text-slate-100">
                    {formatCroreOrLakh(row.endValue)}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {formatCroreOrLakh(row.cumulativeInvested)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, row.targetProgressPct)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400">
                        {row.targetProgressPct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
