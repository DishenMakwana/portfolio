import type { AuditTableTopBarProps } from "@/types/audit";

export default function AuditTableTopBar({
  page,
  totalPages,
  showingCount,
  totalCount,
}: AuditTableTopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850 text-xs text-slate-400">
      <span className="text-xs text-slate-400 font-medium">
        Page <span className="text-slate-200 font-bold">{page}</span> of{" "}
        <span className="text-slate-200 font-bold">
          {Math.max(totalPages, 1)}
        </span>
      </span>
      <span className="font-medium">
        Showing <span className="text-slate-200 font-bold">{showingCount}</span>{" "}
        of <span className="text-slate-200 font-bold">{totalCount}</span>{" "}
        audited folios
      </span>
    </div>
  );
}
