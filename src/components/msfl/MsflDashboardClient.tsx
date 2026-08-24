"use client";

import MsflLeaderboardChart from "@/components/msfl/MsflLeaderboardChart";
import MsflHeroCards from "@/components/msfl/MsflHeroCards";
import MsflBenchmarkAndSummaryCards from "@/components/msfl/MsflBenchmarkAndSummaryCards";
import OverviewAthCorrectionCards from "@/components/mutual-fund/overview/OverviewAthCorrectionCards";
import MsflHoldingsSection from "@/components/msfl/MsflHoldingsSection";
import MsflSectorAndCapAnalysis from "@/components/msfl/MsflSectorAndCapAnalysis";
import MsflPortfolioTimeSeriesChart from "@/components/msfl/MsflPortfolioTimeSeriesChart";
import { useState, useTransition, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  Trash,
  Loader2,
  BriefcaseBusiness,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Search,
  Building2,
  Tag,
} from "lucide-react";
import type {
  MsflHoldingData,
  MsflDashboardClientProps,
  MsflScheme,
  MsflSortField,
} from "@/types/msfl";
import type { StockSearchResult } from "@/types/zerodha";
import {
  uploadMsflHoldingsAction,
  deleteMsflHoldingsAction,
  updateMsflSchemeMappingAction,
} from "@/actions/msfl";
import { searchStockApiAction } from "@/actions/zerodha";
import { toast } from "react-hot-toast";

export default function MsflDashboardClient({
  msflData,
  allMsflSchemes,
}: MsflDashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialQ = searchParams.get("q") || "";
  const initialSort =
    (searchParams.get("sort") as MsflSortField) || "currentValue";
  const initialOrder = (searchParams.get("order") as "asc" | "desc") || "desc";

  const [searchQuery, setSearchQuery] = useState(initialQ);

  // Sorting state for MSFL Stock Holdings
  const [sortField, setSortField] = useState<MsflSortField>(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialOrder);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    const sField =
      (searchParams.get("sort") as MsflSortField) || "currentValue";
    setSortField(sField);
    const sOrder = (searchParams.get("order") as "asc" | "desc") || "desc";
    setSortOrder(sOrder);
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
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

  const toggleSort = (field: typeof sortField) => {
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

  // Snapshot Change Handler
  const handleSnapshotChange = (reportId: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("msflReportId", String(reportId));
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  // Delete Snapshot Handler
  const handleDeleteSnapshot = async () => {
    if (!selectedReport) return;
    if (!confirm("Are you sure you want to delete this MSFL report snapshot?"))
      return;

    startTransition(async () => {
      const res = await deleteMsflHoldingsAction(selectedReport.id);
      if (res.success) {
        router.refresh();
        const params = new URLSearchParams(window.location.search);
        params.delete("msflReportId");
        router.push(`${window.location.pathname}?${params.toString()}`);
      } else {
        alert(res.error || "Failed to delete snapshot");
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

  // Filter holdings by search query and sort
  const filteredHoldings = holdings
    .filter((h) => h.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let valA = a[sortField as keyof MsflHoldingData];
      let valB = b[sortField as keyof MsflHoldingData];

      // Handle null CAGR / metrics gracefully
      if (valA === null || valA === undefined) {
        valA = sortOrder === "asc" ? Infinity : -Infinity;
      }
      if (valB === null || valB === undefined) {
        valB = sortOrder === "asc" ? Infinity : -Infinity;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return sortOrder === "asc" ? numA - numB : numB - numA;
    });

  return (
    <div className="space-y-6">
      {/* Upload and snapshot control panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3.5 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-200">
              MSFL Connect Portfolio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Static stock investment portfolio snapshots
            </p>
          </div>
          {reportsList.length > 0 && selectedReport && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedReport.id}
                  onChange={(e) => handleSnapshotChange(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none pr-9 h-[38px] transition"
                >
                  {reportsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} (
                      {new Date(r.asOfDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      )
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <ChevronDown size={14} />
                </div>
              </div>
              <button
                onClick={handleDeleteSnapshot}
                className="p-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition cursor-pointer h-[38px] w-[38px] flex items-center justify-center"
                title="Delete Snapshot"
              >
                <Trash size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-black transition shadow-lg shadow-teal-500/10 cursor-pointer">
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            Upload Report (.xlsx)
            <input
              type="file"
              accept=".xlsx"
              onChange={handleUpload}
              disabled={isPending}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

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
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 size={15} className="text-teal-400" />
              MSFL Stock CAGR Leaderboard
            </h3>
            {cagrHoldings.length > 0 ? (
              <MsflLeaderboardChart
                mfHoldings={cagrHoldings.slice(0, 10)}
                niftyBenchmark={benchmark}
              />
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No MSFL stocks with CAGR history found in this snapshot.
              </div>
            )}
          </div>

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

      {/* ── POLISHED MANUAL SEARCH / MAP MODAL (Matching Zerodha Logic) ── */}
      {editingScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
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
                    {editingScheme.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingScheme(null);
                  setStockSearchQuery("");
                  setStockSearchResults([]);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* ── STOCK SEARCH VIEW ── */}
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
                      placeholder="Search stock symbol or name (e.g. ASHOKLEY, RELIANCE, TCS)..."
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
                            onClick={() => handleMapScheme(res.symbol)}
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
                                {res.industry && <span>• {res.industry}</span>}
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
                      placeholder="E.G. ASHOKLEY.NS, 539574.BO"
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
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-950/80">
              {editingScheme.schemeCodeApi ? (
                <button
                  type="button"
                  onClick={() => handleMapScheme(null)}
                  disabled={isPending}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash size={12} />
                  <span>Clear Mapping</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingScheme(null);
                  setStockSearchQuery("");
                  setStockSearchResults([]);
                }}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
