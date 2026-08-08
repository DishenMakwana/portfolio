"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Info,
  ShieldAlert,
  Calendar,
  RotateCcw,
  Upload,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import { isDateInRange, getPresetDateRange } from "@/helpers/dates";
import type {
  TransactionRow,
  TransactionSortField,
} from "@/types/transactions";
import { TRANSACTION_SORT_FIELDS } from "@/types/transactions";
import TransactionUploadModal from "./TransactionUploadModal";

interface TransactionsClientProps {
  transactions: TransactionRow[];
}

const ITEMS_PER_PAGE = 50;

export default function TransactionsClient({
  transactions,
}: TransactionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [showSttInfo, setShowSttInfo] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const initialSearch = searchParams.get("q") || "";
  const initialMember = searchParams.get("member") || "All";
  const initialType = searchParams.get("type") || "All";
  const initialStt = searchParams.get("stt") || "All";
  const initialStartDate = searchParams.get("start") || "";
  const initialEndDate = searchParams.get("end") || "";
  const rawSort = searchParams.get("sort");
  const initialSort = (
    (TRANSACTION_SORT_FIELDS as readonly string[]).includes(rawSort || "")
      ? rawSort
      : "date"
  ) as TransactionSortField;
  const rawOrder = searchParams.get("order");
  const initialOrder = (
    rawOrder === "asc" || rawOrder === "desc" ? rawOrder : "desc"
  ) as "asc" | "desc";

  const [searchVal, setSearchVal] = useState(initialSearch);
  const [memberFilter, setMemberFilter] = useState(initialMember);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [sttFilter, setSttFilter] = useState(initialStt);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [sortField, setSortField] = useState<TransactionSortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialOrder);
  const [page, setPage] = useState(1);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "All") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchVal(q);
    setMemberFilter(searchParams.get("member") || "All");
    setTypeFilter(searchParams.get("type") || "All");
    setSttFilter(searchParams.get("stt") || "All");
    setStartDate(searchParams.get("start") || "");
    setEndDate(searchParams.get("end") || "");
    const rawS = searchParams.get("sort");
    setSortField(
      ((TRANSACTION_SORT_FIELDS as readonly string[]).includes(rawS || "")
        ? rawS
        : "date") as TransactionSortField
    );
    const rawO = searchParams.get("order");
    setSortOrder(
      (rawO === "asc" || rawO === "desc" ? rawO : "desc") as "asc" | "desc"
    );
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUrlQ = searchParams.get("q") || "";
      if (currentUrlQ !== searchVal) {
        updateUrl({ q: searchVal });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Reset page on filter/sort change
  useEffect(() => {
    setPage(1);
  }, [
    searchVal,
    memberFilter,
    typeFilter,
    sttFilter,
    startDate,
    endDate,
    sortField,
    sortOrder,
  ]);

  const memberNames = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.memberName))).sort(),
    [transactions]
  );

  const transactionTypeNames = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((t) => t.transactionType)
            .filter((t): t is string => Boolean(t))
        )
      ).sort(),
    [transactions]
  );

  const handleSort = (field: TransactionSortField) => {
    let nextOrder: "asc" | "desc" = "desc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(nextOrder);
    updateUrl({ sort: field, order: nextOrder });
  };

  const handlePresetRange = (preset: string) => {
    const { start, end } = getPresetDateRange(preset);
    setStartDate(start);
    setEndDate(end);
    updateUrl({ start: start || null, end: end || null });
  };

  const handleClearAll = () => {
    setMemberFilter("All");
    setTypeFilter("All");
    setSttFilter("All");
    setSearchVal("");
    setStartDate("");
    setEndDate("");
    updateUrl({
      member: null,
      type: null,
      stt: null,
      q: null,
      start: null,
      end: null,
    });
  };

  const renderSortIcon = (field: TransactionSortField) => {
    const isActive = sortField === field;
    if (isActive) {
      return sortOrder === "asc" ? (
        <ChevronUp size={12} className="inline ml-1 text-teal-400" />
      ) : (
        <ChevronDown size={12} className="inline ml-1 text-teal-400" />
      );
    }
    return <ChevronDown size={12} className="inline ml-1 opacity-20" />;
  };

  const filtered = useMemo(() => {
    const lowerSearch = searchVal.toLowerCase();
    return transactions
      .filter((t) => {
        const matchSearch =
          t.schemeName.toLowerCase().includes(lowerSearch) ||
          (t.folioNo || "").toLowerCase().includes(lowerSearch) ||
          t.memberName.toLowerCase().includes(lowerSearch);
        const matchMember =
          memberFilter === "All" || t.memberName === memberFilter;
        const matchType =
          typeFilter === "All" ||
          t.type === typeFilter ||
          t.transactionType === typeFilter;
        const matchStt =
          sttFilter === "All" ||
          (sttFilter === "Charged" && (t.stt || 0) > 0) ||
          (sttFilter === "Zero" && (t.stt || 0) === 0);
        const matchDate = isDateInRange(t.date, startDate, endDate);
        return matchSearch && matchMember && matchType && matchStt && matchDate;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        if (sortOrder === "asc") {
          return (valA as number) > (valB as number) ? 1 : -1;
        }
        return (valA as number) < (valB as number) ? 1 : -1;
      });
  }, [
    transactions,
    searchVal,
    memberFilter,
    typeFilter,
    sttFilter,
    startDate,
    endDate,
    sortField,
    sortOrder,
  ]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Summary stats
  const totalBuyAmount = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "BUY")
        .reduce((s, t) => s + t.amount, 0),
    [filtered]
  );
  const totalSellAmount = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "SELL")
        .reduce((s, t) => s + t.amount, 0),
    [filtered]
  );
  const totalStampDuty = useMemo(
    () => filtered.reduce((s, t) => s + (t.stampDuty || 0), 0),
    [filtered]
  );
  const totalStt = useMemo(
    () => filtered.reduce((s, t) => s + (t.stt || 0), 0),
    [filtered]
  );

  return (
    <>
      <motion.div
        key="transactions"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-xs font-semibold text-slate-400">
            Total {transactions.length.toLocaleString("en-IN")} transaction
            records in database
          </div>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <Upload size={16} />
            <span>Upload Statement (.xlsx)</span>
          </button>
        </div>
        {/* STT Information Banner */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 backdrop-blur-md shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                <Info className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    Securities Transaction Tax (STT) & Tax Applicability
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Tax Regulation
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  <strong className="text-slate-200">What is STT?</strong>{" "}
                  Securities Transaction Tax (STT) is a direct tax levied by the
                  Central Government of India on mutual fund transactions.
                </p>
                {showSttInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Redemptions / Sells (Equity Funds)
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Levied at{" "}
                          <strong className="text-slate-200">0.001%</strong> on
                          the redemption proceeds when selling or switching out
                          of{" "}
                          <strong className="text-slate-200">
                            Equity-oriented mutual funds
                          </strong>{" "}
                          ($\ge 65\%$ equity allocation). Automatically deducted
                          upfront by AMC.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          Purchases & Non-Equity Schemes
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          <strong className="text-slate-200">
                            Purchases/SIPs:
                          </strong>{" "}
                          Exempt from STT (attracts 0.005% Stamp Duty instead).{" "}
                          <br />
                          <strong className="text-slate-200">
                            Debt & Liquid Funds:
                          </strong>{" "}
                          Completely exempt from STT.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSttInfo(!showSttInfo)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap cursor-pointer"
            >
              {showSttInfo ? "Hide Details" : "Learn More"}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
              Total Transactions
            </div>
            <div className="text-xl font-extrabold text-slate-100 tracking-tight">
              {filtered.length.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-emerald-500 uppercase tracking-wide font-semibold mb-1">
              Total Buy Amount
            </div>
            <div className="text-xl font-extrabold text-emerald-400 tracking-tight">
              {formatCurrency(totalBuyAmount)}
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-red-500 uppercase tracking-wide font-semibold mb-1">
              Total Sell Amount
            </div>
            <div className="text-xl font-extrabold text-red-400 tracking-tight">
              {formatCurrency(totalSellAmount)}
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-amber-500 uppercase tracking-wide font-semibold mb-1">
              Total Stamp Duty Paid
            </div>
            <div className="text-xl font-extrabold text-amber-400 tracking-tight">
              {formatCurrency(totalStampDuty)}
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-indigo-400 uppercase tracking-wide font-semibold mb-1">
              Total STT Paid
            </div>
            <div className="text-xl font-extrabold text-indigo-400 tracking-tight">
              {formatCurrency(totalStt)}
            </div>
          </div>
        </div>

        {/* ── Filter Modal ── */}
        {filterPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setFilterPanelOpen(false)}
            />

            {/* Panel */}
            <div className="relative z-10 w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
                <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                  Filters
                </h2>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs"
                  aria-label="Close filters"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
                {/* Applicant */}
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>Applicant</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded tracking-normal normal-case">
                      Single Select
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setMemberFilter("All");
                        updateUrl({ member: "All" });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        memberFilter === "All"
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      All Applicants
                    </button>
                    {memberNames.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          const next = memberFilter === m ? "All" : m;
                          setMemberFilter(next);
                          updateUrl({ member: next });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          memberFilter === m
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                            : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-800/60" />

                {/* Transaction Type */}
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>Transaction Type</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded tracking-normal normal-case">
                      Single Select
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["All", "BUY", "SELL"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setTypeFilter(opt);
                          updateUrl({ type: opt });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          typeFilter === opt
                            ? opt === "BUY"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-emerald-500/40"
                              : opt === "SELL"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-rose-500/40"
                                : "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                            : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        {opt === "All" ? "All Types" : opt}
                      </button>
                    ))}
                    {transactionTypeNames.map((tt) => (
                      <button
                        key={tt}
                        onClick={() => {
                          setTypeFilter(tt);
                          updateUrl({ type: tt });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          typeFilter === tt
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                            : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        {tt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-800/60" />

                {/* STT Status */}
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>STT Status</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded tracking-normal normal-case">
                      Single Select
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["All", "Charged", "Zero"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSttFilter(opt);
                          updateUrl({ stt: opt });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          sttFilter === opt
                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-indigo-500/40"
                            : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        {opt === "All"
                          ? "All STT Status"
                          : opt === "Charged"
                            ? "STT Charged (> ₹0)"
                            : "No STT (₹0)"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-950">
                <button
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20"
                >
                  Show {filtered.length} result
                  {filtered.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Search + Date Range + Filters card ── */}
        <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
          {/* Toolbar row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search scheme, folio or applicant…"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full h-9 bg-slate-950/60 border border-slate-800/60 rounded-xl pl-9 pr-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition"
              />
              {searchVal && (
                <button
                  onClick={() => setSearchVal("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-[10px]"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date Range (compact inline) */}
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-800/60 bg-slate-950/60">
              <Calendar className="w-3 h-3 text-teal-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  updateUrl({ start: e.target.value });
                }}
                className="bg-transparent text-xs text-slate-300 focus:outline-none border-none [color-scheme:dark] w-[110px]"
                title="From date"
              />
              <span className="text-slate-600 text-xs">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  updateUrl({ end: e.target.value });
                }}
                className="bg-transparent text-xs text-slate-300 focus:outline-none border-none [color-scheme:dark] w-[110px]"
                title="To date"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    updateUrl({ start: null, end: null });
                  }}
                  className="text-slate-500 hover:text-rose-400 transition ml-0.5"
                  title="Clear date filter"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Date presets */}
            <div className="relative h-9">
              <select
                onChange={(e) => {
                  if (e.target.value) handlePresetRange(e.target.value);
                }}
                value=""
                className="h-9 appearance-none bg-slate-950/60 border border-slate-800/60 rounded-xl px-3 pr-7 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer transition hover:border-slate-600 hover:text-slate-100"
              >
                <option value="" disabled>
                  Presets
                </option>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last-7">Last 7 Days</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="last-30">Last 30 Days</option>
                <option value="last-90">Last 90 Days</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-fy">This FY (2026-27)</option>
                <option value="last-fy">Last FY (2025-26)</option>
              </select>
              <ChevronDown className="w-3 h-3 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Filters button */}
            {(() => {
              const activeCount =
                (memberFilter !== "All" ? 1 : 0) +
                (typeFilter !== "All" ? 1 : 0) +
                (sttFilter !== "All" ? 1 : 0);
              return (
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
                    activeCount > 0
                      ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
                      : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {activeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* Active filter chips row inside card */}
          {(() => {
            const chips: ReactNode[] = [];
            if (memberFilter !== "All")
              chips.push(
                <span
                  key="member"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
                >
                  👤 {memberFilter}
                  <button
                    onClick={() => {
                      setMemberFilter("All");
                      updateUrl({ member: "All" });
                    }}
                    className="hover:opacity-70 transition ml-0.5"
                    aria-label="Remove member filter"
                  >
                    ✕
                  </button>
                </span>
              );
            if (typeFilter !== "All")
              chips.push(
                <span
                  key="type"
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    typeFilter === "BUY"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : typeFilter === "SELL"
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : "bg-teal-500/15 text-teal-300 border-teal-500/30"
                  }`}
                >
                  🔄 {typeFilter}
                  <button
                    onClick={() => {
                      setTypeFilter("All");
                      updateUrl({ type: "All" });
                    }}
                    className="hover:opacity-70 transition ml-0.5"
                    aria-label="Remove type filter"
                  >
                    ✕
                  </button>
                </span>
              );
            if (sttFilter !== "All")
              chips.push(
                <span
                  key="stt"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                >
                  🏛 {sttFilter === "Charged" ? "STT Charged" : "No STT"}
                  <button
                    onClick={() => {
                      setSttFilter("All");
                      updateUrl({ stt: "All" });
                    }}
                    className="hover:opacity-70 transition ml-0.5"
                    aria-label="Remove STT filter"
                  >
                    ✕
                  </button>
                </span>
              );
            if (startDate || endDate)
              chips.push(
                <span
                  key="date"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                >
                  📅{" "}
                  {startDate && endDate
                    ? `${startDate} – ${endDate}`
                    : startDate
                      ? `From ${startDate}`
                      : `Until ${endDate}`}
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      updateUrl({ start: null, end: null });
                    }}
                    className="hover:opacity-70 transition ml-0.5"
                    aria-label="Remove date filter"
                  >
                    ✕
                  </button>
                </span>
              );
            if (chips.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/50">
                {chips}
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1"
                >
                  Clear all
                </button>
              </div>
            );
          })()}
        </div>

        {/* Table Container */}
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
              <span className="text-slate-200 font-bold">
                {paginated.length}
              </span>{" "}
              of{" "}
              <span className="text-slate-200 font-bold">
                {filtered.length}
              </span>{" "}
              transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      Date {renderSortIcon("date")}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => handleSort("schemeName")}
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
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => handleSort("memberName")}
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
                    onClick={() => handleSort("type")}
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
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                    onClick={() => handleSort("units")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Units {renderSortIcon("units")}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                    onClick={() => handleSort("nav")}
                  >
                    <div className="flex items-center justify-end gap-1 leading-tight">
                      <span className="text-right">
                        Price
                        <br />
                        (₹)
                      </span>{" "}
                      {renderSortIcon("nav")}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                    onClick={() => handleSort("amount")}
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
                    onClick={() => handleSort("stampDuty")}
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
                    onClick={() => handleSort("stt")}
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
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No transactions match the current filters.
                    </td>
                  </tr>
                ) : (
                  paginated.map((t) => (
                    <tr key={t.id} className="transition hover:bg-slate-950/45">
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-200 font-medium text-xs sm:text-sm">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-100 text-xs sm:text-sm whitespace-normal leading-snug">
                          {t.schemeName}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded text-[11px] font-mono">
                          {t.folioNo || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-200 text-xs sm:text-sm whitespace-normal leading-snug">
                        {t.memberName}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                              t.type === "BUY"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                                : "bg-red-950/80 text-red-400 border border-red-800/40"
                            }`}
                          >
                            {t.type}
                          </span>
                          {t.transactionType && (
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/60">
                              {t.transactionType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-200 text-xs sm:text-sm tabular-nums">
                        {t.units.toFixed(4)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-200 text-xs sm:text-sm tabular-nums">
                        {t.nav.toFixed(4)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-100 text-xs sm:text-sm tabular-nums">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-amber-400/90 text-xs sm:text-sm tabular-nums">
                        {t.stampDuty !== null && t.stampDuty !== undefined
                          ? `₹${t.stampDuty.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-indigo-400 text-xs sm:text-sm tabular-nums whitespace-nowrap">
                        {t.stt !== null && t.stt !== undefined && t.stt > 0 ? (
                          <span className="font-bold text-indigo-300">
                            ₹{t.stt.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-950/80 border-t border-slate-850">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      page === pageNum
                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                        : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </motion.div>
      <TransactionUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </>
  );
}
