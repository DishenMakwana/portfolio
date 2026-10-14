import { Loader2, Zap, ShieldCheck, AlertTriangle } from "lucide-react";
import type { MappingHeaderPanelProps } from "@/types/mapping";

export default function MappingHeaderPanel({
  unmappedCount,
  mappedCount,
  activeHoldingSchemesCount,
  soldHoldingSchemesCount,
  totalSchemesCount,
  isAutoMapping,
  onAutoMapAll,
}: MappingHeaderPanelProps) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h3 className="text-xl font-bold text-slate-100">
            Scheme API Mappings
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Link each fund to its{" "}
            <span className="text-teal-400">api.mfapi.in</span> scheme code for
            live NAV, XIRR, and Alpha calculations.
          </p>
        </div>
        <button
          onClick={onAutoMapAll}
          disabled={isAutoMapping || unmappedCount === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg cursor-pointer transition duration-200 shrink-0"
        >
          {isAutoMapping ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Auto-fetching…
            </>
          ) : (
            <>
              <Zap size={16} /> Auto-Fetch All ({unmappedCount} unmapped)
            </>
          )}
        </button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mt-4">
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-400">
          <ShieldCheck size={13} /> {mappedCount} Mapped
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-400">
          <AlertTriangle size={13} /> {unmappedCount} Unmapped
        </div>
        <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-teal-300">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          {activeHoldingSchemesCount} Active Funds
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {soldHoldingSchemesCount} Sold / Zero Balance Funds
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400">
          Total: {totalSchemesCount} schemes
        </div>
      </div>
    </div>
  );
}
