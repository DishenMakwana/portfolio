"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatIndianNumber, formatPct } from "@/helpers/formatters";
import AllocationCardHeader from "./common/AllocationCardHeader";
import AllocationSortTh from "./common/AllocationSortTh";
import type { AllocationEquityCapTableCardProps } from "@/types/allocation";

export default function AllocationEquityCapTableCard({
  isOpen,
  onToggle,
  sortedCap,
  capTotals,
  capSort,
  onSort,
}: AllocationEquityCapTableCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300"
    >
      <AllocationCardHeader
        accent="bg-emerald-400"
        title="Equity Cap for Mutual Fund"
        subtitle="— large cap / mid cap / small cap breakdown per scheme"
        collapsed={!isOpen}
        onToggle={onToggle}
      />
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="equitycap-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40">
                    <AllocationSortTh
                      label="Scheme Name"
                      col="schemeName"
                      sortCol={capSort.col}
                      sortDir={capSort.dir}
                      onSort={onSort}
                      className="text-left text-slate-400 min-w-52"
                    />
                    <AllocationSortTh
                      label="Sub Category"
                      col="subCat"
                      sortCol={capSort.col}
                      sortDir={capSort.dir}
                      onSort={onSort}
                      className="text-left text-slate-400 min-w-36"
                    />
                    <AllocationSortTh
                      label="Equity Large Cap"
                      col="large"
                      sortCol={capSort.col}
                      sortDir={capSort.dir}
                      onSort={onSort}
                      className="text-right text-slate-400"
                    />
                    <AllocationSortTh
                      label="Equity Mid Cap"
                      col="mid"
                      sortCol={capSort.col}
                      sortDir={capSort.dir}
                      onSort={onSort}
                      className="text-right text-slate-400"
                    />
                    <AllocationSortTh
                      label="Equity Small Cap"
                      col="small"
                      sortCol={capSort.col}
                      sortDir={capSort.dir}
                      onSort={onSort}
                      className="text-right text-slate-400"
                    />
                    <AllocationSortTh
                      label="Total"
                      col="total"
                      sortCol={capSort.col}
                      sortDir={capSort.dir}
                      onSort={onSort}
                      className="text-right text-slate-400"
                    />
                    <AllocationSortTh
                      label="Share(%)"
                      col="total"
                      sortCol={capSort.col}
                      sortDir={capSort.dir}
                      onSort={onSort}
                      className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-24"
                    />
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-teal-500 text-slate-950">
                    <td
                      className="px-4 py-3 font-extrabold text-sm"
                      colSpan={2}
                    >
                      Total
                    </td>
                    {[
                      capTotals.large,
                      capTotals.mid,
                      capTotals.small,
                      capTotals.total,
                    ].map((v, i) => (
                      <td
                        key={i}
                        className="px-4 py-3 text-right font-extrabold tabular-nums"
                      >
                        <div>{formatIndianNumber(v)}</div>
                        {capTotals.total > 0 && (
                          <div className="text-[10px] font-semibold opacity-75">
                            ({((v / capTotals.total) * 100).toFixed(2)}%)
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-extrabold bg-teal-600 border-l border-teal-400/30 tabular-nums">
                      100.00
                    </td>
                  </tr>
                  {sortedCap.map((r, i) => (
                    <tr
                      key={r.schemeName}
                      className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${
                        i % 2 === 1 ? "bg-slate-950/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-200 font-medium text-xs">
                        {r.schemeName}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {r.subCat}
                      </td>
                      {[r.large, r.mid, r.small, r.total].map((v, j) => (
                        <td
                          key={j}
                          className="px-4 py-3 text-right tabular-nums text-slate-300 text-xs"
                        >
                          {v > 0 ? formatIndianNumber(v) : "0"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10 text-xs">
                        {formatPct(r.pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
