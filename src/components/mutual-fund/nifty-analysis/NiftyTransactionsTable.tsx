"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import TablePagination from "@/components/shared/TablePagination";
import { useTableSort } from "@/helpers/useTableSort";
import {
  sortNiftyTransactions,
  getNiftyTransactionCategories,
  getNiftyTransactionRawTypes,
} from "@/helpers/niftyAnalysis";
import {
  parseCategoryFilters,
  serializeCategoryFilters,
} from "@/helpers/holdingsCategory";
import { NiftyTableFilterModal } from "./table/NiftyTableFilterModal";
import { NiftyTableToolbar } from "./table/NiftyTableToolbar";
import { NiftyTableRow } from "./table/NiftyTableRow";
import type {
  NiftySortField,
  NiftyTransactionsTableProps,
} from "@/types/nifty-analysis";

export default function NiftyTransactionsTable({
  transactions,
  searchQuery,
  onSearchChange,
  selectedMember,
  onMemberChange,
  membersList,
  currentNifty,
  tradeMode = "BUY",
}: NiftyTransactionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sorting state with URL synchronization
  const { sortField, sortOrder, handleSort, renderSortIcon } =
    useTableSort<NiftySortField>({
      defaultField: "date",
      defaultOrder: "desc",
      onSortChange: () => setCurrentPage(1),
    });

  const [onlyHigher, setOnlyHigher] = useState(
    searchParams.get("higher") === "true"
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() =>
    parseCategoryFilters(searchParams.get("type"))
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    parseCategoryFilters(searchParams.get("category"))
  );
  const initialPageSize = (() => {
    const ps = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    return !isNaN(ps) && ps > 0 ? ps : 25;
  })();
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return !isNaN(p) && p > 0 ? p : 1;
  });

  const updateTableUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const params = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (
        value === null ||
        value === "" ||
        value === "All" ||
        value === "all" ||
        (key === "higher" && value === "false") ||
        (key === "page" && value === "1") ||
        (key === "pageSize" && value === "25") ||
        (key === "perPage" && value === "25")
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const query = params.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    setSelectedTypes(parseCategoryFilters(searchParams.get("type")));
    setSelectedCategories(parseCategoryFilters(searchParams.get("category")));
    setOnlyHigher(searchParams.get("higher") === "true");
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawPage) && rawPage > 0) setCurrentPage(rawPage);
    const rawPageSize = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    if (!isNaN(rawPageSize) && rawPageSize > 0) setPageSize(rawPageSize);
  }, [searchParams]);

  // Distinct transaction types available
  const availableTypes = useMemo(
    () => getNiftyTransactionRawTypes(transactions),
    [transactions]
  );

  // Distinct categories available
  const availableCategories = useMemo(
    () => getNiftyTransactionCategories(transactions),
    [transactions]
  );

  // Filter transactions by search query, member, type, category, and higher-only toggle
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      if (
        selectedMember !== "all" &&
        selectedMember !== "All" &&
        t.memberName !== selectedMember
      ) {
        return false;
      }
      if (onlyHigher && !t.isHigherThanCurrent) {
        return false;
      }
      if (
        selectedTypes.length > 0 &&
        !selectedTypes.includes(t.rawTransactionType)
      ) {
        return false;
      }
      if (
        selectedCategories.length > 0 &&
        (!t.category || !selectedCategories.includes(t.category))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        t.schemeName.toLowerCase().includes(q) ||
        t.folioNo.toLowerCase().includes(q) ||
        t.memberName.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        t.date.includes(q) ||
        t.rawTransactionType.toLowerCase().includes(q)
      );
    });
  }, [
    transactions,
    searchQuery,
    selectedMember,
    onlyHigher,
    selectedTypes,
    selectedCategories,
  ]);

  // Active filter counter
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedMember !== "all" && selectedMember !== "All") count++;
    if (onlyHigher) count++;
    if (selectedTypes.length > 0) count += selectedTypes.length;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    return count;
  }, [selectedMember, onlyHigher, selectedTypes, selectedCategories]);

  // Sort filtered list
  const sorted = useMemo(() => {
    return sortNiftyTransactions(filtered, sortField, sortOrder);
  }, [filtered, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  // Slice paginated items
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const handleResetAllFilters = () => {
    onSearchChange("");
    onMemberChange("all");
    setSelectedTypes([]);
    setSelectedCategories([]);
    setOnlyHigher(false);
    setCurrentPage(1);
    updateTableUrl({
      q: null,
      member: null,
      type: null,
      category: null,
      higher: null,
      page: "1",
    });
  };

  return (
    <>
      {/* ── Filter Modal Portal ── */}
      <NiftyTableFilterModal
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        selectedMember={selectedMember}
        onMemberChange={(m) => {
          onMemberChange(m);
          setCurrentPage(1);
        }}
        membersList={membersList}
        availableCategories={availableCategories}
        selectedCategories={selectedCategories}
        onCategoriesChange={(cats) => {
          setSelectedCategories(cats);
          setCurrentPage(1);
          updateTableUrl({
            category: serializeCategoryFilters(cats) || null,
            page: "1",
          });
        }}
        availableTypes={availableTypes}
        selectedTypes={selectedTypes}
        onTypesChange={(types) => {
          setSelectedTypes(types);
          setCurrentPage(1);
          updateTableUrl({
            type: serializeCategoryFilters(types) || null,
            page: "1",
          });
        }}
        onResetAll={handleResetAllFilters}
        filteredCount={filtered.length}
      />

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 sm:p-6 shadow-xl space-y-4">
        {/* ── Title & Meta Header Section ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-tight">
                {tradeMode === "BUY"
                  ? "Buy Transaction Records on NIFTY Timeline"
                  : "Sell & Redemption Records on NIFTY Timeline"}
              </h2>
              <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-full px-2.5 py-0.5">
                {filtered.length} {filtered.length === 1 ? "record" : "records"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {tradeMode === "BUY"
                ? `Detailed purchase history compared against current NIFTY 50 spot (${currentNifty.toLocaleString("en-IN")}) with index levels, valuation, and compounding returns.`
                : `Detailed sell / redemption history compared against current NIFTY 50 spot (${currentNifty.toLocaleString("en-IN")}) with exit index levels and market timing.`}
            </p>
          </div>
        </div>

        {/* ── Search & Filter Controls (Standardized Row) ── */}
        <NiftyTableToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            onSearchChange(val);
            setCurrentPage(1);
            updateTableUrl({ page: "1" });
          }}
          activeFiltersCount={activeFiltersCount}
          onOpenFilterModal={() => setFilterPanelOpen(true)}
          onlyHigher={onlyHigher}
          onToggleOnlyHigher={() => {
            const nextHigher = !onlyHigher;
            setOnlyHigher(nextHigher);
            setCurrentPage(1);
            updateTableUrl({
              higher: nextHigher ? "true" : null,
              page: "1",
            });
          }}
          tradeMode={tradeMode}
        />

        {/* ── Table Container ── */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
          {/* Table Top Bar with Page & Counter */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850">
            <span className="text-xs text-slate-400 font-medium">
              Page{" "}
              <span className="text-slate-200 font-bold">{currentPage}</span> of{" "}
              <span className="text-slate-200 font-bold">
                {Math.max(totalPages, 1)}
              </span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Showing{" "}
              <span className="text-slate-200 font-bold">
                {paginated.length}
              </span>{" "}
              of{" "}
              <span className="text-slate-200 font-bold">{sorted.length}</span>{" "}
              transactions
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800 select-none text-[11px]">
                <th className="py-3 px-3.5 whitespace-nowrap">Date</th>
                <th className="py-3 px-3.5 min-w-[220px]">
                  Fund &amp; Applicant
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">
                  Type
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  {tradeMode === "BUY" ? "Amount (₹)" : "Proceeds (₹)"}{" "}
                  {renderSortIcon("amount")}
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  {tradeMode === "BUY" ? "Buy NAV" : "Sell NAV"}
                </th>
                <th
                  onClick={() => handleSort("niftyAtPurchase")}
                  className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  {tradeMode === "BUY" ? "Nifty at Buy" : "Nifty at Sell"}{" "}
                  {renderSortIcon("niftyAtPurchase")}
                </th>
                <th
                  onClick={() => handleSort("niftyDiffPct")}
                  className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  Vs Current Nifty {renderSortIcon("niftyDiffPct")}
                </th>
                {tradeMode === "BUY" ? (
                  <>
                    <th
                      onClick={() => handleSort("gain")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                    >
                      Gain / P&L (₹) {renderSortIcon("gain")}
                    </th>
                    <th
                      onClick={() => handleSort("holdingDays")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                    >
                      Days {renderSortIcon("holdingDays")}
                    </th>
                    <th
                      onClick={() => handleSort("cagr")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap"
                    >
                      CAGR (%) {renderSortIcon("cagr")}
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">
                      Units Redeemed
                    </th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">
                      Market Zone at Exit
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={tradeMode === "BUY" ? 10 : 9}
                    className="py-12 text-center text-slate-500 font-semibold"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p>
                        No transaction records found matching the current
                        filters.
                      </p>
                      {(searchQuery ||
                        (selectedMember !== "all" &&
                          selectedMember !== "All") ||
                        onlyHigher ||
                        selectedTypes.length > 0 ||
                        selectedCategories.length > 0) && (
                        <button
                          type="button"
                          onClick={handleResetAllFilters}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
                        >
                          Reset All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => (
                  <NiftyTableRow
                    key={tx.id}
                    tx={tx}
                    tradeMode={tradeMode}
                    onFundClick={(url) => router.push(url)}
                  />
                ))
              )}
            </tbody>
          </table>

          {/* ── Bottom Pagination Bar ── */}
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(nextPage) => {
              setCurrentPage(nextPage);
              updateTableUrl({ page: String(nextPage) });
            }}
            pageSize={pageSize}
            pageSizeOptions={[25, 50, 75, 100]}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
              updateTableUrl({ page: "1", pageSize: String(newSize) });
            }}
            totalItems={sorted.length}
            showingStart={Math.min(
              (currentPage - 1) * pageSize + 1,
              sorted.length
            )}
            showingEnd={Math.min(currentPage * pageSize, sorted.length)}
            itemName="transactions"
          />
        </div>
      </div>
    </>
  );
}
