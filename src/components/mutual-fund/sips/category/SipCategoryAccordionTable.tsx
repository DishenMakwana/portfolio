"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  getFundDetailsUrl,
} from "@/helpers/formatters";
import type {
  SipCategoryAccordionTableProps,
  CategorySipItem,
} from "@/types/sips";

export default function SipCategoryAccordionTable({
  categories,
  expandedCategory,
  onToggleCategory,
  onSelectFund,
}: SipCategoryAccordionTableProps) {
  return (
    <div className="lg:col-span-7 bg-slate-950/50 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 bg-slate-950/70">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
          Category Allocation Breakdown
        </h4>
        <span className="text-[11px] text-slate-400">
          Click category to view schemes
        </span>
      </div>

      <div className="divide-y divide-slate-800/50">
        {categories.map((cat: CategorySipItem, idx: number) => {
          const isExpanded = expandedCategory === cat.category;
          return (
            <div
              key={cat.category}
              className={`transition-colors ${idx % 2 === 0 ? "bg-transparent" : "bg-slate-900/20"}`}
            >
              {/* Category Header Row */}
              <div
                onClick={() => onToggleCategory(cat.category)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/30 transition select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">
                        {cat.category}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                        {cat.activeCount} Active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="font-extrabold text-sm text-slate-100">
                      {formatCurrency(cat.monthlyAmount)}
                      <span className="text-[10px] font-normal text-slate-400">
                        {" "}
                        / mo
                      </span>
                    </div>
                    <div className="text-xs font-bold text-teal-400">
                      {formatPercent(cat.pct)}
                    </div>
                  </div>

                  <div className="w-14 hidden sm:block">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(cat.pct, 3)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>

                  <ChevronDown
                    size={15}
                    className={`text-slate-400 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-teal-400" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Expandable Scheme List */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-800/60 bg-slate-950/80 px-4 py-3"
                  >
                    <div className="space-y-2">
                      {cat.funds.map((f, fIdx) => {
                        const fundUrl = f.holdingId
                          ? getFundDetailsUrl(f.holdingId)
                          : f.txId
                            ? getFundDetailsUrl(f.txId, true)
                            : null;

                        return (
                          <div
                            key={`${f.schemeName}-${f.folioNo}-${fIdx}`}
                            onClick={() => {
                              if (fundUrl) onSelectFund(fundUrl);
                            }}
                            className={`flex items-center justify-between text-xs bg-slate-900/70 border border-slate-800/70 rounded-xl px-3.5 py-2.5 transition ${
                              fundUrl
                                ? "cursor-pointer hover:border-teal-500/40 hover:bg-slate-850/90 group"
                                : ""
                            }`}
                          >
                            <div className="min-w-0 pr-3">
                              <div
                                className={`font-bold text-slate-200 truncate ${
                                  fundUrl
                                    ? "group-hover:text-teal-400 group-hover:underline underline-offset-2 transition-colors"
                                    : ""
                                }`}
                              >
                                {f.schemeName}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="font-semibold text-slate-300">
                                  {f.memberName}
                                </span>
                                {f.folioNo && (
                                  <>
                                    <span>•</span>
                                    <span>Folio: {f.folioNo}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-bold text-slate-100">
                                {formatCurrency(f.monthlyAmount)}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {" "}
                                  / mo
                                </span>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                                  f.isActive
                                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                    : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                                }`}
                              >
                                {f.isActive ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
                                    Active
                                  </>
                                ) : (
                                  "Paused"
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
