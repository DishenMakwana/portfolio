import TablePagination from "@/components/shared/TablePagination";
import TransactionsTableRow from "./TransactionsTableRow";
import type { TransactionsTableProps } from "@/types/transactions";

export default function TransactionsTable({
  paginated,
  totalFiltered,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSort,
  renderSortIcon,
  onResetFilters,
  onNavigateFund,
}: TransactionsTableProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
      {/* Table Top Bar with Count */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850">
        <span className="text-xs text-slate-400 font-medium">
          Page <span className="text-slate-200 font-bold">{page}</span> of{" "}
          <span className="text-slate-200 font-bold">
            {Math.max(totalPages, 1)}
          </span>
        </span>
        <span className="text-xs text-slate-400 font-medium">
          Showing{" "}
          <span className="text-slate-200 font-bold">{paginated.length}</span>{" "}
          of <span className="text-slate-200 font-bold">{totalFiltered}</span>{" "}
          transactions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
              <th
                className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => onSort("date")}
              >
                <div className="flex items-center gap-1">
                  Date {renderSortIcon("date")}
                </div>
              </th>
              <th
                className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none min-w-[180px]"
                onClick={() => onSort("schemeName")}
              >
                <div className="flex items-center gap-1 leading-tight">
                  <span>
                    Scheme
                    <br />
                    Name
                  </span>{" "}
                  {renderSortIcon("schemeName")}
                </div>
              </th>
              <th className="px-3 py-3 whitespace-nowrap">Folio</th>
              <th
                className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none w-28 max-w-[120px]"
                onClick={() => onSort("memberName")}
              >
                <div className="flex items-center gap-1 leading-tight">
                  <span>
                    Applicant
                    <br />
                    Name
                  </span>{" "}
                  {renderSortIcon("memberName")}
                </div>
              </th>
              <th
                className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => onSort("type")}
              >
                <div className="flex items-center gap-1 leading-tight">
                  <span>
                    Transaction
                    <br />
                    Type
                  </span>{" "}
                  {renderSortIcon("type")}
                </div>
              </th>
              <th className="px-3 py-3 whitespace-nowrap leading-tight">
                <span>
                  Tax
                  <br />
                  Status
                </span>
              </th>
              <th className="px-3 py-3 select-none text-right whitespace-nowrap">
                <div className="flex flex-col items-end leading-tight gap-0.5">
                  <button
                    type="button"
                    onClick={() => onSort("units")}
                    className="flex items-center justify-end gap-1 hover:text-slate-200 transition cursor-pointer font-semibold"
                  >
                    <span>Units</span>
                    {renderSortIcon("units")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSort("nav")}
                    className="flex items-center justify-end gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer font-medium"
                  >
                    <span>Price (₹)</span>
                    {renderSortIcon("nav")}
                  </button>
                </div>
              </th>
              <th
                className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => onSort("amount")}
              >
                <div className="flex items-center justify-end gap-1 leading-tight">
                  <span className="text-right">
                    Amount
                    <br />
                    (₹)
                  </span>{" "}
                  {renderSortIcon("amount")}
                </div>
              </th>
              <th
                className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => onSort("stampDuty")}
              >
                <div className="flex items-center justify-end gap-1 leading-tight">
                  <span className="text-right">
                    Stamp Duty
                    <br />
                    (₹)
                  </span>{" "}
                  {renderSortIcon("stampDuty")}
                </div>
              </th>
              <th
                className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => onSort("stt")}
              >
                <div className="flex items-center justify-end gap-1 leading-tight">
                  <span className="text-right">
                    STT
                    <br />
                    (₹)
                  </span>{" "}
                  {renderSortIcon("stt")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-12 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm">
                      No transactions match the current filters.
                    </p>
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
            ) : (
              paginated.map((t) => (
                <TransactionsTableRow
                  key={t.id}
                  transaction={t}
                  onNavigateFund={onNavigateFund}
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
        totalItems={totalFiltered}
        showingStart={(page - 1) * pageSize + 1}
        showingEnd={Math.min(page * pageSize, totalFiltered)}
        itemName="transactions"
      />
    </div>
  );
}
