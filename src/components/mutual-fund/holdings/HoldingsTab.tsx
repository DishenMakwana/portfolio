"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import {
  matchCategoryFilter,
  getCategoryOptions,
  parseCategoryFilters,
  serializeCategoryFilters,
} from "@/helpers/holdingsCategory";
import { isUnlistedStock } from "@/lib/stockApi";
import { HOLDINGS_SORT_FIELDS } from "@/types/holdings";
import type {
  HoldingsCategoryFilters,
  HoldingsSortField,
  HoldingsTabProps,
} from "@/types/holdings";

export default function HoldingsTab({
  holdings,
  memberSummaries,
  initialMember = "All",
}: HoldingsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Read initial states from URL query params
  const initialSearch = searchParams.get("q") || "";
  const initialMemberParam = searchParams.get("member") || initialMember;
  const initialPlan = searchParams.get("plan") || "All";
  const initialCategoryFilters = parseCategoryFilters(
    searchParams.get("category")
  );
  const rawSort = searchParams.get("sort");
  const initialSort = (
    (HOLDINGS_SORT_FIELDS as readonly string[]).includes(rawSort || "")
      ? rawSort
      : "xirr"
  ) as HoldingsSortField;
  const rawOrder = searchParams.get("order");
  const initialOrder = (
    rawOrder === "asc" || rawOrder === "desc" ? rawOrder : "desc"
  ) as "asc" | "desc";

  const initialStatus = searchParams.get("status") || "active";

  // Local Search & Filter State
  const [searchVal, setSearchVal] = useState(initialSearch); // For instant input typing
  const [memberFilter, setMemberFilter] = useState(initialMemberParam);
  const [planFilter, setPlanFilter] = useState(initialPlan);
  const [categoryFilters, setCategoryFilters] =
    useState<HoldingsCategoryFilters>(initialCategoryFilters);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortField, setSortField] = useState<HoldingsSortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialOrder);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Dynamic Category Options
  const categoryOptions = useMemo(
    () => getCategoryOptions(holdings.map((h) => h.category)),
    [holdings]
  );

  // Helper to update query string parameters in the URL
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
        (key === "status" && value === "active")
      ) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  // Synchronize state when URL query params change (e.g. Back/Forward browser navigation)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchVal(q);
    setMemberFilter(searchParams.get("member") || "All");
    setPlanFilter(searchParams.get("plan") || "All");
    setCategoryFilters(parseCategoryFilters(searchParams.get("category")));
    setStatusFilter(searchParams.get("status") || "active");
    const rawS = searchParams.get("sort");
    setSortField(
      ((HOLDINGS_SORT_FIELDS as readonly string[]).includes(rawS || "")
        ? rawS
        : "xirr") as HoldingsSortField
    );
    const rawO = searchParams.get("order");
    setSortOrder(
      (rawO === "asc" || rawO === "desc" ? rawO : "desc") as "asc" | "desc"
    );
  }, [searchParams]);

  // Debounced search query update in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUrlQ = searchParams.get("q") || "";
      if (currentUrlQ !== searchVal) {
        updateUrl({ q: searchVal });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const handleMemberChange = (value: string) => {
    setMemberFilter(value);
    updateUrl({ member: value });
  };

  const handlePlanChange = (value: string) => {
    setPlanFilter(value);
    updateUrl({ plan: value });
  };

  const handleCategoryToggle = (category: string): void => {
    const nextCategoryFilters = categoryFilters.includes(category)
      ? categoryFilters.filter((filter) => filter !== category)
      : [...categoryFilters, category];
    setCategoryFilters(nextCategoryFilters);
    updateUrl({ category: serializeCategoryFilters(nextCategoryFilters) });
  };

  const handleCategoryClear = (): void => {
    setCategoryFilters([]);
    updateUrl({ category: null });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    updateUrl({ status: value });
  };

  const handleClearAll = () => {
    setMemberFilter("All");
    setPlanFilter("All");
    setStatusFilter("active");
    setCategoryFilters([]);
    setSearchVal("");
    updateUrl({
      member: null,
      plan: null,
      status: null,
      category: null,
      q: null,
    });
  };

  const handleSort = (field: typeof sortField) => {
    let nextOrder: "asc" | "desc" = "desc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(nextOrder);
    updateUrl({ sort: field, order: nextOrder });
  };
  const renderSortIcon = (field: typeof sortField) => {
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

  // Active holdings count (excluding fully redeemed/sold 0 balance folios)
  const activeTotalCount = holdings.filter(
    (h) => (h.balanceUnits ?? 0) > 0.0001
  ).length;

  // Filter and Sort holdings
  const filtered = holdings
    .filter((h) => {
      const searchLower = searchVal.trim().toLowerCase();
      const cleanFolio = (h.folioNo || "").replace(/^'/, "").toLowerCase();
      const matchSearch =
        !searchLower ||
        h.schemeName.toLowerCase().includes(searchLower) ||
        (h.memberName || "").toLowerCase().includes(searchLower) ||
        cleanFolio.includes(searchLower);
      const matchMember =
        memberFilter === "All" || h.memberName === memberFilter;

      // Plan type check: SIF vs standard MF
      const nameUpper = (h.schemeName || "").toUpperCase();
      const codeUpper = (h.schemeCodeApi || "").toUpperCase();
      const isSifPlan = nameUpper.includes("SIF") || codeUpper.includes("SIF");

      let matchPlan = true;
      if (planFilter === "MF") {
        matchPlan = !isSifPlan;
      } else if (planFilter === "SIF") {
        matchPlan = isSifPlan;
      }

      // Folio Status check: Active vs Inactive (Redeemed/Sold)
      const isActiveFolio = (h.balanceUnits ?? 0) > 0.0001;
      let matchStatus = true;
      if (statusFilter === "active") {
        matchStatus = isActiveFolio;
      } else if (statusFilter === "inactive") {
        matchStatus = !isActiveFolio;
      }

      // Category check
      const matchCategory = matchCategoryFilter(h.category, categoryFilters);

      return (
        matchSearch && matchMember && matchPlan && matchStatus && matchCategory
      );
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (sortOrder === "asc") {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

  return (
    <motion.div
      key="holdings"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
    >
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
                    onClick={() => handleMemberChange("All")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      memberFilter === "All"
                        ? "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                        : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    All Applicants
                  </button>
                  {memberSummaries.map((m) => (
                    <button
                      key={m.name}
                      onClick={() =>
                        handleMemberChange(
                          memberFilter === m.name ? "All" : m.name
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        memberFilter === m.name
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* Type */}
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>Fund Type</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded tracking-normal normal-case">
                    Single Select
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["All", "MF", "SIF"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handlePlanChange(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        planFilter === opt
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {opt === "All"
                        ? "All Types"
                        : opt === "MF"
                          ? "Mutual Fund (MF)"
                          : "Specialized (SIF)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* Status */}
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>Folio Status</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded tracking-normal normal-case">
                    Single Select
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["active", "inactive", "all"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleStatusChange(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        statusFilter === opt
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-teal-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {opt === "active"
                        ? "Active Folios"
                        : opt === "inactive"
                          ? "Inactive / Sold"
                          : "All Folios"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* Category */}
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>Fund Category</span>
                  <span className="text-[10px] font-semibold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded tracking-normal normal-case">
                    Multi Select
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCategoryClear}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      categoryFilters.length === 0
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-indigo-500/40"
                        : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    All Categories
                  </button>
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryToggle(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        categoryFilters.includes(cat)
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-indigo-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {categoryFilters.includes(cat) && (
                        <span className="mr-1">✓</span>
                      )}
                      {cat}
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

      {/* ── Search + Filters card ── */}
      <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
        {/* Toolbar row */}
        <div className="flex items-center gap-2">
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

          {/* Filters button */}
          {(() => {
            const activeCount =
              (memberFilter !== "All" ? 1 : 0) +
              (planFilter !== "All" ? 1 : 0) +
              (statusFilter !== "active" ? 1 : 0) +
              categoryFilters.length;
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

        {/* Active filter chips — inside the same card */}
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
                  onClick={() => handleMemberChange("All")}
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label="Remove member filter"
                >
                  ✕
                </button>
              </span>
            );
          if (planFilter !== "All")
            chips.push(
              <span
                key="plan"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
              >
                📦 {planFilter === "MF" ? "Mutual Fund" : "Specialized (SIF)"}
                <button
                  onClick={() => handlePlanChange("All")}
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label="Remove plan filter"
                >
                  ✕
                </button>
              </span>
            );
          if (statusFilter !== "active")
            chips.push(
              <span
                key="status"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
              >
                🔖{" "}
                {statusFilter === "inactive" ? "Inactive / Sold" : "All Folios"}
                <button
                  onClick={() => handleStatusChange("active")}
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label="Remove status filter"
                >
                  ✕
                </button>
              </span>
            );
          categoryFilters.forEach((cat) =>
            chips.push(
              <span
                key={`cat-${cat}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
              >
                🏷 {cat}
                <button
                  onClick={() => handleCategoryToggle(cat)}
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label={`Remove ${cat} filter`}
                >
                  ✕
                </button>
              </span>
            )
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
        {/* Table Top Bar with Fund Count */}
        <div className="flex items-center justify-end px-4 py-3 bg-slate-950/80 border-b border-slate-850">
          <span className="text-xs text-slate-400 font-medium">
            Showing{" "}
            <span className="text-slate-200 font-bold">{filtered.length}</span>{" "}
            of{" "}
            <span className="text-slate-200 font-bold">{activeTotalCount}</span>{" "}
            active folios
            {statusFilter !== "active" && (
              <span className="text-slate-500 font-normal">
                {" "}
                ({holdings.length} total including inactive)
              </span>
            )}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
                <th className="p-4">Scheme Details</th>
                <th className="p-4">Holder</th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => handleSort("currentValue")}
                >
                  <div className="flex items-center gap-1">
                    Valuation {renderSortIcon("currentValue")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => handleSort("gain")}
                >
                  <div className="flex items-center gap-1">
                    Profit/Loss {renderSortIcon("gain")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                  onClick={() => handleSort("holdingDays")}
                >
                  <div className="flex items-center gap-1">
                    Holding Days {renderSortIcon("holdingDays")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => handleSort("cagr")}
                >
                  <div className="flex items-center gap-1">
                    CAGR {renderSortIcon("cagr")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => handleSort("xirr")}
                >
                  <div className="flex items-center gap-1">
                    XIRR {renderSortIcon("xirr")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => handleSort("alpha")}
                >
                  <div className="flex items-center gap-1">
                    Alpha {renderSortIcon("alpha")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No holdings match the search filter.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() =>
                      router.push(
                        h.id < 0
                          ? `/fund/sold_${Math.abs(h.id)}`
                          : `/fund/${h.id}`
                      )
                    }
                    className="transition cursor-pointer select-none hover:bg-slate-950/45"
                  >
                    <td className="p-4">
                      <div className="font-bold text-slate-100">
                        {h.schemeName}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          {h.category}
                        </span>
                        {h.folioNo && (
                          <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-tight">
                            Folio: {h.folioNo.replace(/^'/, "")}
                          </span>
                        )}
                        {h.balanceUnits <= 0.0001 && (
                          <span className="bg-amber-950/80 text-amber-400 border border-amber-800/40 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                            Inactive / Sold
                          </span>
                        )}
                        {isUnlistedStock(h.schemeName) && (
                          <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase animate-pulse">
                            Unlisted
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>Units: {h.balanceUnits.toFixed(3)}</span>
                        <span>• NAV: ₹{h.currentNav.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-200">
                      {h.memberName}
                    </td>
                    <td className="p-4 font-bold text-slate-100">
                      <div>{formatCurrency(h.currentValue)}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Cost: {formatCurrency(h.purchaseValue)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className={`font-semibold ${h.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {formatCurrency(h.gain)}
                      </div>
                      <div
                        className={`text-[11px] ${h.gain >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}
                      >
                        {h.absoluteReturn.toFixed(1)}% Abs
                      </div>
                    </td>
                    <td className="p-4 text-slate-200 whitespace-nowrap">
                      <div className="font-bold">{h.holdingDays}</div>
                      {h.holdingDays >= 30 && (
                        <div className="text-[11px] text-slate-500 font-medium">
                          {formatHoldingYearsAndDays(h.holdingDays)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div
                        className={`font-bold ${
                          h.cagr >= 0 ? "text-slate-200" : "text-red-400"
                        }`}
                      >
                        {formatPercent(h.cagr)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className={`font-bold ${
                          h.xirr >= 0 ? "text-teal-400" : "text-red-400"
                        }`}
                      >
                        {formatPercent(h.xirr)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${h.alpha >= 0 ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-red-950/80 text-red-400 border border-red-800/40"}`}
                      >
                        {h.alpha.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
