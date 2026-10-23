"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/helpers/formatters";
import {
  OVERVIEW_BG_CLASSES,
  type OverviewCategoryBreakdownTableProps,
} from "@/types/overview";

export default function OverviewCategoryBreakdownTable({
  sortedSubCats,
  totalCurrentValue,
  categoryPerfMap,
  toggleCatSort,
  renderCatSortIcon,
}: OverviewCategoryBreakdownTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
        <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">
          Category Allocation Breakdown
        </h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-950/60">
            <th
              onClick={() => toggleCatSort("name")}
              className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              Category {renderCatSortIcon("name")}
            </th>
            <th
              onClick={() => toggleCatSort("value")}
              className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              Current Value {renderCatSortIcon("value")}
            </th>
            <th
              onClick={() => toggleCatSort("value")}
              className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              Share {renderCatSortIcon("value")}
            </th>
            <th
              onClick={() => toggleCatSort("absReturn")}
              className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              Abs Return {renderCatSortIcon("absReturn")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {sortedSubCats.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-5 py-6 text-center text-slate-500 text-xs"
              >
                No data
              </td>
            </tr>
          ) : (
            sortedSubCats.map((cat, i) => {
              const share =
                totalCurrentValue > 0
                  ? (cat.value / totalCurrentValue) * 100
                  : 0;
              const absReturn = categoryPerfMap.get(cat.name) ?? null;
              return (
                <tr
                  key={cat.name}
                  className={i % 2 === 0 ? "bg-transparent" : "bg-slate-950/30"}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          OVERVIEW_BG_CLASSES[i % OVERVIEW_BG_CLASSES.length]
                        }`}
                      />
                      <span className="font-semibold text-slate-200">
                        {cat.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-100">
                    {formatCurrency(cat.value)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-violet-400 font-semibold">
                      {share.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {absReturn !== null ? (
                      <span
                        className={`font-semibold ${
                          absReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {absReturn >= 0 ? "+" : ""}
                        {absReturn.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </motion.div>
  );
}
