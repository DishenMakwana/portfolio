import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import { formatIndianAmount, getFundDetailsUrl } from "@/helpers/formatters";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import FolioBadge from "@/components/shared/FolioBadge";
import { sortNiftyTransactions } from "@/helpers/niftyAnalysis";
import {
  parseCategoryFilters,
  serializeCategoryFilters,
} from "@/helpers/holdingsCategory";
import type {
  NiftyTransactionItem,
  NiftySortField,
  NiftyTradeMode,
} from "@/types/nifty-analysis";

interface NiftyTransactionsTableProps {
  transactions: NiftyTransactionItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMember: string;
  onMemberChange: (m: string) => void;
  membersList: string[];
  currentNifty: number;
  tradeMode?: NiftyTradeMode;
}

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

  const [mounted, setMounted] = useState(false);
  const [sortField, setSortField] = useState<NiftySortField>(
    (searchParams.get("txSort") as NiftySortField) || "date"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("txOrder") as "asc" | "desc") || "desc"
  );
  const [onlyHigher, setOnlyHigher] = useState(
    searchParams.get("higher") === "true"
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() =>
    parseCategoryFilters(searchParams.get("type"))
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    parseCategoryFilters(searchParams.get("category"))
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return !isNaN(p) && p > 0 ? p : 1;
  });
  const [pageSize, setPageSize] = useState<number>(25);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        (key === "txSort" && value === "date") ||
        (key === "txOrder" && value === "desc") ||
        (key === "higher" && value === "false") ||
        (key === "page" && value === "1")
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
    const rawSort = searchParams.get("txSort") as NiftySortField | null;
    if (rawSort) setSortField(rawSort);
    const rawOrder = searchParams.get("txOrder") as "asc" | "desc" | null;
    if (rawOrder) setSortOrder(rawOrder);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawPage) && rawPage > 0) setCurrentPage(rawPage);
  }, [searchParams]);

  // Close filter modal on Escape key
  useEffect(() => {
    if (!filterPanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterPanelOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filterPanelOpen]);

  const handleSort = (field: NiftySortField) => {
    let nextOrder: "asc" | "desc" = "desc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(nextOrder);
    updateTableUrl({ txSort: field, txOrder: nextOrder });
  };

  // Distinct transaction types available
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.rawTransactionType) set.add(t.rawTransactionType);
    }
    return Array.from(set).sort();
  }, [transactions]);

  // Distinct categories available
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (
        t.category &&
        t.category.trim() &&
        t.category !== "Unknown" &&
        t.category !== "All"
      ) {
        set.add(t.category.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

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

  // Effective page size (support "All" represented by a high number)
  const isShowAll = pageSize >= 10000;
  const effectivePageSize = isShowAll ? sorted.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(sorted.length / effectivePageSize));

  // Pagination slice
  const paginated = useMemo(() => {
    if (isShowAll) return sorted;
    const start = (currentPage - 1) * effectivePageSize;
    return sorted.slice(start, start + effectivePageSize);
  }, [sorted, currentPage, effectivePageSize, isShowAll]);

  const renderSortIcon = (field: NiftySortField) => {
    if (sortField !== field) {
      return (
        <ChevronsUpDown
          size={12}
          className="inline ml-1 text-slate-500 opacity-60"
        />
      );
    }
    return sortOrder === "asc" ? (
      <ChevronUp size={12} className="inline ml-1 text-teal-400 font-bold" />
    ) : (
      <ChevronDown size={12} className="inline ml-1 text-teal-400 font-bold" />
    );
  };

  return (
    <>
      {/* ── Filter Modal Portal ── */}
      {mounted &&
        filterPanelOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setFilterPanelOpen(false)}
            />
            {/* Panel */}
            <div className="relative z-10 w-full max-w-xl h-[85vh] max-h-[640px] flex flex-col bg-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-teal-400" />
                  <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                    Nifty Transactions Tab Filters
                  </h3>
                </div>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs cursor-pointer"
                  aria-label="Close filters"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
                {/* Applicant / Family Member Filter */}
                <SingleSelectFilter
                  label="Applicant"
                  value={selectedMember}
                  onChange={(m) => {
                    onMemberChange(m);
                    setCurrentPage(1);
                  }}
                  options={membersList}
                  allLabel="All Applicants"
                  allId="all"
                />

                <FilterSectionDivider />

                {/* Fund Category Multi-Select Filter */}
                {availableCategories.length > 0 && (
                  <>
                    <MultiSelectFilter
                      label="Fund Category"
                      values={selectedCategories}
                      onChange={(cats) => {
                        setSelectedCategories(cats);
                        setCurrentPage(1);
                        updateTableUrl({
                          category: serializeCategoryFilters(cats) || null,
                          page: "1",
                        });
                      }}
                      options={availableCategories}
                      allLabel="All Categories"
                      onClear={() => {
                        setSelectedCategories([]);
                        setCurrentPage(1);
                        updateTableUrl({ category: null, page: "1" });
                      }}
                    />
                    <FilterSectionDivider />
                  </>
                )}

                {/* Transaction Types Multi-Select Filter */}
                {availableTypes.length > 0 && (
                  <MultiSelectFilter
                    label="Transaction Types"
                    values={selectedTypes}
                    onChange={(types) => {
                      setSelectedTypes(types);
                      setCurrentPage(1);
                      updateTableUrl({
                        type: serializeCategoryFilters(types) || null,
                        page: "1",
                      });
                    }}
                    options={availableTypes}
                    allLabel="All Types"
                    onClear={() => {
                      setSelectedTypes([]);
                      setCurrentPage(1);
                      updateTableUrl({ type: null, page: "1" });
                    }}
                  />
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 shrink-0 bg-slate-950/80">
                <button
                  onClick={() => {
                    onMemberChange("all");
                    setSelectedTypes([]);
                    setSelectedCategories([]);
                    setOnlyHigher(false);
                    setCurrentPage(1);
                    updateTableUrl({
                      type: null,
                      category: null,
                      higher: null,
                      page: "1",
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                  Apply & View {filtered.length} Record
                  {filtered.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <SearchFilterBar
            value={searchQuery}
            onChange={(val) => {
              onSearchChange(val);
              setCurrentPage(1);
              updateTableUrl({ page: "1" });
            }}
            placeholder={
              tradeMode === "BUY"
                ? "Search fund name, folio, applicant or purchase type…"
                : "Search fund name, folio, applicant or sell type…"
            }
            className="flex-1 w-full"
          />

          {/* Filter Modal Toggle Button */}
          <button
            type="button"
            onClick={() => setFilterPanelOpen(true)}
            className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeFiltersCount > 0
                ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
                : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Market Timing Quick Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextHigher = !onlyHigher;
              setOnlyHigher(nextHigher);
              setCurrentPage(1);
              updateTableUrl({
                higher: nextHigher ? "true" : null,
                page: "1",
              });
            }}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 shrink-0 ${
              onlyHigher
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                : "bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                onlyHigher ? "bg-amber-400 animate-pulse" : "bg-slate-600"
              }`}
            />
            <span>
              {tradeMode === "BUY"
                ? "Higher than Current Nifty"
                : "Sold Above Current Nifty"}
            </span>
          </button>
        </div>

        {/* ── Table Container ── */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
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
                    className="py-12 text-center text-slate-500"
                  >
                    No transaction records found matching the current filters.
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => {
                  const fundUrl = getFundDetailsUrl(tx.holdingId, tx.isSold);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-800/40 transition-colors duration-150 group ${
                        tx.isHigherThanCurrent
                          ? "bg-amber-950/15 hover:bg-amber-900/25"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                        {tx.displayDate}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => router.push(fundUrl)}
                            className="text-left font-semibold text-slate-100 hover:text-teal-400 hover:underline transition cursor-pointer leading-snug"
                          >
                            {tx.schemeName}
                          </button>
                          <span className="text-[10.5px] text-slate-300 font-medium leading-tight">
                            {tx.memberName}
                          </span>
                          <div className="mt-0.5">
                            <FolioBadge folioNo={tx.folioNo} />
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            tx.transactionType === "SIP"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              : tx.transactionType === "SWITCH_IN" ||
                                  tx.transactionType === "SWITCH_OUT"
                                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                : tx.transactionType === "SELL"
                                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          }`}
                          title={tx.rawTransactionType}
                        >
                          {tx.rawTransactionType}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-100 font-semibold whitespace-nowrap">
                        {formatIndianAmount(tx.purchaseAmount, 0)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-400 whitespace-nowrap text-[11px]">
                        {tx.purchaseNav.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-medium text-slate-200">
                        {tx.niftyAtPurchase > 0
                          ? tx.niftyAtPurchase.toLocaleString("en-IN", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                        {tx.niftyAtPurchase > 0 ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              tx.isHigherThanCurrent
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700/60"
                            }`}
                          >
                            {tx.niftyDiffPct >= 0 ? "+" : ""}
                            {tx.niftyDiffPct.toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {tradeMode === "BUY" ? (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                            <div className="flex flex-col items-end">
                              <span
                                className={`font-semibold ${
                                  tx.gain >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {tx.gain >= 0 ? "+" : ""}
                                {formatIndianAmount(tx.gain, 0)}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  tx.absReturn >= 0
                                    ? "text-emerald-500/80"
                                    : "text-rose-500/80"
                                }`}
                              >
                                ({tx.absReturn >= 0 ? "+" : ""}
                                {tx.absReturn.toFixed(2)}%)
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-2.5 text-right font-mono text-slate-400 whitespace-nowrap text-[11px]">
                            {tx.holdingDays}d
                          </td>

                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              tx.cagr >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {tx.cagr >= 0 ? "+" : ""}
                            {tx.cagr.toFixed(2)}%
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300 whitespace-nowrap text-[11px]">
                            {tx.units > 0
                              ? tx.units.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 3,
                                })
                              : "—"}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {tx.isHigherThanCurrent ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Above Spot Level
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                                Below Spot Level
                              </span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-2 gap-3">
          {/* Left Side: Summary text */}
          <div>
            <span>
              Showing{" "}
              <span className="font-semibold text-slate-300">
                {sorted.length === 0
                  ? 0
                  : (currentPage - 1) * effectivePageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-300">
                {Math.min(currentPage * effectivePageSize, sorted.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-300">
                {sorted.length}
              </span>{" "}
              records
            </span>
          </div>

          {/* Right Side: Page size pills + Page navigation */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Page size buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold mr-1">Show:</span>
              {[25, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pageSize === size
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm"
                      : "bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {size}
                </button>
              ))}
              <button
                onClick={() => {
                  setPageSize(100000);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isShowAll
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm"
                    : "bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
                }`}
              >
                All
              </button>
            </div>

            {/* Prev / Next Page controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextPage = Math.max(currentPage - 1, 1);
                  setCurrentPage(nextPage);
                  updateTableUrl({ page: String(nextPage) });
                }}
                disabled={currentPage === 1 || isShowAll}
                className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-bold text-slate-200 px-1 font-mono">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => {
                  const nextPage = Math.min(currentPage + 1, totalPages);
                  setCurrentPage(nextPage);
                  updateTableUrl({ page: String(nextPage) });
                }}
                disabled={currentPage >= totalPages || isShowAll}
                className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
