import { createPortal } from "react-dom";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import {
  SingleSelectFilter,
  MultiSelectFilter,
} from "@/components/shared/filters/CommonFilterComponents";
import type {
  MappingFilterModalProps,
  MappingSortField,
  MappingStatusFilter,
  SchemeHoldingFilter,
} from "@/types/mapping";

export default function MappingFilterModal({
  isOpen,
  onClose,
  mappingFilter,
  onMappingFilterChange,
  holdingFilter,
  onHoldingFilterChange,
  categoryFilters,
  onCategoryChange,
  onCategoryClear,
  categoryOptions,
  sortField,
  sortOrder,
  onSortChange,
  onOrderChange,
  onClearAll,
  filteredCount,
  totalCount,
  mappedCount,
  unmappedCount,
  activeHoldingSchemesCount,
  soldHoldingSchemesCount,
}: MappingFilterModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-xl h-[85vh] max-h-[640px] flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">
              Scheme Mapping Tab Filters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs cursor-pointer"
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
          {/* Mapping Status */}
          <SingleSelectFilter
            label="Mapping Status"
            value={mappingFilter}
            onChange={(val) =>
              onMappingFilterChange(val as MappingStatusFilter)
            }
            options={[
              { id: "mapped", label: `Mapped (${mappedCount})` },
              { id: "unmapped", label: `Unmapped (${unmappedCount})` },
            ]}
            allLabel={`All Schemes (${totalCount})`}
            allId="all"
          />

          <div className="h-px bg-slate-800/60" />

          {/* Holding Status */}
          <SingleSelectFilter
            label="Holding Status"
            value={holdingFilter}
            onChange={(val) =>
              onHoldingFilterChange(val as SchemeHoldingFilter)
            }
            options={[
              {
                id: "active",
                label: `Active Holdings (${activeHoldingSchemesCount})`,
              },
              {
                id: "sold",
                label: `Sold / Zero Balance (${soldHoldingSchemesCount})`,
              },
            ]}
            allLabel={`All Schemes (${totalCount})`}
            allId="all"
          />

          <div className="h-px bg-slate-800/60" />

          {/* Category */}
          <MultiSelectFilter
            label="Fund Category"
            values={categoryFilters}
            onChange={onCategoryChange}
            options={categoryOptions.map((c) => ({ id: c, label: c }))}
            allLabel="All Categories"
            onClear={onCategoryClear}
          />

          <div className="h-px bg-slate-800/60" />

          {/* Sort Options */}
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>Sort By</span>
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(
                [
                  { id: "name", label: "Scheme Name" },
                  { id: "category", label: "Category" },
                  { id: "status", label: "Mapping Status" },
                  { id: "code", label: "Scheme Code" },
                  { id: "activeFolios", label: "Active Folios" },
                  { id: "soldFolios", label: "Sold Folios" },
                ] as const
              ).map((field) => (
                <button
                  key={field.id}
                  onClick={() => onSortChange(field.id as MappingSortField)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    sortField === field.id
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/50"
                      : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  <span>{field.label}</span>
                  {sortField === field.id && (
                    <span className="text-[10px] text-teal-400 uppercase font-bold">
                      {sortOrder}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(["asc", "desc"] as const).map((order) => (
                <button
                  key={order}
                  onClick={() => onOrderChange(order)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    sortOrder === order
                      ? "bg-slate-800 text-teal-300 border-teal-500/40"
                      : "bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-300"
                  }`}
                >
                  {order === "asc" ? "Ascending (A-Z)" : "Descending (Z-A)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            Show {filteredCount} result{filteredCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
