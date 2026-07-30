"use client";

import { Layers } from "lucide-react";
import {
  formatInrCompact,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import type { OverlapsTabProps } from "@/types/insights";

export default function OverlapsTab({
  subCategoryGroups,
  subCategoryTotals,
}: OverlapsTabProps) {
  return (
    <div className="space-y-6">
      {/* Overlaps Header Card */}
      <div className="rounded-2xl border border-teal-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
        <div className="flex items-center gap-2">
          <Layers className="text-teal-400" size={18} />
          <h2 className="text-base font-bold text-slate-100">
            Category Overlaps & Lumpsum Priorities
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          This overview groups all your mutual funds into asset sub-categories.
          The best performing fund in each group (highest CAGR) is highlighted
          as the <strong>Lumpsum Priority choice</strong> to help consolidate
          family allocations.
        </p>
      </div>

      {/* Sub-Category Grids */}
      <div className="grid gap-6">
        {Object.entries(subCategoryGroups).map(([categoryName, schemes]) => {
          if (schemes.length === 0) return null;
          return (
            <div
              key={categoryName}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                {categoryName} ({schemes.length} Funds)
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Scheme Name</th>
                      <th className="pb-3 px-4">Holders</th>
                      <th className="pb-3 px-4 text-right">Value</th>
                      <th className="pb-3 px-4 text-right">Holding Period</th>
                      <th className="pb-3 px-4 text-right">Avg CAGR</th>
                      <th className="pb-3 pl-4 text-right">
                        Action / Recommendation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {schemes.map((s, idx) => {
                      const isWinner = idx === 0 && schemes.length > 1;
                      const isRegular =
                        s.schemeName.toLowerCase().includes("reg") ||
                        s.schemeName.toLowerCase().includes("regular");

                      let recTag = "Consolidate / Switch";
                      let tagClass =
                        "bg-slate-800/50 text-slate-400 border-slate-700/50";
                      if (isWinner) {
                        if (s.avgHoldingDays < 365) {
                          recTag = "🏆 Priority (Short History ⚠️)";
                          tagClass =
                            "bg-amber-500/15 text-amber-300 border-amber-500/25 font-semibold";
                        } else {
                          recTag = "🏆 Lumpsum Priority";
                          tagClass =
                            "bg-teal-500/15 text-teal-300 border-teal-500/20 font-bold";
                        }
                      } else if (schemes.length === 1) {
                        recTag = "Single Fund";
                        tagClass =
                          "bg-slate-800/60 text-slate-300 border-slate-700";
                      } else if (s.cagr < 8) {
                        recTag = "Avoid / Underperforming";
                        tagClass =
                          "bg-rose-500/15 text-rose-400 border-rose-500/20";
                      }

                      return (
                        <tr
                          key={s.schemeName}
                          className="hover:bg-slate-800/20 transition-colors"
                        >
                          <td
                            className="py-3 pr-4 font-semibold text-slate-200"
                            title={s.schemeName}
                          >
                            {s.schemeName}
                            {isRegular && (
                              <span className="text-[10px] ml-2 px-1 py-0.25 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded uppercase">
                                Reg
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs">
                            {s.holders.join(", ")}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-300">
                            {formatInrCompact(s.totalValue)}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-slate-400">
                            {formatHoldingYearsAndDays(s.avgHoldingDays)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-100">
                            {s.cagr.toFixed(2)}%
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <span
                              className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${tagClass}`}
                            >
                              {recTag}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total / Average Row */}
                    {(() => {
                      const totals = subCategoryTotals[categoryName];
                      if (!totals) return null;
                      return (
                        <tr className="bg-slate-900/90 border-t-2 border-slate-800 font-bold text-slate-200">
                          <td className="py-4 pr-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold pl-4">
                            Total / Weighted Avg
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 font-semibold">
                            {schemes.length} Funds
                          </td>
                          <td className="py-4 px-4 text-right text-teal-400 font-black text-sm">
                            {formatInrCompact(totals.totalValueSum)}
                          </td>
                          <td className="py-4 px-4 text-right text-xs text-slate-300 font-bold">
                            <div>
                              {Math.round(totals.avgHoldingDays).toLocaleString(
                                "en-IN"
                              )}{" "}
                              days
                            </div>
                            {totals.avgHoldingDays >= 30 && (
                              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                {formatHoldingYearsAndDays(
                                  totals.avgHoldingDays
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right text-indigo-400 font-black text-sm">
                            {totals.avgCagr.toFixed(2)}%
                          </td>
                          <td className="py-4 pl-4 text-right pr-4">
                            <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 font-bold uppercase tracking-wider">
                              Summary
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
