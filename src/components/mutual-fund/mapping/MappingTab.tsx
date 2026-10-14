"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  searchMfApiAction,
  updateSchemeMappingAction,
  autoMapAllSchemesAction,
} from "@/actions/portfolio";
import {
  getCategoryOptions,
  matchCategoryFilter,
  parseCategoryFilters,
  serializeCategoryFilters,
} from "@/helpers/holdingsCategory";
import AutoMapResultsPanel from "./automap/AutoMapResultsPanel";
import MappingFilterModal from "./modal/MappingFilterModal";
import ManualSearchModal from "./modal/ManualSearchModal";
import SchemeListPanel from "./scheme/SchemeListPanel";
import MappingHeaderPanel from "./MappingHeaderPanel";
import MappingToolbar from "./MappingToolbar";
import type { HoldingsCategoryFilters } from "@/types/holdings";
import {
  MAPPING_SORT_FIELDS,
  type MappingTabProps,
  type MappingStatusFilter,
  type MappingSortField,
  type SchemeHoldingFilter,
} from "@/types/mapping";
import type { MfSearchResult } from "@/types/mf-api";
import type { AutoMapResult } from "@/types/portfolio";

export default function MappingTab({ allSchemes }: MappingTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial states from URL query parameters
  const initialSearch = searchParams.get("q") || "";
  const initialStatus =
    (searchParams.get("status") as MappingStatusFilter) || "all";
  const initialHolding =
    (searchParams.get("holding") as SchemeHoldingFilter) || "all";
  const initialCategoryFilters = parseCategoryFilters(
    searchParams.get("category")
  );
  const rawSort = searchParams.get("sort");
  const initialSort = (
    (MAPPING_SORT_FIELDS as readonly string[]).includes(rawSort || "")
      ? rawSort
      : "name"
  ) as MappingSortField;
  const rawOrder = searchParams.get("order");
  const initialOrder = (
    rawOrder === "asc" || rawOrder === "desc" ? rawOrder : "asc"
  ) as "asc" | "desc";
  const initialAutoFilter =
    (searchParams.get("autoFilter") as
      "all" | "mapped" | "low_confidence" | "not_found") || "all";

  // ── Local Search & Filter State
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [mappingFilter, setMappingFilter] =
    useState<MappingStatusFilter>(initialStatus);
  const [holdingFilter, setHoldingFilter] =
    useState<SchemeHoldingFilter>(initialHolding);
  const [categoryFilters, setCategoryFilters] =
    useState<HoldingsCategoryFilters>(initialCategoryFilters);
  const [sortField, setSortField] = useState<MappingSortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialOrder);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [autoMapFilter, setAutoMapFilter] = useState<
    "all" | "mapped" | "low_confidence" | "not_found"
  >(initialAutoFilter);

  // Dynamic Category Options from schemes
  const categoryOptions = useMemo(
    () => getCategoryOptions(allSchemes.map((s) => s.category)),
    [allSchemes]
  );

  // Synchronize state when URL query params change (e.g. Back/Forward browser navigation)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchVal(q);
    setMappingFilter(
      (searchParams.get("status") as MappingStatusFilter) || "all"
    );
    setHoldingFilter(
      (searchParams.get("holding") as SchemeHoldingFilter) || "all"
    );
    setCategoryFilters(parseCategoryFilters(searchParams.get("category")));
    const rawS = searchParams.get("sort");
    setSortField(
      ((MAPPING_SORT_FIELDS as readonly string[]).includes(rawS || "")
        ? rawS
        : "name") as MappingSortField
    );
    const rawO = searchParams.get("order");
    setSortOrder(
      (rawO === "asc" || rawO === "desc" ? rawO : "asc") as "asc" | "desc"
    );
    setAutoMapFilter(
      (searchParams.get("autoFilter") as
        "all" | "mapped" | "low_confidence" | "not_found") || "all"
    );
  }, [searchParams]);

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
        value === "all" ||
        (key === "sort" && value === "name" && current.get("order") === "asc")
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
    router.replace(url, { scroll: false });
  };

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

  const handleMappingFilterChange = (filter: MappingStatusFilter) => {
    setMappingFilter(filter);
    updateUrl({ status: filter });
  };

  const handleHoldingFilterChange = (filter: SchemeHoldingFilter) => {
    setHoldingFilter(filter);
    updateUrl({ holding: filter === "all" ? null : filter });
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

  const handleSortChange = (field: MappingSortField) => {
    let nextOrder: "asc" | "desc" = "asc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(nextOrder);
    updateUrl({ sort: field, order: nextOrder });
  };

  const handleClearAll = () => {
    setSearchVal("");
    setMappingFilter("all");
    setHoldingFilter("all");
    setCategoryFilters([]);
    setSortField("name");
    setSortOrder("asc");
    updateUrl({
      q: null,
      status: null,
      holding: null,
      category: null,
      sort: null,
      order: null,
    });
  };

  const handleAutoMapFilterChange = (
    filter: "all" | "mapped" | "low_confidence" | "not_found"
  ) => {
    setAutoMapFilter(filter);
    updateUrl({ autoFilter: filter });
  };

  // ── Manual assign modal state
  const [mappingSchemeId, setMappingSchemeId] = useState<number | null>(null);
  const [mappingSchemeName, setMappingSchemeName] = useState("");
  const [apiSearchQuery, setApiSearchQuery] = useState("");
  const [apiSearchResults, setApiSearchResults] = useState<MfSearchResult[]>(
    []
  );
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // ── Auto-map state
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [autoMapResults, setAutoMapResults] = useState<AutoMapResult[] | null>(
    null
  );
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  // ── Search for the manual modal
  const handleApiSearch = async (query: string) => {
    setApiSearchQuery(query);
    if (query.trim().length < 3) {
      setApiSearchResults([]);
      return;
    }
    setIsSearchingApi(true);
    const results = await searchMfApiAction(query);
    setApiSearchResults(results.data || []);
    setIsSearchingApi(false);
  };

  const handleMapScheme = async (schemeId: number, code: string | null) => {
    const res = await updateSchemeMappingAction(schemeId, code);
    if (res.success) {
      toast.success(code ? "Scheme successfully mapped" : "Scheme unmapped");
    } else {
      toast.error(res.error || "Failed to update mapping");
    }
    setMappingSchemeId(null);
    setApiSearchQuery("");
    setApiSearchResults([]);
    // If there's an auto-map result panel open, refresh the result too
    if (autoMapResults) {
      setAutoMapResults((prev) =>
        prev
          ? prev.map((r) =>
              r.schemeId === schemeId
                ? {
                    ...r,
                    status: code ? "mapped" : "not_found",
                    schemeCode: code,
                    confidence: code ? 100 : null,
                  }
                : r
            )
          : null
      );
    }
    router.refresh();
  };

  // ── Auto-map all unmapped schemes
  const handleAutoMapAll = async () => {
    setIsAutoMapping(true);
    setAutoMapResults(null);
    setAutoMapFilter("all");
    try {
      const { results } = await autoMapAllSchemesAction(true);
      setAutoMapResults(results);
      const mappedSuccessCount = results.filter(
        (r) => r.status === "mapped"
      ).length;
      toast.success(
        `Auto-mapping complete: ${mappedSuccessCount} schemes mapped.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Auto-mapping encountered an error"
      );
    } finally {
      setIsAutoMapping(false);
      router.refresh();
    }
  };

  // ── Filtered and Sorted Schemes
  const filteredSchemes = useMemo(() => {
    const query = searchVal.trim().toLowerCase();
    return allSchemes
      .filter((scheme) => {
        // Holding status filter
        if (holdingFilter === "active" && (scheme.activeFoliosCount ?? 0) === 0)
          return false;
        if (
          holdingFilter === "sold" &&
          ((scheme.activeFoliosCount ?? 0) > 0 ||
            (scheme.zeroBalanceFoliosCount ?? 0) === 0)
        )
          return false;

        // Status filter
        if (mappingFilter === "mapped" && !scheme.schemeCodeApi) return false;
        if (mappingFilter === "unmapped" && scheme.schemeCodeApi) return false;

        // Category filter
        if (!matchCategoryFilter(scheme.category, categoryFilters))
          return false;

        // Search query
        if (query) {
          const matchName = scheme.name.toLowerCase().includes(query);
          const matchCat = (scheme.category || "")
            .toLowerCase()
            .includes(query);
          const matchCode = (scheme.schemeCodeApi || "")
            .toLowerCase()
            .includes(query);
          const matchFolio =
            scheme.activeFolios?.some((f) => f.includes(query)) ||
            scheme.zeroBalanceFolios?.some((f) => f.includes(query));
          if (!matchName && !matchCat && !matchCode && !matchFolio)
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") {
          cmp = a.name.localeCompare(b.name);
        } else if (sortField === "category") {
          cmp = (a.category || "").localeCompare(b.category || "");
        } else if (sortField === "status") {
          const aMapped = a.schemeCodeApi ? 1 : 0;
          const bMapped = b.schemeCodeApi ? 1 : 0;
          cmp = aMapped - bMapped;
        } else if (sortField === "code") {
          cmp = (a.schemeCodeApi || "").localeCompare(b.schemeCodeApi || "");
        } else if (sortField === "activeFolios") {
          cmp = (a.activeFoliosCount ?? 0) - (b.activeFoliosCount ?? 0);
        } else if (sortField === "soldFolios") {
          cmp =
            (a.zeroBalanceFoliosCount ?? 0) - (b.zeroBalanceFoliosCount ?? 0);
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [
    allSchemes,
    searchVal,
    holdingFilter,
    mappingFilter,
    categoryFilters,
    sortField,
    sortOrder,
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const mappedCount = allSchemes.filter((s) => !!s.schemeCodeApi).length;
  const activeHoldingSchemesCount = useMemo(
    () => allSchemes.filter((s) => (s.activeFoliosCount ?? 0) > 0).length,
    [allSchemes]
  );
  const soldHoldingSchemesCount = useMemo(
    () =>
      allSchemes.filter(
        (s) =>
          (s.activeFoliosCount ?? 0) === 0 &&
          (s.zeroBalanceFoliosCount ?? 0) > 0
      ).length,
    [allSchemes]
  );

  // Filter the auto-map result list
  const filteredAutoResults = autoMapResults
    ? autoMapResults.filter((r) => {
        if (autoMapFilter === "all") return true;
        if (autoMapFilter === "mapped")
          return r.status === "mapped" || r.status === "already_mapped";
        if (autoMapFilter === "low_confidence")
          return r.status === "low_confidence";
        if (autoMapFilter === "not_found")
          return r.status === "not_found" || r.status === "api_error";
        return true;
      })
    : null;

  const activeFilterCount =
    (mappingFilter !== "all" ? 1 : 0) +
    (holdingFilter !== "all" ? 1 : 0) +
    categoryFilters.length +
    (sortField !== "name" || sortOrder !== "asc" ? 1 : 0);

  const handleOpenManualModal = (schemeId: number, schemeName: string) => {
    setMappingSchemeId(schemeId);
    setMappingSchemeName(schemeName);
    const q = schemeName
      .replace(/Reg(?:ular)?/gi, "")
      .replace(/\(G\)/g, "")
      .trim()
      .slice(0, 30);
    setApiSearchQuery(q);
    handleApiSearch(q);
  };

  return (
    <motion.div
      key="mapping"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* ── FILTER MODAL / DRAWER ── */}
      <MappingFilterModal
        isOpen={mounted && filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        mappingFilter={mappingFilter}
        onMappingFilterChange={handleMappingFilterChange}
        holdingFilter={holdingFilter}
        onHoldingFilterChange={handleHoldingFilterChange}
        categoryFilters={categoryFilters}
        onCategoryChange={setCategoryFilters}
        onCategoryClear={handleCategoryClear}
        categoryOptions={categoryOptions}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onOrderChange={(order) => {
          setSortOrder(order);
          updateUrl({ order });
        }}
        onClearAll={handleClearAll}
        filteredCount={filteredSchemes.length}
        totalCount={allSchemes.length}
        mappedCount={mappedCount}
        unmappedCount={unmappedCount}
        activeHoldingSchemesCount={activeHoldingSchemesCount}
        soldHoldingSchemesCount={soldHoldingSchemesCount}
      />

      {/* ── HEADER PANEL ── */}
      <MappingHeaderPanel
        unmappedCount={unmappedCount}
        mappedCount={mappedCount}
        activeHoldingSchemesCount={activeHoldingSchemesCount}
        soldHoldingSchemesCount={soldHoldingSchemesCount}
        totalSchemesCount={allSchemes.length}
        isAutoMapping={isAutoMapping}
        onAutoMapAll={handleAutoMapAll}
      />

      {/* ── AUTO-MAP RESULTS PANEL ── */}
      <AutoMapResultsPanel
        isAutoMapping={isAutoMapping}
        autoMapResults={autoMapResults}
        filteredAutoResults={filteredAutoResults}
        autoMapFilter={autoMapFilter}
        onAutoMapFilterChange={handleAutoMapFilterChange}
        expandedResult={expandedResult}
        onToggleExpandResult={(schemeId) =>
          setExpandedResult((prev) => (prev === schemeId ? null : schemeId))
        }
        onOpenManualModal={handleOpenManualModal}
        onMapScheme={handleMapScheme}
      />

      {/* ── SEARCH + FILTERS TOOLBAR CARD ── */}
      <MappingToolbar
        searchVal={searchVal}
        setSearchVal={setSearchVal}
        activeFilterCount={activeFilterCount}
        onOpenFilterPanel={() => setFilterPanelOpen(true)}
        mappingFilter={mappingFilter}
        onMappingFilterChange={handleMappingFilterChange}
        holdingFilter={holdingFilter}
        onHoldingFilterChange={handleHoldingFilterChange}
        categoryFilters={categoryFilters}
        onCategoryToggle={handleCategoryToggle}
        sortField={sortField}
        sortOrder={sortOrder}
        onResetSort={() => {
          setSortField("name");
          setSortOrder("asc");
          updateUrl({ sort: null, order: null });
        }}
        onClearAll={handleClearAll}
      />

      {/* ── SCHEME LIST PANEL ── */}
      <SchemeListPanel
        schemes={filteredSchemes}
        totalSchemesCount={allSchemes.length}
        holdingFilter={holdingFilter}
        onHoldingFilterChange={handleHoldingFilterChange}
        activeHoldingSchemesCount={activeHoldingSchemesCount}
        soldHoldingSchemesCount={soldHoldingSchemesCount}
        onOpenManualModal={handleOpenManualModal}
        onMapScheme={handleMapScheme}
      />

      {/* ── MANUAL SEARCH MODAL ── */}
      <ManualSearchModal
        isOpen={mappingSchemeId !== null}
        onClose={() => {
          setMappingSchemeId(null);
          setApiSearchQuery("");
          setApiSearchResults([]);
        }}
        schemeId={mappingSchemeId}
        schemeName={mappingSchemeName}
        searchQuery={apiSearchQuery}
        onSearchQueryChange={handleApiSearch}
        searchResults={apiSearchResults}
        isSearching={isSearchingApi}
        onSelectScheme={handleMapScheme}
      />
    </motion.div>
  );
}
