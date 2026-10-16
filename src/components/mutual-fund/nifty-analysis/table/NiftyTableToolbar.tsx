"use client";

import { SlidersHorizontal } from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import type { NiftyTableToolbarProps } from "@/types/nifty-analysis";

export function NiftyTableToolbar({
  searchQuery,
  onSearchChange,
  activeFiltersCount,
  onOpenFilterModal,
  onlyHigher,
  onToggleOnlyHigher,
  tradeMode,
}: NiftyTableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <SearchFilterBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={
          tradeMode === "BUY"
            ? "Search fund name, folio, applicant or purchase type…"
            : "Search fund name, folio, applicant or sell type…"
        }
        className="flex-1 w-full"
      />

      {/* Filter Modal Toggle Button */}
      <button
        type="button"
        onClick={onOpenFilterModal}
        className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
          activeFiltersCount > 0
            ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
            : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Market Timing Quick Toggle */}
      <button
        type="button"
        onClick={onToggleOnlyHigher}
        className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 shrink-0 ${
          onlyHigher
            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
            : "bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            onlyHigher ? "bg-amber-400 animate-pulse" : "bg-slate-600"
          }`}
        />
        <span>
          {tradeMode === "BUY"
            ? "Higher than Current Nifty"
            : "Sold Above Current Nifty"}
        </span>
      </button>
    </div>
  );
}
