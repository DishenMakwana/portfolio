"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getOverlapSubCategory } from "@/helpers/allocation";
import { getAuditItemKey } from "@/helpers/audit";
import { parseAuditUrlState, updateAuditUrlParams } from "@/helpers/auditUrl";
import { exportJsonToExcel } from "@/helpers/excelExport";
import { getFundDetailsUrl } from "@/utils/formatters";
import AuditHeaderBanner from "./AuditHeaderBanner";
import AuditHeroCards from "./AuditHeroCards";
import AuditTable from "./table/AuditTable";
import AuditToolbar from "./AuditToolbar";

const TransactionUploadModal = dynamic(
  () => import("@/components/mutual-fund/transactions/TransactionUploadModal"),
  { ssr: false }
);
const AuditFilterModal = dynamic(() => import("./modal/AuditFilterModal"), {
  ssr: false,
});
import type {
  AuditClientProps,
  AuditHoldingItem,
  AuditSortField,
  AuditStatusType,
  AuditHoldingFilter,
} from "@/types/audit";
import type { SortOrder } from "@/types/tableSort";

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
  const [activityFilter, setActivityFilter] = useState<AuditHoldingFilter>(
    initialUrlState.activityFilter
  );
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
  const [sortOrder, setSortOrder] = useState<SortOrder>(
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
          const rankScore: Record<AuditStatusType, number> = {
            UNIT_COST_MISMATCH: 5,
            PARTIAL_REDEMPTION: 4,
            NAV_ROUNDING: 3,
            MISSING_HISTORY: 2,
            PERFECT_MATCH: 1,
          };
          valA = rankScore[a.auditStatus] || 0;
          valB = rankScore[b.auditStatus] || 0;
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
    activityFilter,
    memberFilter,
    categoryFilter,
    sortField,
    sortOrder,
  ]);

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
      map.set(getAuditItemKey(item), index + 1);
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
    let nextOrder: SortOrder = "desc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(nextOrder);
    setPage(1);
  };

  const handleStatusToggle = (status: AuditStatusType) => {
    if (statusFilters.length === 1 && statusFilters[0] === status) {
      setStatusFilters([]);
    } else {
      setStatusFilters([status]);
    }
  };

  const handleResetFilters = () => {
    setStatusFilters([]);
    setActivityFilter("ALL");
  };

  const handleItemClick = (item: AuditHoldingItem) => {
    router.push(
      getFundDetailsUrl(
        item.holdingId,
        item.isZeroBalance ||
          item.isSold ||
          item.holdingId < 0 ||
          item.casCurrentValue === 0
      )
    );
  };

  // XLSX Export Handler matching exact report format using ExcelJS
  const handleExportXlsx = async () => {
    const data = filteredItems.map((item, idx) => ({
      index: rankMap.get(getAuditItemKey(item)) ?? idx + 1,
      memberName: item.memberName,
      schemeName: item.schemeName,
      folioNo: item.folioNo,
      holdingStatus: item.isActive ? "Active" : "Inactive / Redeemed",
      casBalanceUnits: Number(item.casBalanceUnits.toFixed(3)),
      txNetUnits: Number(item.txNetUnits.toFixed(3)),
      unitDifference: Number(item.unitDifference.toFixed(3)),
      unitStatus: item.unitStatus,
      casPurchaseValue: Number(item.casPurchaseValue.toFixed(2)),
      txNetAmount: Number(item.txNetAmount.toFixed(2)),
      totalBuyAmount: Number(item.totalBuyAmount.toFixed(2)),
      totalSellAmount: Number(item.totalSellAmount.toFixed(2)),
      totalStt: Number(item.totalStt.toFixed(2)),
      totalStampDuty: Number(item.totalStampDuty.toFixed(2)),
      txNetAmountWithCharges: Number(item.txNetAmountWithCharges.toFixed(2)),
      amountDifference: Number(item.amountDifference.toFixed(2)),
      casCurrentValue: Number(item.casCurrentValue.toFixed(2)),
      auditStatus: item.auditStatus.replace(/_/g, " "),
      rootCauseAnalysis: item.rootCauseAnalysis,
    }));

    const columns = [
      { header: "#", key: "index", width: 6 },
      { header: "Member Name", key: "memberName", width: 25 },
      { header: "Scheme Name", key: "schemeName", width: 40 },
      { header: "Folio No", key: "folioNo", width: 18 },
      { header: "Holding Status", key: "holdingStatus", width: 20 },
      { header: "CAS Balance Units", key: "casBalanceUnits", width: 18 },
      { header: "Transaction Net Units", key: "txNetUnits", width: 20 },
      { header: "Unit Difference", key: "unitDifference", width: 16 },
      { header: "Unit Status", key: "unitStatus", width: 16 },
      { header: "CAS Purchase Value (₹)", key: "casPurchaseValue", width: 22 },
      { header: "Transaction Net Amount (₹)", key: "txNetAmount", width: 24 },
      { header: "Total Buy Amount (₹)", key: "totalBuyAmount", width: 20 },
      { header: "Total Sell Amount (₹)", key: "totalSellAmount", width: 20 },
      { header: "Total STT (₹)", key: "totalStt", width: 14 },
      { header: "Total Stamp Duty (₹)", key: "totalStampDuty", width: 18 },
      {
        header: "Net+Charges Amount (₹)",
        key: "txNetAmountWithCharges",
        width: 22,
      },
      { header: "Amount Difference (₹)", key: "amountDifference", width: 20 },
      { header: "CAS Current Value (₹)", key: "casCurrentValue", width: 20 },
      { header: "Audit Status", key: "auditStatus", width: 20 },
      { header: "Root Cause & Analysis", key: "rootCauseAnalysis", width: 60 },
    ];

    const fileName = `CAS_Reconciliation_Audit_${new Date().toISOString().split("T")[0]}.xlsx`;

    await exportJsonToExcel({
      sheetName: "CAS Reconciliation",
      columns,
      data,
      fileName,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <AuditHeaderBanner
        onUploadClick={() => setIsUploadModalOpen(true)}
        onExportClick={handleExportXlsx}
      />

      {/* Hero Summary Cards Grid */}
      <AuditHeroCards
        summary={summary}
        statusFilters={statusFilters}
        activityFilter={activityFilter}
        onStatusToggle={handleStatusToggle}
        onResetFilters={handleResetFilters}
      />

      {/* Filter Modal */}
      {mounted && filterPanelOpen && (
        <AuditFilterModal
          isOpen={filterPanelOpen}
          onClose={() => setFilterPanelOpen(false)}
          statusFilters={statusFilters}
          setStatusFilters={setStatusFilters}
          activityFilter={activityFilter}
          setActivityFilter={setActivityFilter}
          memberFilter={memberFilter}
          setMemberFilter={setMemberFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          membersList={membersList}
          categoriesList={categoriesList}
          onClearAll={handleClearAll}
          resultCount={filteredItems.length}
        />
      )}

      {/* Search + Filters card */}
      <AuditToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activityFilter={activityFilter}
        setActivityFilter={setActivityFilter}
        statusFilters={statusFilters}
        setStatusFilters={setStatusFilters}
        memberFilter={memberFilter}
        setMemberFilter={setMemberFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        activeFilterCount={activeFilterCount}
        onOpenFilterModal={() => setFilterPanelOpen(true)}
        onClearAll={handleClearAll}
        summary={summary}
      />

      {/* Audit Table Container */}
      <AuditTable
        paginatedAuditItems={paginatedAuditItems}
        filteredItemsCount={filteredItems.length}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        rankMap={rankMap}
        onItemClick={handleItemClick}
      />

      {mounted && isUploadModalOpen && (
        <TransactionUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </div>
  );
}
