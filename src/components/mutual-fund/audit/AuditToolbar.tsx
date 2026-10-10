import { SlidersHorizontal } from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import { formatAuditStatusBadge } from "@/helpers/audit";
import type { AuditStatusType, AuditToolbarProps } from "@/types/audit";

export default function AuditToolbar({
  searchTerm,
  setSearchTerm,
  activityFilter,
  setActivityFilter,
  statusFilters,
  setStatusFilters,
  memberFilter,
  setMemberFilter,
  categoryFilter,
  setCategoryFilter,
  activeFilterCount,
  onOpenFilterModal,
  onClearAll,
  summary,
}: AuditToolbarProps) {
  return (
    <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
      {/* Toolbar row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search */}
        <SearchFilterBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search scheme, member, folio…"
          className="flex-1"
        />

        {/* Quick Holding Status Segmented Toggle */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => setActivityFilter("ALL")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activityFilter === "ALL"
                ? "bg-slate-800 text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({summary.totalAudited})
          </button>
          <button
            type="button"
            onClick={() => setActivityFilter("ACTIVE")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activityFilter === "ACTIVE"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Active ({summary.activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActivityFilter("INACTIVE")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activityFilter === "INACTIVE"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Inactive ({summary.inactiveCount})
          </button>
        </div>

        {/* Filters button */}
        <button
          onClick={onOpenFilterModal}
          className={`relative flex items-center justify-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
            activeFilterCount > 0
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
              : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips — inside the same card, only when filters applied */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/50">
          {activityFilter !== "ALL" && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                activityFilter === "ACTIVE"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}
            >
              {activityFilter === "ACTIVE"
                ? "Active Only"
                : "Inactive / Redeemed Only"}
              <button
                onClick={() => setActivityFilter("ALL")}
                className="hover:opacity-70 transition ml-0.5"
                aria-label="Remove activity filter"
              >
                ✕
              </button>
            </span>
          )}
          {statusFilters.map((s) => {
            const badge = formatAuditStatusBadge(s as AuditStatusType);
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.badgeClass}`}
              >
                {badge.label}
                <button
                  onClick={() =>
                    setStatusFilters((prev) => prev.filter((x) => x !== s))
                  }
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label={`Remove ${badge.label} filter`}
                >
                  ✕
                </button>
              </span>
            );
          })}
          {memberFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              👤 {memberFilter}
              <button
                onClick={() => setMemberFilter("ALL")}
                className="hover:opacity-70 transition ml-0.5"
                aria-label="Remove member filter"
              >
                ✕
              </button>
            </span>
          )}
          {categoryFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              🏷 {categoryFilter}
              <button
                onClick={() => setCategoryFilter("ALL")}
                className="hover:opacity-70 transition ml-0.5"
                aria-label="Remove category filter"
              >
                ✕
              </button>
            </span>
          )}
          <button
            onClick={onClearAll}
            className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
