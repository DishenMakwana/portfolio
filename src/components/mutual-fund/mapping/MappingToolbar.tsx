import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import type { MappingSortField, MappingToolbarProps } from "@/types/mapping";

export default function MappingToolbar({
  searchVal,
  setSearchVal,
  activeFilterCount,
  onOpenFilterPanel,
  mappingFilter,
  onMappingFilterChange,
  holdingFilter,
  onHoldingFilterChange,
  categoryFilters,
  onCategoryToggle,
  sortField,
  sortOrder,
  onResetSort,
  onClearAll,
}: MappingToolbarProps) {
  const chips: ReactNode[] = [];

  if (mappingFilter !== "all") {
    chips.push(
      <span
        key="status"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
      >
        🔖 {mappingFilter === "mapped" ? "Mapped" : "Unmapped"}
        <button
          onClick={() => onMappingFilterChange("all")}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label="Remove status filter"
        >
          ✕
        </button>
      </span>
    );
  }

  if (holdingFilter !== "all") {
    chips.push(
      <span
        key="holding"
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
          holdingFilter === "active"
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
        }`}
      >
        💼{" "}
        {holdingFilter === "active" ? "Active Holdings" : "Sold / Zero Balance"}
        <button
          onClick={() => onHoldingFilterChange("all")}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label="Remove holding status filter"
        >
          ✕
        </button>
      </span>
    );
  }

  categoryFilters.forEach((cat) => {
    chips.push(
      <span
        key={`cat-${cat}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
      >
        🏷 {cat}
        <button
          onClick={() => onCategoryToggle(cat)}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label={`Remove ${cat} filter`}
        >
          ✕
        </button>
      </span>
    );
  });

  if (sortField !== "name" || sortOrder !== "asc") {
    const sortLabelMap: Record<MappingSortField, string> = {
      name: "Name",
      category: "Category",
      status: "Status",
      code: "Code",
      activeFolios: "Active Folios",
      soldFolios: "Sold Folios",
    };
    chips.push(
      <span
        key="sort"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
      >
        ↕ Sort: {sortLabelMap[sortField]} ({sortOrder.toUpperCase()})
        <button
          onClick={onResetSort}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label="Reset sort"
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
      {/* Toolbar row */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <SearchFilterBar
          value={searchVal}
          onChange={setSearchVal}
          placeholder="Search scheme name, category, or code…"
          className="flex-1"
        />

        {/* Filters button */}
        <button
          onClick={onOpenFilterPanel}
          className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            activeFilterCount > 0
              ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
              : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {(chips.length > 0 || searchVal) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/40">
          <span className="text-[10px] text-slate-500 font-medium mr-1">
            Active:
          </span>
          {chips}
          <button
            onClick={onClearAll}
            className="text-[10px] text-slate-400 hover:text-slate-200 transition underline underline-offset-2 ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
