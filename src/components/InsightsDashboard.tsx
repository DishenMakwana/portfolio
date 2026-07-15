"use client";

import { useState, useMemo, Fragment, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Lightbulb,
  TrendingUp,
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
  Layers,
  LineChart,
  Download,
} from "lucide-react";
import type {
  Tab,
  SortKey,
  SortState,
  InsightsDashboardProps,
  CategoryOverlap,
  DonutSlice,
  HoveredMemberCagrPoint,
  MemberCagrPoint,
  MetricCardProps,
  SubCategoryGroupItem,
  AmcPoint,
  HoveredAmcPoint,
  AllocationAnalysisGroup,
  AllocationAnalysisSortKey,
  AllocationAnalysisTabProps,
} from "@/types/insights";
import {
  formatInrCompact,
  formatPct,
  formatCurrency,
  formatHoldingDays,
  formatPercent,
} from "@/helpers/formatters";

// ─── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor = "indigo",
}: MetricCardProps) {
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

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);

  const total = slices.reduce((s, v) => s + v.value, 0);
  const r = 60;
  const cx = 75;
  const cy = 75;
  const strokeW = 18;

  const cumulativeOffsets: number[] = [];
  for (let i = 0; i < slices.length; i++) {
    cumulativeOffsets.push(
      i === 0 ? 0 : cumulativeOffsets[i - 1] + slices[i - 1].value
    );
  }

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
            className={`cursor-pointer transition-[stroke-width,opacity] duration-200 drop-shadow-[0_0_6px_rgba(0,0,0,0.35)] ${
              opacity === 1 ? "opacity-100" : "opacity-[0.45]"
            }`}
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
  memberCagrs: MemberCagrPoint[];
  niftyBenchmark: number;
}) {
  const [hoveredBar, setHoveredBar] = useState<HoveredMemberCagrPoint | null>(
    null
  );

  const maxCagr = Math.max(...memberCagrs.map((m) => m.cagr), 0);
  const minCagr = Math.min(...memberCagrs.map((m) => m.cagr), 0);
  const chartH = 300;
  const barW = 60;
  const gap = 35;
  const padX = 55;
  const padY = 40;
  const totalW = padX * 2 + memberCagrs.length * (barW + gap) - gap;
  const benchmark = niftyBenchmark;

  // Set bounds for Y scale
  const yMax = Math.max(maxCagr, benchmark, 1) * 1.15;
  const yMin = minCagr < 0 ? minCagr * 1.35 : 0; // Pad negative side slightly to prevent text clipping
  const totalRange = yMax - yMin;

  const getY = (v: number) =>
    padY + chartH - ((v - yMin) / totalRange) * chartH;

  const zeroY = getY(0);
  const benchmarkY = getY(benchmark);

  return (
    <div className="overflow-x-auto select-none relative">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + padY * 2 + 60}`}
        className="w-full min-w-[600px] h-[440px]"
      >
        {/* Grid lines */}
        {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 75, 100, 150].map(
          (v) => {
            if (v > yMax || v < yMin) return null;
            const y = getY(v);
            return (
              <g key={v}>
                <line
                  x1={padX}
                  y1={y}
                  x2={totalW - padX}
                  y2={y}
                  stroke={v === 0 ? "#475569" : "#1e293b"}
                  strokeWidth={v === 0 ? "1.5" : "1"}
                  strokeOpacity={v === 0 ? "0.8" : "1"}
                />
                <text
                  x={padX - 5}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill={v === 0 ? "#94a3b8" : "#475569"}
                  fontWeight={v === 0 ? "bold" : "normal"}
                >
                  {v}%
                </text>
              </g>
            );
          }
        )}

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
          const valY = getY(m.cagr);
          const isNegative = m.cagr < 0;

          const rectY = isNegative ? zeroY : valY;
          const rectH = isNegative ? valY - zeroY : zeroY - valY;

          const isTop = i === 0;
          const shortName = m.memberName.split(" ")[0];

          const isHovered = hoveredBar?.fullName === m.memberName;

          return (
            <g
              key={m.memberName}
              onMouseEnter={() =>
                setHoveredBar({
                  x,
                  y: valY,
                  fullName: m.memberName,
                  cagr: m.cagr,
                })
              }
              onMouseLeave={() => setHoveredBar(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={rectY}
                width={barW}
                height={Math.max(2, rectH)}
                rx="6"
                fill={
                  isTop
                    ? "url(#topGrad)"
                    : m.cagr >= niftyBenchmark
                      ? "url(#goodGrad)"
                      : "url(#lowGrad)"
                }
                className={`transition-[opacity,filter] duration-200 ${
                  isTop ? "drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" : ""
                } ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              />
              <text
                x={x + barW / 2}
                y={isNegative ? valY + 12 : valY - 6}
                textAnchor="middle"
                fontSize="9"
                fill={isNegative ? "#f87171" : "#94a3b8"}
                fontWeight="bold"
                className={`transition-opacity duration-200 ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              >
                {m.cagr.toFixed(1)}%
              </text>
              <text
                x={x + barW / 2}
                y={padY + chartH + 16}
                textAnchor="middle"
                fontSize="8"
                fill="#64748b"
                className={`transition-opacity duration-200 ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
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
            const isNegative = hoveredBar.cagr < 0;
            const tooltipY = isNegative
              ? Math.min(hoveredBar.y + 15, chartH + padY * 2 - 15)
              : Math.max(hoveredBar.y - 70, 5);
            return (
              <g className="pointer-events-none">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width="170"
                  height="58"
                  rx="8"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                  className="drop-shadow-[0_10px_15px_rgba(0,0,0,0.65)]"
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

// ─── Allocation Analysis Tab Component ───────────────────────────────────────────

function AllocationAnalysisTab({
  analysisData,
  niftyBenchmark,
  sortKey,
  sortDir,
  onSort,
  entityLabel,
  entityDescription,
  title,
  downloadPrefix,
}: AllocationAnalysisTabProps) {
  const [graphView, setGraphView] = useState<"cagr" | "abs" | "xirr">("cagr");
  const [hoveredPoint, setHoveredPoint] = useState<HoveredAmcPoint | null>(
    null
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cagrSvgRef = useRef<SVGSVGElement | null>(null);
  const absSvgRef = useRef<SVGSVGElement | null>(null);
  const xirrSvgRef = useRef<SVGSVGElement | null>(null);

  const downloadSvgAsPng = (svgElement: SVGSVGElement, filename: string) => {
    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute("width", "800");
      clonedSvg.setAttribute("height", "460");

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const scale = 3;
        const width = 800 * scale;
        const height = 460 * scale;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = "#0f172a"; // slate-900 background match
          ctx.fillRect(0, 0, width, height);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const downloadURL = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = downloadURL;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(downloadURL);
            }
          }, "image/png");
        }
        URL.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    let activeSvg: SVGSVGElement | null = null;
    let filename = `${downloadPrefix}_analysis`;

    if (graphView === "cagr") {
      activeSvg = cagrSvgRef.current;
      filename = `${downloadPrefix}_cagr_returns`;
    } else if (graphView === "abs") {
      activeSvg = absSvgRef.current;
      filename = `${downloadPrefix}_absolute_returns`;
    } else if (graphView === "xirr") {
      activeSvg = xirrSvgRef.current;
      filename = `${downloadPrefix}_xirr_returns`;
    }

    if (activeSvg) {
      const dateStr = new Date().toISOString().split("T")[0];
      downloadSvgAsPng(activeSvg, `${filename}_${dateStr}.png`);
    }
  };

  function SortIcon({ col }: { col: AllocationAnalysisSortKey }) {
    if (sortKey !== col)
      return (
        <ChevronsUpDown
          size={11}
          className="text-slate-600 inline ml-1.5 align-middle"
        />
      );
    return sortDir === "asc" ? (
      <ChevronUp
        size={11}
        className="text-teal-400 inline ml-1.5 align-middle"
      />
    ) : (
      <ChevronDown
        size={11}
        className="text-teal-400 inline ml-1.5 align-middle"
      />
    );
  }

  // Unified dimensions for the SVG chart
  const chartW = 800;
  const chartH = 460;
  const padLeft = 65;
  const padRight = 65;
  const padTop = 45;
  const padBottom = 55;

  const width = chartW - padLeft - padRight;
  const height = chartH - padTop - padBottom;

  // --- Math for CAGR Bubble Chart ---
  const maxDays = Math.max(...analysisData.map((d) => d.avgHoldingDays), 365);
  const maxX = Math.ceil(maxDays / 182.5) * 182.5;

  const maxVal =
    graphView === "cagr"
      ? Math.max(...analysisData.map((d) => d.cagr), 15)
      : Math.max(...analysisData.map((d) => d.xirr), 15);
  const minVal =
    graphView === "cagr"
      ? Math.min(...analysisData.map((d) => d.cagr), 0)
      : Math.min(...analysisData.map((d) => d.xirr), 0);

  const maxYVal = Math.ceil(maxVal / 5) * 5;
  const minYVal = minVal < 0 ? Math.floor(minVal / 5) * 5 : 0;

  const getX = (days: number) => padLeft + (days / maxX) * width;
  const getYVal = (val: number) =>
    padTop + height - ((val - minYVal) / (maxYVal - minYVal)) * height;

  const xTicks: number[] = [];
  for (let d = 182.5; d <= maxX; d += 182.5) {
    xTicks.push(d);
  }

  const yTicksVal: number[] = [];
  const yStep = maxYVal - minYVal > 30 ? 10 : 5;
  for (let y = minYVal; y <= maxYVal; y += yStep) {
    yTicksVal.push(y);
  }

  const benchmarkY = getYVal(niftyBenchmark);

  // --- Math for Absolute Returns Combo Chart ---
  const analysisWithReturns = useMemo(() => {
    return analysisData.map((item) => {
      const absReturn =
        item.invested > 0 ? (item.gain / item.invested) * 100 : 0;
      return {
        ...item,
        absReturn,
      };
    });
  }, [analysisData]);

  const maxAbsReturn = Math.max(
    ...analysisWithReturns.map((d) => d.absReturn),
    15
  );
  const minAbsReturn = Math.min(
    ...analysisWithReturns.map((d) => d.absReturn),
    0
  );
  const maxYLeft = Math.ceil(maxAbsReturn / 10) * 10;
  const minYLeft = minAbsReturn < 0 ? Math.floor(minAbsReturn / 10) * 10 : 0;
  const getYLeft = (val: number) =>
    padTop + height - ((val - minYLeft) / (maxYLeft - minYLeft)) * height;

  const maxHoldingDays = Math.max(
    ...analysisWithReturns.map((d) => d.avgHoldingDays),
    365
  );
  const maxYRight = Math.ceil(maxHoldingDays / 182.5) * 182.5;
  const getYRight = (val: number) =>
    padTop + height - (val / maxYRight) * height;

  const stepXAbs = width / (analysisWithReturns.length || 1);
  const getXAbs = (index: number) => padLeft + stepXAbs * index + stepXAbs / 2;

  const yLeftTicks: number[] = [];
  const leftStep = maxYLeft - minYLeft > 50 ? 20 : 10;
  for (let y = minYLeft; y <= maxYLeft; y += leftStep) {
    yLeftTicks.push(y);
  }

  const yRightTicks: number[] = [];
  const rightStep = maxYRight / 5;
  for (let y = 0; y <= maxYRight; y += rightStep) {
    yRightTicks.push(y);
  }

  const linePoints = analysisWithReturns.map((item, i) => ({
    x: getXAbs(i),
    y: getYRight(item.avgHoldingDays),
  }));

  let linePath = "";
  if (linePoints.length > 0) {
    linePath = linePoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-2xl border border-teal-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
        <div className="flex items-center gap-2">
          <LineChart className="text-teal-400" size={18} />
          <h2 className="text-base font-bold text-slate-100">{title}</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {graphView === "cagr" && (
            <>
              This Cartesian graph plots each {entityDescription}
              where the <strong>X-axis</strong> represents the weighted average
              holding period (Time) in days/years, the <strong>Y-axis</strong>{" "}
              represents the weighted CAGR return (%), and the{" "}
              <strong>Bubble Size</strong> represents its relative weight in
              your mutual fund portfolio.
            </>
          )}
          {graphView === "abs" && (
            <>
              This Cartesian graph displays two metrics for each {entityLabel}:{" "}
              <strong className="text-teal-400">Absolute Return (%)</strong> as
              vertical bars (left Y-axis) and{" "}
              <strong className="text-amber-500">
                Average Holding Period (Days)
              </strong>{" "}
              as a line overlay (right Y-axis).
            </>
          )}
          {graphView === "xirr" && (
            <>
              This Cartesian graph displays {entityLabel} performance using a{" "}
              <strong className="text-teal-400">Lollipop Chart</strong> where
              the <strong>X-axis</strong> represents average holding period in
              days/years, the <strong>Y-axis</strong> represents {entityLabel}{" "}
              XIRR return (%), and stick height indicates the magnitude of
              return. Node size represents relative portfolio weight (%).
            </>
          )}
        </p>
      </div>

      {/* Unified Graph Card */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            {graphView === "cagr"
              ? `${entityLabel} CAGR Returns vs Weighted Holding Time`
              : graphView === "abs"
                ? `${entityLabel} Absolute Returns vs Weighted Holding Time`
                : `${entityLabel} XIRR Returns vs Weighted Holding Time`}
          </h3>

          {/* Graph View Selector & Download */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setGraphView("cagr")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphView === "cagr"
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                CAGR Bubble
              </button>
              <button
                onClick={() => setGraphView("abs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphView === "abs"
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                Abs Return Combo
              </button>
              <button
                onClick={() => setGraphView("xirr")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphView === "xirr"
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                XIRR Lollipop
              </button>
            </div>

            <button
              onClick={handleDownload}
              title="Download Graph as PNG"
              className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/30 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 transition-all"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto select-none relative">
          {graphView === "cagr" && (
            <svg
              ref={cagrSvgRef}
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full min-w-[700px] h-[460px]"
            >
              {/* Y-axis grid lines & labels */}
              {yTicksVal.map((yVal) => {
                const y = getYVal(yVal);
                return (
                  <g key={yVal}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartW - padRight}
                      y2={y}
                      stroke={yVal === 0 ? "#475569" : "#1e293b"}
                      strokeWidth={yVal === 0 ? "1.5" : "1"}
                      strokeOpacity={yVal === 0 ? "0.8" : "1"}
                    />
                    <text
                      x={padLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill={yVal === 0 ? "#94a3b8" : "#475569"}
                      fontWeight={yVal === 0 ? "bold" : "normal"}
                    >
                      {yVal.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {/* X-axis grid lines & labels (Time in Years) */}
              {xTicks.map((tick) => {
                const x = getX(tick);
                const yrs = tick / 365;
                let label = `${yrs.toFixed(1)}Y`;
                if (Math.abs(yrs - Math.round(yrs)) < 0.05) {
                  label = `${Math.round(yrs)}Y`;
                }
                return (
                  <g key={tick}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={chartH - padBottom}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <text
                      x={x}
                      y={chartH - padBottom + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#475569"
                    >
                      {label} ({Math.round(tick)}d)
                    </text>
                  </g>
                );
              })}

              {/* Main Axis Lines */}
              <line
                x1={padLeft}
                y1={chartH - padBottom}
                x2={chartW - padRight}
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <line
                x1={padLeft}
                y1={padTop}
                x2={padLeft}
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* Axis Titles */}
              <text
                x={padLeft + width / 2}
                y={chartH - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748b"
              >
                Average Holding Period (Years & Days)
              </text>
              <text
                transform={`rotate(-90 ${15} ${padTop + height / 2})`}
                x={15}
                y={padTop + height / 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748b"
              >
                Weighted CAGR Return (%)
              </text>

              {/* Nifty 3Y Benchmark Line */}
              <line
                x1={padLeft}
                y1={benchmarkY}
                x2={chartW - padRight}
                y2={benchmarkY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6,4"
                strokeOpacity="0.85"
              />
              <text
                x={chartW - padRight - 5}
                y={benchmarkY - 6}
                textAnchor="end"
                fontSize="9"
                fill="#f59e0b"
                fontWeight="semibold"
              >
                Nifty Benchmark ({niftyBenchmark.toFixed(1)}% CAGR)
              </text>

              {/* Hover Crosshairs */}
              {hoveredPoint && (
                <g className="pointer-events-none">
                  <line
                    x1={padLeft}
                    y1={hoveredPoint.y}
                    x2={hoveredPoint.x}
                    y2={hoveredPoint.y}
                    stroke="#2dd4bf"
                    strokeWidth="1.25"
                    strokeDasharray="4,3"
                    opacity="0.75"
                  />
                  <line
                    x1={hoveredPoint.x}
                    y1={hoveredPoint.y}
                    x2={hoveredPoint.x}
                    y2={chartH - padBottom}
                    stroke="#2dd4bf"
                    strokeWidth="1.25"
                    strokeDasharray="4,3"
                    opacity="0.75"
                  />
                  <circle
                    cx={padLeft}
                    cy={hoveredPoint.y}
                    r="3"
                    fill="#2dd4bf"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={chartH - padBottom}
                    r="3"
                    fill="#2dd4bf"
                  />
                </g>
              )}

              {/* Bubbles / Points */}
              {analysisData.map((amc, i) => {
                const cx = getX(amc.avgHoldingDays);
                const cy = getYVal(amc.cagr);

                const r = 8 + Math.sqrt(amc.weight) * 3.2;

                const isHovered = hoveredPoint?.name === amc.name;
                const opacity = hoveredPoint ? (isHovered ? 1.0 : 0.25) : 0.85;

                let gradId = `amcGrad-${i}`;
                let stopColor1 = "#3b82f6";
                let stopColor2 = "#1d4ed8";
                if (amc.cagr >= 15) {
                  stopColor1 = "#14b8a6";
                  stopColor2 = "#0f766e";
                } else if (amc.cagr < 8) {
                  stopColor1 = "#f43f5e";
                  stopColor2 = "#be123c";
                } else if (amc.cagr < 11) {
                  stopColor1 = "#f59e0b";
                  stopColor2 = "#b45309";
                }

                const shortName = amc.name
                  .replace(" Mutual Fund", "")
                  .replace(" India", "")
                  .replace(" Sun Life", "")
                  .replace(" Templeton", "")
                  .split(" ")
                  .slice(0, 2)
                  .join(" ");

                return (
                  <g
                    key={amc.name}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        x: cx,
                        y: cy,
                        ...amc,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <defs>
                      <radialGradient id={gradId} cx="35%" cy="35%" r="65%">
                        <stop
                          offset="0%"
                          stopColor={stopColor1}
                          stopOpacity="1"
                        />
                        <stop
                          offset="70%"
                          stopColor={stopColor2}
                          stopOpacity="0.85"
                        />
                        <stop
                          offset="100%"
                          stopColor={stopColor2}
                          stopOpacity="0.6"
                        />
                      </radialGradient>
                    </defs>

                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 4}
                        fill="none"
                        stroke={stopColor1}
                        strokeWidth="2.5"
                        strokeOpacity="0.6"
                        className="animate-ping"
                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                      />
                    )}

                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={`url(#${gradId})`}
                      stroke={isHovered ? "#ffffff" : stopColor1}
                      strokeWidth={isHovered ? "2" : "1"}
                      strokeOpacity={isHovered ? "1" : "0.7"}
                      className="transition-all duration-200"
                      opacity={opacity}
                    />

                    {r > 13 && (
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        fontSize={r > 18 ? "9" : "8"}
                        fontWeight="black"
                        fill="#ffffff"
                        opacity={opacity}
                        className="pointer-events-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.85)] font-sans"
                      >
                        {shortName}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Custom Tooltip rendered inside SVG */}
              {hoveredPoint &&
                (() => {
                  const tooltipW = 200;
                  const tooltipH = 105;
                  let tx = hoveredPoint.x + 15;
                  if (tx + tooltipW > chartW) {
                    tx = hoveredPoint.x - tooltipW - 15;
                  }
                  let ty = hoveredPoint.y - tooltipH / 2;
                  if (ty < 10) ty = 10;
                  if (ty + tooltipH > chartH - 10) ty = chartH - tooltipH - 10;

                  return (
                    <g className="pointer-events-none transition-all duration-200">
                      <rect
                        x={tx}
                        y={ty}
                        width={tooltipW}
                        height={tooltipH}
                        rx="12"
                        fill="#0b0f19"
                        stroke="#1e293b"
                        strokeWidth="1.5"
                        className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
                      />
                      <text
                        x={tx + 12}
                        y={ty + 22}
                        fontSize="10"
                        fontWeight="black"
                        fill="#f1f5f9"
                      >
                        {hoveredPoint.name.split(" ").slice(0, 3).join(" ")}
                      </text>
                      <text x={tx + 12} y={ty + 42} fontSize="9" fill="#94a3b8">
                        Weight:{" "}
                        <tspan fill="#f1f5f9" fontWeight="bold">
                          {hoveredPoint.weight.toFixed(1)}%
                        </tspan>{" "}
                        ({formatInrCompact(hoveredPoint.current)})
                      </text>
                      <text x={tx + 12} y={ty + 60} fontSize="9" fill="#94a3b8">
                        Weighted CAGR:{" "}
                        <tspan
                          fill={
                            hoveredPoint.cagr >= 15
                              ? "#2dd4bf"
                              : hoveredPoint.cagr >= 10
                                ? "#fbbf24"
                                : "#fb7185"
                          }
                          fontWeight="black"
                        >
                          {hoveredPoint.cagr.toFixed(2)}%
                        </tspan>
                      </text>
                      <text x={tx + 12} y={ty + 78} fontSize="9" fill="#94a3b8">
                        Avg. Holding Period:
                      </text>
                      <text
                        x={tx + 12}
                        y={ty + 92}
                        fontSize="8.5"
                        fill="#f1f5f9"
                        fontWeight="semibold"
                      >
                        {formatHoldingDays(hoveredPoint.avgHoldingDays)}
                      </text>
                    </g>
                  );
                })()}
            </svg>
          )}

          {graphView === "abs" && (
            <svg
              ref={absSvgRef}
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full min-w-[700px] h-[460px]"
            >
              {yLeftTicks.map((yVal) => {
                const y = getYLeft(yVal);
                return (
                  <g key={`left-${yVal}`}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartW - padRight}
                      y2={y}
                      stroke={yVal === 0 ? "#475569" : "#1e293b"}
                      strokeWidth={yVal === 0 ? "1.5" : "1"}
                      strokeOpacity={yVal === 0 ? "0.8" : "1"}
                    />
                    <text
                      x={padLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill={yVal === 0 ? "#94a3b8" : "#475569"}
                      fontWeight={yVal === 0 ? "bold" : "normal"}
                    >
                      {yVal.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {yRightTicks.map((yVal) => {
                const y = getYRight(yVal);
                const yrs = yVal / 365;
                let label = `${yrs.toFixed(1)}Y`;
                if (Math.abs(yrs - Math.round(yrs)) < 0.05) {
                  label = `${Math.round(yrs)}Y`;
                }
                if (yVal === 0) label = "0d";
                return (
                  <g key={`right-${yVal}`}>
                    <text
                      x={chartW - padRight + 10}
                      y={y + 4}
                      textAnchor="start"
                      fontSize="10"
                      fill="#f59e0b"
                      opacity="0.85"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              <line
                x1={padLeft}
                y1={padTop}
                x2={padLeft}
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <line
                x1={chartW - padRight}
                y1={padTop}
                x2={chartW - padRight}
                y2={chartH - padBottom}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <line
                x1={padLeft}
                y1={chartH - padBottom}
                x2={chartW - padRight}
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />

              <text
                transform={`rotate(-90 ${15} ${padTop + height / 2})`}
                x={15}
                y={padTop + height / 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#2dd4bf"
              >
                Absolute Return (%)
              </text>
              <text
                transform={`rotate(90 ${chartW - 15} ${padTop + height / 2})`}
                x={chartW - 15}
                y={padTop + height / 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#f59e0b"
              >
                Holding Period (Years)
              </text>

              {analysisWithReturns.map((amc, i) => {
                const cx = getXAbs(i);
                const cy = getYLeft(amc.absReturn);
                const cyZero = getYLeft(0);
                const barW = Math.min(32, stepXAbs * 0.5);

                const rx = cx - barW / 2;
                const isNegative = amc.absReturn < 0;
                const ry = isNegative ? cyZero : cy;
                const rh = isNegative ? cy - cyZero : cyZero - cy;

                const isHovered = hoveredIdx === i;
                const opacity =
                  hoveredIdx !== null ? (isHovered ? 1.0 : 0.25) : 0.85;

                let gradId = `amcAbsGrad-${i}`;
                let stopColor1 = isNegative ? "#f43f5e" : "#06b6d4";
                let stopColor2 = isNegative ? "#be123c" : "#0891b2";

                return (
                  <g key={`bar-${amc.name}`}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={stopColor1} />
                        <stop offset="100%" stopColor={stopColor2} />
                      </linearGradient>
                    </defs>

                    <rect
                      x={rx}
                      y={ry}
                      width={barW}
                      height={Math.max(2, rh)}
                      rx="4"
                      fill={`url(#${gradId})`}
                      className="transition-all duration-200 cursor-pointer"
                      opacity={opacity}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </g>
                );
              })}

              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)] pointer-events-none"
                  opacity={hoveredIdx !== null ? 0.35 : 0.85}
                />
              )}

              {analysisWithReturns.map((amc, i) => {
                const cx = getXAbs(i);
                const cy = getYRight(amc.avgHoldingDays);

                const isHovered = hoveredIdx === i;
                const opacity =
                  hoveredIdx !== null ? (isHovered ? 1.0 : 0.25) : 0.9;

                return (
                  <g key={`node-${amc.name}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 7 : 4.5}
                      fill="#1e1b4b"
                      stroke="#f59e0b"
                      strokeWidth={isHovered ? "3.5" : "2.5"}
                      className="transition-all duration-200 cursor-pointer"
                      opacity={opacity}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </g>
                );
              })}

              {analysisWithReturns.map((amc, i) => {
                const x = getXAbs(i);
                const isHovered = hoveredIdx === i;
                const shortName = amc.name
                  .replace(" Mutual Fund", "")
                  .replace(" India", "")
                  .replace(" Sun Life", "")
                  .replace(" Templeton", "")
                  .split(" ")
                  .slice(0, 2)
                  .join(" ");

                return (
                  <g key={`x-lbl-${amc.name}`}>
                    <text
                      x={x}
                      y={chartH - padBottom + 20}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight={isHovered ? "bold" : "normal"}
                      fill={isHovered ? "#2dd4bf" : "#64748b"}
                      className="transition-colors duration-150"
                    >
                      {shortName}
                    </text>
                  </g>
                );
              })}

              {/* X-axis Title for AMC names */}
              <text
                x={padLeft + width / 2}
                y={chartH - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748b"
                className="font-sans"
              >
                {entityLabel} Exposure
              </text>

              {hoveredIdx !== null &&
                (() => {
                  const amc = analysisWithReturns[hoveredIdx];
                  const cx = getXAbs(hoveredIdx);
                  const cy = getYLeft(amc.absReturn);

                  const tooltipW = 200;
                  const tooltipH = 105;
                  let tx = cx + 15;
                  if (tx + tooltipW > chartW) {
                    tx = cx - tooltipW - 15;
                  }
                  let ty = cy - tooltipH / 2;
                  if (ty < 10) ty = 10;
                  if (ty + tooltipH > chartH - 10) ty = chartH - tooltipH - 10;

                  return (
                    <g className="pointer-events-none transition-all duration-200">
                      <rect
                        x={tx}
                        y={ty}
                        width={tooltipW}
                        height={tooltipH}
                        rx="12"
                        fill="#0b0f19"
                        stroke="#1e293b"
                        strokeWidth="1.5"
                        className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
                      />
                      <text
                        x={tx + 12}
                        y={ty + 22}
                        fontSize="10"
                        fontWeight="black"
                        fill="#f1f5f9"
                      >
                        {amc.name.split(" ").slice(0, 3).join(" ")}
                      </text>
                      <text x={tx + 12} y={ty + 42} fontSize="9" fill="#94a3b8">
                        Weight:{" "}
                        <tspan fill="#f1f5f9" fontWeight="bold">
                          {amc.weight.toFixed(1)}%
                        </tspan>{" "}
                        ({formatInrCompact(amc.current)})
                      </text>
                      <text x={tx + 12} y={ty + 60} fontSize="9" fill="#94a3b8">
                        Absolute Return:{" "}
                        <tspan
                          fill={amc.absReturn >= 0 ? "#2dd4bf" : "#fb7185"}
                          fontWeight="black"
                        >
                          {formatPercent(amc.absReturn)}
                        </tspan>
                      </text>
                      <text x={tx + 12} y={ty + 78} fontSize="9" fill="#94a3b8">
                        Avg. Holding Period:
                      </text>
                      <text
                        x={tx + 12}
                        y={ty + 92}
                        fontSize="8.5"
                        fill="#f1f5f9"
                        fontWeight="semibold"
                      >
                        {formatHoldingDays(amc.avgHoldingDays)}
                      </text>
                    </g>
                  );
                })()}
            </svg>
          )}

          {graphView === "xirr" && (
            <svg
              ref={xirrSvgRef}
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full min-w-[700px] h-[460px]"
            >
              {/* Y-axis grid lines & labels */}
              {yTicksVal.map((yVal) => {
                const y = getYVal(yVal);
                return (
                  <g key={yVal}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartW - padRight}
                      y2={y}
                      stroke={yVal === 0 ? "#475569" : "#1e293b"}
                      strokeWidth={yVal === 0 ? "1.5" : "1"}
                      strokeOpacity={yVal === 0 ? "0.8" : "1"}
                    />
                    <text
                      x={padLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill={yVal === 0 ? "#94a3b8" : "#475569"}
                      fontWeight={yVal === 0 ? "bold" : "normal"}
                    >
                      {yVal.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {/* X-axis grid lines & labels (Time in Years) */}
              {xTicks.map((tick) => {
                const x = getX(tick);
                const yrs = tick / 365;
                let label = `${yrs.toFixed(1)}Y`;
                if (Math.abs(yrs - Math.round(yrs)) < 0.05) {
                  label = `${Math.round(yrs)}Y`;
                }
                return (
                  <g key={tick}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={chartH - padBottom}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <text
                      x={x}
                      y={chartH - padBottom + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#475569"
                    >
                      {label} ({Math.round(tick)}d)
                    </text>
                  </g>
                );
              })}

              {/* Main Axis Lines */}
              <line
                x1={padLeft}
                y1={chartH - padBottom}
                x2={chartW - padRight}
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <line
                x1={padLeft}
                y1={padTop}
                x2={padLeft}
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* Axis Titles */}
              <text
                x={padLeft + width / 2}
                y={chartH - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748b"
              >
                Average Holding Period (Years & Days)
              </text>
              <text
                transform={`rotate(-90 ${15} ${padTop + height / 2})`}
                x={15}
                y={padTop + height / 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748b"
              >
                {entityLabel} XIRR Return (%)
              </text>

              {/* Nifty 3Y Benchmark Line */}
              <line
                x1={padLeft}
                y1={benchmarkY}
                x2={chartW - padRight}
                y2={benchmarkY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6,4"
                strokeOpacity="0.85"
              />
              <text
                x={chartW - padRight - 5}
                y={benchmarkY - 6}
                textAnchor="end"
                fontSize="9"
                fill="#f59e0b"
                fontWeight="semibold"
              >
                Nifty Benchmark ({niftyBenchmark.toFixed(1)}% XIRR)
              </text>

              {/* Hover Crosshairs */}
              {hoveredPoint && (
                <g className="pointer-events-none">
                  {/* Horizontal line to Y-axis */}
                  <line
                    x1={padLeft}
                    y1={hoveredPoint.y}
                    x2={hoveredPoint.x}
                    y2={hoveredPoint.y}
                    stroke="#fbbf24"
                    strokeWidth="1.25"
                    strokeDasharray="4,3"
                    opacity="0.75"
                  />
                  {/* Vertical line to X-axis */}
                  <line
                    x1={hoveredPoint.x}
                    y1={hoveredPoint.y}
                    x2={hoveredPoint.x}
                    y2={chartH - padBottom}
                    stroke="#fbbf24"
                    strokeWidth="1.25"
                    strokeDasharray="4,3"
                    opacity="0.75"
                  />
                  <circle
                    cx={padLeft}
                    cy={hoveredPoint.y}
                    r="3"
                    fill="#fbbf24"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={chartH - padBottom}
                    r="3"
                    fill="#fbbf24"
                  />
                </g>
              )}

              {/* Lollipop Sticks and Heads */}
              {analysisData.map((amc) => {
                const cx = getX(amc.avgHoldingDays);
                const cy = getYVal(amc.xirr);
                const cyZero = getYVal(0);

                const isHovered = hoveredPoint?.name === amc.name;
                const opacity = hoveredPoint ? (isHovered ? 1.0 : 0.25) : 0.85;

                // Color selection based on XIRR performance
                let color = "#3b82f6";
                if (amc.xirr >= 15) {
                  color = "#10b981";
                } else if (amc.xirr < 8) {
                  color = "#ef4444";
                } else if (amc.xirr < 11) {
                  color = "#f59e0b";
                }

                // Head radius based on weight
                const r = 6 + Math.sqrt(amc.weight) * 2.2;

                const shortName = amc.name
                  .replace(" Mutual Fund", "")
                  .replace(" India", "")
                  .replace(" Sun Life", "")
                  .replace(" Templeton", "")
                  .split(" ")
                  .slice(0, 2)
                  .join(" ");

                return (
                  <g
                    key={`lolipop-${amc.name}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        x: cx,
                        y: cy,
                        ...amc,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Glow ring on hover */}
                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 3.5}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeOpacity="0.5"
                        className="animate-ping"
                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                      />
                    )}

                    {/* Lollipop Stick */}
                    <line
                      x1={cx}
                      y1={cyZero}
                      x2={cx}
                      y2={cy}
                      stroke={color}
                      strokeWidth={isHovered ? "3.5" : "2"}
                      strokeDasharray={isHovered ? "0" : "3,2"}
                      opacity={opacity}
                      className="transition-all duration-200"
                    />

                    {/* Lollipop Head */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={color}
                      stroke={isHovered ? "#ffffff" : "#1e293b"}
                      strokeWidth={isHovered ? "2.5" : "1.5"}
                      opacity={opacity}
                      className="transition-all duration-200"
                    />

                    {/* Lollipop name label */}
                    <text
                      x={cx}
                      y={amc.xirr >= 0 ? cy - r - 5 : cy + r + 11}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={isHovered ? "black" : "semibold"}
                      fill={isHovered ? "#f1f5f9" : "#64748b"}
                      opacity={hoveredPoint ? (isHovered ? 1.0 : 0.3) : 0.85}
                      className="transition-all duration-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] font-sans"
                    >
                      {shortName}
                    </text>
                  </g>
                );
              })}

              {/* Custom Tooltip */}
              {hoveredPoint &&
                (() => {
                  const tooltipW = 200;
                  const tooltipH = 105;
                  let tx = hoveredPoint.x + 15;
                  if (tx + tooltipW > chartW) {
                    tx = hoveredPoint.x - tooltipW - 15;
                  }
                  let ty = hoveredPoint.y - tooltipH / 2;
                  if (ty < 10) ty = 10;
                  if (ty + tooltipH > chartH - 10) ty = chartH - tooltipH - 10;

                  return (
                    <g className="pointer-events-none transition-all duration-200">
                      <rect
                        x={tx}
                        y={ty}
                        width={tooltipW}
                        height={tooltipH}
                        rx="12"
                        fill="#0b0f19"
                        stroke="#1e293b"
                        strokeWidth="1.5"
                        className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
                      />

                      <text
                        x={tx + 12}
                        y={ty + 22}
                        fontSize="10"
                        fontWeight="black"
                        fill="#f1f5f9"
                      >
                        {hoveredPoint.name.split(" ").slice(0, 3).join(" ")}
                      </text>

                      <text x={tx + 12} y={ty + 42} fontSize="9" fill="#94a3b8">
                        Weight:{" "}
                        <tspan fill="#f1f5f9" fontWeight="bold">
                          {hoveredPoint.weight.toFixed(1)}%
                        </tspan>{" "}
                        ({formatInrCompact(hoveredPoint.current)})
                      </text>

                      <text x={tx + 12} y={ty + 60} fontSize="9" fill="#94a3b8">
                        {entityLabel} XIRR Return:{" "}
                        <tspan
                          fill={
                            hoveredPoint.xirr >= 15
                              ? "#2dd4bf"
                              : hoveredPoint.xirr >= 10
                                ? "#fbbf24"
                                : "#fb7185"
                          }
                          fontWeight="black"
                        >
                          {hoveredPoint.xirr.toFixed(2)}%
                        </tspan>
                      </text>

                      <text x={tx + 12} y={ty + 78} fontSize="9" fill="#94a3b8">
                        Avg. Holding Period:
                      </text>
                      <text
                        x={tx + 12}
                        y={ty + 92}
                        fontSize="8.5"
                        fill="#f1f5f9"
                        fontWeight="semibold"
                      >
                        {formatHoldingDays(hoveredPoint.avgHoldingDays)}
                      </text>
                    </g>
                  );
                })()}
            </svg>
          )}
        </div>
      </div>

      {/* Detailed allocation performance table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          {entityLabel} Performance Details
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                <th
                  className="pb-3 pr-4 pl-4 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("name")}
                >
                  {entityLabel} Name <SortIcon col="name" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("weight")}
                >
                  Weight <SortIcon col="weight" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("current")}
                >
                  Current Value <SortIcon col="current" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("invested")}
                >
                  Invested Value <SortIcon col="invested" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("gain")}
                >
                  Gain / Loss <SortIcon col="gain" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("cagr")}
                >
                  Weighted CAGR <SortIcon col="cagr" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("xirr")}
                >
                  {entityLabel} XIRR <SortIcon col="xirr" />
                </th>
                <th
                  className="pb-3 pl-4 text-right pr-4 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("avgHoldingDays")}
                >
                  Avg. Holding Period <SortIcon col="avgHoldingDays" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {analysisWithReturns.map((amc) => {
                const gainPct =
                  amc.invested > 0 ? (amc.gain / amc.invested) * 100 : 0;

                return (
                  <tr
                    key={amc.name}
                    className="hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 pr-4 pl-4 font-semibold text-slate-200">
                      {amc.name}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-400 tabular-nums">
                      {amc.weight.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-300 tabular-nums">
                      {formatCurrency(amc.current)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 tabular-nums">
                      {formatCurrency(amc.invested)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold tabular-nums ${
                        amc.gain >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(amc.gain)}
                      <span className="text-[10px] ml-1.5 font-normal opacity-85">
                        ({formatPercent(gainPct)})
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-extrabold tabular-nums ${
                        amc.cagr >= 15
                          ? "text-teal-400"
                          : amc.cagr >= 10
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {amc.cagr.toFixed(2)}%
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-extrabold tabular-nums ${
                        amc.xirr >= 15
                          ? "text-emerald-400"
                          : amc.xirr >= 10
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {amc.xirr.toFixed(2)}%
                    </td>
                    <td className="py-3 pl-4 text-right pr-4 text-slate-400 tabular-nums">
                      {formatHoldingDays(amc.avgHoldingDays)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Category colour palette (one distinct colour per SEBI category) ───────────
const CAT_PALETTE = [
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#ec4899", // pink
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fb923c", // orange
  "#f87171", // red
  "#60a5fa", // blue
  "#facc15", // yellow
  "#4ade80", // green
  "#e879f9", // fuchsia
  "#2dd4bf", // teal-light
  "#818cf8", // indigo-light
];
const CAT_DOT_CLASSES = [
  "bg-teal-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-orange-400",
  "bg-red-400",
  "bg-blue-400",
  "bg-yellow-400",
  "bg-green-400",
  "bg-fuchsia-400",
  "bg-teal-400",
  "bg-indigo-400",
];
const CAT_GRADIENT_CLASSES = [
  "bg-gradient-to-r from-teal-500 to-teal-400/50",
  "bg-gradient-to-r from-indigo-500 to-indigo-400/50",
  "bg-gradient-to-r from-amber-500 to-amber-400/50",
  "bg-gradient-to-r from-pink-500 to-pink-400/50",
  "bg-gradient-to-r from-cyan-400 to-cyan-300/50",
  "bg-gradient-to-r from-violet-400 to-violet-300/50",
  "bg-gradient-to-r from-emerald-400 to-emerald-300/50",
  "bg-gradient-to-r from-orange-400 to-orange-300/50",
  "bg-gradient-to-r from-red-400 to-red-300/50",
  "bg-gradient-to-r from-blue-400 to-blue-300/50",
  "bg-gradient-to-r from-yellow-400 to-yellow-300/50",
  "bg-gradient-to-r from-green-400 to-green-300/50",
  "bg-gradient-to-r from-fuchsia-400 to-fuchsia-300/50",
  "bg-gradient-to-r from-teal-400 to-teal-300/50",
  "bg-gradient-to-r from-indigo-400 to-indigo-300/50",
];
const CAT_BADGE_CLASSES = [
  "bg-teal-500/15 text-teal-300 border-teal-500/25",
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
  "bg-amber-500/15 text-amber-300 border-amber-500/25",
  "bg-pink-500/15 text-pink-300 border-pink-500/25",
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "bg-orange-500/15 text-orange-300 border-orange-500/25",
  "bg-red-500/15 text-red-300 border-red-500/25",
  "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
  "bg-green-500/15 text-green-300 border-green-500/25",
  "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
  "bg-teal-500/15 text-teal-300 border-teal-500/25",
  "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
];
const FALLBACK_DOT_CLASS = "bg-slate-500";
const FALLBACK_GRADIENT_CLASS =
  "bg-gradient-to-r from-slate-500 to-slate-400/50";
const FALLBACK_BADGE_CLASS =
  "bg-slate-500/15 text-slate-300 border-slate-500/25";

const ALLOCATION_ANALYSIS_SORT_KEYS: AllocationAnalysisSortKey[] = [
  "name",
  "weight",
  "current",
  "invested",
  "gain",
  "cagr",
  "avgHoldingDays",
  "xirr",
];

function getAllocationAnalysisSortKey(
  rawSortKey: string | null
): AllocationAnalysisSortKey {
  return ALLOCATION_ANALYSIS_SORT_KEYS.includes(
    rawSortKey as AllocationAnalysisSortKey
  )
    ? (rawSortKey as AllocationAnalysisSortKey)
    : "current";
}

function sortAllocationAnalysisData(
  analysisData: AmcPoint[],
  sortKey: AllocationAnalysisSortKey,
  sortDir: "asc" | "desc"
): AmcPoint[] {
  return [...analysisData].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];

    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }

    return sortDir === "asc" ? av - bv : bv - av;
  });
}

function mapAllocationAnalysisGroups(
  groups: AllocationAnalysisGroup[],
  totalCurrent: number
): AmcPoint[] {
  return groups
    .map((group) => {
      const cagr =
        group.totalCagrWeight > 0
          ? group.weightedCagrSum / group.totalCagrWeight
          : 0;
      const avgHoldingDays =
        group.totalHoldingDaysWeight > 0
          ? group.weightedHoldingDaysSum / group.totalHoldingDaysWeight
          : 0;
      const weight =
        totalCurrent > 0 ? (group.current / totalCurrent) * 100 : 0;
      const xirr =
        group.invested > 0 && avgHoldingDays > 0
          ? (Math.pow(group.current / group.invested, 365.25 / avgHoldingDays) -
              1) *
            100
          : 0;

      return {
        name: group.name,
        invested: group.invested,
        current: group.current,
        gain: group.gain,
        cagr,
        avgHoldingDays,
        weight,
        xirr,
      };
    })
    .sort((a, b) => b.current - a.current);
}

export default function InsightsDashboard({ data }: InsightsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get active tab from URL query parameters, default to "overview"
  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab =
    tabParam &&
    [
      "overview",
      "funds",
      "members",
      "sip",
      "actions",
      "overlaps",
      "amc",
      "category",
    ].includes(tabParam)
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
    { id: "overlaps", label: "Overlaps", icon: Layers },
    { id: "amc", label: "AMC Analysis", icon: LineChart },
    { id: "category", label: "Category Allocation", icon: Layers },
  ];

  // Decompiled reverse engineering portfolio insights
  const reverseInsights = useMemo(() => {
    let ashokVal = 0;
    let totalMsfl = 0;
    const msflStocks: Record<string, number> = {};
    for (const h of data.msflHoldings || []) {
      const val = (h.quantity || 0) * (h.currentPrice || 0);
      totalMsfl += val;
      if (h.symbol === "ASHOKLEY") {
        ashokVal = val;
      }
      msflStocks[h.symbol] = (msflStocks[h.symbol] || 0) + val;
    }
    const ashokPct = totalMsfl > 0 ? (ashokVal / totalMsfl) * 100 : 0;

    const sortedMsfl = Object.entries(msflStocks).sort((a, b) => b[1] - a[1]);
    const top3MsflVal = sortedMsfl
      .slice(0, 3)
      .reduce((sum, s) => sum + s[1], 0);
    const top3MsflPct = totalMsfl > 0 ? (top3MsflVal / totalMsfl) * 100 : 0;

    let totalRegularVal = 0;
    for (const s of data.schemes || []) {
      const name = s.scheme.toLowerCase();
      if (
        (name.includes("reg") || name.includes("regular")) &&
        !name.includes("direct")
      ) {
        totalRegularVal += s.current;
      }
    }
    const annualDrag = totalRegularVal * 0.01;

    const overlaps: CategoryOverlap[] = [];
    const catMap: Record<string, string[]> = {};
    for (const s of data.schemes || []) {
      if (!catMap[s.category]) {
        catMap[s.category] = [];
      }
      catMap[s.category].push(s.scheme);
    }
    for (const [cat, funds] of Object.entries(catMap)) {
      if (funds.length > 1) {
        overlaps.push({
          category: cat,
          count: funds.length,
          funds,
        });
      }
    }

    let sonalbenVal = 0;
    let totalMf = 0;
    for (const s of data.schemes || []) {
      totalMf += s.current;
      for (const h of s.holdings || []) {
        if (h.memberName.toLowerCase().includes("sonalben")) {
          sonalbenVal += h.current;
        }
      }
    }
    const sonalbenPct = totalMf > 0 ? (sonalbenVal / totalMf) * 100 : 0;

    return {
      ashokPct,
      top3MsflPct,
      totalRegularVal,
      annualDrag,
      overlaps: overlaps.sort((a, b) => b.count - a.count),
      sonalbenPct,
    };
  }, [data]);

  // Group mutual funds by category for overlap analysis
  const subCategoryGroups = useMemo(() => {
    const groups: Record<string, SubCategoryGroupItem[]> = {};

    for (const s of data.schemes || []) {
      const name = s.scheme;
      let subCat = "Other Equity";
      const nameLower = name.toLowerCase();
      const catLower = s.category.toLowerCase();

      if (
        catLower.includes("ulip") ||
        catLower.includes("insurance") ||
        nameLower.includes("ulis") ||
        nameLower.includes("ulip") ||
        nameLower.includes("unit linked")
      ) {
        subCat = "ULIP / Insurance-Linked";
      } else if (catLower.includes("multi asset")) {
        subCat = "Multi Asset Allocation";
      } else if (catLower.includes("aggressive hybrid")) {
        subCat = "Aggressive Hybrid";
      } else if (
        catLower.includes("large & mid") ||
        catLower.includes("large and mid") ||
        nameLower.includes("large & mid") ||
        nameLower.includes("large and mid")
      ) {
        subCat = "Large & Mid Cap";
      } else if (
        catLower.includes("mid cap") ||
        catLower.includes("midcap") ||
        nameLower.includes("mid cap") ||
        nameLower.includes("midcap")
      ) {
        subCat = "Mid Cap";
      } else if (catLower.includes("flexi") || nameLower.includes("flexi")) {
        subCat = "Flexi Cap";
      } else if (
        catLower.includes("multi cap") ||
        catLower.includes("multicap") ||
        nameLower.includes("multi cap") ||
        nameLower.includes("multicap")
      ) {
        subCat = "Multi Cap";
      } else if (
        catLower.includes("focused") ||
        nameLower.includes("focused")
      ) {
        subCat = "Focused Equity";
      } else if (
        catLower.includes("thematic") ||
        catLower.includes("opportunity") ||
        catLower.includes("opportunities") ||
        nameLower.includes("opportunities") ||
        nameLower.includes("opportunity") ||
        nameLower.includes("thematic")
      ) {
        subCat = "Thematic / Opportunities";
      } else if (
        catLower.includes("long-short") ||
        catLower.includes("aif") ||
        nameLower.includes("long-short") ||
        nameLower.includes("long short")
      ) {
        subCat = "Specialized Investment Fund - SIF";
      } else if (
        catLower.includes("large") ||
        nameLower.includes("large cap")
      ) {
        subCat = "Large Cap";
      } else if (catLower.includes("small") || nameLower.includes("smallcap")) {
        subCat = "Small Cap";
      } else if (catLower.includes("debt") || catLower.includes("liquid")) {
        subCat = "Debt & Liquid";
      } else if (
        catLower.includes("hybrid") ||
        catLower.includes("balanced") ||
        catLower.includes("alloc")
      ) {
        subCat = "Hybrid & Multi Asset";
      }

      if (!groups[subCat]) {
        groups[subCat] = [];
      }

      const totalValue = s.current;
      const holders = s.holdings.map((h) => h.memberName);

      // Calculate weighted average holding days
      let totalHoldingDays = 0;
      let totalHoldingWeight = 0;
      for (const h of s.holdings) {
        totalHoldingDays += (h.holdingDays || 0) * h.current;
        totalHoldingWeight += h.current;
      }
      const avgHoldingDays =
        totalHoldingWeight > 0 ? totalHoldingDays / totalHoldingWeight : 0;

      groups[subCat].push({
        schemeName: name,
        cagr: s.avgCagr,
        holders,
        totalValue,
        avgHoldingDays,
      });
    }

    // Sort funds in each category by CAGR descending
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => b.cagr - a.cagr);
    }

    return groups;
  }, [data]);

  const getAmcName = (name: string): string => {
    const n = name.trim();
    if (/^aditya birla/i.test(n)) return "Aditya Birla Sun Life Mutual Fund";
    if (/^axis/i.test(n)) return "Axis Mutual Fund";
    if (/^bajaj/i.test(n)) return "Bajaj Finserv Mutual Fund";
    if (/^bandhan/i.test(n)) return "Bandhan Mutual Fund";
    if (/^canara/i.test(n)) return "Canara Robeco Mutual Fund";
    if (/^dsp/i.test(n)) return "DSP Mutual Fund";
    if (/^edelweiss/i.test(n)) return "Edelweiss Mutual Fund";
    if (/^franklin/i.test(n)) return "Franklin Templeton Mutual Fund";
    if (/^hdfc/i.test(n)) return "HDFC Mutual Fund";
    if (/^hsbc/i.test(n)) return "HSBC Mutual Fund";
    if (/^icici pru/i.test(n)) return "ICICI Prudential Mutual Fund";
    if (/^invesco/i.test(n)) return "Invesco Mutual Fund";
    if (/^kotak/i.test(n)) return "Kotak Mutual Fund";
    if (/^lic/i.test(n)) return "LIC Mutual Fund";
    if (/^mirae/i.test(n)) return "Mirae Asset Mutual Fund";
    if (/^motilal/i.test(n)) return "Motilal Oswal Mutual Fund";
    if (/^nippon/i.test(n)) return "Nippon India Mutual Fund";
    if (/^pgim/i.test(n)) return "PGIM India Mutual Fund";
    if (/^ppfas/i.test(n) || /parag parikh/i.test(n))
      return "PPFAS Mutual Fund";
    if (/^quant/i.test(n)) return "Quant Mutual Fund";
    if (/^sbi/i.test(n)) return "SBI Mutual Fund";
    if (/^sundaram/i.test(n)) return "Sundaram Mutual Fund";
    if (/^tata/i.test(n)) return "Tata Mutual Fund";
    if (/^uti/i.test(n)) return "UTI Mutual Fund";
    if (/^whiteoak/i.test(n) || /white oak/i.test(n))
      return "WhiteOak Capital Mutual Fund";
    return n.split(" ")[0] + " Mutual Fund";
  };

  const amcData = useMemo<AmcPoint[]>(() => {
    const amcMap = new Map<string, AllocationAnalysisGroup>();

    let totalMfCurrent = 0;

    for (const s of data.schemes || []) {
      const amcName = getAmcName(s.scheme);
      totalMfCurrent += s.current;

      const existing = amcMap.get(amcName) || {
        name: amcName,
        invested: 0,
        current: 0,
        gain: 0,
        weightedCagrSum: 0,
        weightedHoldingDaysSum: 0,
        totalCagrWeight: 0,
        totalHoldingDaysWeight: 0,
      };

      existing.invested += s.invested;
      existing.current += s.current;
      existing.gain += s.gain;

      existing.weightedCagrSum += s.avgCagr * s.current;
      existing.totalCagrWeight += s.current;

      for (const h of s.holdings || []) {
        if (h.holdingDays) {
          existing.weightedHoldingDaysSum += h.holdingDays * h.current;
          existing.totalHoldingDaysWeight += h.current;
        }
      }

      amcMap.set(amcName, existing);
    }

    return mapAllocationAnalysisGroups(
      Array.from(amcMap.values()),
      totalMfCurrent
    );
  }, [data]);

  const categoryData = useMemo<AmcPoint[]>(() => {
    const categoryMap = new Map<string, AllocationAnalysisGroup>();

    let totalMfCurrent = 0;

    for (const s of data.schemes || []) {
      const categoryName = s.category || "Uncategorized";
      totalMfCurrent += s.current;

      const existing = categoryMap.get(categoryName) || {
        name: categoryName,
        invested: 0,
        current: 0,
        gain: 0,
        weightedCagrSum: 0,
        weightedHoldingDaysSum: 0,
        totalCagrWeight: 0,
        totalHoldingDaysWeight: 0,
      };

      existing.invested += s.invested;
      existing.current += s.current;
      existing.gain += s.gain;

      existing.weightedCagrSum += s.avgCagr * s.current;
      existing.totalCagrWeight += s.current;

      for (const h of s.holdings || []) {
        if (h.holdingDays) {
          existing.weightedHoldingDaysSum += h.holdingDays * h.current;
          existing.totalHoldingDaysWeight += h.current;
        }
      }

      categoryMap.set(categoryName, existing);
    }

    return mapAllocationAnalysisGroups(
      Array.from(categoryMap.values()),
      totalMfCurrent
    );
  }, [data]);

  const rawAmcSort = searchParams.get("amcSort");
  const amcSortKey = getAllocationAnalysisSortKey(rawAmcSort);

  const rawAmcOrder = searchParams.get("amcOrder");
  const amcSortDir = (
    rawAmcOrder === "asc" || rawAmcOrder === "desc" ? rawAmcOrder : "desc"
  ) as "asc" | "desc";

  const sortedAmcData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(amcData, amcSortKey, amcSortDir);
  }, [amcData, amcSortKey, amcSortDir]);

  const rawCategorySort = searchParams.get("categorySort");
  const categorySortKey = getAllocationAnalysisSortKey(rawCategorySort);

  const rawCategoryOrder = searchParams.get("categoryOrder");
  const categorySortDir = (
    rawCategoryOrder === "asc" || rawCategoryOrder === "desc"
      ? rawCategoryOrder
      : "desc"
  ) as "asc" | "desc";

  const sortedCategoryData = useMemo<AmcPoint[]>(() => {
    return sortAllocationAnalysisData(
      categoryData,
      categorySortKey,
      categorySortDir
    );
  }, [categoryData, categorySortKey, categorySortDir]);

  const handleAmcSort = (key: AllocationAnalysisSortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (amcSortKey === key) {
      params.set("amcOrder", amcSortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("amcSort", key);
      params.set("amcOrder", "desc");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCategorySort = (key: AllocationAnalysisSortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categorySortKey === key) {
      params.set("categoryOrder", categorySortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("categorySort", key);
      params.set("categoryOrder", "desc");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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

  // Category palette index — dynamically mapped from module-level palette constants
  const catPaletteIndexes = useMemo(() => {
    const map: Record<string, number> = {};
    data.categoryAllocation.forEach((c, i) => {
      map[c.category] = i % CAT_PALETTE.length;
    });
    return map;
  }, [data.categoryAllocation]);

  const getCategoryPaletteIndex = (category: string): number | null =>
    catPaletteIndexes[category] ?? null;

  const getCategoryColor = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null ? "#64748b" : CAT_PALETTE[index];
  };

  const getCategoryDotClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null ? FALLBACK_DOT_CLASS : CAT_DOT_CLASSES[index];
  };

  const getCategoryGradientClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null
      ? FALLBACK_GRADIENT_CLASS
      : CAT_GRADIENT_CLASSES[index];
  };

  const getCategoryBadgeClass = (category: string): string => {
    const index = getCategoryPaletteIndex(category);
    return index === null ? FALLBACK_BADGE_CLASS : CAT_BADGE_CLASSES[index];
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
                  value={formatInrCompact(data.totals.invested)}
                  icon={IndianRupee}
                  accentColor="indigo"
                />
                <MetricCard
                  label="Current Value"
                  value={formatInrCompact(data.totals.current)}
                  sub={`+${formatInrCompact(data.totals.gain)} gain`}
                  icon={TrendingUp}
                  accentColor="teal"
                />
                <MetricCard
                  label="Total Gain"
                  value={formatInrCompact(data.totals.gain)}
                  sub={`${formatPct(data.totals.absReturn)} absolute`}
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
                <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                    Category Allocation
                  </h2>
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar [scrollbar-gutter:stable]">
                    {data.categoryAllocation.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDotClass(cat.category)}`}
                            />
                            <span
                              className="font-semibold text-slate-200 truncate"
                              title={cat.category}
                            >
                              {cat.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="text-slate-500 hidden sm:inline">
                              {formatInrCompact(cat.current)}
                            </span>
                            <span
                              className={`font-semibold text-xs ${
                                cat.gain >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {cat.absReturn}%
                            </span>
                            <span className="font-bold text-slate-300 w-12 text-right tabular-nums">
                              {cat.allocation}%
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.allocation}%` }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            className={`h-full rounded-full ${getCategoryGradientClass(cat.category)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Donut */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 flex flex-col shadow-xl">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Allocation Mix
                  </h2>
                  <div className="flex justify-center">
                    <div className="w-36 h-36">
                      <DonutChart
                        slices={data.categoryAllocation.map((c) => ({
                          label: c.category,
                          value: c.allocation,
                          color: getCategoryColor(c.category),
                        }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
                    {data.categoryAllocation.map((c) => (
                      <div key={c.category} className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDotClass(c.category)}`}
                        />
                        <span
                          className="text-xs text-slate-400 truncate flex-1"
                          title={c.category}
                        >
                          {c.category}
                        </span>
                        <span className="text-xs font-semibold text-slate-300 tabular-nums shrink-0">
                          {c.allocation}%
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
                      {formatInrCompact(data.totals.totalMonthlySip)}
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
                                {formatInrCompact(total)}
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
                                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap border ${getCategoryBadgeClass(s.category)}`}
                                >
                                  {s.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                {formatInrCompact(s.invested)}
                              </td>
                              <td className="px-4 py-3 text-slate-200 font-mono text-xs font-semibold">
                                {formatInrCompact(s.current)}
                              </td>
                              <td className="px-4 py-3 text-emerald-400 font-mono text-xs font-semibold">
                                {formatInrCompact(s.gain)}
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
                                                  (hold.cagr ?? 0) >=
                                                  niftyBenchmark
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                }`}
                                              >
                                                {hold.cagr !== null &&
                                                hold.cagr !== undefined
                                                  ? `${hold.cagr.toFixed(2)}%`
                                                  : "-"}{" "}
                                                CAGR
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 mt-2.5 pt-2.5 border-t border-slate-800/50 text-xs text-slate-400">
                                              <div>
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Invested
                                                </span>
                                                <span className="font-mono text-slate-300">
                                                  {formatInrCompact(
                                                    hold.invested
                                                  )}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                  Current
                                                </span>
                                                <span className="font-mono text-slate-300 font-semibold">
                                                  {formatInrCompact(
                                                    hold.current
                                                  )}
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
                                                  {formatInrCompact(hold.gain)}
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
                  starting from {formatInrCompact(baseSip)}/mo
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
                            {formatInrCompact(row.monthlySip)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">
                            {formatInrCompact(row.monthlySip * 12)}
                          </td>
                          <td className="px-4 py-3 font-bold text-teal-300">
                            {formatInrCompact(row.corpus)}
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
              {/* Reverse Engineering & Strategic Portfolio Audit */}
              <div className="rounded-2xl border border-indigo-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-indigo-400 animate-pulse" />
                  Decompiled Portfolio Audit & Strategic Insights
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Ashok Leyland stock concentration */}
                  {reverseInsights.ashokPct > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Single-Stock Concentration
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                          High Risk
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        Ashok Leyland constitutes{" "}
                        <span className="text-rose-400 font-bold">
                          {reverseInsights.ashokPct.toFixed(1)}%
                        </span>{" "}
                        of your MSFL stock portfolio.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Top 3 stock positions in MSFL (Ashok Leyland, Reliance,
                        and NTPC) represent{" "}
                        <span className="text-slate-300 font-semibold">
                          {reverseInsights.top3MsflPct.toFixed(1)}%
                        </span>
                        . Scale back Ashok Leyland to under 15% of the account
                        to diversify sector risk.
                      </p>
                    </div>
                  )}

                  {/* Regular plan fee drag */}
                  {reverseInsights.totalRegularVal > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Expense Ratio Optimization
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                          Distributor Commission
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        You have{" "}
                        <span className="text-amber-400 font-bold">
                          {formatInrCompact(reverseInsights.totalRegularVal)}
                        </span>{" "}
                        locked in Regular Plans.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Switching to commission-free Direct Plans can save you
                        approximately{" "}
                        <span className="text-emerald-400 font-bold">
                          {formatInrCompact(reverseInsights.annualDrag)} every
                          single year
                        </span>
                        . Over 10 years compounding, this drag costs{" "}
                        <span className="text-slate-300 font-semibold">
                          ₹70 Lakhs+
                        </span>{" "}
                        in potential wealth.
                      </p>
                    </div>
                  )}

                  {/* Closet Indexing / Scheme overlaps */}
                  {reverseInsights.overlaps.length > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2 col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Closet Indexing & Scheme Redundancy
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
                          Portfolio Clutter
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        You hold multiple active schemes in overlapping
                        categories.
                      </p>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                        {reverseInsights.overlaps.slice(0, 3).map((ov) => (
                          <div
                            key={ov.category}
                            className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg"
                          >
                            <div className="flex justify-between text-xs font-bold text-slate-200">
                              <span>{ov.category}</span>
                              <span className="text-indigo-400">
                                {ov.count} Funds
                              </span>
                            </div>
                            <p
                              className="text-[10px] text-slate-500 mt-1 leading-normal truncate"
                              title={ov.funds.join(", ")}
                            >
                              {ov.funds.join(" · ")}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Consolidate these overlapping holdings. Holding 7
                        broad-market funds in identical styles dilutes active
                        outperformance and multiplies platform overhead. Keep
                        only 1 high-conviction fund per category.
                      </p>
                    </div>
                  )}

                  {/* Tax bracket optimization */}
                  {reverseInsights.sonalbenPct > 0 && (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2 col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Tax Bracket Optimization
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold uppercase">
                          PAN Exposure
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-snug">
                        Sonalben holds{" "}
                        <span className="text-teal-400 font-bold">
                          {reverseInsights.sonalbenPct.toFixed(1)}%
                        </span>{" "}
                        of the family mutual fund assets.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        This concentrates the future capital gains tax liability
                        (12.5% LTCG) heavily under one PAN. Distribute future
                        SIP allocations or rebalanced proceeds under other
                        family members (e.g. Alpeshkumar who holds just 1.4%) to
                        utilize lower-income slabs and save tax outgo.
                      </p>
                    </div>
                  )}
                </div>
              </div>

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

          {/* ── OVERLAPS ──────────────────────────────────────────────────────── */}
          {activeTab === "overlaps" && (
            <div className="space-y-6">
              {/* Overlaps Header Card */}
              <div className="rounded-2xl border border-teal-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <Layers className="text-teal-400" size={18} />
                  <h2 className="text-base font-bold text-slate-100">
                    Category Overlaps & Lumpsum Priorities
                  </h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This overview groups all your mutual funds into asset
                  sub-categories. The best performing fund in each group
                  (highest CAGR) is highlighted as the{" "}
                  <strong>Lumpsum Priority choice</strong> to help consolidate
                  family allocations.
                </p>
              </div>

              {/* Sub-Category Grids */}
              <div className="grid gap-6">
                {Object.entries(subCategoryGroups).map(
                  ([categoryName, schemes]) => {
                    if (schemes.length === 0) return null;
                    return (
                      <div
                        key={categoryName}
                        className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4"
                      >
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                          {categoryName} ({schemes.length} Funds)
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-800">
                            <thead>
                              <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="pb-3 pr-4">Scheme Name</th>
                                <th className="pb-3 px-4">Holders</th>
                                <th className="pb-3 px-4 text-right">Value</th>
                                <th className="pb-3 px-4 text-right">
                                  Holding Period
                                </th>
                                <th className="pb-3 px-4 text-right">
                                  Avg CAGR
                                </th>
                                <th className="pb-3 pl-4 text-right">
                                  Action / Recommendation
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-sm">
                              {schemes.map((s, idx) => {
                                const isWinner =
                                  idx === 0 && schemes.length > 1;
                                const isRegular =
                                  s.schemeName.toLowerCase().includes("reg") ||
                                  s.schemeName
                                    .toLowerCase()
                                    .includes("regular");

                                const formatHoldingDays = (days: number) => {
                                  return `${Math.round(days).toLocaleString("en-IN")} days`;
                                };

                                let recTag = "Consolidate / Switch";
                                let tagClass =
                                  "bg-slate-800/50 text-slate-400 border-slate-700/50";
                                if (isWinner) {
                                  if (s.avgHoldingDays < 365) {
                                    recTag = "🏆 Priority (Short History ⚠️)";
                                    tagClass =
                                      "bg-amber-500/15 text-amber-300 border-amber-500/25 font-semibold";
                                  } else {
                                    recTag = "🏆 Lumpsum Priority";
                                    tagClass =
                                      "bg-teal-500/15 text-teal-300 border-teal-500/20 font-bold";
                                  }
                                } else if (schemes.length === 1) {
                                  recTag = "Single Fund";
                                  tagClass =
                                    "bg-slate-800/60 text-slate-300 border-slate-700";
                                } else if (s.cagr < 8) {
                                  recTag = "Avoid / Underperforming";
                                  tagClass =
                                    "bg-rose-500/15 text-rose-400 border-rose-500/20";
                                }

                                return (
                                  <tr
                                    key={s.schemeName}
                                    className="hover:bg-slate-800/20 transition-colors"
                                  >
                                    <td
                                      className="py-3 pr-4 font-semibold text-slate-200"
                                      title={s.schemeName}
                                    >
                                      {s.schemeName}
                                      {isRegular && (
                                        <span className="text-[10px] ml-2 px-1 py-0.25 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded uppercase">
                                          Reg
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 text-xs">
                                      {s.holders.join(", ")}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-300">
                                      {formatInrCompact(s.totalValue)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-xs text-slate-400">
                                      {formatHoldingDays(s.avgHoldingDays)}
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-slate-100">
                                      {s.cagr.toFixed(2)}%
                                    </td>
                                    <td className="py-3 pl-4 text-right">
                                      <span
                                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${tagClass}`}
                                      >
                                        {recTag}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Total / Average Row */}
                              {schemes.length > 0 &&
                                (() => {
                                  const totalValueSum = schemes.reduce(
                                    (sum, s) => sum + s.totalValue,
                                    0
                                  );
                                  const avgCagr =
                                    totalValueSum > 0
                                      ? schemes.reduce(
                                          (sum, s) =>
                                            sum + s.cagr * s.totalValue,
                                          0
                                        ) / totalValueSum
                                      : 0;
                                  const avgHoldingDays =
                                    totalValueSum > 0
                                      ? schemes.reduce(
                                          (sum, s) =>
                                            sum +
                                            (s.avgHoldingDays || 0) *
                                              s.totalValue,
                                          0
                                        ) / totalValueSum
                                      : 0;
                                  return (
                                    <tr className="bg-slate-900/90 border-t-2 border-slate-800 font-bold text-slate-200">
                                      <td className="py-4 pr-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold pl-4">
                                        Total / Weighted Avg
                                      </td>
                                      <td className="py-4 px-4 text-xs text-slate-500 font-semibold">
                                        {schemes.length} Funds
                                      </td>
                                      <td className="py-4 px-4 text-right text-teal-400 font-black text-sm">
                                        {formatInrCompact(totalValueSum)}
                                      </td>
                                      <td className="py-4 px-4 text-right text-xs text-slate-300 font-bold">
                                        {Math.round(
                                          avgHoldingDays
                                        ).toLocaleString("en-IN")}{" "}
                                        days
                                      </td>
                                      <td className="py-4 px-4 text-right text-indigo-400 font-black text-sm">
                                        {avgCagr.toFixed(2)}%
                                      </td>
                                      <td className="py-4 pl-4 text-right pr-4">
                                        <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 font-bold uppercase tracking-wider">
                                          Summary
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {activeTab === "amc" && (
            <AllocationAnalysisTab
              analysisData={sortedAmcData}
              niftyBenchmark={niftyBenchmark}
              sortKey={amcSortKey}
              sortDir={amcSortDir}
              onSort={handleAmcSort}
              entityLabel="AMC"
              entityDescription="Asset Management Company (AMC)"
              title="AMC Exposure & Performance Analysis"
              downloadPrefix="amc"
            />
          )}

          {activeTab === "category" && (
            <AllocationAnalysisTab
              analysisData={sortedCategoryData}
              niftyBenchmark={niftyBenchmark}
              sortKey={categorySortKey}
              sortDir={categorySortDir}
              onSort={handleCategorySort}
              entityLabel="Category"
              entityDescription="mutual fund category"
              title="Category Allocation & Performance Analysis"
              downloadPrefix="category"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
