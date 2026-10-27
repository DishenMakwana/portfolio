"use client";

import { LineChart } from "lucide-react";
import type { AllocationAnalysisOverviewCardProps } from "@/types/insights";

export default function AllocationAnalysisOverviewCard({
  title,
  entityLabel,
  entityDescription,
  graphView,
}: AllocationAnalysisOverviewCardProps) {
  return (
    <div className="rounded-2xl border border-teal-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
      <div className="flex items-center gap-2">
        <LineChart className="text-teal-400" size={18} />
        <h2 className="text-base font-bold text-slate-100">{title}</h2>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        {graphView === "cagr" && (
          <>
            This Cartesian graph plots each {entityDescription} where the{" "}
            <strong>X-axis</strong> represents the weighted average holding
            period (Time) in days/years, the <strong>Y-axis</strong> represents
            the weighted CAGR return (%), and the <strong>Bubble Size</strong>{" "}
            represents its relative weight in your mutual fund portfolio.
          </>
        )}
        {graphView === "abs" && (
          <>
            This Cartesian graph displays two metrics for each {entityLabel}:{" "}
            <strong className="text-teal-400">Absolute Return (%)</strong> as
            vertical bars (left Y-axis) and{" "}
            <strong className="text-amber-500">
              Average Holding Period (Days)
            </strong>{" "}
            as a line overlay (right Y-axis).
          </>
        )}
        {graphView === "xirr" && (
          <>
            This Cartesian graph displays {entityLabel} performance using a{" "}
            <strong className="text-teal-400">Lollipop Chart</strong> where the{" "}
            <strong>X-axis</strong> represents average holding period in
            days/years, the <strong>Y-axis</strong> represents {entityLabel}{" "}
            XIRR return (%), and stick height indicates the magnitude of return.
            Node size represents relative portfolio weight (%).
          </>
        )}
      </p>
    </div>
  );
}
