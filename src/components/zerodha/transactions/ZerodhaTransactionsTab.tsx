"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ChevronDown,
  SlidersHorizontal,
  Calendar,
  RotateCcw,
  Upload,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatZerodhaMemberShortName,
  getZerodhaClientBadgeStyle,
} from "@/helpers/formatters";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import FolioBadge from "@/components/shared/FolioBadge";
import TaxStatusCell from "@/components/shared/TaxStatusCell";
import TablePagination from "@/components/shared/TablePagination";
import {
  isDateInRange,
  getPresetDateRange,
  calculateTransactionHoldingDays,
} from "@/helpers/dates";
import {
  parseCategoryFilters,
  serializeCategoryFilters,
  matchCategoryFilter,
} from "@/helpers/holdingsCategory";
import {
  calculateTransactionSummary,
  isBuyTransactionType,
} from "@/helpers/transactions";
import { getTaxHorizon } from "@/helpers/taxHarvesting";
import { useTableSort } from "@/helpers/useTableSort";
import type { ZerodhaTransactionsTabProps } from "@/types/zerodha";
import type { TransactionSortField, TaxGainFilter } from "@/types/transactions";
import { TRANSACTION_SORT_FIELDS } from "@/types/transactions";
import ZerodhaTransactionUploadModal from "./ZerodhaTransactionUploadModal";

