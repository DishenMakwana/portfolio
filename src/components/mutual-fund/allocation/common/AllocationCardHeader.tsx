import { ChevronDown, ChevronUp } from "lucide-react";
import type { AllocationCardHeaderProps } from "@/types/allocation";

export default function AllocationCardHeader({
  accent,
  title,
  subtitle,
  collapsed,
  onToggle,
}: AllocationCardHeaderProps) {
  const isCollapsible = onToggle !== undefined;
  return (
    <div
      className={`px-5 py-4 border-b border-slate-800 flex items-center gap-3 ${
        isCollapsible
          ? "cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
          : ""
      }`}
      onClick={onToggle}
    >
      <div className={`w-1 h-5 rounded-full shrink-0 ${accent}`} />
      <h2 className="text-sm font-bold text-slate-200">{title}</h2>
      <span className="text-xs text-slate-500 ml-1 flex-1">{subtitle}</span>
      {isCollapsible && (
        <div className="text-slate-400 shrink-0">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      )}
    </div>
  );
}
