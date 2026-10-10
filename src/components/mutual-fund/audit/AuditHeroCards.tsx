import {
  Layers,
  CheckCircle2,
  ArrowRightLeft,
  Coins,
  AlertTriangle,
} from "lucide-react";
import type { AuditHeroCardsProps } from "@/types/audit";

export default function AuditHeroCards({
  summary,
  statusFilters,
  activityFilter,
  onStatusToggle,
  onResetFilters,
}: AuditHeroCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Total Audited */}
      <button
        type="button"
        onClick={onResetFilters}
        className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
          statusFilters.length === 0 && activityFilter === "ALL"
            ? "bg-slate-850 border-indigo-500/50 ring-2 ring-indigo-500/20"
            : "bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Audited
          </span>
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Layers size={13} />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-slate-100 tracking-tight">
            {summary.totalAudited}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {summary.activeCount} Active • {summary.inactiveCount} Inactive
          </div>
        </div>
      </button>

      {/* Perfect Matches */}
      <button
        type="button"
        onClick={() => onStatusToggle("PERFECT_MATCH")}
        className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
          statusFilters.length === 1 && statusFilters.includes("PERFECT_MATCH")
            ? "bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/20"
            : "bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/30 hover:bg-slate-900/90"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Perfect Matches
          </span>
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={13} />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-emerald-400 tracking-tight">
            {summary.perfectMatchCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Units & Cost 100% Match
          </div>
        </div>
      </button>

      {/* Partial Redemptions */}
      <button
        type="button"
        onClick={() => onStatusToggle("PARTIAL_REDEMPTION")}
        className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
          statusFilters.length === 1 &&
          statusFilters.includes("PARTIAL_REDEMPTION")
            ? "bg-indigo-950/40 border-indigo-500/50 ring-2 ring-indigo-500/20"
            : "bg-slate-900/70 border-slate-800/80 hover:border-indigo-500/30 hover:bg-slate-900/90"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Partial Redemptions
          </span>
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ArrowRightLeft size={13} />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-indigo-400 tracking-tight">
            {summary.partialRedemptionCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Units Match (Realized Gains)
          </div>
        </div>
      </button>

      {/* NAV / STT Rounding */}
      <button
        type="button"
        onClick={() => onStatusToggle("NAV_ROUNDING")}
        className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
          statusFilters.length === 1 && statusFilters.includes("NAV_ROUNDING")
            ? "bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20"
            : "bg-slate-900/70 border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-900/90"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            NAV / STT Rounding
          </span>
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Coins size={13} />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-cyan-400 tracking-tight">
            {summary.navRoundingCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Units Match (STT/Rounding)
          </div>
        </div>
      </button>

      {/* Unit Mismatches */}
      <button
        type="button"
        onClick={() => onStatusToggle("UNIT_COST_MISMATCH")}
        className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
          statusFilters.length === 1 &&
          statusFilters.includes("UNIT_COST_MISMATCH")
            ? "bg-rose-950/40 border-rose-500/50 ring-2 ring-rose-500/20"
            : "bg-slate-900/70 border-slate-800/80 hover:border-rose-500/30 hover:bg-slate-900/90"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Unit Mismatches
          </span>
          <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertTriangle size={13} />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-rose-400 tracking-tight">
            {summary.unitMismatchCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Pre-Log / Missing Units
          </div>
        </div>
      </button>
    </div>
  );
}
