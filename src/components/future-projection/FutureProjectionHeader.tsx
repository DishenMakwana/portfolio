"use client";

import { Rocket, RotateCcw } from "lucide-react";
import type { FutureProjectionHeaderProps } from "@/types/futureProjection";

export function FutureProjectionHeader({
  onResetDefaults,
}: FutureProjectionHeaderProps) {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900/90 to-indigo-950/80 border border-teal-500/30 backdrop-blur-md shadow-2xl relative overflow-hidden">
      <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
              <Rocket className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
              Portfolio Goal & Future Projection
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Wealth Simulator
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
            Simulate exact timeline, step-up SIP impact, and compounding growth
            to reach your target net worth goal (e.g. ₹10 Crore).
          </p>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-300 transition-all cursor-pointer shrink-0 self-start md:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
          <span>Reset Defaults</span>
        </button>
      </div>
    </div>
  );
}
