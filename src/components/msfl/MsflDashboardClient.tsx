"use client";

import {
  useState,
  useTransition,
  useEffect,
  useDeferredValue,
  useMemo,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";
import { toast } from "react-hot-toast";

import MsflHeaderUploadBanner from "@/components/msfl/MsflHeaderUploadBanner";
import MsflHeroCards from "@/components/msfl/MsflHeroCards";
import MsflBenchmarkAndSummaryCards from "@/components/msfl/MsflBenchmarkAndSummaryCards";
import OverviewAthCorrectionCards from "@/components/mutual-fund/overview/OverviewAthCorrectionCards";
import MsflPortfolioTimeSeriesChart from "@/components/msfl/MsflPortfolioTimeSeriesChart";
import MsflSectorAndCapAnalysis from "@/components/msfl/MsflSectorAndCapAnalysis";
import MsflLeaderboardCard from "@/components/msfl/MsflLeaderboardCard";
import MsflHoldingsSection from "@/components/msfl/MsflHoldingsSection";
import MsflUploadedFilesCard from "@/components/msfl/MsflUploadedFilesCard";
import MsflMappingModal from "@/components/msfl/modal/MsflMappingModal";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

import { useTableSort } from "@/helpers/useTableSort";
import { formatLocalDateStr } from "@/helpers/formatters";
import {
  matchesSearchTokens,
  getSearchTokens,
  scoreItem,
  PORTFOLIO_SEARCH_WEIGHTS,
} from "@/helpers/search";
import {
  uploadMsflHoldingsAction,
  deleteMsflHoldingsAction,
  updateMsflSchemeMappingAction,
} from "@/actions/msfl";
import { searchStockApiAction } from "@/actions/zerodha";

import type {
  MsflHoldingData,
  MsflDashboardClientProps,
  MsflScheme,
  MsflSortField,
  MsflReportItem,
} from "@/types/msfl";
import type { StockSearchResult } from "@/types/zerodha";
import type { SearchScoreMap } from "@/types/filters";

export default function MsflDashboardClient({
  msflData,
  allMsflSchemes,
}: MsflDashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<MsflReportItem | null>(
    null
  );

  const initialQ = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQ);

  // Sorting state for MSFL Stock Holdings with URL synchronization
  const { sortField, sortOrder, toggleSort, renderSortIcon } =
    useTableSort<MsflSortField>({
      defaultField: "currentValue",
      defaultOrder: "desc",
    });

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (currentQ !== searchQuery) {
        updateUrl({ q: searchQuery });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Mapping modal states
  const [editingScheme, setEditingScheme] = useState<MsflScheme | null>(null);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [stockSearchResults, setStockSearchResults] = useState<
    StockSearchResult[]
  >([]);
  const [customTickerInput, setCustomTickerInput] = useState("");

  const {
    reportsList,
    selectedReport,
    holdings,
    totals,
    insights,
    metricDeltas,
  } = msflData;

  const benchmark = insights.benchmarkReturns.cagr3Y ?? 12;
  const benchmarkLabel =
    insights.benchmarkReturns.cagr3Y === null
      ? "Fallback Nifty 12.00%"
      : `Nifty 3Y CAGR ${benchmark.toFixed(2)}%`;

  const mfCagrDelta =
    insights.weightedCagr !== null ? insights.weightedCagr - benchmark : null;

  // Beating vs Lagging
  const cagrHoldings = holdings
    .filter(
      (h): h is typeof h & { cagr: number } =>
        typeof h.cagr === "number" && h.currentValue > 0
    )
    .sort((a, b) => b.cagr - a.cagr);

  const beatingFunds = cagrHoldings
    .filter((h) => h.cagr >= benchmark)
    .sort((a, b) => b.cagr - a.cagr);
  const laggingFunds = cagrHoldings
    .filter((h) => h.cagr < benchmark)
    .sort((a, b) => a.cagr - b.cagr);

  const topPerformer = cagrHoldings.length > 0 ? cagrHoldings[0] : null;

  // File Upload Dropzone Handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadMsflHoldingsAction(formData);
      if (res.success && res.data?.reportId) {
        toast.success("MSFL Holdings sheet uploaded successfully!");
        router.refresh();
        // Sync selectedReportId in URL
        const params = new URLSearchParams(window.location.search);
        params.set("msflReportId", String(res.data.reportId));
        router.push(`${window.location.pathname}?${params.toString()}`);
      } else {
        toast.error(res.error || "Failed to upload report");
      }
    });
  };

  // Delete Snapshot Handler
  const handleConfirmDeleteSnapshot = async () => {
    const target = reportToDelete || selectedReport;
    if (!target) return;

    startTransition(async () => {
      const res = await deleteMsflHoldingsAction(target.id);
      setIsDeleteModalOpen(false);
      setReportToDelete(null);
      if (res.success) {
        toast.success("MSFL report snapshot deleted successfully");
        router.refresh();
        const params = new URLSearchParams(window.location.search);
        if (selectedReport?.id === target.id) {
          params.delete("msflReportId");
        }
        router.push(`${window.location.pathname}?${params.toString()}`);
      } else {
        toast.error(res.error || "Failed to delete snapshot");
      }
    });
  };

  // ── Search Handlers (Stock Tickers)
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

  // Mapping Edit Trigger
  const handleEditMapping = (h: MsflHoldingData): void => {
    const scheme = allMsflSchemes.find((s) => s.name === h.symbol) || {
      id: 0,
      name: h.symbol,
      category: "Stock",
      schemeCodeApi: `${h.symbol}.NS`,
      mappedAt: null,
    };
    setEditingScheme(scheme);
    setCustomTickerInput(scheme.schemeCodeApi || `${h.symbol}.NS`);
    setStockSearchQuery(h.symbol);
    setStockSearchResults([]);
    handleStockSearch(h.symbol);
  };

  // Save / Apply Mapping
  const handleMapScheme = async (code: string | null) => {
    if (!editingScheme) return;
    startTransition(async () => {
      const res = await updateMsflSchemeMappingAction(
        editingScheme.id,
        code ? code.trim() : null
      );
      if (res.success) {
        toast.success(
          code ? `Mapped ${editingScheme.name} to ${code}` : "Mapping cleared"
        );
        setEditingScheme(null);
        setStockSearchQuery("");
        setStockSearchResults([]);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update mapping");
      }
    });
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filter holdings by search query and sort
  const filteredHoldings = useMemo(() => {
    const tokens = getSearchTokens(deferredSearchQuery);
    const isSearching = tokens.length > 0;

    const matched = holdings.filter((h) => {
      return (
        tokens.length === 0 ||
        matchesSearchTokens(tokens, [h.symbol, h.sector, h.marketCapCategory])
      );
    });

    const scoreMap: SearchScoreMap = new Map();
    if (isSearching) {
      for (const h of matched) {
        const res = scoreItem(tokens, [
          { text: h.symbol, weight: PORTFOLIO_SEARCH_WEIGHTS.SYMBOL },
          { text: h.sector, weight: PORTFOLIO_SEARCH_WEIGHTS.CATEGORY },
          { text: h.marketCapCategory, weight: PORTFOLIO_SEARCH_WEIGHTS.OTHER },
        ]);
        scoreMap.set(h.id, res);
      }
    }

    return [...matched].sort((a, b) => {
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

      const valA = a[sortField] ?? (sortOrder === "asc" ? Infinity : -Infinity);
      const valB = b[sortField] ?? (sortOrder === "asc" ? Infinity : -Infinity);

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return sortOrder === "asc" ? numA - numB : numB - numA;
    });
  }, [holdings, deferredSearchQuery, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Upload and snapshot control panel */}
      <MsflHeaderUploadBanner isPending={isPending} onUpload={handleUpload} />

      {reportsList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 py-16 px-6 text-center">
          <BriefcaseBusiness
            size={40}
            className="text-slate-600 mx-auto mb-4 stroke-[1.5]"
          />
          <h3 className="text-base font-bold text-slate-300">
            No MSFL Snapshots Found
          </h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Upload your MSFL Connect stock holding report (.xlsx) to analyze
            stock metrics, benchmark returns, and see CAGR leaderboard details.
          </p>
        </div>
      ) : (
        <>
          {/* MSFL Hero metric cards */}
          <MsflHeroCards
            totals={totals}
            insights={insights}
            metricDeltas={metricDeltas}
            mfCagrDelta={mfCagrDelta}
            benchmarkLabel={benchmarkLabel}
          />

          {/* Balanced 2-Column Section for Benchmark comparison + Portfolio Stats */}
          <MsflBenchmarkAndSummaryCards
            totals={totals}
            metricDeltas={metricDeltas}
            holdingsCount={holdings.length}
            topPerformer={topPerformer}
          />

          {/* All-Time High (ATH) & Correction Tracker */}
          {msflData.athData && (
            <OverviewAthCorrectionCards
              athData={msflData.athData}
              reportIdParam=""
            />
          )}

          {/* Portfolio Time Series Growth Chart */}
          <MsflPortfolioTimeSeriesChart
            timeSeries={msflData.portfolioTimeSeries}
            currentValuation={totals.currentValue}
            totalInvested={totals.invested}
          />

          {/* Sector Allocation & Market Cap Risk Analysis */}
          <MsflSectorAndCapAnalysis
            sectorBreakdown={msflData.sectorBreakdown}
            marketCapBreakdown={msflData.marketCapBreakdown}
          />

          {/* CAGR Leaderboard Chart */}
          <MsflLeaderboardCard
            cagrHoldings={cagrHoldings}
            benchmark={benchmark}
          />

          {/* Holdings Table & Outperforming vs Underperforming breakdown */}
          <MsflHoldingsSection
            holdings={holdings}
            filteredHoldings={filteredHoldings}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortField={sortField}
            sortOrder={sortOrder}
            toggleSort={toggleSort}
            renderSortIcon={renderSortIcon}
            handleEditMapping={handleEditMapping}
            beatingFunds={beatingFunds}
            laggingFunds={laggingFunds}
          />
        </>
      )}

      {/* Uploaded XLSX Files Card */}
      <MsflUploadedFilesCard
        reportsList={reportsList}
        selectedReportId={selectedReport?.id}
        onDeleteReport={(report) => {
          setReportToDelete(report);
          setIsDeleteModalOpen(true);
        }}
      />

      {/* Manual Search / Map Modal */}
      <MsflMappingModal
        editingScheme={editingScheme}
        onClose={() => {
          setEditingScheme(null);
          setStockSearchQuery("");
          setStockSearchResults([]);
        }}
        stockSearchQuery={stockSearchQuery}
        onStockSearch={handleStockSearch}
        onClearStockSearch={() => {
          setStockSearchQuery("");
          setStockSearchResults([]);
        }}
        isSearchingStock={isSearchingStock}
        stockSearchResults={stockSearchResults}
        customTickerInput={customTickerInput}
        onCustomTickerChange={setCustomTickerInput}
        onMapScheme={handleMapScheme}
        isPending={isPending}
      />

      {/* Confirmation Modal for Deleting MSFL Snapshot */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setReportToDelete(null);
        }}
        onConfirm={handleConfirmDeleteSnapshot}
        title="Delete MSFL Snapshot?"
        description={`Are you sure you want to permanently delete the MSFL snapshot for ${
          reportToDelete || selectedReport
            ? formatLocalDateStr((reportToDelete || selectedReport)!.asOfDate)
            : "this report"
        }?`}
        warningNote="All stock holdings, valuations, and profit calculations for this MSFL snapshot will be permanently removed."
        confirmText="Delete Snapshot"
        cancelText="Cancel"
        variant="danger"
        isPending={isPending}
      />
    </div>
  );
}
