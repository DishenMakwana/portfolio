"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRightLeft,
  Coins,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatCurrency, getFundDetailsUrl } from "@/helpers/formatters";
import TablePagination from "@/components/shared/TablePagination";
import TableSortIcon from "@/components/shared/TableSortIcon";
import TransactionUploadModal from "@/components/mutual-fund/transactions/TransactionUploadModal";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import FolioBadge from "@/components/shared/FolioBadge";
import { formatAuditStatusBadge } from "@/helpers/audit";
import { getOverlapSubCategory } from "@/helpers/allocation";
import { parseAuditUrlState, updateAuditUrlParams } from "@/helpers/auditUrl";
import type {
  AuditClientProps,
  AuditHoldingItem,
  AuditSortField,
  AuditSortOrder,
  AuditStatusType,
} from "@/types/audit";

const STATUS_OPTIONS: [AuditStatusType, string][] = [
  ["PERFECT_MATCH", "Perfect Match"],
  ["PARTIAL_REDEMPTION", "Partial Redemption"],
  ["NAV_ROUNDING", "NAV / STT Rounding"],
  ["UNIT_COST_MISMATCH", "Unit & Cost Mismatch"],
  // ["MISSING_HISTORY", "Missing History"],
];

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
  const [activityFilter, setActivityFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >(initialUrlState.activityFilter);
  const [memberFilter, setMemberFilter] = useState(
    initialUrlState.memberFilter
  );
  const [categoryFilter, setCategoryFilter] = useState(
    initialUrlState.categoryFilter
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pageSize, setPageSize] = useState(initialUrlState.pageSize || 25);
  const [page, setPage] = useState(initialUrlState.page || 1);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      activityFilter,
      memberFilter,
      categoryFilter,
      sortField,
      sortOrder,
      page,
      pageSize,
    };
    const nextParams = updateAuditUrlParams(
      new URLSearchParams(searchParams.toString()),
      nextState
    );
    const nextQuery = nextParams.toString();

    if (nextQuery !== searchParams.toString()) {
      const url = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", url);
      }
      router.replace(url, {
        scroll: false,
      });
    }
  }, [
    activityFilter,
    categoryFilter,
    memberFilter,
    page,
    pageSize,
    pathname,
    router,
    searchParams,
    searchTerm,
    sortField,
    sortOrder,
    statusFilters,
  ]);

  // Synchronize state on browser back/forward navigation
  useEffect(() => {
    const current = parseAuditUrlState(searchParams.toString());
    setSearchTerm(current.searchTerm);
    setStatusFilters(current.statusFilters);
    setActivityFilter(current.activityFilter);
    setMemberFilter(current.memberFilter);
    setCategoryFilter(current.categoryFilter);
    setSortField(current.sortField);
    setSortOrder(current.sortOrder);
    if (current.page) setPage(current.page);
    if (current.pageSize) setPageSize(current.pageSize);
  }, [searchParams]);

  const summary = initialAuditData.summary;
  const items = initialAuditData.items;

  const activeFilterCount =
    statusFilters.length +
    (activityFilter !== "ALL" ? 1 : 0) +
    (memberFilter !== "ALL" ? 1 : 0) +
    (categoryFilter !== "ALL" ? 1 : 0);

  // Filter lists
  const membersList = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.memberName) set.add(item.memberName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
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

        const matchesActivity =
          activityFilter === "ALL" ||
          (activityFilter === "ACTIVE" && item.isActive) ||
          (activityFilter === "INACTIVE" && !item.isActive);

        const matchesMember =
          memberFilter === "ALL" || item.memberName === memberFilter;

        const cat = getOverlapSubCategory(item.schemeName, item.schemeCategory);
        const matchesCategory =
          categoryFilter === "ALL" || cat === categoryFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesActivity &&
          matchesMember &&
          matchesCategory
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

  const getItemKey = (item: AuditHoldingItem) =>
    `${item.holdingId}_${item.memberName}_${item.folioNo}_${item.schemeName}`;

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedAuditItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Compute baseline rank for each item based on DESCENDING sort of current sortField
  const rankMap = useMemo(() => {
    const descSorted = [...filteredItems].sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      if (sortField === "memberName") {
        valA = a.memberName.toLowerCase();
        valB = b.memberName.toLowerCase();
        return valA < valB ? -1 : 1;
      } else if (sortField === "schemeName") {
        valA = a.schemeName.toLowerCase();
        valB = b.schemeName.toLowerCase();
        return valA < valB ? -1 : 1;
      } else if (sortField === "casBalanceUnits") {
        valA = a.casBalanceUnits;
        valB = b.casBalanceUnits;
      } else if (sortField === "casPurchaseValue") {
        valA = a.casPurchaseValue;
        valB = b.casPurchaseValue;
      } else if (sortField === "auditStatus") {
        const statusPriority: Record<AuditStatusType, number> = {
          UNIT_COST_MISMATCH: 5,
          PARTIAL_REDEMPTION: 4,
          NAV_ROUNDING: 3,
          MISSING_HISTORY: 2,
          PERFECT_MATCH: 1,
        };
        valA = statusPriority[a.auditStatus] || 0;
        valB = statusPriority[b.auditStatus] || 0;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return valB - valA;
      }
      return 0;
    });

    const map = new Map<string, number>();
    descSorted.forEach((item, index) => {
      map.set(getItemKey(item), index + 1);
    });
    return map;
  }, [filteredItems, sortField]);

  const handleClearAll = () => {
    setStatusFilters([]);
    setActivityFilter("ALL");
    setMemberFilter("ALL");
    setCategoryFilter("ALL");
    setSearchTerm("");
    setPage(1);
  };

  const handleSort = (field: AuditSortField) => {
    let nextOrder: AuditSortOrder = "desc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(nextOrder);
    setPage(1);
  };

  const renderSortIcon = (field: AuditSortField) => (
    <TableSortIcon
      isActive={sortField === field}
      sortOrder={sortOrder}
      className="inline ml-0.5"
    />
  );

  // XLSX Export Handler matching exact report format
  const handleExportXlsx = () => {
    const data = filteredItems.map((item, idx) => ({
      "#": rankMap.get(getItemKey(item)) ?? idx + 1,
      "Member Name": item.memberName,
      "Scheme Name": item.schemeName,
      "Folio No": item.folioNo,
      "Holding Status": item.isActive ? "Active" : "Inactive / Redeemed",
      "CAS Balance Units": Number(item.casBalanceUnits.toFixed(3)),
      "Transaction Net Units": Number(item.txNetUnits.toFixed(3)),
      "Unit Difference": Number(item.unitDifference.toFixed(3)),
      "Unit Status": item.unitStatus,
      "CAS Purchase Value (₹)": Number(item.casPurchaseValue.toFixed(2)),
      "Transaction Net Amount (₹)": Number(item.txNetAmount.toFixed(2)),
      "Total Buy Amount (₹)": Number(item.totalBuyAmount.toFixed(2)),
      "Total Sell Amount (₹)": Number(item.totalSellAmount.toFixed(2)),
      "Total STT (₹)": Number(item.totalStt.toFixed(2)),
      "Total Stamp Duty (₹)": Number(item.totalStampDuty.toFixed(2)),
      "Net+Charges Amount (₹)": Number(item.txNetAmountWithCharges.toFixed(2)),
      "Amount Difference (₹)": Number(item.amountDifference.toFixed(2)),
      "CAS Current Value (₹)": Number(item.casCurrentValue.toFixed(2)),
      "Audit Status": item.auditStatus.replace(/_/g, " "),
      "Root Cause & Analysis": item.rootCauseAnalysis,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set nice column widths
    const colWidths = [
      { wch: 6 }, // #
      { wch: 25 }, // Member Name
      { wch: 40 }, // Scheme Name
      { wch: 18 }, // Folio No
      { wch: 20 }, // Holding Status
      { wch: 18 }, // CAS Balance Units
      { wch: 20 }, // Transaction Net Units
      { wch: 16 }, // Unit Difference
      { wch: 16 }, // Unit Status
      { wch: 22 }, // CAS Purchase Value (₹)
      { wch: 24 }, // Transaction Net Amount (₹)
      { wch: 20 }, // Total Buy Amount (₹)
      { wch: 20 }, // Total Sell Amount (₹)
      { wch: 14 }, // Total STT (₹)
      { wch: 18 }, // Total Stamp Duty (₹)
      { wch: 22 }, // Net+Charges Amount (₹)
      { wch: 20 }, // Amount Difference (₹)
      { wch: 20 }, // CAS Current Value (₹)
      { wch: 20 }, // Audit Status
      { wch: 60 }, // Root Cause & Analysis
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CAS Reconciliation");

    const fileName = `CAS_Reconciliation_Audit_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                CAS Audit & Discrepancy Finder
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Full portfolio reconciliation comparing CAS Statement snapshot
                balances against historical transaction logs. Audits both active
                holdings and fully redeemed folios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer shrink-0"
            >
              <Upload size={14} className="stroke-[2.5]" />
              Upload Statement (.xlsx)
            </button>

            <button
              type="button"
              onClick={handleExportXlsx}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-md cursor-pointer shrink-0"
            >
              <Download size={14} className="text-emerald-400" />
              Export XLSX
            </button>
          </div>
        </div>
      </div>

      {/* Hero Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Audited */}
        <button
          type="button"
          onClick={() => {
            setStatusFilters([]);
            setActivityFilter("ALL");
          }}
          className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 0 && activityFilter === "ALL"
              ? "bg-slate-850 border-indigo-500/50 ring-2 ring-indigo-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between w-full">
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
              {summary.activeCount} Active • {summary.inactiveCount} Inactive
            </div>
          </div>
        </button>

        {/* Perfect Matches */}
        <button
          type="button"
          onClick={() => {
            if (
              statusFilters.length === 1 &&
              statusFilters[0] === "PERFECT_MATCH"
            ) {
              setStatusFilters([]);
            } else {
              setStatusFilters(["PERFECT_MATCH"]);
            }
          }}
          className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 &&
            statusFilters.includes("PERFECT_MATCH")
              ? "bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between w-full">
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
        </button>

        {/* Partial Redemptions */}
        <button
          type="button"
          onClick={() => {
            if (
              statusFilters.length === 1 &&
              statusFilters[0] === "PARTIAL_REDEMPTION"
            ) {
              setStatusFilters([]);
            } else {
              setStatusFilters(["PARTIAL_REDEMPTION"]);
            }
          }}
          className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 &&
            statusFilters.includes("PARTIAL_REDEMPTION")
              ? "bg-indigo-950/40 border-indigo-500/50 ring-2 ring-indigo-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-indigo-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between w-full">
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
        </button>

        {/* NAV / STT Rounding */}
        <button
          type="button"
          onClick={() => {
            if (
              statusFilters.length === 1 &&
              statusFilters[0] === "NAV_ROUNDING"
            ) {
              setStatusFilters([]);
            } else {
              setStatusFilters(["NAV_ROUNDING"]);
            }
          }}
          className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 && statusFilters.includes("NAV_ROUNDING")
              ? "bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between w-full">
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
        </button>

        {/* Unit Mismatches */}
        <button
          type="button"
          onClick={() => {
            if (
              statusFilters.length === 1 &&
              statusFilters[0] === "UNIT_COST_MISMATCH"
            ) {
              setStatusFilters([]);
            } else {
              setStatusFilters(["UNIT_COST_MISMATCH"]);
            }
          }}
          className={`border rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 &&
            statusFilters.includes("UNIT_COST_MISMATCH")
              ? "bg-rose-950/40 border-rose-500/50 ring-2 ring-rose-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-rose-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between w-full">
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
        </button>
      </div>

      {/* ── Filter Modal ── */}
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
                    Audit Tab Filters
                  </h2>
                </div>
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
                <MultiSelectFilter
                  label="Audit Status"
                  values={statusFilters}
                  onChange={setStatusFilters}
                  options={STATUS_OPTIONS.map(([val, label]) => ({
                    id: val,
                    label: label,
                  }))}
                  allLabel="All Statuses"
                  onClear={() => setStatusFilters([])}
                />

                <FilterSectionDivider />

                {/* Activity */}
                <SingleSelectFilter
                  label="Folio Activity"
                  value={activityFilter}
                  onChange={(val) =>
                    setActivityFilter(val as "ALL" | "ACTIVE" | "INACTIVE")
                  }
                  options={[
                    { id: "ACTIVE", label: "Active" },
                    { id: "INACTIVE", label: "Inactive / Zero Balance" },
                  ]}
                  allLabel="All Activity"
                  allId="ALL"
                />

                <FilterSectionDivider />

                {/* Family Member */}
                <SingleSelectFilter
                  label="Family Member"
                  value={memberFilter}
                  onChange={setMemberFilter}
                  options={membersList}
                  allLabel="All"
                  allId="ALL"
                />

                <FilterSectionDivider />

                {/* Category */}
                <SingleSelectFilter
                  label="Fund Category"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categoriesList}
                  allLabel="All Categories"
                  allId="ALL"
                />
              </div>

              {/* Sticky footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
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
                  Show {filteredItems.length} result
                  {filteredItems.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Search + Filters card ── */}
      <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
        {/* Toolbar row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <SearchFilterBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search scheme, member, folio…"
            className="flex-1"
          />

          {/* Quick Holding Status Segmented Toggle */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={() => setActivityFilter("ALL")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activityFilter === "ALL"
                  ? "bg-slate-800 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({summary.totalAudited})
            </button>
            <button
              type="button"
              onClick={() => setActivityFilter("ACTIVE")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activityFilter === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Active ({summary.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setActivityFilter("INACTIVE")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activityFilter === "INACTIVE"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Inactive ({summary.inactiveCount})
            </button>
          </div>

          {/* Filters button */}
          <button
            onClick={() => setFilterPanelOpen(true)}
            className={`relative flex items-center justify-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
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
            {activityFilter !== "ALL" && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  activityFilter === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {activityFilter === "ACTIVE"
                  ? "Active Only"
                  : "Inactive / Redeemed Only"}
                <button
                  onClick={() => setActivityFilter("ALL")}
                  className="hover:opacity-70 transition ml-0.5"
                  aria-label="Remove activity filter"
                >
                  ✕
                </button>
              </span>
            )}
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

      {/* Audit Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
        {/* Table Top Bar with Counter & Page */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850 text-xs text-slate-400">
          <span className="text-xs text-slate-400 font-medium">
            Page <span className="text-slate-200 font-bold">{page}</span> of{" "}
            <span className="text-slate-200 font-bold">
              {Math.max(totalPages, 1)}
            </span>
          </span>
          <span className="font-medium">
            Showing{" "}
            <span className="text-slate-200 font-bold">
              {paginatedAuditItems.length}
            </span>{" "}
            of{" "}
            <span className="text-slate-200 font-bold">
              {filteredItems.length}
            </span>{" "}
            audited folios
          </span>
        </div>

        <div className="overflow-x-auto">
          {/* COMPACT LAPTOP VIEW (Fits screen with zero horizontal scroll!) */}
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800/80 select-none">
                <th className="p-3 w-10 text-center text-slate-500  text-xs">
                  #
                </th>

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
              {paginatedAuditItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No portfolio holdings match the audit filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedAuditItems.map((item, idx) => {
                  const badge = formatAuditStatusBadge(item.auditStatus);
                  const isMismatch = item.auditStatus === "UNIT_COST_MISMATCH";

                  return (
                    <motion.tr
                      key={`unmatched-${item.holdingId}-${item.memberName}-${idx}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() =>
                        router.push(
                          getFundDetailsUrl(
                            item.holdingId,
                            item.isZeroBalance ||
                              item.isSold ||
                              item.holdingId < 0 ||
                              item.casCurrentValue === 0
                          )
                        )
                      }
                      className={`transition-colors hover:bg-slate-800/50 cursor-pointer group ${
                        isMismatch ? "bg-rose-950/10" : ""
                      }`}
                    >
                      {/* 0. Index / Rank */}
                      <td className="p-3 w-10 text-center  text-xs font-bold text-slate-500 align-top">
                        {rankMap.get(getItemKey(item)) ?? idx + 1}
                      </td>

                      {/* 1. Member & Folio */}
                      <td className="px-3 py-3 align-top">
                        <div className="font-bold text-slate-100">
                          {item.memberName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          <FolioBadge folioNo={item.folioNo} />
                          {!item.isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Inactive
                            </span>
                          )}
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
                            <span className="text-slate-400">Tx Net Amt:</span>
                            <span className="font-semibold text-slate-200 tabular-nums">
                              {formatCurrency(item.txNetAmount)}
                            </span>
                          </div>
                          {(item.totalStt > 0 || item.totalStampDuty > 0) && (
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">STT+Stamp:</span>
                              <span className="text-slate-400 tabular-nums">
                                +
                                {formatCurrency(
                                  item.totalStt + item.totalStampDuty
                                )}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
                            <span className="text-slate-400">Net+Charges:</span>
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
        </div>

        {/* Bottom Pagination & Records-Per-Page Bar */}
        <TablePagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[25, 50, 75, 100]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          totalItems={filteredItems.length}
          showingStart={(page - 1) * pageSize + 1}
          showingEnd={Math.min(page * pageSize, filteredItems.length)}
          itemName="audit records"
        />
      </div>

      <TransactionUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
