import { createPortal } from "react-dom";
import { SlidersHorizontal } from "lucide-react";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import { AUDIT_STATUS_OPTIONS } from "@/helpers/audit";
import type { AuditFilterModalProps } from "@/types/audit";

export default function AuditFilterModal({
  isOpen,
  onClose,
  statusFilters,
  setStatusFilters,
  activityFilter,
  setActivityFilter,
  memberFilter,
  setMemberFilter,
  categoryFilter,
  setCategoryFilter,
  membersList,
  categoriesList,
  onClearAll,
  resultCount,
}: AuditFilterModalProps) {
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
              Audit Tab Filters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs"
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
          {/* Audit Status */}
          <MultiSelectFilter
            label="Audit Status"
            values={statusFilters}
            onChange={setStatusFilters}
            options={AUDIT_STATUS_OPTIONS.map(([val, label]) => ({
              id: val,
              label: label,
            }))}
            allLabel="All Statuses"
            onClear={() => setStatusFilters([])}
          />

          <FilterSectionDivider />

          {/* Activity */}
          <SingleSelectFilter
            label="Folio Activity"
            value={activityFilter}
            onChange={(val) =>
              setActivityFilter(val as "ALL" | "ACTIVE" | "INACTIVE")
            }
            options={[
              { id: "ACTIVE", label: "Active" },
              { id: "INACTIVE", label: "Inactive / Zero Balance" },
            ]}
            allLabel="All Activity"
            allId="ALL"
          />

          <FilterSectionDivider />

          {/* Family Member */}
          <SingleSelectFilter
            label="Family Member"
            value={memberFilter}
            onChange={setMemberFilter}
            options={membersList}
            allLabel="All"
            allId="ALL"
          />

          <FilterSectionDivider />

          {/* Category */}
          <SingleSelectFilter
            label="Fund Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoriesList}
            allLabel="All Categories"
            allId="ALL"
          />
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
          <button
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20"
          >
            Show {resultCount} result{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
