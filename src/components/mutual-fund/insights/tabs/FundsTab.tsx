"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Star,
  ChevronDown,
  Users,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { formatInrCompact } from "@/helpers/formatters";
import type { FundsTabProps, SortKey } from "@/types/insights";

const SCHEME_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "scheme", label: "Fund" },
  { key: "category", label: "Category" },
  { key: "invested", label: "Invested" },
  { key: "current", label: "Current" },
  { key: "gain", label: "Gain" },
  { key: "absReturn", label: "Abs %" },
  { key: "avgCagr", label: "CAGR %" },
  { key: "memberCount", label: "Members" },
];

export default function FundsTab({
  schemes,
  filterCategory,
  onFilterChange,
  sort,
  onSort,
  top5Schemes,
  watchlistSchemes,
  expandedSchemes,
  onToggleExpand,
  getCategoryBadgeClass,
  niftyBenchmark = 12,
  totalCount = 0,
  mfCount = 0,
  sifCount = 0,
}: FundsTabProps & {
  niftyBenchmark?: number;
  totalCount?: number;
  mfCount?: number;
  sifCount?: number;
}) {
  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col) {
      return <ChevronsUpDown size={12} className="text-slate-600" />;
    }
    return sort.dir === "asc" ? (
      <ChevronUp size={12} className="text-teal-400" />
    ) : (
      <ChevronDown size={12} className="text-teal-400" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "All", label: "All", count: totalCount },
          { key: "MF", label: "MF", count: mfCount },
          { key: "SIF", label: "SIF", count: sifCount },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onFilterChange(item.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${filterCategory === item.key ? "bg-teal-500/20 text-teal-300 border border-teal-500/40" : "bg-slate-900/50 text-slate-400 border border-slate-800/80 hover:border-slate-700"}`}
          >
            {item.label}
            <span className="ml-1.5 text-xs opacity-60">({item.count})</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          {schemes.length} funds
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-700/50">
                {SCHEME_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
                    onClick={() => onSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {schemes.map((s, i) => {
                const isTop = top5Schemes.has(s.scheme);
                const isWatch = watchlistSchemes.has(s.scheme);
                const isExpanded = expandedSchemes.has(s.scheme);
                const isZeroValue =
                  (s.current ?? 0) <= 0 && (s.invested ?? 0) <= 0;
                const isBelowNifty =
                  !isZeroValue && (isWatch || s.avgCagr < niftyBenchmark);

                // Row background styling:
                // - Zero value fund: distinct muted grey style with slate left border
                // - Underperforming active fund (below Nifty): red highlight with rose left border
                // - Default: standard hover
                const rowBgClass = isZeroValue
                  ? "bg-slate-950/40 text-slate-400 opacity-65 hover:opacity-100 hover:bg-slate-900/60 border-l-2 border-l-slate-700"
                  : isBelowNifty
                    ? "bg-rose-500/10 hover:bg-rose-500/20 border-l-2 border-l-rose-500/80"
                    : "hover:bg-slate-700/20";

                return (
                  <Fragment key={s.scheme}>
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`transition-colors group cursor-pointer ${rowBgClass}`}
                      onClick={() => onToggleExpand(s.scheme)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <p
                              className={`font-semibold leading-snug ${isZeroValue ? "text-slate-400" : "text-slate-200"}`}
                            >
                              {s.scheme}
                              {isTop && (
                                <Star
                                  size={12}
                                  className="inline ml-1 text-amber-400 fill-amber-400"
                                />
                              )}
                              {isZeroValue && (
                                <span className="inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60">
                                  Zero Balance
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap border ${getCategoryBadgeClass(s.category)}`}
                        >
                          {s.category}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-xs ${isZeroValue ? "text-slate-500 font-medium" : "text-slate-400"}`}
                      >
                        {formatInrCompact(s.invested)}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-semibold ${isZeroValue ? "text-slate-500" : "text-slate-200"}`}
                      >
                        {formatInrCompact(s.current)}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-semibold ${isZeroValue ? "text-slate-500" : s.gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {formatInrCompact(s.gain)}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-semibold ${isZeroValue ? "text-slate-500" : "text-slate-300"}`}
                      >
                        {s.absReturn.toFixed(1)}%
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-bold ${isZeroValue ? "text-slate-500" : isBelowNifty ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        {s.avgCagr.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(s.scheme);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer select-none ${isExpanded ? "bg-teal-500/15 border-teal-500/30 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.1)]" : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"}`}
                        >
                          {s.memberCount}{" "}
                          {s.memberCount === 1 ? "member" : "members"}
                          {s.holdings.length > s.memberCount && (
                            <span className="text-[10px] opacity-75 font-normal ml-1">
                              {s.holdings.length}{" "}
                              {s.holdings.length === 1 ? "folio" : "folios"}
                            </span>
                          )}
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={11} />
                          </motion.span>
                        </button>
                      </td>
                    </motion.tr>
                    {isExpanded && (
                      <tr
                        key={`${s.scheme}-expanded`}
                        className="bg-slate-900/40"
                      >
                        <td colSpan={8} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.2,
                              ease: "easeInOut",
                            }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 py-4 flex flex-col gap-3.5 border-t border-slate-800/40 bg-slate-900/10">
                              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                                <Users
                                  size={12}
                                  className="text-teal-400 animate-pulse"
                                />
                                <span>
                                  Holdings Breakdown by Family Member (Click
                                  card for details)
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {s.holdings.map((hold) => {
                                  const isHoldZero =
                                    (hold.current ?? 0) <= 0 &&
                                    (hold.invested ?? 0) <= 0;
                                  return (
                                    <Link
                                      key={hold.holdingId}
                                      href={`/fund/${hold.holdingId}`}
                                      className={`flex flex-col p-3.5 rounded-xl border transition-all duration-200 group shadow-md ${
                                        isHoldZero
                                          ? "border-slate-800 bg-slate-950/30 opacity-70 hover:opacity-100 hover:bg-slate-950/60"
                                          : "border-slate-750 bg-slate-950/40 hover:border-teal-500/50 hover:bg-slate-950/75"
                                      }`}
                                    >
                                      <div className="font-bold text-slate-100 group-hover:text-teal-300 transition-colors break-words text-sm sm:text-base leading-tight flex items-center justify-between">
                                        <span>{hold.memberName}</span>
                                        {isHoldZero && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-400 border border-slate-700/60">
                                            Zero Balance
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-2.5 flex items-center gap-3">
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded font-black shrink-0 ${
                                            isHoldZero
                                              ? "bg-slate-800 text-slate-400 border border-slate-700/60"
                                              : (hold.cagr ?? 0) >=
                                                  niftyBenchmark
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                          }`}
                                        >
                                          {isHoldZero
                                            ? "0.00%"
                                            : hold.cagr !== null &&
                                                hold.cagr !== undefined
                                              ? `${hold.cagr.toFixed(2)}%`
                                              : "-"}{" "}
                                          CAGR
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Folio: {hold.folioNo}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-3 mt-2.5 pt-2.5 border-t border-slate-800/50 text-xs text-slate-400">
                                        <div className="text-left">
                                          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                            Invested
                                          </span>
                                          <span
                                            className={
                                              isHoldZero
                                                ? "text-slate-500"
                                                : "text-slate-300"
                                            }
                                          >
                                            {formatInrCompact(hold.invested)}
                                          </span>
                                        </div>
                                        <div className="text-center">
                                          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                            Current
                                          </span>
                                          <span
                                            className={`font-semibold ${isHoldZero ? "text-slate-500" : "text-slate-300"}`}
                                          >
                                            {formatInrCompact(hold.current)}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                            Gain
                                          </span>
                                          <span
                                            className={`font-bold ${isHoldZero ? "text-slate-500" : hold.gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                                          >
                                            {formatInrCompact(hold.gain)}
                                          </span>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
