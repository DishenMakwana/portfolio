"use client";

import { useState, useMemo } from "react";
import { Edit2, Trash2, Layers, Plus } from "lucide-react";
import type {
  BankDepositLedgerTableProps,
  DepositLedgerSortField,
} from "@/types/bankDeposit";
import type { SortOrder } from "@/types/tableSort";
import {
  formatDepositInr,
  formatShortDate,
  formatMonthYear,
} from "@/helpers/bankDeposit";
import TableSortIcon from "@/components/shared/TableSortIcon";
import TablePagination from "@/components/shared/TablePagination";

export default function BankDepositLedgerTable({
  transactions,
  onEdit,
  onDelete,
  onOpenAddDeposit,
}: BankDepositLedgerTableProps) {
  const [sortField, setSortField] = useState<DepositLedgerSortField>("date");
  const [sortDirection, setSortDirection] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const handleSort = (field: DepositLedgerSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const sortedTransactions = useMemo(() => {
    const list = [...transactions];
    list.sort((a, b) => {
      let comp = 0;
      if (sortField === "date") {
        comp = a.depositDate.localeCompare(b.depositDate);
      } else if (sortField === "amount") {
        comp = a.amount - b.amount;
      } else if (sortField === "person") {
        comp = a.personName.localeCompare(b.personName);
      } else if (sortField === "bank") {
        comp = a.bankName.localeCompare(b.bankName);
      }
      return sortDirection === "asc" ? comp : -comp;
    });
    return list;
  }, [transactions, sortField, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedTransactions.length / pageSize)
  );

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm">
      {/* Table Header Strip */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers size={18} className="text-teal-400" />
            <span>Deposit Transaction Ledger</span>
          </h2>
          <p className="text-xs text-slate-400">
            {transactions.length} record{transactions.length === 1 ? "" : "s"}{" "}
            tracked in this view.
          </p>
        </div>

        {onOpenAddDeposit && (
          <button
            type="button"
            onClick={onOpenAddDeposit}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-teal-950/30 cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>New Deposit</span>
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              {/* Date */}
              <th
                onClick={() => handleSort("date")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  <TableSortIcon
                    isActive={sortField === "date"}
                    sortOrder={sortDirection}
                  />
                </div>
              </th>

              {/* Person */}
              <th
                onClick={() => handleSort("person")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Person</span>
                  <TableSortIcon
                    isActive={sortField === "person"}
                    sortOrder={sortDirection}
                  />
                </div>
              </th>

              {/* Bank */}
              <th
                onClick={() => handleSort("bank")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Bank & Account</span>
                  <TableSortIcon
                    isActive={sortField === "bank"}
                    sortOrder={sortDirection}
                  />
                </div>
              </th>

              {/* Amount */}
              <th
                onClick={() => handleSort("amount")}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-200 transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Amount</span>
                  <TableSortIcon
                    isActive={sortField === "amount"}
                    sortOrder={sortDirection}
                  />
                </div>
              </th>

              {/* Comment */}
              <th className="py-3 px-4 font-semibold">Comment</th>

              {/* Period */}
              <th className="py-3 px-4 font-semibold text-center">Period</th>

              {/* Actions */}
              <th className="py-3 px-4 font-semibold text-right w-20">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/40">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-slate-500 text-xs"
                >
                  No deposit records found for this selection.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  {/* Date */}
                  <td className="py-3 px-4 font-medium text-slate-300 whitespace-nowrap">
                    {formatShortDate(tx.depositDate)}
                  </td>

                  {/* Person */}
                  <td className="py-3 px-4 font-bold text-slate-100 whitespace-nowrap">
                    {tx.personName}
                  </td>

                  {/* Bank & Account */}
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    <span className="font-semibold text-teal-300">
                      {tx.bankName}
                    </span>
                    {tx.accountIdentifier &&
                      tx.accountIdentifier !== "Default" && (
                        <span className="ml-1 text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {tx.accountIdentifier}
                        </span>
                      )}
                  </td>

                  {/* Amount */}
                  <td className="py-3 px-4 text-right font-bold text-slate-100 whitespace-nowrap">
                    {formatDepositInr(tx.amount)}
                  </td>

                  {/* Comment */}
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                    {tx.comment ? (
                      <span className="italic text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded">
                        {tx.comment}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Period */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-xs font-semibold text-slate-200">
                        {formatMonthYear(tx.month, tx.financialYear)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        FY {tx.financialYear}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(tx)}
                        title="Edit Deposit"
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(tx)}
                        title="Delete Deposit"
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Holdings-Style Bottom Pagination Bar */}
      <TablePagination
        page={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        totalItems={sortedTransactions.length}
        showingStart={
          sortedTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
        }
        showingEnd={Math.min(currentPage * pageSize, sortedTransactions.length)}
        pageSizeOptions={[25, 50, 75, 100]}
        itemName="deposits"
      />
    </div>
  );
}
