"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import type { HoldingsToolbarProps } from "@/types/holdings";

export default function HoldingsToolbar({
  searchValue,
  onSearchChange,
  onOpenFilters,
  memberFilter,
  onMemberChange,
  planFilter,
  onPlanChange,
  statusFilter,
  onStatusChange,
  categoryFilters,
  onCategoryToggle,
  onClearAll,
}: HoldingsToolbarProps) {
  const activeCount =
    (memberFilter !== "All" ? 1 : 0) +
    (planFilter !== "All" ? 1 : 0) +
    (statusFilter !== "active" ? 1 : 0) +
    categoryFilters.length;

  const chips: ReactNode[] = [];

  if (memberFilter !== "All") {
    chips.push(
      <span
        key="member"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
      >
        👤 {memberFilter}
        <button
          onClick={() => onMemberChange("All")}
          className="hover:opacity-70 transition ml-0.5"
          aria-label="Remove member filter"
        >
          ✕
        </button>
      </span>
    );
  }

  if (planFilter !== "All") {
    chips.push(
      <span
        key="plan"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
      >
        📦 {planFilter === "MF" ? "Mutual Fund" : "Specialized (SIF)"}
        <button
          onClick={() => onPlanChange("All")}
          className="hover:opacity-70 transition ml-0.5"
          aria-label="Remove plan filter"
        >
          ✕
        </button>
      </span>
    );
  }

  if (statusFilter !== "active") {
    chips.push(
      <span
        key="status"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
      >
        🔖 {statusFilter === "inactive" ? "Inactive / Sold" : "All Folios"}
        <button
          onClick={() => onStatusChange("active")}
          className="hover:opacity-70 transition ml-0.5"
          aria-label="Remove status filter"
        >
          ✕
        </button>
      </span>
    );
  }

  categoryFilters.forEach((cat) =>
    chips.push(
      <span
        key={`cat-${cat}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
      >
        🏷 {cat}
        <button
          onClick={() => onCategoryToggle(cat)}
          className="hover:opacity-70 transition ml-0.5"
          aria-label={`Remove ${cat} filter`}
        >
          ✕
        </button>
      </span>
    )
  );

  return (
    <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
      {/* Toolbar row */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <SearchFilterBar
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search scheme, folio or applicant…"
          className="flex-1"
        />

        {/* Filters button */}
        <button
          onClick={onOpenFilters}
          className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
            activeCount > 0
              ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
              : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips — inside the same card */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/50">
          {chips}
          <button
            onClick={onClearAll}
            className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
