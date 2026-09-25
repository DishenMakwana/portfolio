"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Layers,
  ArrowRightLeft,
  Coins,
  Sparkles,
  ExternalLink,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import TablePagination from "@/components/shared/TablePagination";
import TableSortIcon from "@/components/shared/TableSortIcon";
import ZerodhaTransactionUploadModal from "@/components/zerodha/transactions/ZerodhaTransactionUploadModal";
import {
  formatCurrency,
  formatIndianAmount,
  formatUnits,
  getZerodhaClientBadgeStyle,
} from "@/helpers/formatters";
import {
  MultiSelectFilter,
  SingleSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import FolioBadge from "@/components/shared/FolioBadge";
import { formatZerodhaAuditStatusBadge } from "@/helpers/zerodhaAudit";
import {
  parseZerodhaAuditUrlState,
  updateZerodhaAuditUrlParams,
} from "@/helpers/zerodhaAuditUrl";
import type {
  ZerodhaAuditFilterModalProps,
  ZerodhaAuditHoldingRowProps,
  ZerodhaAuditSortField,
  ZerodhaAuditSortOrder,
  ZerodhaAuditStatusType,
  ZerodhaAuditTabProps,
} from "@/types/zerodhaAudit";

const STATUS_OPTIONS: [ZerodhaAuditStatusType, string][] = [
  ["PERFECT_MATCH", "Perfect Match"],
  ["PARTIAL_REDEMPTION", "Partial Redemption"],
  ["NAV_ROUNDING", "NAV / STT Rounding"],
  ["UNIT_COST_MISMATCH", "Unit & Cost Mismatch"],
  ["MISSING_HISTORY", "Missing History"],
];

function ZerodhaAuditFilterModal({
  isOpen,
  onClose,
  statusFilters,
  onStatusChange,
  activityFilter,
  onChangeActivity,
  accountFilter,
  onChangeAccount,
  assetTypeFilter,
  onChangeAssetType,
  members,
  onReset,
  filteredCount,
}: ZerodhaAuditFilterModalProps) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
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
            onClick={onClose}
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
            onChange={(vals) =>
              onStatusChange(vals as ZerodhaAuditStatusType[])
            }
            options={STATUS_OPTIONS.map(([val, label]) => ({
              id: val,
              label: label,
            }))}
            allLabel="All Statuses"
            onClear={() => onStatusChange([])}
          />

          <FilterSectionDivider />

          {/* Activity */}
          <SingleSelectFilter
            label="Folio Activity"
            value={activityFilter}
            onChange={(val) =>
              onChangeActivity(val as "ALL" | "ACTIVE" | "INACTIVE")
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
            value={accountFilter}
            onChange={onChangeAccount}
            options={members.map((m) => ({
              id: m.clientId,
              label: `${m.name.toUpperCase()} (${m.clientId})`,
            }))}
            allLabel="All"
            allId="ALL"
          />

          <FilterSectionDivider />

          {/* Asset Type */}
          <SingleSelectFilter
            label="Asset Type"
            value={assetTypeFilter}
            onChange={(val) =>
              onChangeAssetType(val as "ALL" | "EQUITY" | "MUTUAL_FUND")
            }
            options={[
              { id: "EQUITY", label: "Equity Stocks" },
              { id: "MUTUAL_FUND", label: "Mutual Funds" },
            ]}
            allLabel="All Assets"
            allId="ALL"
          />
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20"
          >
            Show {filteredCount} result{filteredCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

function ZerodhaAuditHoldingRow({
  item,
  index,
  isExpanded,
  onToggleExpand,
}: ZerodhaAuditHoldingRowProps) {
  const badgeInfo = formatZerodhaAuditStatusBadge(item.auditStatus);
  const badgeStyle = getZerodhaClientBadgeStyle(item.clientId);

  const isUnitsDiff = Math.abs(item.unitDifference) > 0.001;
  const isAmtDiff = Math.abs(item.amountDifference) > 2.0;

  return (
    <>
      <tr
        onClick={onToggleExpand}
        className={`border-b border-slate-800/40 hover:bg-slate-800/50 transition-colors cursor-pointer group ${
          item.auditStatus === "UNIT_COST_MISMATCH" ? "bg-rose-950/10" : ""
        } ${isExpanded ? "bg-slate-800/30" : ""}`}
      >
        {/* 0. Index */}
        <td className="p-3 w-10 text-center  text-xs font-bold text-slate-500 align-top">
          {index + 1}
        </td>

        {/* 1. Member & Folio */}
        <td className="px-3 py-3 align-top">
          <div className="font-bold text-slate-100">{item.memberName}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${badgeStyle}`}
            >
              {item.memberShortName} ({item.clientId})
            </span>
            {!item.isActive && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Inactive
              </span>
            )}
          </div>
        </td>

        {/* 2. Scheme & Category */}
        <td className="px-3 py-3 align-top">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/fund/z_${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline text-xs leading-snug transition-colors inline-flex items-center gap-1 group/link"
            >
              <span>{item.schemeName}</span>
              <ExternalLink
                size={12}
                className="shrink-0 opacity-80 group-hover/link:opacity-100 transition-opacity"
              />
            </Link>
            {item.holdingType === "equity" ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                Stock
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 shrink-0">
                MF
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>{item.category}</span>
            {item.isin && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] text-slate-500">{item.isin}</span>
              </>
            )}
            {item.folioNo && <FolioBadge folioNo={item.folioNo} />}
          </div>
        </td>

        {/* 3. Units Breakdown */}
        <td className="px-3 py-3 align-top">
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Statement:</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {item.snapshotUnits.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tx Net:</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {item.txCount > 0 ? item.txNetUnits.toFixed(3) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60 font-bold">
              <span className="text-slate-400">Diff:</span>
              <span
                className={
                  !isUnitsDiff
                    ? "text-emerald-400"
                    : item.unitDifference > 0
                      ? "text-amber-400"
                      : "text-rose-400"
                }
              >
                {!isUnitsDiff
                  ? "-0.000"
                  : `${item.unitDifference >= 0 ? "+" : ""}${item.unitDifference.toFixed(3)}`}
              </span>
            </div>
          </div>
        </td>

        {/* 4. Cost Basis & Charges */}
        <td className="px-3 py-3 align-top">
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Avg NAV:</span>
              <span className="font-semibold text-slate-200 tabular-nums ">
                ₹{formatIndianAmount(item.snapshotAvgPrice, 2)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tx Buy NAV:</span>
              <span className="font-semibold text-slate-200 tabular-nums ">
                {item.txWeightedAvgBuyNav > 0
                  ? `₹${formatIndianAmount(item.txWeightedAvgBuyNav, 2)}`
                  : "—"}
              </span>
            </div>
            {item.txTotalStampDuty > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Stamp Duty:</span>
                <span className="text-slate-400 tabular-nums ">
                  +₹{item.txTotalStampDuty.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60 font-bold">
              <span className="text-slate-400">Amt Diff:</span>
              <span
                className={
                  !isAmtDiff
                    ? "text-emerald-400"
                    : item.amountDifference > 0
                      ? "text-amber-400"
                      : "text-rose-400"
                }
              >
                {!isAmtDiff
                  ? "₹0.00"
                  : `${item.amountDifference >= 0 ? "+" : ""}₹${formatIndianAmount(item.amountDifference, 2)}`}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 pt-0.5">
              Buy: {formatCurrency(item.txBuyAmount)} | Sell:{" "}
              {formatCurrency(item.txSellAmount)}
            </div>
          </div>
        </td>

        {/* 5. Valuation & Status */}
        <td className="px-3 py-3 align-top space-y-2">
          <div>
            <div className="text-[10px] text-slate-400">Current Value</div>
            <div className="text-xs font-bold text-teal-400 tabular-nums">
              {formatCurrency(item.snapshotCurrentValue)}
            </div>
          </div>
          <div>
            <span
              className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold ${badgeInfo.badgeClass}`}
            >
              {badgeInfo.label}
            </span>
          </div>
        </td>

        {/* 6. Root Cause */}
        <td className="px-3 py-3 align-top text-[11px]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-slate-300 leading-snug">{item.rootCause}</p>
            <div className="p-1 rounded-lg text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </td>
      </tr>

      {/* Expandable Transaction Drawer */}
      {isExpanded && (
        <tr className="bg-slate-900/90 border-b border-slate-800">
          <td colSpan={7} className="p-4 sm:p-5">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Tradebook Transaction History
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {item.transactions.length} Records
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Total Buy:{" "}
                  <span className="text-slate-200 font-bold ">
                    {formatUnits(item.txBuyUnits)}
                  </span>{" "}
                  | Total Sell:{" "}
                  <span className="text-slate-200 font-bold ">
                    {formatUnits(item.txSellUnits)}
                  </span>
                </div>
              </div>

              {item.transactions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No tradebook transactions recorded for this asset.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2 px-2.5">Date</th>
                        <th className="py-2 px-2.5">Type</th>
                        <th className="py-2 px-2.5 text-right">Units / Qty</th>
                        <th className="py-2 px-2.5 text-right">NAV / Price</th>
                        <th className="py-2 px-2.5 text-right">Amount</th>
                        <th className="py-2 px-2.5 text-right">Stamp Duty</th>
                        <th className="py-2 px-2.5 text-right">Broker</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {item.transactions.map((tx) => {
                        const isBuy =
                          tx.type.toUpperCase().includes("BUY") ||
                          tx.type.toUpperCase().includes("PURCHASE");
                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-2.5  text-slate-300 whitespace-nowrap">
                              {tx.date}
                            </td>
                            <td className="py-2 px-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isBuy
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}
                              >
                                {tx.rawTransactionType || tx.type}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right  font-bold text-slate-200">
                              {formatUnits(tx.units)}
                            </td>
                            <td className="py-2 px-2.5 text-right  text-slate-300">
                              ₹{formatIndianAmount(tx.nav, 2)}
                            </td>
                            <td className="py-2 px-2.5 text-right  font-bold text-slate-200">
                              ₹{formatIndianAmount(tx.amount, 2)}
                            </td>
                            <td className="py-2 px-2.5 text-right  text-slate-400">
                              {tx.stampDuty > 0
                                ? `₹${tx.stampDuty.toFixed(2)}`
                                : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-right text-slate-400">
                              {tx.broker || "Zerodha"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ZerodhaAuditTab({
  auditData,
  selectedAccount = "all",
}: ZerodhaAuditTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialUrlState = useMemo(
    () => parseZerodhaAuditUrlState(searchParams.toString()),
    [searchParams]
  );

  const [searchTerm, setSearchTerm] = useState(initialUrlState.searchTerm);
  const [statusFilters, setStatusFilters] = useState<ZerodhaAuditStatusType[]>(
    initialUrlState.statusFilters
  );
  const [activityFilter, setActivityFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >(initialUrlState.activityFilter);
  const [accountFilter, setAccountFilter] = useState<string>(
    initialUrlState.accountFilter !== "ALL"
      ? initialUrlState.accountFilter
      : selectedAccount !== "all"
        ? selectedAccount
        : "ALL"
  );
  const [assetTypeFilter, setAssetTypeFilter] = useState<
    "ALL" | "EQUITY" | "MUTUAL_FUND"
  >(initialUrlState.assetTypeFilter);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(initialUrlState.pageSize || 25);
  const [page, setPage] = useState(initialUrlState.page || 1);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const [sortField, setSortField] = useState<ZerodhaAuditSortField>(
    initialUrlState.sortField
  );
  const [sortOrder, setSortOrder] = useState<ZerodhaAuditSortOrder>(
    initialUrlState.sortOrder
  );

  // Sync state with URL params
  useEffect(() => {
    const nextState = {
      searchTerm,
      statusFilters,
      activityFilter,
      accountFilter,
      assetTypeFilter,
      sortField,
      sortOrder,
      page,
      pageSize,
    };
    const nextParams = updateZerodhaAuditUrlParams(
      new URLSearchParams(searchParams.toString()),
      nextState
    );
    const nextQuery = nextParams.toString();

    if (nextQuery !== searchParams.toString()) {
      const url = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", url);
      }
      router.replace(url, { scroll: false });
    }
  }, [
    accountFilter,
    activityFilter,
    assetTypeFilter,
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

  const summary = auditData.summary;
  const items = auditData.items;

  const toggleRowExpand = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilters([]);
    setActivityFilter("ALL");
    setAccountFilter("ALL");
    setAssetTypeFilter("ALL");
    setPage(1);
  };

  const activeFilterCount =
    statusFilters.length +
    (activityFilter !== "ALL" ? 1 : 0) +
    (accountFilter !== "ALL" ? 1 : 0) +
    (assetTypeFilter !== "ALL" ? 1 : 0);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return items
      .filter((item) => {
        // Search filter
        if (query) {
          const matchName = item.schemeName.toLowerCase().includes(query);
          const matchMember = item.memberName.toLowerCase().includes(query);
          const matchClient = item.clientId.toLowerCase().includes(query);
          const matchIsin = item.isin?.toLowerCase().includes(query);
          const matchFolio = item.folioNo?.toLowerCase().includes(query);
          if (
            !matchName &&
            !matchMember &&
            !matchClient &&
            !matchIsin &&
            !matchFolio
          ) {
            return false;
          }
        }

        // Status filter
        if (statusFilters.length > 0) {
          if (!statusFilters.includes(item.auditStatus)) return false;
        }

        // Account filter
        if (accountFilter !== "ALL" && item.clientId !== accountFilter) {
          return false;
        }

        // Asset Type filter
        if (assetTypeFilter === "EQUITY" && item.holdingType !== "equity") {
          return false;
        }
        if (
          assetTypeFilter === "MUTUAL_FUND" &&
          item.holdingType !== "mutual_fund"
        ) {
          return false;
        }

        // Activity filter
        if (activityFilter === "ACTIVE" && !item.isActive) return false;
        if (activityFilter === "INACTIVE" && item.isActive) return false;

        return true;
      })
      .sort((a, b) => {
        const valA: string | number | boolean | null | undefined = a[sortField];
        const valB: string | number | boolean | null | undefined = b[sortField];

        if (typeof valA === "string") {
          const strA = valA.toLowerCase();
          const strB = typeof valB === "string" ? valB.toLowerCase() : "";
          return sortOrder === "asc"
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA);
        }

        const numA = typeof valA === "number" ? valA : 0;
        const numB = typeof valB === "number" ? valB : 0;

        return sortOrder === "asc" ? numA - numB : numB - numA;
      });
  }, [
    items,
    searchTerm,
    statusFilters,
    accountFilter,
    assetTypeFilter,
    activityFilter,
    sortField,
    sortOrder,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Sort toggle handler
  const handleSort = (field: ZerodhaAuditSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (field: ZerodhaAuditSortField) => (
    <TableSortIcon
      isActive={sortField === field}
      sortOrder={sortOrder}
      className="inline ml-1 shrink-0"
    />
  );

  // Export to Excel
  const handleExportXLSX = () => {
    const rows = filteredItems.map((item, idx) => ({
      "#": idx + 1,
      "Member Name": item.memberName,
      "Client ID": item.clientId,
      "Asset Name": item.schemeName,
      "Asset Type":
        item.holdingType === "equity" ? "Equity Stock" : "Mutual Fund",
      Category: item.category,
      "Folio Number": item.folioNo || "N/A",
      ISIN: item.isin || "N/A",
      "Snapshot Units": item.snapshotUnits,
      "Tradebook Net Units": item.txNetUnits,
      "Unit Difference": item.unitDifference,
      "Snapshot Avg Price": item.snapshotAvgPrice,
      "Tradebook Avg Buy NAV": item.txWeightedAvgBuyNav,
      "NAV Difference": item.navDifference,
      "Snapshot Invested Value": item.snapshotInvestedValue,
      "Tradebook Net Amount": item.txNetAmount,
      "Stamp Duty": item.txTotalStampDuty,
      "Amount Difference": item.amountDifference,
      "Current Price": item.snapshotCurrentPrice,
      "Current Valuation": item.snapshotCurrentValue,
      "Audit Status": item.auditStatus,
      "Root Cause Diagnostic": item.rootCause,
      "Tx Count": item.txCount,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Zerodha CAS Audit");
    XLSX.writeFile(
      wb,
      `Zerodha-CAS-Audit-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. BANNER / HERO CARD ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-teal-950/40 p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                  Zerodha CAS Audit & Discrepancy Finder
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Live Audit
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Full portfolio reconciliation comparing Zerodha holdings
                statement balances against historical tradebook transaction logs
                for Dishen (SQY316) and Nency (QIJ676).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
            {/* Upload Coin CSV Button */}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer shrink-0"
            >
              <Upload size={14} className="stroke-[2.5]" />
              Upload Coin CSV
            </button>

            {/* Export XLSX Button */}
            <button
              type="button"
              onClick={handleExportXLSX}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <Download size={14} className="text-emerald-400" />
              Export XLSX
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. SUMMARY KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Total Audited */}
        <button
          type="button"
          onClick={() => {
            setStatusFilters([]);
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 0
              ? "bg-indigo-950/40 border-indigo-500/50 ring-2 ring-indigo-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-indigo-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Total Audited
            </span>
            <Layers size={16} className="text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-100 mt-2 tracking-tight">
            {summary.totalAudited}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold truncate">
            {summary.equityCount} Stocks • {summary.mutualFundCount} MFs
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
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 &&
            statusFilters.includes("PERFECT_MATCH")
              ? "bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Perfect Matches
            </span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2 tracking-tight">
            {summary.perfectMatchCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold truncate">
            Units & NAV 100% Match
          </div>
        </button>

        {/* Partial Redemptions / Partial Sells */}
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
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 &&
            statusFilters.includes("PARTIAL_REDEMPTION")
              ? "bg-purple-950/40 border-purple-500/50 ring-2 ring-purple-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-purple-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
              Partial Sells
            </span>
            <ArrowRightLeft size={16} className="text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 mt-2 tracking-tight">
            {summary.partialRedemptionCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold truncate">
            Units Match (Realized Gains)
          </div>
        </button>

        {/* NAV Rounding */}
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
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 && statusFilters.includes("NAV_ROUNDING")
              ? "bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              NAV / STT Rounding
            </span>
            <Coins size={16} className="text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-2 tracking-tight">
            {summary.navRoundingCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold truncate">
            Minor fractional / STT diff
          </div>
        </button>

        {/* Unit & Cost Mismatches */}
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
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 &&
            statusFilters.includes("UNIT_COST_MISMATCH")
              ? "bg-rose-950/40 border-rose-500/50 ring-2 ring-rose-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-rose-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
              Unit Mismatches
            </span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-2 tracking-tight">
            {summary.unitMismatchCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold truncate">
            Qty or Cost Variance
          </div>
        </button>

        {/* Missing History */}
        <button
          type="button"
          onClick={() => {
            if (
              statusFilters.length === 1 &&
              statusFilters[0] === "MISSING_HISTORY"
            ) {
              setStatusFilters([]);
            } else {
              setStatusFilters(["MISSING_HISTORY"]);
            }
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilters.length === 1 &&
            statusFilters.includes("MISSING_HISTORY")
              ? "bg-amber-950/40 border-amber-500/50 ring-2 ring-amber-500/20"
              : "bg-slate-900/70 border-slate-800/80 hover:border-amber-500/30 hover:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Missing History
            </span>
            <Sparkles size={16} className="text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-2 tracking-tight">
            {summary.missingTxCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold truncate">
            0 Transactions Recorded
          </div>
        </button>
      </div>

      {/* ── 3. SEARCH, QUICK PILLS & FILTERS BAR ── */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
        {/* Toolbar row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <SearchFilterBar
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            placeholder="Search scheme, member, folio..."
            className="flex-1"
          />

          {/* Quick Holding Status Segmented Toggle */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActivityFilter("ALL");
                setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activityFilter === "ALL"
                  ? "bg-slate-800 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({summary.totalAudited})
            </button>
            <button
              type="button"
              onClick={() => {
                setActivityFilter("ACTIVE");
                setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activityFilter === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Active ({summary.activeCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActivityFilter("INACTIVE");
                setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
            type="button"
            onClick={() => setFilterPanelOpen(true)}
            className={`relative flex items-center justify-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
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

        {/* Active filter chips — visible under search bar */}
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
                  type="button"
                  onClick={() => {
                    setActivityFilter("ALL");
                    setPage(1);
                  }}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Remove activity filter"
                >
                  ✕
                </button>
              </span>
            )}
            {statusFilters.map((s) => {
              const badge = formatZerodhaAuditStatusBadge(s);
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.badgeClass}`}
                >
                  {badge.label}
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilters((prev) => prev.filter((x) => x !== s));
                      setPage(1);
                    }}
                    className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                    aria-label={`Remove ${badge.label} filter`}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
            {accountFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                👤{" "}
                {auditData.members.find((m) => m.clientId === accountFilter)
                  ?.name ?? accountFilter}{" "}
                ({accountFilter})
                <button
                  type="button"
                  onClick={() => {
                    setAccountFilter("ALL");
                    setPage(1);
                  }}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Remove member filter"
                >
                  ✕
                </button>
              </span>
            )}
            {assetTypeFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {assetTypeFilter === "EQUITY"
                  ? "Stocks Only"
                  : "Mutual Funds Only"}
                <button
                  type="button"
                  onClick={() => {
                    setAssetTypeFilter("ALL");
                    setPage(1);
                  }}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Remove asset type filter"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── 4. AUDIT TABLE ── */}
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
              {paginatedItems.length}
            </span>{" "}
            of{" "}
            <span className="text-slate-200 font-bold">
              {filteredItems.length}
            </span>{" "}
            audited folios
          </span>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
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
                    <span>MEMBER & FOLIO</span>
                    {renderSortIcon("memberName")}
                  </div>
                </th>

                <th
                  className="px-3 py-3 w-[22%] cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("schemeName")}
                >
                  <div className="flex items-center gap-1">
                    <span>SCHEME & CATEGORY</span>
                    {renderSortIcon("schemeName")}
                  </div>
                </th>

                <th
                  className="px-3 py-3 w-[18%] cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("snapshotUnits")}
                >
                  <div className="flex items-center gap-1">
                    <span>UNITS BREAKDOWN</span>
                    {renderSortIcon("snapshotUnits")}
                  </div>
                </th>

                <th
                  className="px-3 py-3 w-[20%] cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("snapshotAvgPrice")}
                >
                  <div className="flex items-center gap-1">
                    <span>COST BASIS & CHARGES</span>
                    {renderSortIcon("snapshotAvgPrice")}
                  </div>
                </th>

                <th
                  className="px-3 py-3 w-[13%] cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("snapshotCurrentValue")}
                >
                  <div className="flex items-center gap-1">
                    <span>VALUATION & STATUS</span>
                    {renderSortIcon("snapshotCurrentValue")}
                  </div>
                </th>

                <th className="px-3 py-3 w-[12%]">ROOT CAUSE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 text-xs">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No portfolio holdings match the audit filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <ZerodhaAuditHoldingRow
                    key={item.id}
                    item={item}
                    index={(page - 1) * pageSize + idx}
                    isExpanded={!!expandedRows[item.id]}
                    onToggleExpand={() => toggleRowExpand(item.id)}
                  />
                ))
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

      {/* ── 5. FILTER MODAL ── */}
      <ZerodhaAuditFilterModal
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        statusFilters={statusFilters}
        onStatusChange={(statuses) => {
          setStatusFilters(statuses);
          setPage(1);
        }}
        activityFilter={activityFilter}
        onChangeActivity={(val) => {
          setActivityFilter(val);
          setPage(1);
        }}
        accountFilter={accountFilter}
        onChangeAccount={(val) => {
          setAccountFilter(val);
          setPage(1);
        }}
        assetTypeFilter={assetTypeFilter}
        onChangeAssetType={(val) => {
          setAssetTypeFilter(val);
          setPage(1);
        }}
        members={auditData.members}
        onReset={handleResetFilters}
        filteredCount={filteredItems.length}
      />

      <ZerodhaTransactionUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
