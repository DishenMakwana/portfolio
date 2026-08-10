"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Layers,
  LayoutGrid,
  TableProperties,
  ArrowRightLeft,
  Coins,
} from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import { formatAuditStatusBadge } from "@/helpers/audit";
import { getOverlapSubCategory } from "@/helpers/allocation";
import { parseAuditUrlState, updateAuditUrlParams } from "@/helpers/auditUrl";
import type {
  AuditSortField,
  AuditSortOrder,
  AuditStatusType,
  PortfolioAuditData,
} from "@/types/audit";

const STATUS_OPTIONS: [AuditStatusType, string][] = [
  ["PERFECT_MATCH", "Perfect Match"],
  ["PARTIAL_REDEMPTION", "Partial Redemption"],
  ["NAV_ROUNDING", "NAV / STT Rounding"],
  ["UNIT_COST_MISMATCH", "Unit & Cost Mismatch"],
  // ["MISSING_HISTORY", "Missing History"],
];

interface AuditClientProps {
  initialAuditData: PortfolioAuditData;
}

export default function AuditClient({ initialAuditData }: AuditClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialUrlState = useMemo(
    () => parseAuditUrlState(searchParams.toString()),
    [searchParams]
  );
  const [searchTerm, setSearchTerm] = useState(initialUrlState.searchTerm);
  const [statusFilters, setStatusFilters] = useState<AuditStatusType[]>(
    initialUrlState.statusFilters
  );
  const [memberFilter, setMemberFilter] = useState(
    initialUrlState.memberFilter
  );
  const [categoryFilter, setCategoryFilter] = useState(
    initialUrlState.categoryFilter
  );
  const [viewMode, setViewMode] = useState(initialUrlState.viewMode);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const [sortField, setSortField] = useState<AuditSortField>(
    initialUrlState.sortField
  );
  const [sortOrder, setSortOrder] = useState<AuditSortOrder>(
    initialUrlState.sortOrder
  );

  useEffect(() => {
    const nextState = {
      searchTerm,
      statusFilters,
      memberFilter,
      categoryFilter,
      sortField,
      sortOrder,
      viewMode,
    };
    const nextParams = updateAuditUrlParams(
      new URLSearchParams(searchParams.toString()),
      nextState
    );
    const nextQuery = nextParams.toString();

    if (nextQuery !== searchParams.toString()) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [
    categoryFilter,
    memberFilter,
    pathname,
    router,
    searchParams,
    searchTerm,
    sortField,
    sortOrder,
    statusFilters,
    viewMode,
  ]);

  const summary = initialAuditData.summary;
  const items = initialAuditData.items;

  const activeFilterCount =
    statusFilters.length +
    (memberFilter !== "ALL" ? 1 : 0) +
    (categoryFilter !== "ALL" ? 1 : 0);

  // Filter lists
  const membersList = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.memberName) set.add(item.memberName);
    }
    return Array.from(set);
  }, [items]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const cat = getOverlapSubCategory(item.schemeName, item.schemeCategory);
      set.add(cat);
    }
    return Array.from(set);
  }, [items]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const searchLower = searchTerm.trim().toLowerCase();
        const cleanFolio = (item.folioNo || "").replace(/^'/, "").toLowerCase();
        const matchesSearch =
          !searchLower ||
          item.schemeName.toLowerCase().includes(searchLower) ||
          item.memberName.toLowerCase().includes(searchLower) ||
          cleanFolio.includes(searchLower);

        let matchesStatus = true;
        if (statusFilters.length > 0) {
          matchesStatus = statusFilters.includes(item.auditStatus);
        }

        const matchesMember =
          memberFilter === "ALL" || item.memberName === memberFilter;

        const cat = getOverlapSubCategory(item.schemeName, item.schemeCategory);
        const matchesCategory =
          categoryFilter === "ALL" || cat === categoryFilter;

        return (
          matchesSearch && matchesStatus && matchesMember && matchesCategory
        );
      })
      .sort((a, b) => {
        let valA: string | number = 0;
        let valB: string | number = 0;

        if (sortField === "memberName") {
          valA = a.memberName.toLowerCase();
          valB = b.memberName.toLowerCase();
        } else if (sortField === "schemeName") {
          valA = a.schemeName.toLowerCase();
          valB = b.schemeName.toLowerCase();
        } else if (sortField === "folioNo") {
          valA = a.folioNo;
          valB = b.folioNo;
        } else if (sortField === "casBalanceUnits") {
          valA = a.casBalanceUnits;
          valB = b.casBalanceUnits;
        } else if (sortField === "txNetUnits") {
          valA = a.txNetUnits;
          valB = b.txNetUnits;
        } else if (sortField === "unitDifference") {
          valA = Math.abs(a.unitDifference);
          valB = Math.abs(b.unitDifference);
        } else if (sortField === "casPurchaseValue") {
          valA = a.casPurchaseValue;
          valB = b.casPurchaseValue;
        } else if (sortField === "txNetAmount") {
          valA = a.txNetAmount;
          valB = b.txNetAmount;
        } else if (sortField === "amountDifference") {
          valA = Math.abs(a.amountDifference);
          valB = Math.abs(b.amountDifference);
        } else if (sortField === "casCurrentValue") {
          valA = a.casCurrentValue;
          valB = b.casCurrentValue;
        } else if (sortField === "auditStatus") {
          const rankMap: Record<AuditStatusType, number> = {
            UNIT_COST_MISMATCH: 5,
            PARTIAL_REDEMPTION: 4,
            NAV_ROUNDING: 3,
            MISSING_HISTORY: 2,
            PERFECT_MATCH: 1,
          };
          valA = rankMap[a.auditStatus] || 0;
          valB = rankMap[b.auditStatus] || 0;
        }

        if (sortOrder === "asc") {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [
    items,
    searchTerm,
    statusFilters,
    memberFilter,
    categoryFilter,
    sortField,
    sortOrder,
  ]);

  const handleClearAll = () => {
    setStatusFilters([]);
    setMemberFilter("ALL");
    setCategoryFilter("ALL");
    setSearchTerm("");
  };

  const handleSort = (field: AuditSortField) => {
    let nextOrder: AuditSortOrder = "desc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(nextOrder);
  };

  const renderSortIcon = (field: AuditSortField) => {
    const isActive = sortField === field;
    if (isActive) {
      return sortOrder === "asc" ? (
        <ChevronUp
          size={12}
          className="inline text-emerald-400 shrink-0 ml-0.5"
        />
      ) : (
        <ChevronDown
          size={12}
          className="inline text-emerald-400 shrink-0 ml-0.5"
        />
      );
    }
    return (
      <ChevronDown size={12} className="inline opacity-20 shrink-0 ml-0.5" />
    );
  };

  // CSV Export Handler matching exact report format
  const handleExportCsv = () => {
    const headers = [
      "Member Name",
      "Scheme Name",
      "Folio No",
      "CAS Balance Units",
      "Transaction Net Units",
      "Unit Difference",
      "Unit Status",
      "CAS Purchase Value (₹)",
      "Transaction Net Amount (₹)",
      "Total Buy Amount (₹)",
      "Total Sell Amount (₹)",
      "Total STT (₹)",
      "Total Stamp Duty (₹)",
      "Net+Charges Amount (₹)",
      "Amount Difference (₹)",
      "CAS Current Value (₹)",
      "Audit Status",
      "Root Cause & Analysis",
    ];

    const csvRows = filteredItems.map((item) => [
      `"${item.memberName}"`,
      `"${item.schemeName}"`,
      `"${item.folioNo}"`,
      item.casBalanceUnits.toFixed(3),
      item.txNetUnits.toFixed(3),
      item.unitDifference.toFixed(3),
      `"${item.unitStatus}"`,
      item.casPurchaseValue.toFixed(2),
      item.txNetAmount.toFixed(2),
      item.totalBuyAmount.toFixed(2),
      item.totalSellAmount.toFixed(2),
      item.totalStt.toFixed(2),
      item.totalStampDuty.toFixed(2),
      item.txNetAmountWithCharges.toFixed(2),
      item.amountDifference.toFixed(2),
      item.casCurrentValue.toFixed(2),
      `"${item.auditStatus.replace(/_/g, " ")}"`,
      `"${item.rootCauseAnalysis.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CAS_Reconciliation_Audit_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                  CAS Portfolio Reconciliation Audit & Discrepancy Finder
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-3xl">
                  Full portfolio reconciliation comparing CAS Statement snapshot
                  balances against historical transaction logs. Categorizes
                  partial redemptions, STT/stamp duty rounding, and unit
                  mismatches.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode("compact")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "compact"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Fit all columns on screen without horizontal scroll"
              >
                <LayoutGrid size={13} />
                Fit Screen
              </button>
              <button
                onClick={() => setViewMode("expanded")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "expanded"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="15-column wide table with horizontal scrollbar"
              >
                <TableProperties size={13} />
                Full Table
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700 shadow-sm shrink-0 cursor-pointer"
            >
              <Download size={14} className="text-emerald-400" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Hero Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Audited
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-100 tracking-tight">
              {summary.totalAudited}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Active Folios
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Perfect Matches
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-emerald-400 tracking-tight">
              {summary.perfectMatchCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Units & Cost 100% Match
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Partial Redemptions
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ArrowRightLeft size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-indigo-400 tracking-tight">
              {summary.partialRedemptionCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Units Match (Realized Gains)
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              NAV / STT Rounding
            </span>
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Coins size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-cyan-400 tracking-tight">
              {summary.navRoundingCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Units Match (STT/Rounding)
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Unit Mismatches
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-rose-400 tracking-tight">
              {summary.unitMismatchCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Pre-Log / Missing Units
            </div>
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
              {/* Audit Status */}
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>Audit Status</span>
                  <span className="text-[10px] font-semibold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded tracking-normal normal-case">
                    Multi Select
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(([val, label]) => {
                    const active = statusFilters.includes(val);
                    const badge = formatAuditStatusBadge(val);
                    return (
                      <button
                        key={val}
                        onClick={() =>
                          setStatusFilters((prev) =>
                            active
                              ? prev.filter((x) => x !== val)
                              : [...prev, val]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? badge.badgeClass +
                              " ring-2 ring-offset-1 ring-offset-slate-950 ring-current"
                            : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        {active && <span className="mr-1">✓</span>}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* Family Member */}
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>Family Member</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded tracking-normal normal-case">
                    Single Select
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setMemberFilter("ALL")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      memberFilter === "ALL"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-emerald-500/40"
                        : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    All
                  </button>
                  {membersList.map((m) => (
                    <button
                      key={m}
                      onClick={() =>
                        setMemberFilter(memberFilter === m ? "ALL" : m)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        memberFilter === m
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-emerald-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* Fund Category */}
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>Fund Category</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded tracking-normal normal-case">
                    Single Select
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryFilter("ALL")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      categoryFilter === "ALL"
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-indigo-500/40"
                        : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    All Categories
                  </button>
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setCategoryFilter(categoryFilter === cat ? "ALL" : cat)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        categoryFilter === cat
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 ring-2 ring-offset-1 ring-offset-slate-950 ring-indigo-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
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
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                Show {filteredItems.length} result
                {filteredItems.length !== 1 ? "s" : ""}
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
              placeholder="Search scheme, member, folio…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 bg-slate-950/60 border border-slate-800/60 rounded-xl pl-9 pr-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-[10px]"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters button */}
          <button
            onClick={() => setFilterPanelOpen(true)}
            className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
              activeFilterCount > 0
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips — inside the same card, only when filters applied */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/50">
            {statusFilters.map((s) => {
              const badge = formatAuditStatusBadge(s as AuditStatusType);
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.badgeClass}`}
                >
                  {badge.label}
                  <button
                    onClick={() =>
                      setStatusFilters((prev) => prev.filter((x) => x !== s))
                    }
                    className="hover:opacity-70 transition ml-0.5"
                    aria-label={`Remove ${badge.label} filter`}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
            {memberFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                👤 {memberFilter}
                <button
                  onClick={() => setMemberFilter("ALL")}
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label="Remove member filter"
                >
                  ✕
                </button>
              </span>
            )}
            {categoryFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                🏷 {categoryFilter}
                <button
                  onClick={() => setCategoryFilter("ALL")}
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label="Remove category filter"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={handleClearAll}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
        {/* Table Top Bar with Counter */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">
            {viewMode === "compact"
              ? "Laptop View (Fit Screen)"
              : "Full 15-Column Table View"}
          </span>
          <span className="font-medium">
            Showing{" "}
            <span className="text-slate-200 font-bold">
              {filteredItems.length}
            </span>{" "}
            of <span className="text-slate-200 font-bold">{items.length}</span>{" "}
            audited folios
          </span>
        </div>

        <div className="overflow-x-auto">
          {viewMode === "compact" ? (
            /* COMPACT LAPTOP VIEW (Fits screen with zero horizontal scroll!) */
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800/80 select-none">
                  <th
                    className="px-3 py-3 w-[15%] cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort("memberName")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Member & Folio</span>
                      {renderSortIcon("memberName")}
                    </div>
                  </th>

                  <th
                    className="px-3 py-3 w-[22%] cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort("schemeName")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Scheme & Category</span>
                      {renderSortIcon("schemeName")}
                    </div>
                  </th>

                  <th
                    className="px-3 py-3 w-[18%] cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort("casBalanceUnits")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Units Breakdown</span>
                      {renderSortIcon("casBalanceUnits")}
                    </div>
                  </th>

                  <th
                    className="px-3 py-3 w-[20%] cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort("casPurchaseValue")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Cost Basis & Charges</span>
                      {renderSortIcon("casPurchaseValue")}
                    </div>
                  </th>

                  <th
                    className="px-3 py-3 w-[13%] cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => handleSort("auditStatus")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Valuation & Status</span>
                      {renderSortIcon("auditStatus")}
                    </div>
                  </th>

                  <th className="px-3 py-3 w-[12%]">Root Cause</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/40 text-slate-300 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No portfolio holdings match the audit filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const badge = formatAuditStatusBadge(item.auditStatus);
                    const isMismatch =
                      item.auditStatus === "UNIT_COST_MISMATCH";

                    return (
                      <motion.tr
                        key={`unmatched-${item.holdingId}-${item.memberName}-${idx}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() =>
                          router.push(
                            item.isZeroBalance ||
                              item.isSold ||
                              item.holdingId < 0 ||
                              item.casCurrentValue === 0
                              ? `/fund/sold_${Math.abs(item.holdingId)}`
                              : `/fund/${item.holdingId}`
                          )
                        }
                        className={`transition-colors hover:bg-slate-800/50 cursor-pointer group ${
                          isMismatch ? "bg-rose-950/10" : ""
                        }`}
                      >
                        {/* 1. Member & Folio */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-bold text-slate-100">
                            {item.memberName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400 mt-1">
                            Folio: {item.folioNo}
                          </div>
                        </td>

                        {/* 2. Scheme & Category */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-bold text-slate-100 group-hover:text-emerald-400 text-xs leading-snug transition-colors flex items-center gap-1">
                            <span>{item.schemeName}</span>
                            <ExternalLink className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {getOverlapSubCategory(
                              item.schemeName,
                              item.schemeCategory
                            )}
                          </div>
                        </td>

                        {/* 3. Units Breakdown */}
                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1 text-slate-300">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">CAS:</span>
                              <span className="font-semibold text-slate-200 tabular-nums">
                                {item.casBalanceUnits.toFixed(3)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Tx Net:</span>
                              <span className="font-semibold text-slate-200 tabular-nums">
                                {item.txNetUnits.toFixed(3)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60 font-bold">
                              <span className="text-slate-400">Diff:</span>
                              <span
                                className={
                                  Math.abs(item.unitDifference) < 0.001
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }
                              >
                                {item.unitDifference >= 0 ? "+" : ""}
                                {item.unitDifference.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Cost Basis & Charges (₹) */}
                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1 text-slate-300">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">CAS Cost:</span>
                              <span className="font-semibold text-slate-200 tabular-nums">
                                {formatCurrency(item.casPurchaseValue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">
                                Tx Net Amt:
                              </span>
                              <span className="font-semibold text-slate-200 tabular-nums">
                                {formatCurrency(item.txNetAmount)}
                              </span>
                            </div>
                            {(item.totalStt > 0 || item.totalStampDuty > 0) && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-500">
                                  STT+Stamp:
                                </span>
                                <span className="text-slate-400 tabular-nums">
                                  +
                                  {formatCurrency(
                                    item.totalStt + item.totalStampDuty
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
                              <span className="text-slate-400">
                                Net+Charges:
                              </span>
                              <span className="font-semibold text-sky-300 tabular-nums">
                                {formatCurrency(item.txNetAmountWithCharges)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60 font-bold">
                              <span className="text-slate-400">Amt Diff:</span>
                              <span
                                className={
                                  Math.abs(item.amountDifference) < 1.0
                                    ? "text-emerald-400"
                                    : "text-amber-400"
                                }
                              >
                                {item.amountDifference >= 0 ? "+" : ""}
                                {formatCurrency(item.amountDifference)}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 pt-0.5">
                              Buy: {formatCurrency(item.totalBuyAmount)} | Sell:{" "}
                              {formatCurrency(item.totalSellAmount)}
                            </div>
                          </div>
                        </td>

                        {/* 5. Valuation & Status */}
                        <td className="px-3 py-3 align-top space-y-2">
                          <div>
                            <div className="text-[10px] text-slate-400">
                              CAS Current Value
                            </div>
                            <div className="font-extrabold text-teal-400 text-sm tabular-nums">
                              {formatCurrency(item.casCurrentValue)}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </td>

                        {/* 6. Root Cause & Analysis */}
                        <td className="px-3 py-3 align-top">
                          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 text-[11px] leading-snug text-slate-300">
                            {item.rootCauseAnalysis}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* EXPANDED 15-COLUMN WIDE TABLE VIEW */
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800/80 select-none">
                  <th className="px-3 py-3">Member Name</th>
                  <th className="px-3 py-3">Scheme Name</th>
                  <th className="px-3 py-3">Folio No</th>
                  <th className="px-3 py-3 text-right">CAS Balance Units</th>
                  <th className="px-3 py-3 text-right">Tx Net Units</th>
                  <th className="px-3 py-3 text-right">Unit Diff</th>
                  <th className="px-3 py-3">Unit Status</th>
                  <th className="px-3 py-3 text-right">CAS Purchase Value</th>
                  <th className="px-3 py-3 text-right">Tx Net Amount</th>
                  <th className="px-3 py-3 text-right">Total Buy</th>
                  <th className="px-3 py-3 text-right">Total Sell</th>
                  <th className="px-3 py-3 text-right">Amount Diff</th>
                  <th className="px-3 py-3 text-right">CAS Current Value</th>
                  <th className="px-3 py-3">Audit Status</th>
                  <th className="px-3 py-3 min-w-[260px]">
                    Root Cause & Analysis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 text-xs">
                {filteredItems.map((item, idx) => {
                  const badge = formatAuditStatusBadge(item.auditStatus);
                  return (
                    <tr
                      key={`full-${item.holdingId}-${item.memberName}-${idx}`}
                      className="hover:bg-slate-800/50 cursor-pointer"
                    >
                      <td className="px-3 py-3 font-semibold">
                        {item.memberName}
                      </td>
                      <td className="px-3 py-3">{item.schemeName}</td>
                      <td className="px-3 py-3 font-mono">{item.folioNo}</td>
                      <td className="px-3 py-3 text-right font-mono">
                        {item.casBalanceUnits.toFixed(3)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {item.txNetUnits.toFixed(3)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {item.unitDifference.toFixed(3)}
                      </td>
                      <td className="px-3 py-3">{item.unitStatus}</td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatCurrency(item.casPurchaseValue)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        <div>{formatCurrency(item.txNetAmount)}</div>
                        {(item.totalStt > 0 || item.totalStampDuty > 0) && (
                          <div className="text-[10px] text-slate-500">
                            +STT/SD:{" "}
                            {formatCurrency(
                              item.totalStt + item.totalStampDuty
                            )}
                          </div>
                        )}
                        <div className="text-sky-300 text-[10px]">
                          ={formatCurrency(item.txNetAmountWithCharges)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatCurrency(item.totalBuyAmount)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatCurrency(item.totalSellAmount)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatCurrency(item.amountDifference)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-teal-400">
                        {formatCurrency(item.casCurrentValue)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px]">
                        {item.rootCauseAnalysis}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
