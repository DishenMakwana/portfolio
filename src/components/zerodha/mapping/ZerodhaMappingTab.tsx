"use client";

import {
  useState,
  useTransition,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Loader2,
  X,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  Check,
  Tag,
  Hash,
  Trash2,
  Sparkles,
  TrendingUp,
  Target,
  Building2,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import { searchMfApiAction } from "@/actions/portfolio";
import {
  searchStockApiAction,
  updateZerodhaSchemeMappingAction,
  autoMapAllZerodhaSchemesAction,
  updateZerodhaSchemeCategoryAction,
} from "@/actions/zerodha";
import { ZerodhaScheme, StockSearchResult } from "@/types/zerodha";
import {
  ZerodhaMappingTabProps,
  MappingStatusFilter,
  ZerodhaMappingAssetTypeFilter,
  MappingSortField,
  MAPPING_SORT_FIELDS,
} from "@/types/mapping";
import { MfSearchResult } from "@/types/mf-api";
import {
  getCategoryOptions,
  matchCategoryFilter,
  parseCategoryFilters,
  serializeCategoryFilters,
} from "@/helpers/holdingsCategory";
import type { HoldingsCategoryFilters } from "@/types/holdings";

const BENCHMARK_CLASSIFICATIONS = [
  {
    value: "Equity: Large Cap",
    label: "Large Cap (Nifty 50)",
    badge: "Large Cap",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    desc: "Benchmark against NIFTY 50 TRI",
  },
  {
    value: "Equity: Mid Cap",
    label: "Mid Cap (Nifty Midcap 150)",
    badge: "Mid Cap",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    desc: "Benchmark against NIFTY MIDCAP 150 TRI",
  },
  {
    value: "Equity: Small Cap",
    label: "Small Cap (Nifty Smallcap 250)",
    badge: "Small Cap",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    desc: "Benchmark against NIFTY SMALLCAP 250 TRI",
  },
  {
    value: "Debt",
    label: "Debt (Fixed Income)",
    badge: "Debt",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    desc: "Benchmark against Fixed Income Index",
  },
  {
    value: "Mutual Fund",
    label: "Other / Mutual Fund",
    badge: "General MF",
    badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    desc: "Standard Mutual Fund Benchmark",
  },
] as const;

const isStockScheme = (scheme: ZerodhaScheme) => {
  if (scheme.category.toLowerCase().includes("stock")) return true;
  if (
    scheme.schemeCodeApi &&
    (scheme.schemeCodeApi.includes(".") || isNaN(Number(scheme.schemeCodeApi)))
  )
    return true;
  return !scheme.name.includes(" ");
};

export default function ZerodhaMappingTab({
  allSchemes,
}: ZerodhaMappingTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read initial states from URL query parameters
  const initialSearch = searchParams.get("q") || "";
  const initialStatus =
    (searchParams.get("status") as MappingStatusFilter) || "all";
  const initialType =
    (searchParams.get("type") as ZerodhaMappingAssetTypeFilter) || "all";
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

  // ── Local Search & Filter State
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [mappingFilter, setMappingFilter] =
    useState<MappingStatusFilter>(initialStatus);
  const [assetTypeFilter, setAssetTypeFilter] =
    useState<ZerodhaMappingAssetTypeFilter>(initialType);
  const [categoryFilters, setCategoryFilters] =
    useState<HoldingsCategoryFilters>(initialCategoryFilters);
  const [sortField, setSortField] = useState<MappingSortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialOrder);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Manual Modal State
  const [mappingSchemeId, setMappingSchemeId] = useState<number | null>(null);
  const [mappingSchemeName, setMappingSchemeName] = useState("");
  const [modalSearchMode, setModalSearchMode] = useState<"stock" | "mf">(
    "stock"
  );

  // Stock search state
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockSearchResults, setStockSearchResults] = useState<
    StockSearchResult[]
  >([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);

  // MF search state
  const [apiSearchQuery, setApiSearchQuery] = useState("");
  const [apiSearchResults, setApiSearchResults] = useState<MfSearchResult[]>(
    []
  );
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // Custom ticker entry state
  const [customTickerInput, setCustomTickerInput] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Equity: Large Cap");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isApplyingCategory, setIsApplyingCategory] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Dynamic Category Options from schemes
  const categoryOptions = useMemo(
    () => getCategoryOptions(allSchemes.map((s) => s.category)),
    [allSchemes]
  );

  // Synchronize state when URL query params change
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchVal(q);
    setMappingFilter(
      (searchParams.get("status") as MappingStatusFilter) || "all"
    );
    setAssetTypeFilter(
      (searchParams.get("type") as ZerodhaMappingAssetTypeFilter) || "all"
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

  const handleStatusFilterChange = (status: MappingStatusFilter) => {
    setMappingFilter(status);
    updateUrl({ status });
  };

  const handleTypeFilterChange = (type: ZerodhaMappingAssetTypeFilter) => {
    setAssetTypeFilter(type);
    updateUrl({ type });
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
    setAssetTypeFilter("all");
    setCategoryFilters([]);
    setSortField("name");
    setSortOrder("asc");
    updateUrl({
      q: null,
      status: null,
      type: null,
      category: null,
      sort: null,
      order: null,
    });
  };

  // ── Search Handlers
  const handleStockSearch = async (query: string) => {
    setStockSearchQuery(query);
    if (query.trim().length < 2) {
      setStockSearchResults([]);
      return;
    }
    setIsSearchingStock(true);
    try {
      const res = await searchStockApiAction(query.trim());
      setStockSearchResults(res.data || []);
    } catch (e) {
      console.error(e);
      setStockSearchResults([]);
    } finally {
      setIsSearchingStock(false);
    }
  };

  const handleApiSearch = async (query: string) => {
    setApiSearchQuery(query);
    if (query.trim().length < 3) {
      setApiSearchResults([]);
      return;
    }
    setIsSearchingApi(true);
    try {
      const results = await searchMfApiAction(query.trim());
      setApiSearchResults(results.data || []);
    } catch (e) {
      console.error(e);
      setApiSearchResults([]);
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleMapScheme = async (schemeId: number, code: string | null) => {
    startTransition(async () => {
      const res = await updateZerodhaSchemeMappingAction(schemeId, code);
      if (res.success) {
        toast.success(
          code ? `Mapped scheme to code ${code}` : "Scheme unmapped"
        );
        setMappingSchemeId(null);
        setApiSearchQuery("");
        setApiSearchResults([]);
        setStockSearchQuery("");
        setStockSearchResults([]);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update mapping");
      }
    });
  };

  const handleApplyCategory = async () => {
    if (!mappingSchemeId) return;
    setIsApplyingCategory(true);
    try {
      const res = await updateZerodhaSchemeCategoryAction(
        mappingSchemeId,
        selectedCategory
      );
      if (res.success) {
        toast.success(`Classification updated to ${selectedCategory}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update category");
      }
    } catch {
      toast.error("Failed to update category");
    } finally {
      setIsApplyingCategory(false);
    }
  };

  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const handleAutoMapAll = async () => {
    setIsAutoMapping(true);
    try {
      const results = await autoMapAllZerodhaSchemesAction(true);
      const newlyMapped = results.filter(
        (r) => r.status === "mapped" || r.status === "low_confidence"
      ).length;
      if (newlyMapped > 0) {
        toast.success(`Auto-matched and mapped ${newlyMapped} scheme(s)!`);
      } else {
        toast.error("No unmapped schemes could be automatically matched.");
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Auto-mapping failed");
    } finally {
      setIsAutoMapping(false);
    }
  };

  // Open modal pre-configured for stock or MF
  const handleOpenMappingModal = (scheme: ZerodhaScheme) => {
    const isStock = isStockScheme(scheme);
    setMappingSchemeId(scheme.id);
    setMappingSchemeName(scheme.name);
    setSelectedCategory(
      scheme.category || (isStock ? "Equity: Large Cap" : "Mutual Fund")
    );
    setCustomTickerInput(scheme.schemeCodeApi || "");
    setIsCategoryDropdownOpen(false);

    if (isStock) {
      setModalSearchMode("stock");
      const cleanStockSymbol = scheme.name.split(/[- ]/)[0].trim();
      setStockSearchQuery(cleanStockSymbol);
      handleStockSearch(cleanStockSymbol);
      setApiSearchQuery("");
      setApiSearchResults([]);
    } else {
      setModalSearchMode("mf");
      const cleanMfName = scheme.name
        .replace(/Reg(?:ular)?/gi, "")
        .replace(/\(G\)/g, "")
        .trim()
        .slice(0, 30);
      setApiSearchQuery(cleanMfName);
      handleApiSearch(cleanMfName);
      setStockSearchQuery("");
      setStockSearchResults([]);
    }
  };

  // Filter and Sort schemes list
  const filteredSchemes = useMemo(() => {
    const query = searchVal.trim().toLowerCase();
    return allSchemes
      .filter((scheme) => {
        // Status filter
        if (mappingFilter === "mapped" && !scheme.schemeCodeApi) return false;
        if (mappingFilter === "unmapped" && scheme.schemeCodeApi) return false;

        // Asset Type filter
        const isStock = isStockScheme(scheme);
        if (assetTypeFilter === "mf" && isStock) return false;
        if (assetTypeFilter === "stocks" && !isStock) return false;

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
          if (!matchName && !matchCat && !matchCode) return false;
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
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [
    allSchemes,
    searchVal,
    mappingFilter,
    assetTypeFilter,
    categoryFilters,
    sortField,
    sortOrder,
  ]);

  // Split into Stocks and Mutual Funds
  const filteredStocks = useMemo(
    () => filteredSchemes.filter((s) => isStockScheme(s)),
    [filteredSchemes]
  );
  const filteredFunds = useMemo(
    () => filteredSchemes.filter((s) => !isStockScheme(s)),
    [filteredSchemes]
  );

  const allStocks = useMemo(
    () => allSchemes.filter((s) => isStockScheme(s)),
    [allSchemes]
  );
  const allFunds = useMemo(
    () => allSchemes.filter((s) => !isStockScheme(s)),
    [allSchemes]
  );

  const mappedStocksCount = allStocks.filter((s) => !!s.schemeCodeApi).length;
  const unmappedStocksCount = allStocks.filter((s) => !s.schemeCodeApi).length;

  const mappedFundsCount = allFunds.filter((s) => !!s.schemeCodeApi).length;
  const unmappedFundsCount = allFunds.filter((s) => !s.schemeCodeApi).length;

  const totalUnmappedCount = unmappedStocksCount + unmappedFundsCount;
  const totalMappedCount = mappedStocksCount + mappedFundsCount;

  const activeFilterCount =
    (mappingFilter !== "all" ? 1 : 0) +
    (assetTypeFilter !== "all" ? 1 : 0) +
    categoryFilters.length +
    (sortField !== "name" || sortOrder !== "asc" ? 1 : 0);

  const activeScheme = mappingSchemeId
    ? allSchemes.find((s) => s.id === mappingSchemeId)
    : null;

  const selectedClassificationObj = useMemo(
    () =>
      BENCHMARK_CLASSIFICATIONS.find((c) => c.value === selectedCategory) ||
      BENCHMARK_CLASSIFICATIONS[0],
    [selectedCategory]
  );

  return (
    <motion.div
      key="zerodha-mapping"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* ── FILTER MODAL / DRAWER ── */}
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
                    Zerodha Mapping Tab Filters
                  </h2>
                </div>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs cursor-pointer"
                  aria-label="Close filters"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
                {/* Mapping Status */}
                <SingleSelectFilter
                  label="Mapping Status"
                  value={mappingFilter}
                  onChange={(val) =>
                    handleStatusFilterChange(val as MappingStatusFilter)
                  }
                  options={[
                    { id: "mapped", label: `Mapped (${totalMappedCount})` },
                    {
                      id: "unmapped",
                      label: `Unmapped (${totalUnmappedCount})`,
                    },
                  ]}
                  allLabel={`All Schemes (${allSchemes.length})`}
                  allId="all"
                />

                <FilterSectionDivider />

                {/* Asset Type */}
                <SingleSelectFilter
                  label="Asset Type"
                  value={assetTypeFilter}
                  onChange={(val) =>
                    handleTypeFilterChange(val as ZerodhaMappingAssetTypeFilter)
                  }
                  options={[
                    {
                      id: "stocks",
                      label: `Stocks / Equity (${allStocks.length})`,
                    },
                    { id: "mf", label: `Mutual Funds (${allFunds.length})` },
                  ]}
                  allLabel={`All Assets (${allSchemes.length})`}
                  allId="all"
                />

                <FilterSectionDivider />

                {/* Category */}
                <MultiSelectFilter
                  label="Fund Category"
                  values={categoryFilters}
                  onChange={setCategoryFilters}
                  options={categoryOptions}
                  allLabel="All Categories"
                  onClear={handleCategoryClear}
                />

                <div className="h-px bg-slate-800/60" />

                {/* Sort Options */}
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>Sort By</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(
                      [
                        { id: "name", label: "Scheme Name" },
                        { id: "category", label: "Category" },
                        { id: "status", label: "Mapping Status" },
                        { id: "code", label: "Scheme Code" },
                      ] as const
                    ).map((field) => (
                      <button
                        key={field.id}
                        onClick={() => handleSortChange(field.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          sortField === field.id
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/50"
                            : "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        <span>{field.label}</span>
                        {sortField === field.id && (
                          <span className="text-[10px] text-teal-400 uppercase font-bold">
                            {sortOrder}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {(["asc", "desc"] as const).map((order) => (
                      <button
                        key={order}
                        onClick={() => {
                          setSortOrder(order);
                          updateUrl({ order });
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          sortOrder === order
                            ? "bg-slate-800 text-teal-300 border-teal-500/40"
                            : "bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-300"
                        }`}
                      >
                        {order === "asc"
                          ? "Ascending (A-Z)"
                          : "Descending (Z-A)"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All
                </button>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                  Show {filteredSchemes.length} result
                  {filteredSchemes.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── HEADER PANEL ── */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h3 className="text-xl font-bold text-slate-100">
              Zerodha Scheme Mappings
            </h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
              Link each personal equity stock or mutual fund to its{" "}
              <span className="text-teal-400">Yahoo Finance ticker</span> (e.g.{" "}
              <code className="text-slate-300">ADANIGREEN.NS</code>) or{" "}
              <span className="text-teal-400">api.mfapi.in</span> scheme code
              for live prices, XIRR, and Alpha benchmarks.
            </p>
          </div>

          <button
            onClick={handleAutoMapAll}
            disabled={isAutoMapping || totalUnmappedCount === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition duration-200 shrink-0 text-xs self-start sm:self-center cursor-pointer"
          >
            {isAutoMapping ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Auto-matching…
              </>
            ) : (
              <>
                <Zap size={15} /> Auto-Fetch Codes ({totalUnmappedCount}{" "}
                unmapped)
              </>
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={13} /> {totalMappedCount} Mapped
          </div>
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-400">
            <AlertTriangle size={13} /> {totalUnmappedCount} Unmapped
          </div>
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-400">
            <TrendingUp size={13} /> {allStocks.length} Stocks
          </div>
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-400">
            <Target size={13} /> {allFunds.length} Mutual Funds
          </div>
        </div>
      </div>

      {/* ── SEARCH + FILTERS TOOLBAR CARD ── */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
        {/* Toolbar row */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <SearchFilterBar
            value={searchVal}
            onChange={setSearchVal}
            placeholder="Search stock symbol, fund name, category, or code…"
            className="flex-1"
          />

          {/* Filters button */}
          <button
            onClick={() => setFilterPanelOpen(true)}
            className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeFilterCount > 0
                ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
                : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {(() => {
          const chips: ReactNode[] = [];
          if (mappingFilter !== "all")
            chips.push(
              <span
                key="status"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
              >
                🔖 {mappingFilter === "mapped" ? "Mapped" : "Unmapped"}
                <button
                  onClick={() => handleStatusFilterChange("all")}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Remove status filter"
                >
                  ✕
                </button>
              </span>
            );
          if (assetTypeFilter !== "all")
            chips.push(
              <span
                key="type"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
              >
                📦 {assetTypeFilter === "mf" ? "Mutual Funds" : "Stocks"}
                <button
                  onClick={() => handleTypeFilterChange("all")}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Remove type filter"
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
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label={`Remove ${cat} filter`}
                >
                  ✕
                </button>
              </span>
            )
          );
          if (sortField !== "name" || sortOrder !== "asc") {
            const sortLabelMap: Record<MappingSortField, string> = {
              name: "Name",
              category: "Category",
              status: "Status",
              code: "Code",
            };
            chips.push(
              <span
                key="sort"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
              >
                ↕ Sort: {sortLabelMap[sortField]} ({sortOrder.toUpperCase()})
                <button
                  onClick={() => {
                    setSortField("name");
                    setSortOrder("asc");
                    updateUrl({ sort: null, order: null });
                  }}
                  className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                  aria-label="Reset sort"
                >
                  ✕
                </button>
              </span>
            );
          }

          if (chips.length === 0 && !searchVal) return null;

          return (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/40">
              <span className="text-[10px] text-slate-500 font-medium mr-1">
                Active:
              </span>
              {chips}
              <button
                onClick={handleClearAll}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition underline underline-offset-2 ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          );
        })()}
      </div>

      {/* ── SECTION 1: EQUITY STOCKS & ETFS ── */}
      {(assetTypeFilter === "all" || assetTypeFilter === "stocks") && (
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-base">
                  Equity Stocks & ETFs
                </h4>
                <p className="text-xs text-slate-500">
                  Mapped to Yahoo Finance tickers (.NS / .BO) for live NSE/BSE
                  quotes & historical charts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-semibold">
                {mappedStocksCount} Mapped
              </span>
              {unmappedStocksCount > 0 && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg font-semibold">
                  {unmappedStocksCount} Unmapped
                </span>
              )}
              <span className="text-slate-500 font-medium">
                ({filteredStocks.length} of {allStocks.length})
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredStocks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800/80 rounded-xl text-slate-500 text-xs">
                No equity stocks match current search or filter.
              </div>
            ) : (
              filteredStocks.map((scheme) => (
                <div
                  key={scheme.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl gap-3 hover:border-slate-700/80 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-100 text-sm tracking-tight flex items-center gap-2">
                      <span>{scheme.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[11px] text-slate-400 font-medium border border-slate-700/50">
                        {scheme.category || "Equity Stock"}
                      </span>
                      {scheme.schemeCodeApi ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          <ShieldCheck size={12} />
                          Ticker: <span>{scheme.schemeCodeApi}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          <AlertTriangle size={12} /> Ticker not assigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {scheme.schemeCodeApi && (
                      <button
                        onClick={() => handleMapScheme(scheme.id, null)}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 border border-red-800/40 bg-red-950/20 hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenMappingModal(scheme)}
                      className="text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 font-bold px-4 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-teal-500/20"
                    >
                      <LinkIcon size={12} />
                      {scheme.schemeCodeApi ? "Remap Ticker" : "Assign Ticker"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 2: MUTUAL FUNDS ── */}
      {(assetTypeFilter === "all" || assetTypeFilter === "mf") && (
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-base">
                  Mutual Funds
                </h4>
                <p className="text-xs text-slate-500">
                  Mapped to AMFI Scheme Codes for daily NAV history & benchmark
                  calculations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-semibold">
                {mappedFundsCount} Mapped
              </span>
              {unmappedFundsCount > 0 && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg font-semibold">
                  {unmappedFundsCount} Unmapped
                </span>
              )}
              <span className="text-slate-500 font-medium">
                ({filteredFunds.length} of {allFunds.length})
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredFunds.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800/80 rounded-xl text-slate-500 text-xs">
                No mutual funds match current search or filter.
              </div>
            ) : (
              filteredFunds.map((scheme) => (
                <div
                  key={scheme.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl gap-3 hover:border-slate-700/80 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-100 text-sm tracking-tight flex items-center gap-2">
                      <span>{scheme.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[11px] text-slate-400 font-medium border border-slate-700/50">
                        {scheme.category || "Mutual Fund"}
                      </span>
                      {scheme.schemeCodeApi ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          <ShieldCheck size={12} />
                          AMFI Code: <span>{scheme.schemeCodeApi}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          <AlertTriangle size={12} /> Not mapped
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {scheme.schemeCodeApi && (
                      <button
                        onClick={() => handleMapScheme(scheme.id, null)}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 border border-red-800/40 bg-red-950/20 hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenMappingModal(scheme)}
                      className="text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 font-bold px-4 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-teal-500/20"
                    >
                      <LinkIcon size={12} />
                      {scheme.schemeCodeApi ? "Remap Fund" : "Map Fund"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── POLISHED MANUAL SEARCH / MAP MODAL ── */}
      <AnimatePresence>
        {mappingSchemeId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-slate-800/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800/80 bg-slate-950/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-100 text-sm tracking-tight">
                      Map Scheme & Benchmark
                    </h3>
                    <p className="text-[11px] text-teal-300/80 font-medium truncate max-w-sm mt-0.5">
                      {mappingSchemeName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMappingSchemeId(null);
                    setApiSearchQuery("");
                    setApiSearchResults([]);
                    setStockSearchQuery("");
                    setStockSearchResults([]);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Mode Toggle Switcher */}
              <div className="px-6 pt-4 pb-1 border-b border-slate-800/50 bg-slate-950/30">
                <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800/80 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearchMode("stock");
                      if (!stockSearchQuery && mappingSchemeName) {
                        const q = mappingSchemeName.split(/[- ]/)[0].trim();
                        setStockSearchQuery(q);
                        handleStockSearch(q);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      modalSearchMode === "stock"
                        ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <TrendingUp size={13} />
                    <span>Stock / Ticker (NSE/BSE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearchMode("mf");
                      if (!apiSearchQuery && mappingSchemeName) {
                        const q = mappingSchemeName
                          .replace(/Reg(?:ular)?/gi, "")
                          .replace(/\(G\)/g, "")
                          .trim()
                          .slice(0, 30);
                        setApiSearchQuery(q);
                        handleApiSearch(q);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      modalSearchMode === "mf"
                        ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <Target size={13} />
                    <span>Mutual Fund (AMFI)</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* ── STOCK SEARCH VIEW ── */}
                {modalSearchMode === "stock" && (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp size={11} className="text-teal-400" />
                        <span>Search Stock Tickers (NSE & BSE)</span>
                      </label>

                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                        />
                        <input
                          type="text"
                          placeholder="Search stock symbol or name (e.g. ADANIGREEN, RELIANCE, TCS)..."
                          value={stockSearchQuery}
                          onChange={(e) => handleStockSearch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800/80 focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition"
                          autoFocus
                        />
                        {isSearchingStock ? (
                          <Loader2
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 animate-spin"
                            size={14}
                          />
                        ) : stockSearchQuery ? (
                          <button
                            onClick={() => {
                              setStockSearchQuery("");
                              setStockSearchResults([]);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px] transition cursor-pointer"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>

                      {/* Stock Search Results Panel */}
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-850/60 shadow-inner">
                        {isSearchingStock ? (
                          <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                            <Loader2
                              size={14}
                              className="animate-spin text-teal-400"
                            />
                            Searching Yahoo Finance stock symbols…
                          </div>
                        ) : stockSearchResults.length > 0 ? (
                          stockSearchResults.map((res) => {
                            const isIndian =
                              res.symbol.endsWith(".NS") ||
                              res.symbol.endsWith(".BO") ||
                              res.exchange.includes("NSE") ||
                              res.exchange.includes("BSE") ||
                              res.exchange.includes("Bombay");

                            return (
                              <div
                                key={res.symbol}
                                onClick={() =>
                                  handleMapScheme(mappingSchemeId, res.symbol)
                                }
                                className="flex items-center justify-between p-3 hover:bg-slate-900/90 cursor-pointer transition text-xs group"
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <div className="font-bold text-slate-200 group-hover:text-teal-300 transition truncate flex items-center gap-1.5">
                                    <span>{res.name}</span>
                                    {isIndian && (
                                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                                        India
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Building2 size={10} />
                                      {res.exchange}
                                    </span>
                                    {res.industry && (
                                      <span>• {res.industry}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg group-hover:bg-teal-500/20 group-hover:border-teal-500/40 transition">
                                    {res.symbol}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-7 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                            <span>
                              {stockSearchQuery.trim().length < 2
                                ? "Type stock symbol to search NSE/BSE tickers…"
                                : "No ticker matches found on Yahoo Finance."}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manual Ticker Entry with Quick Helper Pills */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Tag size={11} className="text-teal-400" />
                          <span>Manual Ticker Entry</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const base = customTickerInput
                                .replace(/\.(NS|BO)/gi, "")
                                .trim();
                              setCustomTickerInput(`${base}.NS`);
                            }}
                            className="text-[10px] font-bold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded transition cursor-pointer"
                          >
                            + .NS (NSE)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const base = customTickerInput
                                .replace(/\.(NS|BO)/gi, "")
                                .trim();
                              setCustomTickerInput(`${base}.BO`);
                            }}
                            className="text-[10px] font-bold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded transition cursor-pointer"
                          >
                            + .BO (BSE)
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="E.G. ADANIGREEN.NS, 541450.BO"
                          value={customTickerInput}
                          onChange={(e) =>
                            setCustomTickerInput(e.target.value.toUpperCase())
                          }
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none transition uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customTickerInput.trim()) {
                              handleMapScheme(
                                mappingSchemeId,
                                customTickerInput.trim().toUpperCase()
                              );
                            }
                          }}
                          disabled={!customTickerInput.trim() || isPending}
                          className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shrink-0 shadow-md shadow-teal-500/20"
                        >
                          Apply Ticker
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── MUTUAL FUND SEARCH VIEW ── */}
                {modalSearchMode === "mf" && (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Search size={11} className="text-teal-400" />
                        <span>Search Mutual Fund (api.mfapi.in)</span>
                      </label>

                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                        />
                        <input
                          type="text"
                          placeholder="Search AMFI API (e.g. Parag Parikh Flexi)..."
                          value={apiSearchQuery}
                          onChange={(e) => handleApiSearch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800/80 focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition"
                          autoFocus
                        />
                        {isSearchingApi ? (
                          <Loader2
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 animate-spin"
                            size={14}
                          />
                        ) : apiSearchQuery ? (
                          <button
                            onClick={() => {
                              setApiSearchQuery("");
                              setApiSearchResults([]);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px] transition cursor-pointer"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>

                      {/* AMFI Search Results Panel */}
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-850/60 shadow-inner">
                        {isSearchingApi ? (
                          <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                            <Loader2
                              size={14}
                              className="animate-spin text-teal-400"
                            />
                            Searching AMFI database…
                          </div>
                        ) : apiSearchResults.length > 0 ? (
                          apiSearchResults.map((res: MfSearchResult) => (
                            <div
                              key={res.schemeCode}
                              onClick={() =>
                                handleMapScheme(
                                  mappingSchemeId,
                                  String(res.schemeCode)
                                )
                              }
                              className="flex items-center justify-between p-3 hover:bg-slate-900/90 cursor-pointer transition text-xs group"
                            >
                              <div className="font-semibold text-slate-300 group-hover:text-teal-200 flex-1 pr-3 leading-normal transition">
                                {res.schemeName}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md shrink-0 group-hover:bg-teal-500/20 transition">
                                <Hash size={10} />
                                {res.schemeCode}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-7 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                            <span>
                              {apiSearchQuery.trim().length < 3
                                ? "Type at least 3 characters to search AMFI funds…"
                                : "No matches found on api.mfapi.in"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manual AMFI Code Entry */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Tag size={11} className="text-teal-400" />
                        <span>Manual AMFI Code Entry</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter 6-digit AMFI Code (e.g. 118955)"
                          value={customTickerInput}
                          onChange={(e) =>
                            setCustomTickerInput(e.target.value.trim())
                          }
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customTickerInput.trim()) {
                              handleMapScheme(
                                mappingSchemeId,
                                customTickerInput.trim()
                              );
                            }
                          }}
                          disabled={!customTickerInput.trim() || isPending}
                          className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shrink-0 shadow-md shadow-teal-500/20"
                        >
                          Apply Code
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BENCHMARK CLASSIFICATION DROPDOWN (COMMON) ── */}
                <div
                  ref={dropdownRef}
                  className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2.5 relative"
                >
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={11} className="text-teal-400" />
                    <span>Benchmark Classification</span>
                  </label>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Determines which index (NIFTY 50, Midcap 150, Smallcap 250,
                    or Crisil Debt) is used for Alpha and Outperformance
                    metrics.
                  </p>

                  <div className="flex items-center gap-2">
                    {/* Custom Dropdown Trigger */}
                    <div className="relative flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                        }
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-teal-500/50 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between text-slate-200 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border ${selectedClassificationObj.badgeColor}`}
                          >
                            {selectedClassificationObj.badge}
                          </span>
                          <span className="font-semibold text-slate-100 truncate">
                            {selectedClassificationObj.label}
                          </span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                            isCategoryDropdownOpen
                              ? "rotate-180 text-teal-400"
                              : ""
                          }`}
                        />
                      </button>

                      {/* Custom Dropdown Menu Popover */}
                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 shadow-2xl space-y-1 backdrop-blur-xl"
                          >
                            {BENCHMARK_CLASSIFICATIONS.map((opt) => {
                              const isSelected = selectedCategory === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(opt.value);
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                                    isSelected
                                      ? "bg-teal-500/15 text-teal-200 border border-teal-500/30"
                                      : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${opt.badgeColor}`}
                                    >
                                      {opt.badge}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-slate-100">
                                        {opt.label}
                                      </div>
                                      <div className="text-[10px] text-slate-500 truncate">
                                        {opt.desc}
                                      </div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check
                                      size={14}
                                      className="text-teal-400 shrink-0 ml-2"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Apply Classification Button */}
                    <button
                      type="button"
                      onClick={handleApplyCategory}
                      disabled={isApplyingCategory}
                      className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shrink-0 shadow-md shadow-teal-500/20 flex items-center gap-1.5"
                    >
                      {isApplyingCategory ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      <span>Apply Class</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/80 flex justify-between items-center">
                {activeScheme?.schemeCodeApi ? (
                  <button
                    onClick={() => handleMapScheme(mappingSchemeId, null)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Unmap Scheme
                  </button>
                ) : (
                  <div />
                )}

                <button
                  onClick={() => {
                    setMappingSchemeId(null);
                    setApiSearchQuery("");
                    setApiSearchResults([]);
                    setStockSearchQuery("");
                    setStockSearchResults([]);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