export default function ZerodhaTransactionsTab({
  transactions,
  selectedAccount = "all",
}: ZerodhaTransactionsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { sortField, sortOrder, handleSort, renderSortIcon } =
    useTableSort<TransactionSortField>({
      defaultField: "date",
      defaultOrder: "desc",
      allowedFields: TRANSACTION_SORT_FIELDS,
      onSortChange: () => setPage(1),
    });

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

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const initialSearch = searchParams.get("q") || "";
  const initialMember =
    selectedAccount !== "all"
      ? selectedAccount
      : searchParams.get("member") || "All";
  const initialType = searchParams.get("type");
  const initialTypeFilters = parseCategoryFilters(initialType);
  const initialCategory = searchParams.get("category");
  const initialCategoryFilters = parseCategoryFilters(initialCategory);
  const initialTax = (searchParams.get("tax") || "All") as TaxGainFilter;
  const initialStartDate = searchParams.get("start") || "";
  const initialEndDate = searchParams.get("end") || "";

  const [searchVal, setSearchVal] = useState(initialSearch);
  const [memberFilter, setMemberFilter] = useState(initialMember);
  const [typeFilters, setTypeFilters] = useState<string[]>(initialTypeFilters);
  const [categoryFilters, setCategoryFilters] = useState<string[]>(
    initialCategoryFilters
  );
  const [taxFilter, setTaxFilter] = useState<TaxGainFilter>(initialTax);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [page, setPage] = useState(initialPage);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    router.replace(url, {
      scroll: false,
    });
  };

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchVal(q);
    setMemberFilter(
      selectedAccount !== "all"
        ? selectedAccount
        : searchParams.get("member") || "All"
    );
    setTypeFilters(parseCategoryFilters(searchParams.get("type")));
    setCategoryFilters(parseCategoryFilters(searchParams.get("category")));
    setTaxFilter((searchParams.get("tax") || "All") as TaxGainFilter);
    setStartDate(searchParams.get("start") || "");
    setEndDate(searchParams.get("end") || "");
    const rawP = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawP) && rawP > 0) setPage(rawP);
    const rawPs = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    if (!isNaN(rawPs) && rawPs > 0) setPageSize(rawPs);
  }, [searchParams, selectedAccount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUrlQ = searchParams.get("q") || "";
      if (currentUrlQ !== searchVal) {
        updateUrl({ q: searchVal, page: "1" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  useEffect(() => {
    setPage(1);
  }, [
    searchVal,
    memberFilter,
    typeFilters,
    categoryFilters,
    taxFilter,
    startDate,
    endDate,
  ]);

  const members = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.clientId) set.add(t.clientId);
      else if (t.memberName) set.add(t.memberName);
    });
    return Array.from(set).sort((a, b) => {
      const nameA = formatZerodhaMemberShortName(a) || a;
      const nameB = formatZerodhaMemberShortName(b) || b;
      return nameA.localeCompare(nameB);
    });
  }, [transactions]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const transactionTypes = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.type) set.add(t.type);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchVal.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.schemeName.toLowerCase().includes(q) ||
        (t.folioNo && t.folioNo.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.clientId && t.clientId.toLowerCase().includes(q)) ||
        (t.memberName && t.memberName.toLowerCase().includes(q));

      const matchMember =
        memberFilter === "All" ||
        t.clientId === memberFilter ||
        t.memberName === memberFilter ||
        (t.clientId !== null &&
          formatZerodhaMemberShortName(t.clientId) === memberFilter) ||
        (t.memberName !== null &&
          formatZerodhaMemberShortName(t.memberName) === memberFilter);

      const matchType =
        typeFilters.length === 0 ||
        typeFilters.some(
          (f) =>
            t.type?.toLowerCase() === f.toLowerCase() ||
            t.rawTransactionType?.toLowerCase() === f.toLowerCase()
        );

      const matchCat =
        categoryFilters.length === 0 ||
        (t.category !== null &&
          matchCategoryFilter(t.category, categoryFilters));

      const matchDate = isDateInRange(t.date, startDate, endDate);
      const horizon = getTaxHorizon(t.date, t.category, t.schemeName);
      const matchTax =
        taxFilter === "All" ||
        (taxFilter === "LTCG" && horizon.taxType === "LTCG") ||
        (taxFilter === "STCG" && horizon.taxType === "STCG");

      return (
        matchSearch &&
        matchMember &&
        matchType &&
        matchCat &&
        matchDate &&
        matchTax
      );
    });
  }, [
    transactions,
    searchVal,
    memberFilter,
    typeFilters,
    categoryFilters,
    startDate,
    endDate,
    taxFilter,
  ]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (sortField) {
        case "date":
          valA = a.date;
          valB = b.date;
          break;
        case "schemeName":
          valA = a.schemeName.toLowerCase();
          valB = b.schemeName.toLowerCase();
          break;
        case "category":
          valA = (a.category || "").toLowerCase();
          valB = (b.category || "").toLowerCase();
          break;
        case "memberName":
          valA = (a.clientId || a.memberName).toLowerCase();
          valB = (b.clientId || b.memberName).toLowerCase();
          break;
        case "type":
          valA = a.type.toLowerCase();
          valB = b.type.toLowerCase();
          break;
        case "units":
          valA = a.units;
          valB = b.units;
          break;
        case "nav":
          valA = a.nav;
          valB = b.nav;
          break;
        case "amount":
          valA = a.amount;
          valB = b.amount;
          break;
        case "stampDuty":
          valA = a.stampDuty || 0;
          valB = b.stampDuty || 0;
          break;
        default:
          valA = a.date;
          valB = b.date;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, page, pageSize]);

  const summary = useMemo(
    () => calculateTransactionSummary(filteredTransactions),
    [filteredTransactions]
  );

  const handleTypeToggle = (type: string) => {
    const next = typeFilters.includes(type)
      ? typeFilters.filter((t) => t !== type)
      : [...typeFilters, type];
    setTypeFilters(next);
    updateUrl({
      type: next.length > 0 ? serializeCategoryFilters(next) : null,
      page: "1",
    });
  };

  const handleCategoryToggle = (category: string) => {
    const next = categoryFilters.includes(category)
      ? categoryFilters.filter((c) => c !== category)
      : [...categoryFilters, category];
    setCategoryFilters(next);
    updateUrl({
      category: next.length > 0 ? serializeCategoryFilters(next) : null,
      page: "1",
    });
  };

  const handlePresetRange = (preset: string) => {
    const { start, end } = getPresetDateRange(preset);
    setStartDate(start);
    setEndDate(end);
    updateUrl({ start: start || null, end: end || null, page: "1" });
  };

  const handleClearAll = () => {
    setSearchVal("");
    setMemberFilter("All");
    setTypeFilters([]);
    setCategoryFilters([]);
    setTaxFilter("All");
    setStartDate("");
    setEndDate("");
    setPage(1);
    updateUrl({
      q: null,
      member: null,
      type: null,
      category: null,
      tax: null,
      start: null,
      end: null,
      page: "1",
    });
  };

  const activeFiltersCount =
    (memberFilter !== "All" ? 1 : 0) +
    typeFilters.length +
    categoryFilters.length +
    (taxFilter !== "All" ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header Action Bar */}
      <div className="flex items-center justify-end mb-6">
        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
        >
          <Upload size={16} />
          <span>Upload Coin CSV</span>
        </button>
      </div>

      {/* ── Summary Cards (Matching Family Transactions) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* 1. Total Filtered Records */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold leading-tight">
                Total
                <br />
                Transactions
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-100 tracking-tight">
              {summary.totalCount.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            All matching statements
          </div>
        </div>

        {/* 2. Total Inflow (Buy) */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-emerald-950/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold leading-tight">
                Total Buy
                <br />
                (Inflow)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-center leading-tight">
                Buy
                <br />
                Volume
              </span>
            </div>
            <div className="text-xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-1.5">
              <TrendingUp size={18} className="text-emerald-400 shrink-0" />
              <span>{formatCurrency(summary.totalBuyAmount)}</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-2 font-medium">
            {summary.totalBuyCount.toLocaleString("en-IN")} entries • Total
            capital invested
          </div>
        </div>

        {/* 3. Total Outflow (Sell) */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-rose-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-rose-950/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider font-bold leading-tight">
                Total Sell
                <br />
                (Outflow)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 text-center leading-tight">
                Sell
                <br />
                Volume
              </span>
            </div>
            <div className="text-xl font-extrabold text-rose-400 tracking-tight flex items-center gap-1.5">
              <TrendingDown size={18} className="text-rose-400 shrink-0" />
              <span>{formatCurrency(summary.totalSellAmount)}</span>
            </div>
          </div>
          <div className="text-[11px] text-rose-400/80 mt-2 font-medium">
            {summary.totalSellCount.toLocaleString("en-IN")} entries • Redeemed
            / withdrawn
          </div>
        </div>

        {/* 4. Net Inflow */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-teal-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-teal-950/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
              <span className="text-[11px] text-teal-400 uppercase tracking-wider font-bold leading-tight">
                Net
                <br />
                Inflow
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30 text-center leading-tight">
                Buy −
                <br />
                Sell
              </span>
            </div>
            <div className="text-xl font-extrabold text-teal-300 tracking-tight flex items-center gap-1.5">
              <Wallet size={18} className="text-teal-400 shrink-0" />
              <span>{formatCurrency(summary.netInflowAmount)}</span>
            </div>
          </div>
          <div className="text-[11px] text-teal-400/80 mt-2 font-medium">
            Net capital flow for filtered entries
          </div>
        </div>

        {/* 5. Regulatory Taxes & Charges */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
              <span className="text-[11px] text-amber-400 uppercase tracking-wider font-bold leading-tight">
                Stamp Duty
                <br />& STT
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 text-center leading-tight">
                Taxes
                <br />
                Paid
              </span>
            </div>
            <div className="text-xl font-extrabold text-amber-400 tracking-tight">
              {formatCurrency(summary.totalStampDuty + summary.totalStt)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Stamp: {formatCurrency(summary.totalStampDuty)}</span>
            <span className="text-slate-500">STT: ₹0.00</span>
          </div>
        </div>
      </div>

      {/* ── Search + Date Range + Filters toolbar card ── */}
      <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
        {/* Toolbar row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <SearchFilterBar
            value={searchVal}
            onChange={setSearchVal}
            placeholder="Search scheme, sub category, folio or applicant…"
            className="flex-1"
          />

          {/* Date Range (compact inline) */}
          <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-800/60 bg-slate-950/60">
            <Calendar className="w-3 h-3 text-teal-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                updateUrl({ start: e.target.value, page: "1" });
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
                updateUrl({ end: e.target.value, page: "1" });
              }}
              className="bg-transparent text-xs text-slate-300 focus:outline-none border-none [color-scheme:dark] w-[110px]"
              title="To date"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  updateUrl({ start: null, end: null, page: "1" });
                }}
                className="text-slate-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
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
          <button
            type="button"
            onClick={() => setFilterPanelOpen(true)}
            className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeFiltersCount > 0
                ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
                : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
                {activeFiltersCount}
              </span>
            )}
          </button>
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
                👤 {formatZerodhaMemberShortName(memberFilter) || memberFilter}
                <button
                  type="button"
                  onClick={() => {
                    setMemberFilter("All");
                    updateUrl({ member: "All", page: "1" });
                  }}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Remove member filter"
                >
                  ✕
                </button>
              </span>
            );
          if (taxFilter !== "All")
            chips.push(
              <span
                key="tax"
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  taxFilter === "LTCG"
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                ⏳ {taxFilter === "LTCG" ? "LTCG (>1Y)" : "STCG (≤1Y)"}
                <button
                  type="button"
                  onClick={() => {
                    setTaxFilter("All");
                    updateUrl({ tax: "All", page: "1" });
                  }}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Remove Tax Horizon filter"
                >
                  ✕
                </button>
              </span>
            );
          typeFilters.forEach((tf) => {
            chips.push(
              <span
                key={`type-${tf}`}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  tf === "BUY"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : tf === "SELL"
                      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      : "bg-teal-500/15 text-teal-300 border-teal-500/30"
                }`}
              >
                🔄 {tf}
                <button
                  type="button"
                  onClick={() => handleTypeToggle(tf)}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label={`Remove ${tf} filter`}
                >
                  ✕
                </button>
              </span>
            );
          });
          categoryFilters.forEach((cat) => {
            chips.push(
              <span
                key={`cat-${cat}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
              >
                🏷️ {cat}
                <button
                  type="button"
                  onClick={() => handleCategoryToggle(cat)}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label={`Remove ${cat} filter`}
                >
                  ✕
                </button>
              </span>
            );
          });
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
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    updateUrl({ start: null, end: null, page: "1" });
                  }}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
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
                type="button"
                onClick={handleClearAll}
                className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          );
        })()}
      </div>

      {/* ── Slide-over Filter Drawer (Portal) ── */}
      {mounted &&
        filterPanelOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setFilterPanelOpen(false)}
            />

            {/* Panel */}
            <div className="relative z-10 w-full sm:max-w-xl h-[85vh] max-h-[640px] flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                  <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                    Transactions Tab Filters
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs cursor-pointer"
                  aria-label="Close filters"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
                {/* Applicant */}
                <SingleSelectFilter
                  label="Applicant / Account"
                  value={memberFilter}
                  onChange={(val) => {
                    setMemberFilter(val);
                    updateUrl({ member: val, page: "1" });
                  }}
                  options={members.map((m) => ({
                    id: m,
                    label: formatZerodhaMemberShortName(m) || m,
                  }))}
                  allLabel="All Accounts"
                  allId="All"
                />

                <FilterSectionDivider />

                {/* Transaction Type */}
                <MultiSelectFilter
                  label="Transaction Type"
                  values={typeFilters}
                  onChange={(types) => {
                    setTypeFilters(types);
                    updateUrl({
                      type:
                        types.length > 0
                          ? serializeCategoryFilters(types)
                          : null,
                      page: "1",
                    });
                  }}
                  options={transactionTypes.map((t) => ({
                    id: t,
                    label: t,
                  }))}
                  allLabel="All Types"
                  onClear={() => {
                    setTypeFilters([]);
                    updateUrl({ type: null, page: "1" });
                  }}
                />

                <FilterSectionDivider />

                {/* Sub Category */}
                <MultiSelectFilter
                  label="Fund Category"
                  values={categoryFilters}
                  onChange={(cats) => {
                    setCategoryFilters(cats);
                    updateUrl({
                      category:
                        cats.length > 0 ? serializeCategoryFilters(cats) : null,
                      page: "1",
                    });
                  }}
                  options={categories.map((c) => ({
                    id: c,
                    label: c,
                  }))}
                  allLabel="All Categories"
                  onClear={() => {
                    setCategoryFilters([]);
                    updateUrl({ category: null, page: "1" });
                  }}
                />

                <FilterSectionDivider />

                {/* Tax Horizon (LTCG / STCG) */}
                <SingleSelectFilter
                  label="Tax Horizon (Holding Period)"
                  value={taxFilter}
                  onChange={(val) => {
                    const tf = val as TaxGainFilter;
                    setTaxFilter(tf);
                    updateUrl({ tax: tf, page: "1" });
                  }}
                  options={[
                    {
                      id: "LTCG",
                      label: "LTCG (> 1 Year / 365 Days)",
                    },
                    {
                      id: "STCG",
                      label: "STCG (≤ 1 Year / 365 Days)",
                    },
                  ]}
                  allLabel="All Tax Horizons"
                  allId="All"
                />

                <FilterSectionDivider />

                {/* Date Range Inputs */}
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>Date Range</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        updateUrl({ start: e.target.value, page: "1" });
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500 transition"
                    />
                    <span className="text-slate-500 font-bold text-xs">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        updateUrl({ end: e.target.value, page: "1" });
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition cursor-pointer"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPanelOpen(false)}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                  Show {filteredTransactions.length} result
                  {filteredTransactions.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
              {paginatedTransactions.length}
            </span>{" "}
            of{" "}
            <span className="text-slate-200 font-bold">
              {filteredTransactions.length}
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
                  className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none min-w-[180px]"
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
                  className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none w-28 max-w-[120px]"
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
                      onClick={() => handleSort("units")}
                      className="flex items-center justify-end gap-1 hover:text-slate-200 transition cursor-pointer font-semibold"
                    >
                      <span>Units</span>
                      {renderSortIcon("units")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSort("nav")}
                      className="flex items-center justify-end gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer font-medium"
                    >
                      <span>Price (₹)</span>
                      {renderSortIcon("nav")}
                    </button>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => {
                  const isBuy = isBuyTransactionType(tx.type);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-950/45 transition select-none"
                    >
                      {/* Date */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-200 font-medium text-xs sm:text-sm">
                        {formatDate(tx.date)}
                      </td>

                      {/* Scheme Details */}
                      <td className="px-3 py-2.5 min-w-[180px]">
                        <div
                          onClick={() => {
                            if (tx.holdingId) {
                              router.push(`/fund/z_${tx.holdingId}`);
                            } else if (tx.schemeId) {
                              router.push(`/fund/${tx.schemeId}`);
                            }
                          }}
                          className="font-bold text-slate-100 hover:text-emerald-400 transition cursor-pointer text-xs sm:text-sm whitespace-normal leading-snug"
                          title={tx.schemeName}
                        >
                          {tx.schemeName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                            {tx.category || "Mutual Fund"}
                          </span>
                          {tx.broker && (
                            <span className="text-[10px] text-slate-500">
                              via {tx.broker}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Folio */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <FolioBadge folioNo={tx.folioNo} />
                      </td>

                      {/* Applicant Name (Username & Client Code stacked) */}
                      <td className="px-3 py-2.5 w-28 max-w-[120px]">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium text-slate-300 text-xs leading-snug break-words">
                            {formatZerodhaMemberShortName(
                              tx.clientId || tx.memberName
                            )}
                          </span>
                          {tx.clientId && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px]  font-bold ${getZerodhaClientBadgeStyle(
                                tx.clientId
                              )}`}
                            >
                              {tx.clientId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Transaction Type Badge */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                              isBuy
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                                : "bg-red-950/80 text-red-400 border border-red-800/40"
                            }`}
                          >
                            {tx.type}
                          </span>
                          {tx.rawTransactionType && (
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/60">
                              {tx.rawTransactionType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tax Status */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {tx.type === "SELL" || tx.type === "REDEMPTION"
                          ? (() => {
                              const days = calculateTransactionHoldingDays(
                                tx.date
                              );
                              return (
                                <TaxStatusCell
                                  status="Redeemed"
                                  days={days}
                                  title={`Redeemed / Sold on ${formatDate(tx.date)} (${days} days ago)`}
                                />
                              );
                            })()
                          : (() => {
                              const horizon = getTaxHorizon(
                                tx.date,
                                tx.category,
                                tx.schemeName
                              );
                              if (horizon.isElssLocked) {
                                return (
                                  <TaxStatusCell
                                    status="3Y Locked"
                                    days={horizon.lockDaysRemaining}
                                    title={`Mandatory 3-Year ELSS Lock-in: ${horizon.lockDaysRemaining} days remaining`}
                                  />
                                );
                              }
                              if (horizon.taxType === "LTCG") {
                                return (
                                  <TaxStatusCell
                                    status="LTCG"
                                    days={horizon.holdingDays}
                                    title="Long Term Capital Gains (> 1 Year holding) — Eligible for ₹1.25L annual tax-free harvesting"
                                  />
                                );
                              }
                              return (
                                <TaxStatusCell
                                  status="STCG"
                                  days={horizon.daysToLtcg}
                                  title={`Short Term Capital Gains (≤ 1 Year holding) — ${horizon.daysToLtcg} days left to LTCG`}
                                />
                              );
                            })()}
                      </td>

                      {/* Units & Price (Stacked) */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                        <div className="font-semibold text-slate-200 text-xs sm:text-sm">
                          {tx.units.toFixed(4)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          ₹{tx.nav.toFixed(4)}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-2.5 text-right font-bold text-slate-100 text-xs sm:text-sm tabular-nums">
                        {formatCurrency(tx.amount)}
                      </td>

                      {/* Stamp Duty */}
                      <td className="px-3 py-2.5 text-right font-medium text-amber-400/90 text-xs sm:text-sm tabular-nums">
                        {tx.stampDuty !== null &&
                        tx.stampDuty !== undefined &&
                        tx.stampDuty > 0
                          ? `₹${tx.stampDuty.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
                      <div className="font-bold text-slate-400">
                        No transactions found
                      </div>
                      <div className="text-xs text-slate-500">
                        {activeFiltersCount > 0
                          ? "Try adjusting your search or active filters."
                          : "Upload a Coin order history (.csv) file to view transaction records."}
                      </div>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
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
          onPageChange={(p) => {
            setPage(p);
            updateUrl({ page: String(p) });
          }}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
            updateUrl({ pageSize: String(s), page: "1" });
          }}
          totalItems={filteredTransactions.length}
          showingStart={(page - 1) * pageSize + 1}
          showingEnd={Math.min(page * pageSize, filteredTransactions.length)}
          itemName="transactions"
        />
      </div>

      {/* Coin CSV Upload Modal */}
      {mounted &&
        createPortal(
          <ZerodhaTransactionUploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
          />,
          document.body
        )}
    </div>
  );
}
