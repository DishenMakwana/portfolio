import { Globe, Link2, FolderOpen, Pin } from "lucide-react";
import type { AnalysisLinksHeaderProps } from "@/types/analysisLinks";

export default function AnalysisLinksHeader({
  linksCount,
  categoriesCount,
  pinnedCount,
}: AnalysisLinksHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 shrink-0">
            <Globe size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Market Analysis & Intelligence Links
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Centralized hub for research resources, stock screeners, macro
              insights, and charting tools.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Badges */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
          <Link2 size={15} className="text-sky-300" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Total Links
            </span>
            <span className="text-sm font-bold text-slate-100 tabular-nums">
              {linksCount}
            </span>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
          <FolderOpen size={15} className="text-emerald-300" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Categories
            </span>
            <span className="text-sm font-bold text-slate-100 tabular-nums">
              {categoriesCount}
            </span>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
          <Pin size={15} className="text-amber-200" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Pinned
            </span>
            <span className="text-sm font-bold text-slate-100 tabular-nums">
              {pinnedCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
