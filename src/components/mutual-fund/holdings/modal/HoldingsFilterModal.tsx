"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import type {
  HoldingsFilterModalProps,
  HoldingStatusFilter,
  HoldingsCategoryFilters,
} from "@/types/holdings";

const PLAN_OPTIONS = [
  { id: "MF", label: "Mutual Fund (MF)" },
  { id: "SIF", label: "Specialized (SIF)" },
];

const STATUS_OPTIONS = [
  { id: "active", label: "Active Folios" },
  { id: "inactive", label: "Inactive / Sold" },
];

export default function HoldingsFilterModal({
  isOpen,
  onClose,
  memberFilter,
  memberOptions,
  planFilter,
  statusFilter,
  categoryFilters,
  categoryOptions,
  onApply,
}: HoldingsFilterModalProps) {
  // Local draft state buffered until user clicks "Show results"
  const [draftMember, setDraftMember] = useState(memberFilter);
  const [draftPlan, setDraftPlan] = useState(planFilter);
  const [draftStatus, setDraftStatus] =
    useState<HoldingStatusFilter>(statusFilter);
  const [draftCategories, setDraftCategories] =
    useState<HoldingsCategoryFilters>(categoryFilters);

  useEffect(() => {
    if (isOpen) {
      setDraftMember(memberFilter);
      setDraftPlan(planFilter);
      setDraftStatus(statusFilter);
      setDraftCategories(categoryFilters);
    }
  }, [isOpen, memberFilter, planFilter, statusFilter, categoryFilters]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleClearAll = () => {
    setDraftMember("All");
    setDraftPlan("All");
    setDraftStatus("all");
    setDraftCategories([]);
  };

  const handleApply = () => {
    onApply({
      member: draftMember,
      plan: draftPlan,
      status: draftStatus,
      categories: draftCategories,
    });
    onClose();
  };

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
              Holdings Tab Filters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition cursor-pointer"
            aria-label="Close filters"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
          {/* Applicant */}
          <SingleSelectFilter
            label="Applicant"
            value={draftMember}
            onChange={setDraftMember}
            options={memberOptions}
            allLabel="All Applicants"
            allId="All"
          />

          <FilterSectionDivider />

          {/* Plan Type */}
          <SingleSelectFilter
            label="Plan Type"
            value={draftPlan}
            onChange={setDraftPlan}
            options={PLAN_OPTIONS}
            allLabel="All Plans"
            allId="All"
          />

          <FilterSectionDivider />

          {/* Status */}
          <SingleSelectFilter
            label="Folio Status"
            value={draftStatus}
            onChange={(val) => setDraftStatus(val as HoldingStatusFilter)}
            options={STATUS_OPTIONS}
            allLabel="All Folios"
            allId="all"
          />

          <FilterSectionDivider />

          {/* Category */}
          <MultiSelectFilter
            label="Fund Category"
            values={draftCategories}
            onChange={setDraftCategories}
            options={categoryOptions}
            allLabel="All Categories"
            onClear={() => setDraftCategories([])}
          />
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition cursor-pointer"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            Show results
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
