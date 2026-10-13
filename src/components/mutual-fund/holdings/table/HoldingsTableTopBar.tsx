import type { HoldingsTableTopBarProps } from "@/types/holdings";

export default function HoldingsTableTopBar({
  page,
  totalPages,
  showingCount,
  activeTotalCount,
  totalHoldingsCount,
  statusFilter,
}: HoldingsTableTopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850">
      <span className="text-xs text-slate-400 font-medium">
        Page <span className="text-slate-200 font-bold">{page}</span> of{" "}
        <span className="text-slate-200 font-bold">
          {Math.max(totalPages, 1)}
        </span>
      </span>
      <span className="text-xs text-slate-400 font-medium">
        Showing <span className="text-slate-200 font-bold">{showingCount}</span>{" "}
        of <span className="text-slate-200 font-bold">{activeTotalCount}</span>{" "}
        active folios
        {statusFilter !== "active" && (
          <span className="text-slate-500 font-normal">
            {" "}
            ({totalHoldingsCount} total including inactive)
          </span>
        )}
      </span>
    </div>
  );
}
