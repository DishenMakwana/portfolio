"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { trackFilterLatency } from "@/helpers/performance";
import HoldingsFilterModal from "./modal/HoldingsFilterModal";
import HoldingsToolbar from "./HoldingsToolbar";
import HoldingsTable from "./table/HoldingsTable";
import {
  matchCategoryFilter,
  getCategoryOptions,
  parseCategoryFilters,
  serializeCategoryFilters,
} from "@/helpers/holdingsCategory";
import {
  matchesSearchTokens,
  getSearchTokens,
  scoreItem,
  PORTFOLIO_SEARCH_WEIGHTS,
} from "@/helpers/search";
import {
  HOLDINGS_SORT_FIELDS,
  type HoldingsCategoryFilters,
  type HoldingsSortField,
  type HoldingsTabProps,
} from "@/types/holdings";
import type { SearchScoreMap } from "@/types/filters";
import { useTableSort } from "@/helpers/useTableSort";

export default function HoldingsTab({
  holdings,
  memberSummaries,
  initialMember = "All",
  categoryRankingsMap,
}: HoldingsTabProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { sortField, sortOrder, handleSort, renderSortIcon } =
    useTableSort<HoldingsSortField>({
      defaultField: "xirr",
      defaultOrder: "desc",
      allowedFields: HOLDINGS_SORT_FIELDS,
      onSortChange: () => setPage(1),
    });

  // Read initial states from URL query params
  const initialSearch = searchParams.get("q") || "";
  const initialMemberParam = searchParams.get("member") || initialMember;
  const initialPlan = searchParams.get("plan") || "All";
  const initialCategoryFilters = parseCategoryFilters(
    searchParams.get("category")
  );

  const initialStatus = searchParams.get("status") || "active";
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

  // Local Search & Filter State
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [memberFilter, setMemberFilter] = useState(initialMemberParam);
  const [planFilter, setPlanFilter] = useState(initialPlan);
  const [categoryFilters, setCategoryFilters] =
    useState<HoldingsCategoryFilters>(initialCategoryFilters);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(initialPage);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Dynamic Category Options
  const categoryOptions = useMemo(
    () => getCategoryOptions(holdings.map((h) => h.category)),
    [holdings]
  );

  const memberOptions = useMemo(
    () =>
      [...memberSummaries]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({
          id: m.name,
          label: m.name,
        })),
    [memberSummaries]
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
        (key === "status" && value === "active") ||
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
  };

  // Synchronize state when URL query params change (e.g. Back/Forward browser navigation)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchVal(q);
    setMemberFilter(searchParams.get("member") || "All");
    setPlanFilter(searchParams.get("plan") || "All");
    setCategoryFilters(parseCategoryFilters(searchParams.get("category")));
    setStatusFilter(searchParams.get("status") || "active");
    const rawP = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawP) && rawP > 0) setPage(rawP);
    const rawPs = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    if (!isNaN(rawPs) && rawPs > 0) setPageSize(rawPs);
  }, [searchParams]);

  // Debounced search query update in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUrlQ = searchParams.get("q") || "";
      if (currentUrlQ !== searchVal) {
        updateUrl({ q: searchVal, page: "1" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const handleMemberChange = (value: string) => {
    trackFilterLatency("Mutual Funds - Holdings", "Member", value);
    setMemberFilter(value);
    setPage(1);
    updateUrl({ member: value, page: "1" });
  };

  const handlePlanChange = (value: string) => {
    trackFilterLatency("Mutual Funds - Holdings", "Plan", value);
    setPlanFilter(value);
    setPage(1);
    updateUrl({ plan: value, page: "1" });
  };

  const handleCategoryToggle = (category: string): void => {
    trackFilterLatency("Mutual Funds - Holdings", "Category Toggle", category);
    const nextCategoryFilters = categoryFilters.includes(category)
      ? categoryFilters.filter((filter) => filter !== category)
      : [...categoryFilters, category];
    setCategoryFilters(nextCategoryFilters);
    setPage(1);
    updateUrl({
      category: serializeCategoryFilters(nextCategoryFilters),
      page: "1",
    });
  };

  const handleCategoryChange = (cats: string[]): void => {
    trackFilterLatency("Mutual Funds - Holdings", "Category", cats.join(", "));
    setCategoryFilters(cats);
    setPage(1);
    updateUrl({
      category: serializeCategoryFilters(cats),
      page: "1",
    });
  };

  const handleCategoryClear = (): void => {
    trackFilterLatency("Mutual Funds - Holdings", "Category Clear", "all");
    setCategoryFilters([]);
    setPage(1);
    updateUrl({ category: null, page: "1" });
  };

  const handleStatusChange = (value: string) => {
    trackFilterLatency("Mutual Funds - Holdings", "Status", value);
    setStatusFilter(value);
    setPage(1);
    updateUrl({ status: value, page: "1" });
  };

  const handleClearAll = () => {
    trackFilterLatency("Mutual Funds - Holdings", "Clear All", "all");
    setMemberFilter("All");
    setPlanFilter("All");
    setStatusFilter("active");
    setCategoryFilters([]);
    setSearchVal("");
    setPage(1);
    updateUrl({
      member: null,
      plan: null,
      status: null,
      category: null,
      q: null,
      page: "1",
    });
  };

  // Active holdings count (excluding fully redeemed/sold 0 balance folios)
  const activeTotalCount = holdings.filter(
    (h) => (h.balanceUnits ?? 0) > 0.0001
  ).length;

  const deferredSearchVal = useDeferredValue(searchVal);

  // Filter holdings
  const filtered = useMemo(() => {
    const tokens = getSearchTokens(deferredSearchVal);

    return holdings.filter((h) => {
      const matchSearch =
        tokens.length === 0 ||
        matchesSearchTokens(
          tokens,
          [h.schemeName, h.memberName, h.folioNo],
          h.folioNo
        );
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
    });
  }, [
    holdings,
    deferredSearchVal,
    memberFilter,
    planFilter,
    statusFilter,
    categoryFilters,
  ]);

  // Compute baseline rank for each item based on DESCENDING sort of current sortField
  const rankMap = useMemo(() => {
    const descSorted = [...filtered].sort((a, b) => {
      const valA = a[sortField] ?? -999999;
      const valB = b[sortField] ?? -999999;
      if (typeof valA === "number" && typeof valB === "number") {
        return valB - valA;
      }
      return 0;
    });

    const map = new Map<number, number>();
    descSorted.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [filtered, sortField]);

  // Final display list sorted by sortField and sortOrder (prioritizing search score when search query is active)
  const sortedHoldings = useMemo(() => {
    const tokens = getSearchTokens(deferredSearchVal);
    const isSearching = tokens.length > 0;

    // Pre-calculate score if searching
    const scoreMap: SearchScoreMap = new Map();
    if (isSearching) {
      for (const h of filtered) {
        const res = scoreItem(
          tokens,
          [
            {
              text: h.schemeName,
              weight: PORTFOLIO_SEARCH_WEIGHTS.SCHEME_NAME,
            },
            {
              text: h.memberName,
              weight: PORTFOLIO_SEARCH_WEIGHTS.MEMBER_NAME,
            },
            { text: h.category, weight: PORTFOLIO_SEARCH_WEIGHTS.CATEGORY },
            { text: h.folioNo, weight: PORTFOLIO_SEARCH_WEIGHTS.FOLIO_NO },
          ],
          h.folioNo
        );
        scoreMap.set(h.id, res);
      }
    }

    return [...filtered].sort((a, b) => {
      // 1. If actively searching, rank by matchedTermsCount descending, then totalScore descending
      if (isSearching) {
        const scoreA = scoreMap.get(a.id);
        const scoreB = scoreMap.get(b.id);
        const termsA = scoreA?.matchedTermsCount ?? 0;
        const termsB = scoreB?.matchedTermsCount ?? 0;
        if (termsB !== termsA) {
          return termsB - termsA;
        }
        const totalA = scoreA?.totalScore ?? 0;
        const totalB = scoreB?.totalScore ?? 0;
        if (Math.abs(totalB - totalA) > 0.05) {
          return totalB - totalA;
        }
      }

      // 2. User's explicit table sort column
      const valA = a[sortField] ?? (sortOrder === "asc" ? 999999 : -999999);
      const valB = b[sortField] ?? (sortOrder === "asc" ? 999999 : -999999);
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      if (sortOrder === "asc") {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [filtered, sortField, sortOrder, deferredSearchVal]);

  const totalPages = Math.ceil(sortedHoldings.length / pageSize);
  const paginatedHoldings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedHoldings.slice(start, start + pageSize);
  }, [sortedHoldings, page, pageSize]);

  return (
    <motion.div
      key="holdings"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Filter Modal ── */}
      <HoldingsFilterModal
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        memberFilter={memberFilter}
        onMemberChange={handleMemberChange}
        memberOptions={memberOptions}
        planFilter={planFilter}
        onPlanChange={handlePlanChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        categoryFilters={categoryFilters}
        onCategoryToggle={handleCategoryToggle}
        onCategoryClear={handleCategoryClear}
        categoryOptions={categoryOptions}
        onClearAll={handleClearAll}
        totalFilteredCount={filtered.length}
        onCategoryChange={handleCategoryChange}
      />

      {/* ── Search + Filters card ── */}
      <HoldingsToolbar
        searchValue={searchVal}
        onSearchChange={setSearchVal}
        onOpenFilters={() => setFilterPanelOpen(true)}
        memberFilter={memberFilter}
        onMemberChange={handleMemberChange}
        planFilter={planFilter}
        onPlanChange={handlePlanChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        categoryFilters={categoryFilters}
        onCategoryToggle={handleCategoryToggle}
        onClearAll={handleClearAll}
      />

      {/* ── Table Container ── */}
      <HoldingsTable
        holdings={paginatedHoldings}
        rankMap={rankMap}
        categoryRankingsMap={categoryRankingsMap}
        sortField={sortField}
        renderSortIcon={renderSortIcon}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalFilteredCount={filtered.length}
        activeTotalCount={activeTotalCount}
        totalHoldingsCount={holdings.length}
        statusFilter={statusFilter}
        onPageChange={(nextPage) => {
          setPage(nextPage);
          updateUrl({ page: String(nextPage) });
        }}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
          updateUrl({ pageSize: String(newSize), page: "1" });
        }}
        onResetFilters={handleClearAll}
      />
    </motion.div>
  );
}
