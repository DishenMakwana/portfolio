"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { formatIndianNumber } from "@/utils/formatters";
import AllocationCardHeader from "./common/AllocationCardHeader";
import AllocationSortTh from "./common/AllocationSortTh";
import type {
  AllocationTopHoldingsScripCardProps,
  TopItemLimit,
} from "@/types/allocation";

function AllocationTopHoldingsScripCard({
  isOpen,
  onToggle,
  scrips,
  sortCol,
  sortDir,
  onSort,
  limit,
  onLimitChange,
}: AllocationTopHoldingsScripCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300"
    >
      <AllocationCardHeader
        accent="bg-teal-400"
        title={`By Scrip (Top ${limit})`}
        subtitle={`— weighted top ${limit} company holdings across active folios`}
        collapsed={!isOpen}
        onToggle={onToggle}
        rightAction={
          <div className="relative inline-flex items-center">
            <select
              value={limit}
              onChange={(e) =>
                onLimitChange(Number(e.target.value) as TopItemLimit)
              }
              aria-label="Select number of top scrips to display"
              className="appearance-none bg-slate-950/80 hover:bg-slate-950 border border-slate-700/80 hover:border-teal-500/50 focus:border-teal-400 text-slate-200 text-xs font-semibold rounded-lg pl-2.5 pr-6 py-1 outline-none transition cursor-pointer shadow-inner"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 pointer-events-none text-slate-400"
            />
          </div>
        }
      />
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="scrips-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto max-h-[462px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 shadow-sm">
                  <tr className="border-b border-slate-800 bg-slate-950/80">
                    <th className="px-3 py-3 w-10 text-center text-slate-500 font-bold text-xs">
                      #
                    </th>
                    <AllocationSortTh
                      label={`By Scrip (Top ${limit})`}
                      col="name"
                      sortCol={sortCol}
                      sortDir={sortDir}
                      onSort={onSort}
                      className="text-left text-slate-400"
                    />
                    <AllocationSortTh
                      label="Amount"
                      col="amount"
                      sortCol={sortCol}
                      sortDir={sortDir}
                      onSort={onSort}
                      className="text-right text-slate-400"
                    />
                    <AllocationSortTh
                      label="Share(%)"
                      col="sharePct"
                      sortCol={sortCol}
                      sortDir={sortDir}
                      onSort={onSort}
                      className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-32"
                    />
                  </tr>
                </thead>
                <tbody>
                  {scrips.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-slate-500 text-xs"
                      >
                        No underlying portfolio holdings available for the
                        selected folios.
                      </td>
                    </tr>
                  ) : (
                    scrips.map((s, i) => (
                      <tr
                        key={`${s.name}-${i}`}
                        className={`border-t border-slate-800/60 hover:bg-slate-800/20 transition ${
                          i % 2 === 1 ? "bg-slate-950/20" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-center text-slate-500 font-medium text-xs tabular-nums">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium text-xs">
                          <span className="font-semibold text-slate-100">
                            {s.name}
                          </span>
                          {s.sector && (
                            <span className="ml-2 text-[10px] text-slate-500 font-normal">
                              ({s.sector})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200 tabular-nums font-medium">
                          {formatIndianNumber(s.amount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10">
                          {s.sharePct.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(AllocationTopHoldingsScripCard);
