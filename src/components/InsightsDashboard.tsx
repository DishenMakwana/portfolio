"use client";

import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  BarChart3,
  Users,
  CalendarRange,
  Zap,
  Star,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import type { InsightsData } from "@/lib/insightsService";

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtInr(val: number): string {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)} Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function fmtPct(val: number): string {
  return `${val.toFixed(2)}%`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "funds" | "members" | "sip" | "actions";
type SortKey =
  | "scheme"
  | "category"
  | "invested"
  | "current"
  | "gain"
  | "absReturn"
  | "avgCagr"
  | "memberCount";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor = "indigo",
}: {
  label: string;
  value: string;
  sub?: string;
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

function CagrBar({ cagr, maxCagr }: { cagr: number; maxCagr: number }) {
  const pct = maxCagr > 0 ? (cagr / maxCagr) * 100 : 0;
  const color =
    cagr >= 15
      ? "from-emerald-500 to-teal-400"
      : cagr >= 10
        ? "from-amber-500 to-yellow-400"
        : "from-rose-500 to-red-400";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${color} rounded-full`}
        />
      </div>
      <span
        className={`text-xs font-bold w-12 text-right shrink-0 ${
          cagr >= 15
            ? "text-emerald-400"
            : cagr >= 10
              ? "text-amber-400"
              : "text-rose-400"
        }`}
      >
        {cagr.toFixed(2)}%
      </span>
    </div>
  );
}

// ─── Donut Chart ────────────────────────────────────────────────────────────────

function DonutChart({
  slices,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
}) {
  const [hoveredSlice, setHoveredSlice] = useState<{
    label: string;
    value: number;
    color: string;
  } | null>(null);

  const total = slices.reduce((s, v) => s + v.value, 0);
  const r = 60;
  const cx = 75;
  const cy = 75;
  const strokeW = 18;

  const cumulativeOffsets = slices.reduce<number[]>((acc, slice, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + slices[i - 1].value);
    return acc;
  }, []);

  const paths = slices.map((slice, i) => {
    const cum = cumulativeOffsets[i];
    const startAngle = (cum / total) * 360 - 90;
    const endAngle = ((cum + slice.value) / total) * 360 - 90;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return {
      d: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      color: slice.color,
      label: slice.label,
      value: slice.value,
    };
  });

  return (
    <svg viewBox="0 0 150 150" className="w-full h-full select-none">
      {paths.map((p, i) => {
        const isHovered = hoveredSlice?.label === p.label;
        const opacity = hoveredSlice ? (isHovered ? 1.0 : 0.45) : 1.0;
        const currentStrokeW = isHovered ? strokeW + 3 : strokeW;

        return (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={currentStrokeW}
            strokeLinecap="round"
            onMouseEnter={() => setHoveredSlice(p)}
            onMouseLeave={() => setHoveredSlice(null)}
            className="cursor-pointer"
            style={{
              transition: "stroke-width 0.2s ease, opacity 0.2s ease",
              opacity,
              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.35))",
            }}
          />
        );
      })}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="fill-slate-200 text-xs font-bold font-sans"
        fontSize="10"
      >
        {hoveredSlice ? hoveredSlice.label : "Allocation"}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        className="fill-teal-400 font-extrabold font-sans"
        fontSize="9"
      >
        {hoveredSlice
          ? `${hoveredSlice.value.toFixed(1)}%`
          : `${slices.length} categories`}
      </text>
    </svg>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Members Bar Chart (Interactive SVG) ───────────────────────────────────────

function MembersBarChart({
  memberCagrs,
  niftyBenchmark,
}: {
  memberCagrs: Array<{ memberName: string; cagr: number }>;
  niftyBenchmark: number;
}) {
  const [hoveredBar, setHoveredBar] = useState<{
    x: number;
    y: number;
    fullName: string;
    cagr: number;
  } | null>(null);

  const maxCagr = Math.max(...memberCagrs.map((m) => m.cagr), 0);
  const chartH = 220;
  const barW = 55;
  const gap = 30;
  const padX = 50;
  const padY = 30;
  const totalW = padX * 2 + memberCagrs.length * (barW + gap) - gap;
  const benchmark = niftyBenchmark;
  const chartMax = Math.max(maxCagr, benchmark, 1) * 1.1;
  const benchmarkY = padY + chartH - (benchmark / chartMax) * chartH;

  return (
    <div className="overflow-x-auto select-none relative">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + padY * 2 + 40}`}
        className="w-full min-w-[600px]"
        style={{ height: 320 }}
      >
        {/* Grid lines */}
        {[0, 5, 10, 15, 20, 25].map((v) => {
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
                x={padX - 5}
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

        {/* Benchmark line at real Nifty 3Y CAGR */}
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
          x={totalW - padX + 2}
          y={benchmarkY + 4}
          fontSize="9"
          fill="#f59e0b"
        >
          Nifty {benchmark.toFixed(1)}%
        </text>
        {/* Bars */}
        {memberCagrs.map((m, i) => {
          const x = padX + i * (barW + gap);
          const barH = (m.cagr / chartMax) * chartH;
          const y = padY + chartH - barH;
          const isTop = i === 0;
          const shortName = m.memberName.split(" ")[0];

          const isHovered = hoveredBar?.fullName === m.memberName;
          const opacity = hoveredBar ? (isHovered ? 1.0 : 0.45) : 1.0;

          return (
            <g
              key={m.memberName}
              onMouseEnter={() =>
                setHoveredBar({
                  x,
                  y,
                  fullName: m.memberName,
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
                fontSize="8"
                fill="#64748b"
                style={{
                  transition: "opacity 0.2s ease",
                  opacity: hoveredBar ? (isHovered ? 1.0 : 0.45) : 1.0,
                }}
              >
                {shortName}
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
                  {hoveredBar.fullName.split(" ").slice(0, 2).join(" ")}
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

// ─── SIP Projection ─────────────────────────────────────────────────────────────

function futureValueGrowingAnnuity(
  pmt: number,
  annualCagr: number,
  growthRate: number,
  years: number
): number {
  const r = annualCagr / 12 / 100;
  const g = growthRate / 12 / 100;
  const n = years * 12;
  if (Math.abs(r - g) < 1e-10) return pmt * n * Math.pow(1 + r, n);
  return pmt * ((Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g));
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  data: InsightsData;
}

export default function InsightsDashboard({ data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get active tab from URL query parameters, default to "overview"
  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab =
    tabParam &&
    ["overview", "funds", "members", "sip", "actions"].includes(tabParam)
      ? tabParam
      : "overview";

  const handleTabChange = (newTab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortState>({ key: "avgCagr", dir: "desc" });
  const [stepUpPct, setStepUpPct] = useState(10);
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(
    new Set()
  );

  const toggleSchemeExpanded = (schemeName: string) => {
    const next = new Set(expandedSchemes);
    if (next.has(schemeName)) {
      next.delete(schemeName);
    } else {
      next.add(schemeName);
    }
    setExpandedSchemes(next);
  };

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "funds", label: "Funds", icon: TrendingUp },
    { id: "members", label: "Members", icon: Users },
    { id: "sip", label: "SIP Planner", icon: CalendarRange },
    { id: "actions", label: "Actions", icon: Zap },
  ];

  // Sorted + filtered schemes
  const filteredSchemes = useMemo(() => {
    const base =
      filterCategory === "All"
        ? data.schemes
        : data.schemes.filter((s) => s.category === filterCategory);
    return [...base].sort((a, b) => {
      const av = a[sort.key as keyof typeof a] as number | string;
      const bv = b[sort.key as keyof typeof b] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [data.schemes, filterCategory, sort]);

  const maxSchemeCagr = useMemo(
    () => Math.max(...data.schemes.map((s) => s.avgCagr), 0),
    [data.schemes]
  );

  const top5Schemes = useMemo(
    () =>
      new Set(
        [...data.schemes]
          .sort((a, b) => b.avgCagr - a.avgCagr)
          .slice(0, 5)
          .map((s) => s.scheme)
      ),
    [data.schemes]
  );

  const watchlistSchemes = useMemo(
    () =>
      new Set(data.schemes.filter((s) => s.avgCagr < 8).map((s) => s.scheme)),
    [data.schemes]
  );

  // SIP Projection
  const baseSip = data.totals.totalMonthlySip;
  const projectionRows = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const year = i + 1;
      const monthlySip = baseSip * Math.pow(1 + stepUpPct / 100, i);
      const corpus = futureValueGrowingAnnuity(baseSip, 14, stepUpPct, year);
      return {
        year,
        monthlySip: Math.round(monthlySip),
        corpus: Math.round(corpus),
      };
    });
  }, [baseSip, stepUpPct]);

  // Category colors
  const catColors: Record<string, string> = {
    Equity: "#14b8a6",
    Hybrid: "#6366f1",
    Debt: "#f59e0b",
  };

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col)
      return <ChevronsUpDown size={12} className="text-slate-600" />;
    return sort.dir === "asc" ? (
      <ChevronUp size={12} className="text-teal-400" />
    ) : (
      <ChevronDown size={12} className="text-teal-400" />
    );
  }

  const weightedCagr =
    data.memberCagrs.length > 0
      ? data.memberCagrs.reduce((s, m) => s + m.cagr, 0) /
        data.memberCagrs.length
      : 0;
  const niftyBenchmark = data.benchmarkReturns.cagr3Y ?? 12;
  const hasNiftyBenchmark = data.benchmarkReturns.cagr3Y !== null;
  const benchmarkLabel = hasNiftyBenchmark
    ? `Nifty 3Y CAGR ${niftyBenchmark.toFixed(2)}%`
    : "Fallback target 12.00%";
  const benchmarkDelta = weightedCagr - niftyBenchmark;

  // Action items
  const scaleUpFunds = data.schemes.filter((s) => s.avgCagr >= 15).slice(0, 5);
  const watchlistFunds = data.schemes.filter((s) => s.avgCagr < 8);

  const actionMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, 6 + i, 1); // Jul 2026 → Jun 2027
    return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Lightbulb size={22} className="text-teal-400" />
          Investment Insights
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          As of{" "}
          <span className="text-teal-400 font-semibold">{data.reportDate}</span>{" "}
          · {data.totals.memberCount} members · {data.totals.uniqueSchemes}{" "}
          schemes
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/70 rounded-xl border border-slate-800/80 backdrop-blur-md w-fit">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                active ? "text-teal-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="tabPill"
                  className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon size={14} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Hero Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Invested"
                  value={fmtInr(data.totals.invested)}
                  icon={IndianRupee}
                  accentColor="indigo"
                />
                <MetricCard
                  label="Current Value"
                  value={fmtInr(data.totals.current)}
                  sub={`+${fmtInr(data.totals.gain)} gain`}
                  icon={TrendingUp}
                  accentColor="teal"
                />
                <MetricCard
                  label="Total Gain"
                  value={fmtInr(data.totals.gain)}
                  sub={`${fmtPct(data.totals.absReturn)} absolute`}
                  icon={TrendingUp}
                  accentColor={data.totals.gain >= 0 ? "emerald" : "rose"}
                />
                <MetricCard
                  label="Weighted CAGR"
                  value={`${weightedCagr.toFixed(2)}%`}
                  sub={`${benchmarkDelta >= 0 ? "+" : ""}${benchmarkDelta.toFixed(2)}% vs benchmark`}
                  icon={BarChart3}
                  accentColor="amber"
                />
              </div>

              {/* Category Allocation + Donut */}
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Category Allocation
                  </h2>
                  {data.categoryAllocation.map((cat) => (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-200">
                          {cat.category}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {fmtInr(cat.invested)} invested ·{" "}
                          {fmtInr(cat.current)} current
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.allocation}%` }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, ${catColors[cat.category] ?? "#64748b"}, ${catColors[cat.category] ?? "#64748b"}88)`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-300 w-14 text-right">
                          {cat.allocation}%
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>
                          Abs Return:{" "}
                          <span className="text-emerald-400 font-semibold">
                            {cat.absReturn}%
                          </span>
                        </span>
                        <span>
                          Gain:{" "}
                          <span className="text-emerald-400 font-semibold">
                            {fmtInr(cat.gain)}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Donut */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 flex flex-col items-center justify-center shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 self-start">
                    Allocation Mix
                  </h2>
                  <div className="w-36 h-36">
                    <DonutChart
                      slices={data.categoryAllocation.map((c) => ({
                        label: c.category,
                        value: c.allocation,
                        color: catColors[c.category] ?? "#64748b",
                      }))}
                    />
                  </div>
                  <div className="flex gap-4 mt-3">
                    {data.categoryAllocation.map((c) => (
                      <div
                        key={c.category}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            background: catColors[c.category] ?? "#64748b",
                          }}
                        />
                        <span className="text-xs text-slate-400">
                          {c.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Portfolio Health + SIP Summary */}
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Health Score */}
                <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Portfolio Health Score
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-teal-400 flex items-center justify-center bg-teal-500/10">
                      <span className="text-xl font-extrabold text-teal-300">
                        B+
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-100">Good</p>
                      <p className="text-xs text-slate-400">
                        {weightedCagr.toFixed(1)}% avg CAGR vs {benchmarkLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min((weightedCagr / 20) * 100, 100)}%`,
                        }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-teal-400 font-bold">
                      {weightedCagr.toFixed(1)}% / 20%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {[
                      {
                        label: "Diversification",
                        score: data.totals.uniqueSchemes >= 20 ? "Good" : "OK",
                        ok: true,
                      },
                      {
                        label: "SIP Discipline",
                        score: "Active",
                        ok: true,
                      },
                      {
                        label: "Watchlist Items",
                        score: `${watchlistSchemes.size} funds`,
                        ok: watchlistSchemes.size <= 3,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="text-center p-2 rounded-xl bg-slate-900/50 border border-slate-800/60"
                      >
                        <p className="text-xs text-slate-500 mb-1">
                          {item.label}
                        </p>
                        <p
                          className={`text-xs font-bold ${item.ok ? "text-emerald-400" : "text-amber-400"}`}
                        >
                          {item.score}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SIP Summary */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    SIP Summary
                  </h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-100">
                      {fmtInr(data.totals.totalMonthlySip)}
                    </span>
                    <span className="text-slate-500 text-sm">/ month</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Active across {new Set(data.sips.map((s) => s.member)).size}{" "}
                    members · {data.sips.length} mandates
                  </p>
                  <div className="space-y-2 mt-2">
                    {Array.from(new Set(data.sips.map((s) => s.member))).map(
                      (member) => {
                        const memberSips = data.sips.filter(
                          (s) => s.member === member
                        );
                        const total = memberSips.reduce(
                          (s, m) => s + m.monthlyAmount,
                          0
                        );
                        const shortName = member.split(" ")[0];
                        return (
                          <div
                            key={member}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-400">{shortName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                {memberSips.length} SIPs
                              </span>
                              <span className="font-semibold text-teal-300">
                                {fmtInr(total)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FUNDS ─────────────────────────────────────────────────────────── */}
          {activeTab === "funds" && (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {["All", "Equity", "Hybrid", "Debt"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      filterCategory === cat
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                        : "bg-slate-900/50 text-slate-400 border border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {cat}
                    {cat !== "All" && (
                      <span className="ml-1.5 text-xs opacity-60">
                        ({data.schemes.filter((s) => s.category === cat).length}
                        )
                      </span>
                    )}
                  </button>
                ))}
                <span className="ml-auto text-xs text-slate-500">
                  {filteredSchemes.length} funds
                </span>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        {(
                          [
                            { key: "scheme", label: "Fund" },
                            { key: "category", label: "Category" },
                            { key: "invested", label: "Invested" },
                            { key: "current", label: "Current" },
                            { key: "gain", label: "Gain" },
                            { key: "absReturn", label: "Abs %" },
                            { key: "avgCagr", label: "CAGR %" },
                            { key: "memberCount", label: "Members" },
                          ] as Array<{ key: SortKey; label: string }>
                        ).map((col) => (
                          <th
                            key={col.key}
                            className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                            onClick={() => handleSort(col.key)}
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              <SortIcon col={col.key} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredSchemes.map((s, i) => {
                        const isTop = top5Schemes.has(s.scheme);
                        const isWatch = watchlistSchemes.has(s.scheme);
                        const isExpanded = expandedSchemes.has(s.scheme);
                        return (
                          <Fragment key={s.scheme}>
                            <motion.tr
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className={`transition-colors group cursor-pointer ${
                                isWatch
                                  ? "bg-rose-500/10 hover:bg-rose-500/20"
                                  : "hover:bg-slate-700/20"
                              }`}
                              onClick={() => toggleSchemeExpanded(s.scheme)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-200 truncate max-w-[280px]">
                                      {s.scheme}
                                      {isTop && (
                                        <Star
                                          size={12}
                                          className="inline ml-1 text-amber-400 fill-amber-400"
                                        />
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{
                                    background: `${catColors[s.category] ?? "#64748b"}22`,
                                    color: catColors[s.category] ?? "#94a3b8",
                                    border: `1px solid ${catColors[s.category] ?? "#64748b"}44`,
                                  }}
                                >
                                  {s.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                {fmtInr(s.invested)}
                              </td>
                              <td className="px-4 py-3 text-slate-200 font-mono text-xs font-semibold">
                                {fmtInr(s.current)}
                              </td>
                              <td className="px-4 py-3 text-emerald-400 font-mono text-xs font-semibold">
                                {fmtInr(s.gain)}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-300">
                                {s.absReturn.toFixed(1)}%
                              </td>
                              <td className="px-4 py-3 w-44">
                                <CagrBar
                                  cagr={s.avgCagr}
                                  maxCagr={maxSchemeCagr}
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSchemeExpanded(s.scheme);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer select-none ${
                                    isExpanded
                                      ? "bg-teal-500/15 border-teal-500/30 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.1)]"
                                      : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                  }`}
                                >
                                  {s.memberCount}{" "}
                                  {s.memberCount === 1 ? "member" : "members"}
                                  <motion.span
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown size={11} />
                                  </motion.span>
                                </button>
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <tr
                                key={`${s.scheme}-expanded`}
                                className="bg-slate-900/40"
                              >
                                <td colSpan={8} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-6 py-4 flex flex-col gap-3.5 border-t border-slate-800/40 bg-slate-900/10">
                                      <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                                        <Users
                                          size={12}
                                          className="text-teal-400 animate-pulse"
                                        />
                                        <span>
                                          Holdings Breakdown by Family Member
                                          (Click card for details)
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {s.holdings.map((hold) => (
                                          <Link
                                            key={hold.holdingId}
                                            href={`/fund/${hold.holdingId}`}
                                            className="flex flex-col p-3.5 rounded-xl border border-slate-750 bg-slate-950/40 hover:border-teal-500/50 hover:bg-slate-950/75 transition-all duration-200 group shadow-md"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-bold text-slate-100 group-hover:text-teal-300 transition-colors truncate max-w-[200px]">
                                                {hold.memberName}
                                              </span>
                                              <span
                                                className={`text-[10px] px-2 py-0.5 rounded font-black ${
                                                  hold.cagr >= niftyBenchmark
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                }`}
                                              >
                                                {hold.cagr.toFixed(2)}% CAGR
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 mt-2.5 pt-2.5 border-t border-slate-800/50 text-xs text-slate-400">
                                              <div>
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Invested
                                                </span>
                                                <span className="font-mono text-slate-300">
                                                  {fmtInr(hold.invested)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Current
                                                </span>
                                                <span className="font-mono text-slate-300 font-semibold">
                                                  {fmtInr(hold.current)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Gain
                                                </span>
                                                <span
                                                  className={`font-mono font-bold ${
                                                    hold.gain >= 0
                                                      ? "text-emerald-400"
                                                      : "text-rose-400"
                                                  }`}
                                                >
                                                  {fmtInr(hold.gain)}
                                                </span>
                                              </div>
                                            </div>
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBERS ───────────────────────────────────────────────────────── */}
          {activeTab === "members" && (
            <div className="space-y-6">
              {/* Bar Chart */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Member CAGR Leaderboard
                </h2>
                <MembersBarChart
                  memberCagrs={data.memberCagrs}
                  niftyBenchmark={niftyBenchmark}
                />
              </div>

              {/* Member Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.memberCagrs.map((m, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const medal = medals[i] ?? null;
                  const isTop = i === 0;
                  return (
                    <motion.div
                      key={m.memberName}
                      whileHover={{ y: -3 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className={`rounded-2xl border p-4 backdrop-blur-md space-y-3 relative overflow-hidden ${
                        isTop
                          ? "border-teal-500/25 bg-slate-900/75 shadow-[0_0_20px_rgba(20,184,166,0.06)]"
                          : "border-slate-800/80 bg-slate-900/70"
                      }`}
                    >
                      {isTop && (
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                      )}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-base font-bold text-slate-100 leading-tight">
                            {medal} {m.memberName.split(" ")[0]}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[180px]">
                            {m.memberName}
                          </p>
                        </div>
                        <span
                          className={`text-lg font-extrabold ${
                            m.cagr >= 15
                              ? "text-emerald-400"
                              : m.cagr >= niftyBenchmark
                                ? "text-teal-400"
                                : m.cagr >= 10
                                  ? "text-amber-400"
                                  : "text-rose-400"
                          }`}
                        >
                          {m.cagr.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>CAGR</span>
                          <span>Rank #{i + 1}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(m.cagr / (data.memberCagrs[0]?.cagr ?? 1)) * 100}%`,
                            }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className={`h-full rounded-full ${
                              isTop
                                ? "bg-gradient-to-r from-teal-400 to-emerald-400"
                                : "bg-gradient-to-r from-blue-500 to-indigo-400"
                            }`}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {m.cagr >= niftyBenchmark ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Above {benchmarkLabel}
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle size={11} /> Below {benchmarkLabel}
                          </span>
                        )}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SIP PLANNER ───────────────────────────────────────────────────── */}
          {activeTab === "sip" && (
            <div className="space-y-6">
              {/* Step-Up Projection */}
              <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-5 space-y-5 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Step-Up Projection
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Annual Step-Up:{" "}
                    </span>
                    <span className="text-teal-300 font-extrabold text-lg w-12">
                      {stepUpPct}%
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={1}
                    value={stepUpPct}
                    onChange={(e) => setStepUpPct(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-teal-400 cursor-pointer"
                    id="step-up-slider"
                  />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>5%</span>
                    <span>15%</span>
                    <span>25%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Projection assumes 14% CAGR, {stepUpPct}% annual SIP step-up,
                  starting from {fmtInr(baseSip)}/mo
                </p>

                {/* Projection Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        {[
                          "Year",
                          "Monthly SIP",
                          "Annual SIP",
                          "Projected Corpus",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {projectionRows.map((row) => (
                        <motion.tr
                          key={row.year}
                          layout
                          className="hover:bg-slate-700/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-300">
                            Year {row.year}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-200">
                            {fmtInr(row.monthlySip)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">
                            {fmtInr(row.monthlySip * 12)}
                          </td>
                          <td className="px-4 py-3 font-bold text-teal-300">
                            {fmtInr(row.corpus)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIONS ───────────────────────────────────────────────────────── */}
          {activeTab === "actions" && (
            <div className="space-y-6">
              {/* Scale Up */}
              <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  Scale Up — Top Performers
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scaleUpFunds.map((fund) => (
                    <motion.div
                      key={fund.scheme}
                      whileHover={{ y: -2 }}
                      className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 space-y-2 shadow-md hover:border-emerald-500/40 transition-colors"
                    >
                      <p className="text-sm font-bold text-slate-100 leading-tight">
                        {fund.scheme}
                      </p>
                      <p className="text-xs text-slate-500">{fund.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-extrabold text-lg">
                          {fund.avgCagr.toFixed(2)}%
                        </span>
                        <button
                          type="button"
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer font-semibold"
                        >
                          Increase SIP
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Watchlist */}
              <div className="rounded-2xl border border-rose-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-400" />
                  Watch List — Review These Funds
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {watchlistFunds.map((fund) => {
                    const isInsuranceLinked =
                      fund.scheme.toLowerCase().includes("lic") ||
                      fund.scheme.toLowerCase().includes("uli");
                    const isTooNew =
                      fund.avgCagr < 5 && fund.invested >= 5_00_000;
                    const tag = isInsuranceLinked
                      ? "Insurance-Linked"
                      : isTooNew
                        ? "Too New"
                        : "Underperforming";
                    const tagColor = isInsuranceLinked
                      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30";
                    return (
                      <motion.div
                        key={fund.scheme}
                        whileHover={{ y: -2 }}
                        className="rounded-xl border border-rose-500/20 bg-slate-900/60 p-4 space-y-2 shadow-md hover:border-rose-500/40 transition-colors"
                      >
                        <p className="text-sm font-bold text-slate-100 leading-tight">
                          {fund.scheme}
                        </p>
                        <p className="text-xs text-slate-500">
                          {fund.category}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-rose-400 font-extrabold text-lg">
                            {fund.avgCagr.toFixed(2)}%
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tagColor}`}
                          >
                            {tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {isInsuranceLinked
                            ? "Insurance-linked plan — consider pure equity alternatives."
                            : isTooNew
                              ? "Fund is relatively new — monitor closely."
                              : "CAGR below 8% threshold — review allocation."}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* 12-Month Action Calendar */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  12-Month Action Calendar
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {actionMonths.map((month, i) => {
                    const isQ = (i + 1) % 3 === 0;
                    const isReview = i === 5 || i === 11;
                    return (
                      <div
                        key={month}
                        className={`rounded-xl border p-3 text-center space-y-1 transition-all ${
                          isReview
                            ? "border-teal-500/30 bg-teal-500/10"
                            : isQ
                              ? "border-amber-500/20 bg-amber-500/5"
                              : "border-slate-800/60 bg-slate-900/55 hover:border-slate-700 transition-colors"
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-300">
                          {month}
                        </p>
                        <p className="text-xs text-slate-500">
                          {isReview
                            ? "📊 Review"
                            : isQ
                              ? "⚡ Step-Up"
                              : "✅ SIP"}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  📊 = Semi-annual portfolio review · ⚡ = Quarterly SIP step-up
                  check · ✅ = Regular SIP debit
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
