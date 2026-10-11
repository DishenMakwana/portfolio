"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Info, CheckSquare, Square } from "lucide-react";
import type { AllocationFilterBarProps } from "@/types/allocation";

export default function AllocationFilterBar({
  asOfDate,
  allMembers,
  selectedInvestors,
  investorOpen,
  onToggleDropdown,
  onToggleInvestor,
  onApply,
  isAllSelected,
  investorLabel,
}: AllocationFilterBarProps) {
  return (
    <div
      className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 shadow-xl space-y-4 relative z-30 hover:border-slate-700/80 transition-all duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Info size={14} className="text-teal-400 shrink-0" />
        <span>
          View detailed allocation analysis of your current investments.
        </span>
        {asOfDate && (
          <span className="ml-1 text-teal-400 font-medium">
            As of {asOfDate}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Investor dropdown */}
        <div className="w-full max-w-[420px] relative">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Investor :
          </label>
          <button
            onClick={onToggleDropdown}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 hover:border-slate-600 transition-all cursor-pointer"
          >
            <span className="truncate">{investorLabel}</span>
            <ChevronDown
              size={15}
              className={`shrink-0 text-slate-400 transition-transform ${
                investorOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {investorOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute z-50 top-full left-0 mt-1 w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
              >
                <button
                  onClick={() => onToggleInvestor("all")}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-800 transition cursor-pointer"
                >
                  {isAllSelected ? (
                    <CheckSquare size={15} className="text-teal-400 shrink-0" />
                  ) : (
                    <Square size={15} className="text-slate-500 shrink-0" />
                  )}
                  <span
                    className={
                      isAllSelected
                        ? "text-teal-300 font-semibold"
                        : "text-slate-300"
                    }
                  >
                    All Selected
                  </span>
                </button>
                <div className="border-t border-slate-800" />
                {allMembers.map((name) => (
                  <button
                    key={name}
                    onClick={() => onToggleInvestor(name)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-800 transition cursor-pointer border-t border-slate-800/60"
                  >
                    {selectedInvestors.has(name) ? (
                      <CheckSquare
                        size={15}
                        className="text-teal-400 shrink-0"
                      />
                    ) : (
                      <Square size={15} className="text-slate-500 shrink-0" />
                    )}
                    <span
                      className={
                        selectedInvestors.has(name)
                          ? "text-teal-300 font-semibold"
                          : "text-slate-300"
                      }
                    >
                      {name}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <button
            onClick={onApply}
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg hover:shadow-teal-500/10 active:scale-[0.98] transition-all cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
