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
} from "lucide-react";
import type {
  MsflHoldingData,
  MsflDashboardClientProps,
  MsflScheme,
  MsflSortField,
} from "@/types/msfl";
import {
  uploadMsflHoldingsAction,
  deleteMsflHoldingsAction,
  updateMsflSchemeMappingAction,
} from "@/actions/msfl";
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
  const [tickerInput, setTickerInput] = useState("");
  const [isSavingMapping, setIsSavingMapping] = useState(false);

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
        const params = new URLSearchParams(window.location.search);
        params.delete("msflReportId");
        router.push(`${window.location.pathname}?${params.toString()}`);
      } else {
        alert(res.error || "Failed to delete snapshot");
      }
    });
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
    setTickerInput(scheme.schemeCodeApi || "");
  };

  // Save Mapping override
  const handleSaveMapping = async () => {
    if (!editingScheme) return;
    setIsSavingMapping(true);
    try {
      const res = await updateMsflSchemeMappingAction(
        editingScheme.id,
        tickerInput.trim() || null
      );
      if (res.success) {
        setEditingScheme(null);
      } else {
        alert("Failed to save mapping: " + (res.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingMapping(false);
    }
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

      {/* Manual Ticker Mapping Modal */}
      {editingScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div>
              <h4 className="text-base font-bold text-slate-200">
                Manual Ticker Override
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Map{" "}
                <span className="font-bold text-slate-300">
                  {editingScheme.name}
                </span>{" "}
                to a custom Yahoo Finance ticker (e.g.{" "}
                <span className="text-slate-400">ASHOKLEY.NS</span> or{" "}
                <span className="text-slate-400">539574.BO</span>).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Yahoo Ticker
              </label>
              <input
                type="text"
                placeholder="Ticker code..."
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingScheme(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={isSavingMapping}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-black transition shadow-lg shadow-teal-500/10 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingMapping && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                Save Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
