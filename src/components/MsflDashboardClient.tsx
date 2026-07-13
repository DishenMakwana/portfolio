"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Upload,
  Trash,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  BriefcaseBusiness,
  CheckCircle2,
  BarChart3,
  Search,
  ChevronUp,
  ChevronDown,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatPointDelta,
} from "@/helpers/formatters";
import { isUnlistedStock } from "@/lib/stockApi";
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
} from "@/app/zerodha/msflActions";

function DeltaBadge({
  delta,
  label = "vs prev",
}: {
  delta: number | null;
  label?: string;
}) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        No prior snapshot
      </span>
    );
  }

  const isUp = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
        isUp
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
    >
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {formatPointDelta(delta)} {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor = "teal",
}: {
  label: string;
  value: string;
  sub: string;
  positive?: boolean;
  icon: React.ElementType;
  accentColor?: "indigo" | "teal" | "emerald" | "rose" | "amber";
}) {
  const styles = {
    indigo: {
      border: "border-indigo-500/20",
      gradFrom: "from-indigo-500/10",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      subColor: "text-slate-400",
    },
    teal: {
      border: "border-teal-500/20",
      gradFrom: "from-teal-500/10",
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-400",
      subColor: "text-teal-400",
    },
    emerald: {
      border: "border-emerald-500/20",
      gradFrom: "from-emerald-500/10",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      subColor: "text-emerald-400",
    },
    rose: {
      border: "border-rose-500/20",
      gradFrom: "from-rose-500/10",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
      subColor: "text-rose-400",
    },
    amber: {
      border: "border-amber-500/20",
      gradFrom: "from-amber-500/10",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      subColor: "text-amber-400",
    },
  };

  const currentStyle = styles[accentColor];

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${currentStyle.border} rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${currentStyle.gradFrom} to-transparent pointer-events-none`}
      />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {label}
            </span>
            <div className={`p-2 rounded-xl ${currentStyle.iconBg}`}>
              <Icon size={16} className={currentStyle.iconColor} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight font-sans">
            {value}
          </div>
        </div>
        {sub && (
          <div
            className={`text-xs font-semibold mt-2.5 ${currentStyle.subColor}`}
          >
            {sub}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── SVG MSFL Stock CAGR Leaderboard Chart ──────────────────────────────────

function MsflLeaderboardChart({
  mfHoldings,
  niftyBenchmark,
}: {
  mfHoldings: Array<{ symbol: string; cagr: number }>;
  niftyBenchmark: number;
}) {
  const [hoveredBar, setHoveredBar] = useState<{
    x: number;
    y: number;
    symbol: string;
    cagr: number;
  } | null>(null);

  const maxCagr = Math.max(...mfHoldings.map((m) => m.cagr), 0);
  const chartH = 220;
  const barW = 55;
  const minGap = 25;
  const padX = 60;
  const padY = 30;
  const benchmark = niftyBenchmark;
  const chartMax = Math.max(maxCagr, benchmark, 1) * 1.1;
  const benchmarkY = padY + chartH - (benchmark / chartMax) * chartH;

  const n = mfHoldings.length;
  const neededW = padX * 2 + n * (barW + minGap) - minGap;
  const totalW = Math.max(800, neededW);
  const gap = n > 1 ? (totalW - padX * 2 - n * barW) / (n - 1) : 30;

  return (
    <div className="overflow-x-auto select-none relative">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + padY * 2 + 40}`}
        className="w-full min-w-[700px]"
        style={{ height: 320 }}
      >
        {/* Grid lines */}
        {[0, 10, 20, 30, 40, 50, 75, 100, 150].map((v) => {
          if (v > chartMax) return null;
          const y = padY + chartH - (v / chartMax) * chartH;
          return (
            <g key={v}>
              <line
                x1={padX}
                y1={y}
                x2={totalW - padX}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={padX - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fill="#475569"
              >
                {v}%
              </text>
            </g>
          );
        })}

        {/* Benchmark line */}
        <line
          x1={padX}
          y1={benchmarkY}
          x2={totalW - padX}
          y2={benchmarkY}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="5,3"
        />
        <text
          x={totalW - padX + 4}
          y={benchmarkY + 3}
          fontSize="9"
          fill="#f59e0b"
          fontWeight="bold"
        >
          Nifty {benchmark.toFixed(1)}%
        </text>

        {/* Bars */}
        {mfHoldings.map((m, i) => {
          const x = padX + i * (barW + gap);
          const barH = (m.cagr / chartMax) * chartH;
          const y = padY + chartH - barH;
          const isTop = i === 0;

          const isHovered = hoveredBar?.symbol === m.symbol;
          const opacity = hoveredBar ? (isHovered ? 1.0 : 0.45) : 1.0;

          return (
            <g
              key={m.symbol}
              onMouseEnter={() =>
                setHoveredBar({
                  x,
                  y,
                  symbol: m.symbol,
                  cagr: m.cagr,
                })
              }
              onMouseLeave={() => setHoveredBar(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="6"
                fill={
                  isTop
                    ? "url(#topGrad)"
                    : m.cagr >= niftyBenchmark
                      ? "url(#goodGrad)"
                      : "url(#lowGrad)"
                }
                style={{
                  transition: "opacity 0.2s ease, filter 0.2s ease",
                  opacity,
                  filter: isTop
                    ? "drop-shadow(0 0 8px rgba(20,184,166,0.5))"
                    : undefined,
                }}
              />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
                fontWeight="bold"
                style={{
                  transition: "opacity 0.2s ease",
                  opacity: hoveredBar ? (isHovered ? 1.0 : 0.45) : 1.0,
                }}
              >
                {m.cagr.toFixed(1)}%
              </text>
              <text
                x={x + barW / 2}
                y={padY + chartH + 16}
                textAnchor="middle"
                fontSize="8.5"
                fill="#64748b"
                fontWeight="bold"
                style={{
                  transition: "opacity 0.2s ease",
                  opacity: hoveredBar ? (isHovered ? 1.0 : 0.45) : 1.0,
                }}
              >
                {m.symbol}
              </text>
            </g>
          );
        })}

        {/* Custom SVG Tooltip */}
        {hoveredBar &&
          (() => {
            const tooltipX = Math.max(
              5,
              Math.min(hoveredBar.x + barW / 2 - 85, totalW - 175)
            );
            const tooltipY = Math.max(hoveredBar.y - 70, 5);
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width="170"
                  height="58"
                  rx="8"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                  style={{
                    filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.65))",
                  }}
                />
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 18}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {hoveredBar.symbol}
                </text>
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 33}
                  textAnchor="middle"
                  fill="#14b8a6"
                  fontSize="9"
                  fontWeight="extrabold"
                >
                  CAGR: {hoveredBar.cagr.toFixed(2)}%
                </text>
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 46}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="7"
                >
                  {hoveredBar.cagr >= niftyBenchmark
                    ? "🏆 Outperforming Nifty"
                    : "Below Nifty"}
                </text>
              </g>
            );
          })()}

        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id="goodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── Main Tab Component ────────────────────────────────────────────────────────

