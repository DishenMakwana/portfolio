import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatPointDelta } from "@/helpers/formatters";
import { DeltaBadgeProps } from "@/types/msfl";

export default function DeltaBadge({
  delta,
  label = "vs prev",
}: DeltaBadgeProps) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        No prior snapshot
      </span>
    );
  }

  const isUp = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
        isUp
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
    >
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {formatPointDelta(delta)} {label}
    </span>
  );
}
