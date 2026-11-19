import { ChevronDown, ChevronUp } from "lucide-react";
import type { AllocationCardHeaderProps } from "@/types/allocation";

export default function AllocationCardHeader({
  accent,
  title,
  subtitle,
  collapsed,
  onToggle,
  rightAction,
}: AllocationCardHeaderProps) {
  const isCollapsible = onToggle !== undefined;
  return (
    <div
      className={`px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 ${
        isCollapsible
          ? "cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
          : ""
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={`w-1 h-5 rounded-full shrink-0 ${accent}`} />
        <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
          <h2 className="text-sm font-bold text-slate-200 whitespace-nowrap">
            {title}
          </h2>
          {subtitle && (
            <span className="text-xs text-slate-500 whitespace-normal">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {rightAction && (
          <div onClick={(e) => e.stopPropagation()}>{rightAction}</div>
        )}
        {isCollapsible && (
          <div className="text-slate-400 shrink-0">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        )}
      </div>
    </div>
  );
}
