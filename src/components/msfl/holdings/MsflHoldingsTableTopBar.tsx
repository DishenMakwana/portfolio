import type { MsflHoldingsTableTopBarProps } from "@/types/msfl";

export default function MsflHoldingsTableTopBar({
  page,
  totalPages,
  paginatedCount,
  filteredCount,
}: MsflHoldingsTableTopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850">
      <span className="text-xs text-slate-400 font-medium">
        Page <span className="text-slate-200 font-bold">{page}</span> of{" "}
        <span className="text-slate-200 font-bold">
          {Math.max(totalPages, 1)}
        </span>
      </span>
      <span className="text-xs text-slate-400 font-medium">
        Showing{" "}
        <span className="text-slate-200 font-bold">{paginatedCount}</span> of{" "}
        <span className="text-slate-200 font-bold">{filteredCount}</span> stocks
      </span>
    </div>
  );
}
