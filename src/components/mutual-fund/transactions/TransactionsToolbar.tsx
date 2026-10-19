import type { ReactNode } from "react";
import {
  Calendar,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import type { TransactionsToolbarProps } from "@/types/transactions";

export default function TransactionsToolbar({
  searchVal,
  onSearchChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDate,
  onPresetRange,
  onOpenFilterModal,
  activeFilterCount,
  memberFilter,
  taxFilter,
  typeFilters,
  categoryFilters,
  sttFilter,
  onRemoveMemberFilter,
  onRemoveTaxFilter,
  onRemoveTypeFilter,
  onRemoveCategoryFilter,
  onRemoveSttFilter,
  onClearAllFilters,
}: TransactionsToolbarProps) {
  const chips: ReactNode[] = [];

  if (memberFilter !== "All") {
    chips.push(
      <span
        key="member"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
      >
        👤 {memberFilter}
        <button
          onClick={onRemoveMemberFilter}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label="Remove member filter"
        >
          ✕
        </button>
      </span>
    );
  }

  if (taxFilter !== "All") {
    chips.push(
      <span
        key="tax"
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
          taxFilter === "LTCG"
            ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
        }`}
      >
        ⏳ {taxFilter === "LTCG" ? "LTCG (>1Y)" : "STCG (≤1Y)"}
        <button
          onClick={onRemoveTaxFilter}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label="Remove Tax Horizon filter"
        >
          ✕
        </button>
      </span>
    );
  }

  typeFilters.forEach((tf) => {
    chips.push(
      <span
        key={`type-${tf}`}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
          tf === "BUY"
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : tf === "SELL"
              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
              : "bg-teal-500/15 text-teal-300 border-teal-500/30"
        }`}
      >
        🔄 {tf}
        <button
          onClick={() => onRemoveTypeFilter(tf)}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label={`Remove ${tf} filter`}
        >
          ✕
        </button>
      </span>
    );
  });

  categoryFilters.forEach((cat) => {
    chips.push(
      <span
        key={`cat-${cat}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
      >
        🏷️ {cat}
        <button
          onClick={() => onRemoveCategoryFilter(cat)}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label={`Remove ${cat} filter`}
        >
          ✕
        </button>
      </span>
    );
  });

  if (sttFilter !== "All") {
    chips.push(
      <span
        key="stt"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
      >
        🏛 {sttFilter === "Charged" ? "STT Charged" : "No STT"}
        <button
          onClick={onRemoveSttFilter}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label="Remove STT filter"
        >
          ✕
        </button>
      </span>
    );
  }

  if (startDate || endDate) {
    chips.push(
      <span
        key="date"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
      >
        📅{" "}
        {startDate && endDate
          ? `${startDate} – ${endDate}`
          : startDate
            ? `From ${startDate}`
            : `Until ${endDate}`}
        <button
          onClick={onClearDate}
          className="hover:opacity-70 transition ml-0.5 cursor-pointer"
          aria-label="Remove date filter"
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
      {/* Toolbar row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search */}
        <SearchFilterBar
          value={searchVal}
          onChange={onSearchChange}
          placeholder="Search scheme, sub category, folio or applicant…"
          className="flex-1"
        />

        {/* Date Range (compact inline) */}
        <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-800/60 bg-slate-950/60">
          <Calendar className="w-3 h-3 text-teal-400 shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none border-none [color-scheme:dark] w-[110px]"
            title="From date"
          />
          <span className="text-slate-600 text-xs">–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none border-none [color-scheme:dark] w-[110px]"
            title="To date"
          />
          {(startDate || endDate) && (
            <button
              onClick={onClearDate}
              className="text-slate-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
              title="Clear date filter"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Date presets */}
        <div className="relative h-9">
          <select
            onChange={(e) => {
              if (e.target.value) onPresetRange(e.target.value);
            }}
            value=""
            className="h-9 appearance-none bg-slate-950/60 border border-slate-800/60 rounded-xl px-3 pr-7 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer transition hover:border-slate-600 hover:text-slate-100"
          >
            <option value="" disabled>
              Presets
            </option>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last-7">Last 7 Days</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-30">Last 30 Days</option>
            <option value="last-90">Last 90 Days</option>
            <option value="this-quarter">This Quarter</option>
            <option value="this-fy">This FY (2026-27)</option>
            <option value="last-fy">Last FY (2025-26)</option>
          </select>
          <ChevronDown className="w-3 h-3 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Filters button */}
        <button
          onClick={onOpenFilterModal}
          className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
            activeFilterCount > 0
              ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
              : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips row inside card */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/50">
          {chips}
          <button
            onClick={onClearAllFilters}
            className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
