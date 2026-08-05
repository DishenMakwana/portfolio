"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown, Filter } from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import {
  matchCategoryFilter,
  getCategoryOptions,
} from "@/helpers/holdingsCategory";
import { isUnlistedStock } from "@/lib/stockApi";
import { HOLDINGS_SORT_FIELDS } from "@/types/holdings";
import type { HoldingsSortField, HoldingsTabProps } from "@/types/holdings";

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
  const initialCategory = searchParams.get("category") || "All";
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
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortField, setSortField] = useState<HoldingsSortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialOrder);

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
    setCategoryFilter(searchParams.get("category") || "All");
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

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    updateUrl({ category: value });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    updateUrl({ status: value });
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
      const matchCategory = matchCategoryFilter(h.category, categoryFilter);

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
      {/* Filters Row */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search scheme, folio or applicant..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner transition-all"
          />
        </div>

        {/* Filter dropdowns aligned in a clean 2-row grid */}
        <div className="flex flex-col gap-2.5 ml-auto">
          {/* Row 1: APPLICANT & CATEGORY */}
          <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-5">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 min-w-[72px]">
                APPLICANT:
              </span>
              <div className="relative inline-block w-[180px] sm:w-[210px]">
                <select
                  value={memberFilter}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full appearance-none bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-200 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 cursor-pointer shadow-inner transition-all truncate"
                >
                  <option value="All" className="bg-slate-900 text-slate-200">
                    All Applicants
                  </option>
                  {memberSummaries.map((m) => (
                    <option
                      key={m.name}
                      value={m.name}
                      className="bg-slate-900 text-slate-200"
                    >
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 min-w-[72px]">
                CATEGORY:
              </span>
              <div className="relative inline-block w-[180px] sm:w-[210px]">
                <select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full appearance-none bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-200 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 cursor-pointer shadow-inner transition-all truncate"
                >
                  <option value="All" className="bg-slate-900 text-slate-200">
                    All Categories
                  </option>
                  {categoryOptions.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      className="bg-slate-900 text-slate-200"
                    >
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Row 2: TYPE & FOLIO STATUS */}
          <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-5">
            <div className="flex items-center gap-2">
              <div className="w-[15px] shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 min-w-[72px]">
                TYPE:
              </span>
              <div className="relative inline-block w-[180px] sm:w-[210px]">
                <select
                  value={planFilter}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full appearance-none bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-200 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 cursor-pointer shadow-inner transition-all truncate"
                >
                  <option value="All" className="bg-slate-900 text-slate-200">
                    All Types
                  </option>
                  <option value="MF" className="bg-slate-900 text-slate-200">
                    Mutual Fund (MF)
                  </option>
                  <option value="SIF" className="bg-slate-900 text-slate-200">
                    Specialized (SIF)
                  </option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 min-w-[72px]">
                STATUS:
              </span>
              <div className="relative inline-block w-[180px] sm:w-[210px]">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full appearance-none bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-200 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 cursor-pointer shadow-inner transition-all truncate"
                >
                  <option
                    value="active"
                    className="bg-slate-900 text-slate-200"
                  >
                    Active Folios
                  </option>
                  <option
                    value="inactive"
                    className="bg-slate-900 text-slate-200"
                  >
                    Inactive / Sold
                  </option>
                  <option value="all" className="bg-slate-900 text-slate-200">
                    All Folios
                  </option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
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
                    onClick={() => router.push(`/fund/${h.id}`)}
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
