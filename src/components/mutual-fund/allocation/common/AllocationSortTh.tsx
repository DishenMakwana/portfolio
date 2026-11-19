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
  const isRight = className.includes("text-right");
  const isCenter = className.includes("text-center");
  const justifyClass = isRight
    ? "justify-end"
    : isCenter
      ? "justify-center"
      : "justify-start";

  return (
    <th
      className={`px-4 py-3 font-semibold text-xs cursor-pointer hover:text-slate-200 transition select-none ${className}`}
      onClick={() => onSort(col)}
    >
      <div className={`flex items-center gap-1 ${justifyClass}`}>
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
