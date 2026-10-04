import {
  Filter,
  ArrowUpDown,
  Table as TableIcon,
  LayoutGrid,
} from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import type { AnalysisLinksToolbarProps } from "@/types/analysisLinks";

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
        <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
          <Filter size={13} className="text-slate-400" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
          <ArrowUpDown size={13} className="text-slate-400" />
          <select
            value={sortOrder}
            onChange={(e) =>
              onSortOrderChange(e.target.value as "newest" | "oldest" | "title")
            }
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
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
