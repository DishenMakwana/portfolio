"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, Filter } from "lucide-react";
import TaxStatusCell from "@/components/shared/TaxStatusCell";
import TablePagination from "@/components/shared/TablePagination";
import {
  formatDateDDMMYYYY,
  formatHoldingYearsAndDays,
  formatCurrency,
  formatPercent,
} from "@/helpers/formatters";
import { calculateTransactionHoldingDays } from "@/helpers/dates";
import { calculateTransactionReturns } from "@/helpers/transactions";
import { getTaxHorizon } from "@/helpers/taxHarvesting";
import {
  getCurrentFinancialYearLabel,
  getTxFinancialYear,
} from "@/helpers/financial-year";
import type { FactsheetTransactionHistorySectionProps } from "@/types/fund-details";

export default function FactsheetTransactionHistorySection({
  transactions,
  holding,
  isStock,
}: FactsheetTransactionHistorySectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Current Financial Year label (e.g., "FY 2026-27")
  const currentFYLabel = useMemo(() => getCurrentFinancialYearLabel(), []);

  // Group transactions count by Financial Year
  const fyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((tx) => {
      const fy = getTxFinancialYear(tx.date);
      counts[fy] = (counts[fy] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  // Unique list of Financial Years in descending order
  const availableFYs = useMemo(() => {
    return Object.keys(fyCounts).sort((a, b) => b.localeCompare(a));
  }, [fyCounts]);

  // Determine default Financial Year filter (Current FY if transactions exist, else latest available FY)
  const defaultFY = useMemo(() => {
    if (fyCounts[currentFYLabel]) return currentFYLabel;
    if (availableFYs.length > 0) return availableFYs[0];
    return currentFYLabel;
  }, [currentFYLabel, fyCounts, availableFYs]);

  const initialPageSize = (() => {
    const ps = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    return !isNaN(ps) && ps > 0 ? ps : 25;
  })();
  const initialPage = (() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return !isNaN(p) && p > 0 ? p : 1;
  })();

  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [selectedFY, setSelectedFY] = useState<string>(defaultFY);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (
        value === null ||
        value === "" ||
        value === "All" ||
        (key === "page" && value === "1") ||
        (key === "pageSize" && value === "25") ||
        (key === "perPage" && value === "25")
      ) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    const rawP = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawP) && rawP > 0) setCurrentPage(rawP);
    const rawPs = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    if (!isNaN(rawPs) && rawPs > 0) setPageSize(rawPs);
  }, [searchParams]);

  // Sync selectedFY when defaultFY changes or transactions update
  useEffect(() => {
    if (selectedFY !== "ALL" && !fyCounts[selectedFY]) {
      setSelectedFY(defaultFY);
      setCurrentPage(1);
    }
  }, [transactions, defaultFY, selectedFY, fyCounts]);

  // Filter transactions by selected Financial Year
  const filteredTransactions = useMemo(() => {
    if (selectedFY === "ALL") return transactions;
    return transactions.filter(
      (tx) => getTxFinancialYear(tx.date) === selectedFY
    );
  }, [transactions, selectedFY]);

  // Calculate total pages
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize)
  );

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const handleFYChange = (fy: string) => {
    setSelectedFY(fy);
    setCurrentPage(1);
  };

  return (
    <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
      <div className="p-6 border-b border-slate-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
            <Calendar className="text-teal-400" size={18} />
            <span>Transaction History ({transactions.length})</span>
          </h3>
          <span className="text-slate-400 text-xs font-semibold">
            Complete SOA & statement ledger
          </span>
        </div>

        {/* FINANCIAL YEAR FILTER PILLS */}
        {availableFYs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-850/80">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} className="text-teal-400" /> Filter FY:
            </span>

            {/* Current Financial Year Pill */}
            {availableFYs.includes(currentFYLabel) && (
              <button
                onClick={() => handleFYChange(currentFYLabel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                  selectedFY === currentFYLabel
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "bg-teal-950/40 text-teal-400 border border-teal-800/60 hover:bg-teal-900/40"
                }`}
              >
                <span>{currentFYLabel} (Current FY)</span>
                <span className="bg-slate-950/40 px-1.5 py-0.5 text-[10px] rounded font-black">
                  {fyCounts[currentFYLabel]}
                </span>
              </button>
            )}

            {/* Other Financial Years */}
            {availableFYs
              .filter((fy) => fy !== currentFYLabel)
              .map((fy) => (
                <button
                  key={fy}
                  onClick={() => handleFYChange(fy)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                    selectedFY === fy
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20"
                      : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {fy} ({fyCounts[fy]})
                </button>
              ))}

            {/* All Transactions Pill */}
            <button
              onClick={() => handleFYChange("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                selectedFY === "ALL"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700"
              }`}
            >
              All Transactions ({transactions.length})
            </button>
          </div>
        )}
      </div>

      {/* Table Top Bar with Page & Counter */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850">
        <span className="text-xs text-slate-400 font-medium">
          Page <span className="text-slate-200 font-bold">{currentPage}</span>{" "}
          of{" "}
          <span className="text-slate-200 font-bold">
            {Math.max(totalPages, 1)}
          </span>
        </span>
        <span className="text-xs text-slate-400 font-medium">
          Showing{" "}
          <span className="text-slate-200 font-bold">
            {paginatedTransactions.length}
          </span>{" "}
          of{" "}
          <span className="text-slate-200 font-bold">
            {filteredTransactions.length}
          </span>{" "}
          transactions
          {selectedFY !== "ALL" && (
            <span className="text-slate-500 ml-1">
              (Filtered for {selectedFY}
              {selectedFY === currentFYLabel ? " - Current FY" : ""})
            </span>
          )}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-850">
              <th className="p-4">Transaction Date</th>
              <th className="p-4">Type</th>
              <th className="p-4">{isStock ? "Quantity" : "Units"}</th>
              <th className="p-4">{isStock ? "Price" : "NAV"}</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Holding Days</th>
              <th className="p-4 leading-tight whitespace-nowrap">
                <span>
                  Tax
                  <br />
                  Status
                </span>
              </th>
              <th className="p-4">Abs Return</th>
              <th className="p-4">CAGR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300 text-sm font-medium">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center text-slate-500 font-semibold"
                >
                  No transactions found for the selected filter.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const txTypeDisplay =
                  tx.transactionType ||
                  (tx as { rawTransactionType?: string }).rawTransactionType ||
                  null;
                const hDays = calculateTransactionHoldingDays(
                  tx.date,
                  holding.asOfDate
                );
                const txReturns = calculateTransactionReturns(
                  tx.nav,
                  holding.currentNav,
                  hDays,
                  tx.type === "BUY"
                );
                const taxInfo = getTaxHorizon(
                  tx.date,
                  holding.category,
                  holding.schemeName,
                  holding.asOfDate || undefined
                );

                return (
                  <tr key={tx.id} className="hover:bg-slate-950/40 transition">
                    <td className="p-4">{formatDateDDMMYYYY(tx.date)}</td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider ${
                            tx.type === "BUY"
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                              : "bg-red-950/80 text-red-400 border border-red-800/40"
                          }`}
                        >
                          {tx.type}
                        </span>
                        {txTypeDisplay && (
                          <span className="text-[9px] text-slate-300 font-bold px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 uppercase tracking-tight">
                            {txTypeDisplay}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-bold">
                      {isStock
                        ? Math.abs(tx.units).toLocaleString("en-IN")
                        : Math.abs(tx.units).toFixed(4)}
                    </td>
                    <td className="p-4 font-bold">₹{tx.nav.toFixed(4)}</td>
                    <td className="p-4 font-black text-slate-200">
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200">{hDays}</div>
                      {hDays >= 30 && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatHoldingYearsAndDays(hDays)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {tx.type === "SELL" ? (
                        <TaxStatusCell
                          status="Redeemed"
                          days={hDays}
                          title={`Redeemed / Sold on ${formatDateDDMMYYYY(tx.date)} (${hDays} days ago)`}
                        />
                      ) : taxInfo.isElssLocked ? (
                        <TaxStatusCell
                          status="3Y Locked"
                          days={taxInfo.lockDaysRemaining}
                          title={`Mandatory 3-Year ELSS Lock-in: ${taxInfo.lockDaysRemaining} days remaining`}
                        />
                      ) : taxInfo.taxType === "LTCG" ? (
                        <TaxStatusCell
                          status="LTCG"
                          days={hDays}
                          title="Long Term Capital Gains (> 1 Year holding) — Eligible for ₹1.25L annual tax-free harvesting"
                        />
                      ) : (
                        <TaxStatusCell
                          status="STCG"
                          days={taxInfo.daysToLtcg}
                          title={`Short Term Capital Gains (≤ 1 Year holding) — ${taxInfo.daysToLtcg} days left to become LTCG`}
                        />
                      )}
                    </td>
                    <td className="p-4">
                      {txReturns.absReturn !== null ? (
                        <span
                          className={`font-black text-xs ${
                            txReturns.absReturn >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {formatPercent(txReturns.absReturn)}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {txReturns.cagr !== null ? (
                        <span
                          className={`font-black text-xs ${
                            txReturns.cagr >= 0
                              ? "text-teal-400"
                              : "text-rose-400"
                          }`}
                        >
                          {formatPercent(txReturns.cagr)}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOOTER */}
      <TablePagination
        page={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        pageSizeOptions={[25, 50, 75, 100]}
        onPageChange={(p) => {
          setCurrentPage(p);
          updateUrl({ page: String(p) });
        }}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
          updateUrl({ pageSize: String(s), page: "1" });
        }}
        totalItems={filteredTransactions.length}
        showingStart={(currentPage - 1) * pageSize + 1}
        showingEnd={Math.min(
          currentPage * pageSize,
          filteredTransactions.length
        )}
        itemName="transactions"
      />
    </section>
  );
}
