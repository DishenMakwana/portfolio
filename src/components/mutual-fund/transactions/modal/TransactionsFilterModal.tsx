import { createPortal } from "react-dom";
import { SlidersHorizontal } from "lucide-react";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import type {
  TransactionsFilterModalProps,
  TaxGainFilter,
} from "@/types/transactions";

export default function TransactionsFilterModal({
  isOpen,
  onClose,
  memberFilter,
  onMemberChange,
  memberOptions,
  typeFilters,
  onTypeToggle,
  typeOptions,
  onClearTypes,
  categoryFilters,
  onCategoryToggle,
  categoryOptions,
  onClearCategories,
  taxFilter,
  onTaxChange,
  taxCounts,
  sttFilter,
  onSttChange,
  onClearAll,
  filteredCount,
}: TransactionsFilterModalProps) {
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
              Transactions Tab Filters
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
          {/* Applicant */}
          <SingleSelectFilter
            label="Applicant"
            value={memberFilter}
            onChange={onMemberChange}
            options={memberOptions}
            allLabel="All Applicants"
            allId="All"
          />

          <FilterSectionDivider />

          {/* Transaction Type */}
          <MultiSelectFilter
            label="Transaction Type"
            values={typeFilters}
            onChange={(types) => {
              // Handle types array
              types.forEach((t) => {
                if (!typeFilters.includes(t)) onTypeToggle(t);
              });
              typeFilters.forEach((t) => {
                if (!types.includes(t)) onTypeToggle(t);
              });
            }}
            options={typeOptions}
            allLabel="All Types"
            onClear={onClearTypes}
          />

          <FilterSectionDivider />

          {/* Sub Category */}
          <MultiSelectFilter
            label="Fund Category"
            values={categoryFilters}
            onChange={(cats) => {
              cats.forEach((c) => {
                if (!categoryFilters.includes(c)) onCategoryToggle(c);
              });
              categoryFilters.forEach((c) => {
                if (!cats.includes(c)) onCategoryToggle(c);
              });
            }}
            options={categoryOptions}
            allLabel="All Categories"
            onClear={onClearCategories}
          />

          <FilterSectionDivider />

          {/* Tax Horizon (LTCG / STCG) */}
          <SingleSelectFilter
            label="Tax Horizon (Holding Period)"
            value={taxFilter}
            onChange={(val) => onTaxChange(val as TaxGainFilter)}
            options={[
              {
                id: "LTCG",
                label: "LTCG (> 1 Year / 365 Days)",
                count: taxCounts.ltcg,
              },
              {
                id: "STCG",
                label: "STCG (≤ 1 Year / 365 Days)",
                count: taxCounts.stcg,
              },
            ]}
            allLabel="All Tax Horizons"
            allId="All"
          />

          <FilterSectionDivider />

          {/* STT Status */}
          <SingleSelectFilter
            label="STT Status"
            value={sttFilter}
            onChange={(val) => onSttChange(val as "All" | "Charged" | "Zero")}
            options={[
              { id: "Charged", label: "STT Charged (> ₹0)" },
              { id: "Zero", label: "No STT (₹0)" },
            ]}
            allLabel="All STT Status"
            allId="All"
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
            Show {filteredCount} result{filteredCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