export default function MsflDashboardClient({
  msflData,
  allMsflSchemes,
}: MsflDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting state for MSFL Stock Holdings
  const [sortField, setSortField] = useState<MsflSortField>("currentValue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
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

    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadMsflHoldingsAction(formData);
      if (res.success) {
        // Sync selectedReportId in URL
        const params = new URLSearchParams(window.location.search);
        params.set("msflReportId", String(res.reportId));
        router.push(`${window.location.pathname}?${params.toString()}`);
      } else {
        setUploadError(res.error || "Failed to upload report");
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

      {uploadError && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={15} />
          {uploadError}
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              label="Invested Value"
              value={formatCurrency(totals.invested)}
              sub="MSFL Connect stock cost"
              icon={BriefcaseBusiness}
              accentColor="indigo"
            />
            <MetricCard
              label="Current Valuation"
              value={formatCurrency(totals.currentValue)}
              sub="Current market valuation"
              icon={TrendingUp}
              accentColor="teal"
            />
            <MetricCard
              label="Overall Unrealized P&amp;L"
              value={formatCurrency(totals.gain)}
              sub={`${totals.gain >= 0 ? "+" : ""}${totals.absoluteReturn.toFixed(2)}% Absolute`}
              positive={totals.gain >= 0}
              icon={totals.gain >= 0 ? TrendingUp : TrendingDown}
              accentColor={totals.gain >= 0 ? "emerald" : "rose"}
            />
            <MetricCard
              label="Weighted CAGR"
              value={
                insights.weightedCagr !== null
                  ? `${insights.weightedCagr.toFixed(2)}%`
                  : "N/A"
              }
              sub={
                mfCagrDelta === null
                  ? benchmarkLabel
                  : `${formatPercent(mfCagrDelta)} vs Nifty Benchmark`
              }
              positive={mfCagrDelta === null ? undefined : mfCagrDelta >= 0}
              icon={BarChart3}
              accentColor="amber"
            />
          </div>

          {/* Balanced 2-Column Section for Benchmark comparison + Portfolio Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Benchmark beats card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest">
                  XIRR vs Benchmark
                </h4>
                <div className="bg-teal-500/10 p-1.5 rounded-lg">
                  <Target size={14} className="text-teal-400" />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Your Portfolio</span>
                    <span className="flex items-center gap-2 font-bold text-teal-400">
                      {formatPercent(totals.portfolioXirr)}
                      <DeltaBadge delta={metricDeltas.portfolioXirr} label="" />
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-teal-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(Math.max(totals.portfolioXirr, 0) * 2.5, 100)}%`,
                      }}
                      transition={{ delay: 0.3, duration: 0.7 }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Nifty 50 Index</span>
                    <span className="flex items-center gap-2 font-bold text-violet-400">
                      {formatPercent(totals.benchmarkXirr)}
                      <DeltaBadge delta={metricDeltas.benchmarkXirr} label="" />
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-violet-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(Math.max(totals.benchmarkXirr, 0) * 2.5, 100)}%`,
                      }}
                      transition={{ delay: 0.4, duration: 0.7 }}
                    />
                  </div>
                </div>
                <div
                  className={`text-center text-[11px] font-bold py-1.5 rounded-lg ${
                    totals.alpha >= 0
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  <span>
                    Alpha: {totals.alpha >= 0 ? "+" : ""}
                    {totals.alpha.toFixed(2)}% —{" "}
                    {totals.alpha >= 0
                      ? "Beating the market"
                      : "Lagging behind"}
                  </span>
                  <span className="ml-2 inline-flex align-middle">
                    <DeltaBadge delta={metricDeltas.alpha} label="" />
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Portfolio Summary Stats */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BriefcaseBusiness size={15} className="text-indigo-400" />
                  Portfolio Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Unique Stocks
                    </p>
                    <p className="text-xl font-extrabold text-slate-100 mt-1">
                      {holdings.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Average / Stock
                    </p>
                    <p className="text-xl font-extrabold text-slate-100 mt-1">
                      {holdings.length > 0
                        ? formatCurrency(totals.currentValue / holdings.length)
                        : "₹0"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Top Performing Stock
                  </p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5 truncate max-w-[200px]">
                    {topPerformer ? topPerformer.symbol : "None"}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {topPerformer && typeof topPerformer.cagr === "number"
                    ? `${topPerformer.cagr.toFixed(2)}% CAGR`
                    : "N/A"}
                </span>
              </div>
            </section>
          </div>

          {/* CAGR Leaderboard Chart */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl">
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

          {/* Holdings Table */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800/60">
              <div className="relative max-w-sm w-full">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Search stock symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full transition"
                />
              </div>
              <div className="text-xs text-slate-500 font-bold pr-1">
                Showing {filteredHoldings.length} of {holdings.length} stocks
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none"
                      onClick={() => toggleSort("symbol")}
                    >
                      <div className="flex items-center gap-1">
                        Stock {renderSortIcon("symbol")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("quantity")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Qty {renderSortIcon("quantity")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("averagePrice")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Avg Cost {renderSortIcon("averagePrice")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("currentPrice")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        LTP {renderSortIcon("currentPrice")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("investedValue")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Invested {renderSortIcon("investedValue")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("currentValue")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Valuation {renderSortIcon("currentValue")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("unrealizedPnl")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Profit / Loss {renderSortIcon("unrealizedPnl")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("cagr")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        XIRR/CAGR {renderSortIcon("cagr")}
                      </div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                      onClick={() => toggleSort("alpha")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Alpha {renderSortIcon("alpha")}
                      </div>
                    </th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
                  {filteredHoldings.length > 0 ? (
                    filteredHoldings.map((h, idx) => (
                      <tr
                        key={idx}
                        onClick={() => router.push(`/fund/msfl_${h.id}`)}
                        className="hover:bg-slate-950/45 transition cursor-pointer select-none"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            <span>{h.symbol}</span>
                            {isUnlistedStock(h.symbol) && (
                              <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase animate-pulse leading-none">
                                Unlisted
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-200">
                          {h.quantity}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-400">
                          {formatCurrency(h.averagePrice)}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-200">
                          {formatCurrency(h.currentPrice)}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-400">
                          {formatCurrency(h.investedValue)}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-100">
                          {formatCurrency(h.currentValue)}
                        </td>
                        <td className="p-4 text-right">
                          <div
                            className={`font-semibold ${
                              h.unrealizedPnl >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {formatCurrency(h.unrealizedPnl)}
                          </div>
                          <div
                            className={`text-[11px] ${
                              h.unrealizedPnl >= 0
                                ? "text-emerald-500/80"
                                : "text-red-500/80"
                            }`}
                          >
                            {h.unrealizedPnlPct >= 0 ? "+" : ""}
                            {h.unrealizedPnlPct.toFixed(1)}%
                          </div>
                        </td>
                        <td
                          className={`p-4 text-right font-bold ${
                            h.cagr !== null &&
                            h.cagr !== undefined &&
                            h.cagr >= 0
                              ? "text-teal-400"
                              : h.cagr !== null && h.cagr !== undefined
                                ? "text-red-400"
                                : "text-teal-400"
                          }`}
                        >
                          {h.cagr !== null && h.cagr !== undefined
                            ? `${h.cagr.toFixed(2)}%`
                            : "-"}
                        </td>
                        <td className="p-4 text-right">
                          {h.alpha !== null && h.alpha !== undefined ? (
                            <span
                              className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${
                                h.alpha >= 0
                                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                                  : "bg-red-950/80 text-red-400 border border-red-800/40"
                              }`}
                            >
                              {h.alpha >= 0 ? "+" : ""}
                              {h.alpha.toFixed(2)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMapping(h);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-700 transition cursor-pointer"
                          >
                            Edit Ticker
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-8 text-center text-slate-500"
                      >
                        No stocks found matching search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outperforming vs Underperforming breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-emerald-500/10 bg-slate-900/70 p-5 shadow-xl">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-400">
                <CheckCircle2 size={16} />
                Outperforming Nifty ({beatingFunds.length})
              </h3>
              <div className="space-y-3">
                {beatingFunds.length > 0 ? (
                  beatingFunds.map((f) => (
                    <div
                      key={f.symbol}
                      className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {f.symbol}
                        </p>
                        <p className="text-xs text-slate-500">
                          P&amp;L: {formatCurrency(f.unrealizedPnl)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-emerald-400">
                        {f.cagr.toFixed(2)}% CAGR
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No stocks outperforming the nifty benchmark.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-rose-500/10 bg-slate-900/70 p-5 shadow-xl">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-rose-400">
                <AlertTriangle size={16} />
                Underperforming Nifty ({laggingFunds.length})
              </h3>
              <div className="space-y-3">
                {laggingFunds.length > 0 ? (
                  laggingFunds.map((f) => (
                    <div
                      key={f.symbol}
                      className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {f.symbol}
                        </p>
                        <p className="text-xs text-slate-500">
                          P&amp;L: {formatCurrency(f.unrealizedPnl)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-rose-400">
                        {f.cagr.toFixed(2)}% CAGR
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    All stocks outperforming the nifty benchmark.
                  </div>
                )}
              </div>
            </section>
          </div>
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
                <span className="font-mono text-slate-400">ASHOKLEY.NS</span> or{" "}
                <span className="font-mono text-slate-400">539574.BO</span>).
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
