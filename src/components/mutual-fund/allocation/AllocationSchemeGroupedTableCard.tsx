"use client";

import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatIndianNumber, formatPct } from "@/helpers/formatters";
import AllocationCardHeader from "./common/AllocationCardHeader";
import AllocationTotalRow from "./common/AllocationTotalRow";
import type { AllocationSchemeGroupedTableCardProps } from "@/types/allocation";

export default function AllocationSchemeGroupedTableCard({
  isOpen,
  onToggle,
  grandTotal,
  schemeGrouped,
}: AllocationSchemeGroupedTableCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300"
    >
      <AllocationCardHeader
        accent="bg-violet-400"
        title="Scheme / Scrip"
        subtitle="— grouped by sub-category with sub-totals"
        collapsed={!isOpen}
        onToggle={onToggle}
      />
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="schemescrip-body"
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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">
                      Scheme / Scrip
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28 whitespace-nowrap">
                      Share(%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AllocationTotalRow
                    cells={[
                      "Grand Total :",
                      formatIndianNumber(grandTotal),
                      "100.00",
                    ]}
                  />
                  {schemeGrouped.map((group) => (
                    <Fragment key={group.subCat}>
                      <tr className="border-t border-slate-700/50 bg-slate-800/40">
                        <td
                          colSpan={3}
                          className="px-5 py-2.5 text-sm font-bold text-teal-400"
                        >
                          {group.subCat}
                        </td>
                      </tr>
                      {group.funds.map((f) => (
                        <tr
                          key={f.name}
                          className="border-t border-slate-800/30 hover:bg-slate-800/20 transition"
                        >
                          <td className="px-8 py-2.5 text-slate-300 text-xs">
                            {f.name}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-slate-300 text-xs">
                            {formatIndianNumber(f.value)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-400 text-xs border-l border-teal-500/10 w-28">
                            {formatPct(f.pct)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-700/60 bg-slate-900/60 font-bold">
                        <td className="px-5 py-2.5 text-xs text-slate-400">
                          Sub Total :
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-slate-300 text-xs">
                          {formatIndianNumber(group.subTotal)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-300 text-xs bg-teal-500/5 border-l border-teal-500/10 w-28">
                          {formatPct(group.pct)}
                        </td>
                      </tr>
                    </Fragment>
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
