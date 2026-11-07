import {
  Filter,
  ArrowUpDown,
  Table as TableIcon,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import type {
  AnalysisLinksToolbarProps,
  AnalysisLinksSortOrder,
} from "@/types/analysisLinks";

export default function AnalysisLinksToolbar({
  searchQuery,
  onSearchQueryChange,
  selectedCategoryFilter,
  onCategoryFilterChange,
  allCategories,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
}: AnalysisLinksToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
      <div className="flex items-center gap-2.5 flex-1 max-w-md">
        <SearchFilterBar
          value={searchQuery}
          onChange={onSearchQueryChange}
          placeholder="Search title, URL, domain, or notes..."
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Category Filter */}
        <div className="relative flex items-center bg-slate-950/70 border border-slate-800 rounded-lg pl-2.5 pr-6.5 py-1 text-xs">
          <Filter size={13} className="text-slate-400 shrink-0 mr-1.5" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="appearance-none bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">
              All Categories
            </option>
            {allCategories.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-slate-200">
                {c}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {/* Sort Selector */}
        <div className="relative flex items-center bg-slate-950/70 border border-slate-800 rounded-lg pl-2.5 pr-6.5 py-1 text-xs">
          <ArrowUpDown size={13} className="text-slate-400 shrink-0 mr-1.5" />
          <select
            value={sortOrder}
            onChange={(e) =>
              onSortOrderChange(e.target.value as AnalysisLinksSortOrder)
            }
            className="appearance-none bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="newest" className="bg-slate-900 text-slate-200">
              Newest First
            </option>
            <option value="oldest" className="bg-slate-900 text-slate-200">
              Oldest First
            </option>
            <option value="title" className="bg-slate-900 text-slate-200">
              Alphabetical (A-Z)
            </option>
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-950/70 border border-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "table"
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Table View"
          >
            <TableIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("bento")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "bento"
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Bento Grid View"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
