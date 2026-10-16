"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal } from "lucide-react";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import type { NiftyTableFilterModalProps } from "@/types/nifty-analysis";

export function NiftyTableFilterModal({
  open,
  onClose,
  selectedMember,
  onMemberChange,
  membersList,
  availableCategories,
  selectedCategories,
  onCategoriesChange,
  availableTypes,
  selectedTypes,
  onTypesChange,
  onResetAll,
  filteredCount,
}: NiftyTableFilterModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close filter modal on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl h-[85vh] max-h-[640px] flex flex-col bg-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Nifty Transactions Tab Filters
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs cursor-pointer"
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
          {/* Applicant / Family Member Filter */}
          <SingleSelectFilter
            label="Applicant"
            value={selectedMember}
            onChange={onMemberChange}
            options={membersList}
            allLabel="All Applicants"
            allId="all"
          />

          <FilterSectionDivider />

          {/* Fund Category Multi-Select Filter */}
          {availableCategories.length > 0 && (
            <>
              <MultiSelectFilter
                label="Fund Category"
                values={selectedCategories}
                onChange={onCategoriesChange}
                options={availableCategories}
                allLabel="All Categories"
                onClear={() => onCategoriesChange([])}
              />
              <FilterSectionDivider />
            </>
          )}

          {/* Transaction Types Multi-Select Filter */}
          {availableTypes.length > 0 && (
            <MultiSelectFilter
              label="Transaction Types"
              values={selectedTypes}
              onChange={onTypesChange}
              options={availableTypes}
              allLabel="All Types"
              onClear={() => onTypesChange([])}
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 shrink-0 bg-slate-950/80">
          <button
            type="button"
            onClick={onResetAll}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
          >
            Reset All Filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            Apply & View {filteredCount} Record{filteredCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
