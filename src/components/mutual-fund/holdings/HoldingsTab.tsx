"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatHoldingDaysDetailed,
} from "@/helpers/formatters";
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
  const rawSort = searchParams.get("sort");
  const initialSort = (
    (HOLDINGS_SORT_FIELDS as readonly string[]).includes(rawSort || "")
      ? rawSort
      : "currentValue"
  ) as HoldingsSortField;
  const rawOrder = searchParams.get("order");
  const initialOrder = (
    rawOrder === "asc" || rawOrder === "desc" ? rawOrder : "desc"
  ) as "asc" | "desc";

  // Local Search & Filter State
  const [searchVal, setSearchVal] = useState(initialSearch); // For instant input typing
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [memberFilter, setMemberFilter] = useState(initialMemberParam);
  const [planFilter, setPlanFilter] = useState(initialPlan);
  const [sortField, setSortField] = useState<HoldingsSortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialOrder);

  // Helper to update query string parameters in the URL
  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "All") {
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
    setSearchQuery(q);
    setMemberFilter(searchParams.get("member") || initialMember);
    setPlanFilter(searchParams.get("plan") || "All");
    const rawS = searchParams.get("sort");
    setSortField(
      ((HOLDINGS_SORT_FIELDS as readonly string[]).includes(rawS || "")
        ? rawS
        : "currentValue") as HoldingsSortField
    );
    const rawO = searchParams.get("order");
    setSortOrder(
      (rawO === "asc" || rawO === "desc" ? rawO : "desc") as "asc" | "desc"
    );
  }, [searchParams, initialMember]);

  // Debounced search query update in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchParams.get("q") !== searchVal) {
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
  // Filter and Sort holdings
  const filtered = holdings
    .filter((h) => {
      const matchSearch =
        h.schemeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.folioNo.includes(searchQuery);
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

      return matchSearch && matchMember && matchPlan;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search schemes or folio numbers..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <Search
            className="absolute left-3.5 top-2.5 text-slate-500"
            size={18}
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Plan Type:</span>
            <select
              value={planFilter}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="All">All Plans</option>
              <option value="MF">Mutual Fund (MF)</option>
              <option value="SIF">Specialized (SIF)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Holder:</span>
            <select
              value={memberFilter}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="All">All family members</option>
              {memberSummaries.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
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
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          {h.category}
                        </span>
                        {isUnlistedStock(h.schemeName) && (
                          <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase animate-pulse">
                            Unlisted
                          </span>
                        )}
                        <span>• Units: {h.balanceUnits.toFixed(3)}</span>
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
                      <div className="text-[11px] text-slate-500 font-medium">
                        {formatHoldingDaysDetailed(h.holdingDays)}
                      </div>
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
