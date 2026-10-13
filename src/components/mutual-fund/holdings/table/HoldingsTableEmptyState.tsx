import type { HoldingsTableEmptyStateProps } from "@/types/holdings";

export default function HoldingsTableEmptyState({
  onResetFilters,
}: HoldingsTableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={10} className="p-12 text-center text-slate-500">
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-sm">No holdings match the current filters.</p>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </td>
    </tr>
  );
}
