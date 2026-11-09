"use client";

import { Search, SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
import type { BankDepositToolbarProps } from "@/types/bankDeposit";

export default function BankDepositToolbar({
  filter,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
  allPersonsList,
  allBanksList,
  viewMode,
  onViewModeChange,
  onOpenFilterModal,
}: BankDepositToolbarProps) {
  const selectedPerson = allPersonsList.find((p) => p.id === filter.personId);
  const selectedBank = allBanksList.find((b) => b.id === filter.bankId);

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Within Limit";
      case "NEAR_LIMIT":
        return "Near Limit (≥80%)";
      case "REACHED":
        return "Limit Reached";
      case "EXCEEDED":
        return "Over Deposited";
      default:
        return status;
    }
  };

  const hasAnyFilter =
    activeFilterCount > 0 || (filter.search && filter.search.trim().length > 0);

  return (
    <div className="relative z-30 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm mb-6 space-y-3">
      {/* Controls Row: Search Input & [Ledger | Cards] + [Filters] */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={filter.search || ""}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search person, bank, or comments..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-9 text-xs font-medium text-slate-100 placeholder-slate-500 shadow-inner transition-all focus:border-teal-500/70 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls: [Ledger | Cards] and [Filters] */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          {/* View Mode Toggle: Ledger first, then Cards */}
          <div className="inline-flex rounded-xl border border-slate-700/80 bg-slate-950/90 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onViewModeChange("ledger")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "ledger"
                  ? "bg-teal-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Ledger View"
            >
              <List className="h-3.5 w-3.5" />
              <span>Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("cards")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-teal-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Cards View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>

          {/* Filter Modal Trigger Button */}
          <button
            type="button"
            onClick={onOpenFilterModal}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              activeFilterCount > 0
                ? "border-teal-500/60 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20"
                : "border-slate-700/80 bg-slate-950/80 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 text-teal-400" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-slate-950">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-medium text-slate-400">
            Active filters:
          </span>

          {selectedBank && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/80 px-2.5 py-1 text-slate-200">
              <span className="text-slate-400">Bank:</span>
              <span className="font-semibold text-teal-300">
                {selectedBank.bankName}
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ bankId: 0 })}
                className="hover:text-rose-400 cursor-pointer"
                aria-label="Remove bank filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {selectedPerson && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/80 px-2.5 py-1 text-slate-200">
              <span className="text-slate-400">Person:</span>
              <span className="font-semibold text-teal-300">
                {selectedPerson.name}
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ personId: 0 })}
                className="hover:text-rose-400 cursor-pointer"
                aria-label="Remove person filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {filter.status && filter.status !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/80 px-2.5 py-1 text-slate-200">
              <span className="text-slate-400">Status:</span>
              <span className="font-semibold text-teal-300">
                {getStatusLabel(filter.status)}
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ status: "ALL" })}
                className="hover:text-rose-400 cursor-pointer"
                aria-label="Remove status filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {filter.search && filter.search.trim().length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/80 px-2.5 py-1 text-slate-200">
              <span className="text-slate-400">Search:</span>
              <span className="font-semibold text-teal-300">
                &ldquo;{filter.search}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ search: "" })}
                className="hover:text-rose-400 cursor-pointer"
                aria-label="Remove search query"
              >
                <X size={12} />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onClearFilters}
            className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 hover:underline cursor-pointer ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
