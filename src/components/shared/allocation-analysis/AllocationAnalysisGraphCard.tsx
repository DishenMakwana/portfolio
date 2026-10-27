"use client";

import { Download } from "lucide-react";
import type { AllocationAnalysisGraphCardProps } from "@/types/insights";

export default function AllocationAnalysisGraphCard({
  entityLabel,
  graphView,
  onGraphViewChange,
  onDownload,
  children,
}: AllocationAnalysisGraphCardProps) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          {graphView === "cagr"
            ? `${entityLabel} CAGR Returns vs Weighted Holding Time`
            : graphView === "abs"
              ? `${entityLabel} Absolute Returns vs Weighted Holding Time`
              : `${entityLabel} XIRR Returns vs Weighted Holding Time`}
        </h3>

        {/* Graph View Selector & Download */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onGraphViewChange("cagr")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                graphView === "cagr"
                  ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              CAGR Bubble
            </button>
            <button
              onClick={() => onGraphViewChange("abs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                graphView === "abs"
                  ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              Abs Return Combo
            </button>
            <button
              onClick={() => onGraphViewChange("xirr")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                graphView === "xirr"
                  ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              XIRR Lollipop
            </button>
          </div>

          <button
            onClick={onDownload}
            title="Download Graph as PNG"
            className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/30 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 transition-all cursor-pointer"
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto select-none relative">{children}</div>
    </div>
  );
}
