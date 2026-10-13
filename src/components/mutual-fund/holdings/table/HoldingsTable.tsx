"use client";

import { useRouter } from "next/navigation";
import TablePagination from "@/components/shared/TablePagination";
import { getFundDetailsUrl } from "@/helpers/formatters";
import HoldingsTableTopBar from "./HoldingsTableTopBar";
import HoldingsTableRow from "./HoldingsTableRow";
import HoldingsTableEmptyState from "./HoldingsTableEmptyState";
import type { HoldingsTableProps } from "@/types/holdings";

export default function HoldingsTable({
  holdings,
  rankMap,
  categoryRankingsMap,
  sortField: _sortField,
  renderSortIcon,
  onSort,
  page,
  pageSize,
  totalPages,
  totalFilteredCount,
  activeTotalCount,
  totalHoldingsCount,
  statusFilter,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
}: HoldingsTableProps) {
  const router = useRouter();

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
      {/* Table Top Bar with Page & Fund Count */}
      <HoldingsTableTopBar
        page={page}
        totalPages={totalPages}
        showingCount={holdings.length}
        activeTotalCount={activeTotalCount}
        totalHoldingsCount={totalHoldingsCount}
        statusFilter={statusFilter}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
              <th className="p-4 w-12 text-center text-slate-500">#</th>
              <th className="p-4">
                <div className="leading-tight">
                  <div>Scheme</div>
                  <div>Details</div>
                </div>
              </th>
              <th className="p-4">Holder</th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => onSort("currentValue")}
              >
                <div className="flex items-center gap-1">
                  Valuation {renderSortIcon("currentValue")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => onSort("gain")}
              >
                <div className="flex items-center gap-1">
                  <div className="leading-tight">
                    <div>Profit /</div>
                    <div>Loss</div>
                  </div>
                  {renderSortIcon("gain")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => onSort("holdingDays")}
              >
                <div className="flex items-center gap-1">
                  <div className="leading-tight">
                    <div>Holding</div>
                    <div>Days</div>
                  </div>
                  {renderSortIcon("holdingDays")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => onSort("cagr")}
              >
                <div className="flex items-center gap-1">
                  CAGR {renderSortIcon("cagr")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => onSort("xirr")}
              >
                <div className="flex items-center gap-1">
                  XIRR {renderSortIcon("xirr")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => onSort("alpha")}
              >
                <div className="flex items-center gap-1">
                  Alpha {renderSortIcon("alpha")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => onSort("athCorrectionPct")}
              >
                <div className="flex items-center gap-1">
                  <div className="leading-tight">
                    <div>ATH &</div>
                    <div>Dip</div>
                  </div>
                  {renderSortIcon("athCorrectionPct")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
            {holdings.length === 0 ? (
              <HoldingsTableEmptyState onResetFilters={onResetFilters} />
            ) : (
              holdings.map((h) => (
                <HoldingsTableRow
                  key={h.id}
                  holding={h}
                  rank={rankMap.get(h.id) ?? "-"}
                  categoryRankingsMap={categoryRankingsMap}
                  onRowClick={() =>
                    router.push(
                      getFundDetailsUrl(h.id, (h.currentValue ?? 0) <= 0.0001)
                    )
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bottom Pagination Bar ── */}
      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        pageSizeOptions={[25, 50, 75, 100]}
        onPageSizeChange={onPageSizeChange}
        totalItems={totalFilteredCount}
        showingStart={Math.min((page - 1) * pageSize + 1, totalFilteredCount)}
        showingEnd={Math.min(page * pageSize, totalFilteredCount)}
        itemName="holdings"
      />
    </div>
  );
}
