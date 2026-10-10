import TablePagination from "@/components/shared/TablePagination";
import TableSortIcon from "@/components/shared/TableSortIcon";
import { getAuditItemKey } from "@/helpers/audit";
import AuditTableRow from "./AuditTableRow";
import AuditTableTopBar from "./AuditTableTopBar";
import type { AuditSortField, AuditTableProps } from "@/types/audit";

export default function AuditTable({
  paginatedAuditItems,
  filteredItemsCount,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortOrder,
  onSort,
  rankMap,
  onItemClick,
}: AuditTableProps) {
  const renderSortIcon = (field: AuditSortField) => (
    <TableSortIcon
      isActive={sortField === field}
      sortOrder={sortOrder}
      className="inline ml-0.5"
    />
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
      {/* Table Top Bar with Counter & Page */}
      <AuditTableTopBar
        page={page}
        totalPages={totalPages}
        showingCount={paginatedAuditItems.length}
        totalCount={filteredItemsCount}
      />

      <div className="overflow-x-auto">
        {/* COMPACT LAPTOP VIEW (Fits screen with zero horizontal scroll!) */}
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800/80 select-none">
              <th className="p-3 w-10 text-center text-slate-500 text-xs">#</th>

              <th
                className="px-3 py-3 w-[15%] cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => onSort("memberName")}
              >
                <div className="flex items-center gap-1">
                  <span>Member & Folio</span>
                  {renderSortIcon("memberName")}
                </div>
              </th>

              <th
                className="px-3 py-3 w-[22%] cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => onSort("schemeName")}
              >
                <div className="flex items-center gap-1">
                  <span>Scheme & Category</span>
                  {renderSortIcon("schemeName")}
                </div>
              </th>

              <th
                className="px-3 py-3 w-[18%] cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => onSort("casBalanceUnits")}
              >
                <div className="flex items-center gap-1">
                  <span>Units Breakdown</span>
                  {renderSortIcon("casBalanceUnits")}
                </div>
              </th>

              <th
                className="px-3 py-3 w-[20%] cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => onSort("casPurchaseValue")}
              >
                <div className="flex items-center gap-1">
                  <span>Cost Basis & Charges</span>
                  {renderSortIcon("casPurchaseValue")}
                </div>
              </th>

              <th
                className="px-3 py-3 w-[13%] cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => onSort("auditStatus")}
              >
                <div className="flex items-center gap-1">
                  <span>Valuation & Status</span>
                  {renderSortIcon("auditStatus")}
                </div>
              </th>

              <th className="px-3 py-3 w-[12%]">Root Cause</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/40 text-slate-300 text-xs">
            {paginatedAuditItems.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No portfolio holdings match the audit filter criteria.
                </td>
              </tr>
            ) : (
              paginatedAuditItems.map((item, idx) => (
                <AuditTableRow
                  key={`unmatched-${item.holdingId}-${item.memberName}-${idx}`}
                  item={item}
                  idx={idx}
                  rank={rankMap.get(getAuditItemKey(item))}
                  onItemClick={onItemClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination & Records-Per-Page Bar */}
      <TablePagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        pageSizeOptions={[25, 50, 75, 100]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        totalItems={filteredItemsCount}
        showingStart={(page - 1) * pageSize + 1}
        showingEnd={Math.min(page * pageSize, filteredItemsCount)}
        itemName="audit records"
      />
    </div>
  );
}
