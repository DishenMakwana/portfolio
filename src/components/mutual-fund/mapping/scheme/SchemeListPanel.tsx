import SchemeCard from "./SchemeCard";
import type { SchemeListPanelProps } from "@/types/mapping";

export default function SchemeListPanel({
  schemes,
  totalSchemesCount,
  holdingFilter,
  onHoldingFilterChange,
  activeHoldingSchemesCount,
  soldHoldingSchemesCount,
  onOpenManualModal,
  onMapScheme,
}: SchemeListPanelProps) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-100">All Schemes</h4>
          <span className="text-xs text-slate-500">
            ({schemes.length} of {totalSchemesCount})
          </span>
        </div>

        {/* Quick Segmented Holding Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 self-start sm:self-auto">
          <button
            onClick={() => onHoldingFilterChange("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              holdingFilter === "all"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            All ({totalSchemesCount})
          </button>
          <button
            onClick={() => onHoldingFilterChange("active")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              holdingFilter === "active"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active ({activeHoldingSchemesCount})
          </button>
          <button
            onClick={() => onHoldingFilterChange("sold")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              holdingFilter === "sold"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Sold / Zero Balance ({soldHoldingSchemesCount})
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {schemes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
            No schemes match your current search and filter criteria.
          </div>
        ) : (
          schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              onOpenManualModal={onOpenManualModal}
              onMapScheme={onMapScheme}
            />
          ))
        )}
      </div>
    </div>
  );
}
