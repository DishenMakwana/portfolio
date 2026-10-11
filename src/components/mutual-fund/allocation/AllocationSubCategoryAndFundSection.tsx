"use client";

import { motion } from "framer-motion";
import { formatIndianNumber, formatPct } from "@/helpers/formatters";
import AllocationCardHeader from "./common/AllocationCardHeader";
import AllocationSortTh from "./common/AllocationSortTh";
import AllocationTotalRow from "./common/AllocationTotalRow";
import type { AllocationSubCategoryAndFundSectionProps } from "@/types/allocation";

export default function AllocationSubCategoryAndFundSection({
  grandTotal,
  sortedSubCat,
  subCatSort,
  onSubCatSort,
  sortedAmc,
  amcSort,
  onAmcSort,
}: AllocationSubCategoryAndFundSectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Sub Category Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
      >
        <AllocationCardHeader
          accent="bg-teal-400"
          title="Sub Category"
          subtitle="— allocation by sub-category"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <AllocationSortTh
                  label="Sub Category"
                  col="name"
                  sortCol={subCatSort.col}
                  sortDir={subCatSort.dir}
                  onSort={onSubCatSort}
                  className="text-left text-slate-400"
                />
                <AllocationSortTh
                  label="Amount"
                  col="value"
                  sortCol={subCatSort.col}
                  sortDir={subCatSort.dir}
                  onSort={onSubCatSort}
                  className="text-right text-slate-400"
                />
                <AllocationSortTh
                  label="Share(%)"
                  col="value"
                  sortCol={subCatSort.col}
                  sortDir={subCatSort.dir}
                  onSort={onSubCatSort}
                  className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28"
                />
              </tr>
            </thead>
            <tbody>
              <AllocationTotalRow
                cells={["Total", formatIndianNumber(grandTotal), "100.00"]}
              />
              {sortedSubCat.map((s, i) => (
                <tr
                  key={s.name}
                  className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${
                    i % 2 === 1 ? "bg-slate-950/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-slate-200 font-medium text-sm">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {formatIndianNumber(s.value)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10">
                    {formatPct(s.pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Fund Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
      >
        <AllocationCardHeader
          accent="bg-teal-400"
          title="Fund"
          subtitle="— allocation by fund house"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <AllocationSortTh
                  label="Fund"
                  col="name"
                  sortCol={amcSort.col}
                  sortDir={amcSort.dir}
                  onSort={onAmcSort}
                  className="text-left text-slate-400"
                />
                <AllocationSortTh
                  label="Amount"
                  col="value"
                  sortCol={amcSort.col}
                  sortDir={amcSort.dir}
                  onSort={onAmcSort}
                  className="text-right text-slate-400"
                />
                <AllocationSortTh
                  label="Share(%)"
                  col="value"
                  sortCol={amcSort.col}
                  sortDir={amcSort.dir}
                  onSort={onAmcSort}
                  className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28"
                />
              </tr>
            </thead>
            <tbody>
              <AllocationTotalRow
                cells={["Total", formatIndianNumber(grandTotal), "100.00"]}
              />
              {sortedAmc.map((a, i) => (
                <tr
                  key={a.name}
                  className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${
                    i % 2 === 1 ? "bg-slate-950/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-slate-200 font-medium text-sm">
                    {a.name}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {formatIndianNumber(a.value)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10">
                    {formatPct(a.pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
