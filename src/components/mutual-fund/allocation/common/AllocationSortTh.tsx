import TableSortIcon from "@/components/shared/TableSortIcon";
import type { AllocationSortThProps } from "@/types/allocation";

export default function AllocationSortTh({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  className = "",
}: AllocationSortThProps) {
  const isActive = sortCol === col;
  return (
    <th
      className={`px-4 py-3 font-semibold text-xs cursor-pointer hover:text-slate-200 transition select-none ${className}`}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <TableSortIcon
          isActive={isActive}
          sortOrder={sortDir}
          className="shrink-0"
        />
      </div>
    </th>
  );
}
