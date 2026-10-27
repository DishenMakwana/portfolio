"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  formatCurrency,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import { getCategoryHoldings, getAmcHoldings } from "@/helpers/allocation";
import { getAllocationRowBgClass } from "@/helpers/allocationAnalysis";
import AllocationAnalysisHoldingsBreakdown from "./AllocationAnalysisHoldingsBreakdown";
import type { AllocationAnalysisTableRowProps } from "@/types/insights";

export default function AllocationAnalysisTableRow({
  amc,
  index,
  rank,
  isExpanded,
  onToggleExpand,
  niftyBenchmark,
  entityLabel,
  schemes,
}: AllocationAnalysisTableRowProps) {
  const holdings =
    entityLabel === "Category"
      ? getCategoryHoldings(amc.name, schemes)
      : getAmcHoldings(amc.name, schemes);
  const folioCount = holdings.length;
  const isZeroValue = (amc.current ?? 0) <= 0.0001;
  const isBelowNifty = !isZeroValue && amc.cagr < niftyBenchmark;
  const rowBgClass = getAllocationRowBgClass(isZeroValue, isBelowNifty);

  return (
    <Fragment>
      <motion.tr
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
        className={`transition-colors group cursor-pointer ${rowBgClass}`}
        onClick={() => {
          if (folioCount > 0) onToggleExpand();
        }}
      >
        <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">
          {rank ?? "-"}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <p
                className={`font-semibold leading-snug ${
                  isZeroValue ? "text-slate-400" : "text-slate-200"
                }`}
              >
                {amc.name}
                {isZeroValue && (
                  <span className="inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60">
                    Zero Balance
                  </span>
                )}
              </p>
            </div>
          </div>
        </td>
        <td
          className={`px-4 py-3 text-xs ${
            isZeroValue
              ? "text-slate-500 font-medium"
              : "text-slate-400 font-medium"
          }`}
        >
          {amc.weight.toFixed(1)}%
        </td>
        <td
          className={`px-4 py-3 text-xs ${
            isZeroValue ? "text-slate-500 font-medium" : "text-slate-400"
          }`}
        >
          {formatCurrency(amc.invested)}
        </td>
        <td
          className={`px-4 py-3 text-xs font-semibold ${
            isZeroValue ? "text-slate-500" : "text-slate-200"
          }`}
        >
          {formatCurrency(amc.current)}
        </td>
        <td
          className={`px-4 py-3 text-xs font-semibold ${
            isZeroValue
              ? "text-slate-500"
              : amc.gain >= 0
                ? "text-emerald-400"
                : "text-rose-400"
          }`}
        >
          {formatCurrency(amc.gain)}
        </td>
        <td
          className={`px-4 py-3 text-xs font-semibold ${
            isZeroValue ? "text-slate-500" : "text-slate-300"
          }`}
        >
          {amc.absReturn.toFixed(1)}%
        </td>
        <td
          className={`px-4 py-3 text-xs font-bold ${
            isZeroValue
              ? "text-slate-500"
              : amc.cagr >= 0
                ? "text-emerald-400"
                : "text-rose-400"
          }`}
        >
          {amc.cagr.toFixed(2)}%
        </td>
        <td
          className={`px-4 py-3 text-xs font-bold ${
            isZeroValue
              ? "text-slate-500"
              : (amc.xirr ?? 0) < niftyBenchmark
                ? "text-rose-400"
                : "text-emerald-400"
          }`}
        >
          {amc.xirr !== null && amc.xirr !== undefined
            ? `${amc.xirr.toFixed(2)}%`
            : "-"}
        </td>
        <td
          className={`px-4 py-3 text-xs ${
            isZeroValue ? "text-slate-500 font-medium" : "text-slate-400"
          }`}
        >
          {formatHoldingYearsAndDays(amc.avgHoldingDays)}
        </td>
        <td className="px-4 py-3 text-center">
          {folioCount > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer select-none ${
                isExpanded
                  ? "bg-teal-500/15 border-teal-500/30 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.1)]"
                  : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {folioCount} {folioCount === 1 ? "folio" : "folios"}
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={11} />
              </motion.span>
            </button>
          ) : (
            <span className="text-xs text-slate-600">-</span>
          )}
        </td>
      </motion.tr>

      {isExpanded && holdings.length > 0 && (
        <tr key={`${amc.name}-expanded`} className="bg-slate-900/40">
          <td colSpan={11} className="p-0">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
              className="overflow-hidden w-full"
            >
              <AllocationAnalysisHoldingsBreakdown
                holdings={holdings}
                entityName={amc.name}
                niftyBenchmark={niftyBenchmark}
              />
            </motion.div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
