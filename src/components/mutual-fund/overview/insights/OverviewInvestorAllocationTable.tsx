"use client";

import { motion } from "framer-motion";
import { formatCurrency, formatPercent } from "@/helpers/formatters";
import DeltaBadge from "@/components/shared/DeltaBadge";
import {
  OVERVIEW_BG_CLASSES,
  type OverviewInvestorAllocationTableProps,
} from "@/types/overview";

export default function OverviewInvestorAllocationTable({
  sortedMembers,
  totalCurrentValue,
  toggleSort,
  renderSortIcon,
}: OverviewInvestorAllocationTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
        <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">
          Investor Allocation
        </h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-950/60">
            <th
              onClick={() => toggleSort("name")}
              className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              Investor {renderSortIcon("name")}
            </th>
            <th
              onClick={() => toggleSort("currentValue")}
              className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              Current Value {renderSortIcon("currentValue")}
            </th>
            <th
              onClick={() => toggleSort("currentValue")}
              className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              Share {renderSortIcon("currentValue")}
            </th>
            <th
              onClick={() => toggleSort("xirr")}
              className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
            >
              XIRR {renderSortIcon("xirr")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {sortedMembers.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-5 py-6 text-center text-slate-500 text-xs"
              >
                No data
              </td>
            </tr>
          ) : (
            sortedMembers.map((m, i) => {
              const share =
                totalCurrentValue > 0
                  ? (m.currentValue / totalCurrentValue) * 100
                  : 0;
              return (
                <tr
                  key={m.name}
                  className={i % 2 === 0 ? "bg-transparent" : "bg-slate-950/30"}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                          OVERVIEW_BG_CLASSES[i % OVERVIEW_BG_CLASSES.length]
                        }`}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-200">
                            {m.name}
                          </span>
                          {(m.accountStatus?.toUpperCase() === "DECEASED" ||
                            m.name === "SHAILESH RAMJIBHAI MAKWANA") && (
                            <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] px-1.5 py-0.2 rounded font-extrabold tracking-wide uppercase">
                              Died
                            </span>
                          )}
                        </div>
                        {m.pan && (
                          <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                            PAN: {m.pan}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-100">
                    {formatCurrency(m.currentValue)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-teal-400 font-semibold">
                      {share.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`font-bold text-xs ${
                        m.xirr === 0
                          ? "text-slate-400"
                          : m.xirr >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                      }`}
                    >
                      {m.xirr !== 0 ? formatPercent(m.xirr) : "0.00%"}
                    </span>
                    <div className="mt-1">
                      {m.xirrDelta !== null && m.xirrDelta !== undefined && (
                        <DeltaBadge delta={m.xirrDelta} label="" />
                      )}
                    </div>
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
