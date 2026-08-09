"use client";

import { useState } from "react";
import { PieChart, Pie, Sector, ResponsiveContainer, Tooltip } from "recharts";
import type { PieSectorDataItem } from "recharts";
import { PieChart as PieIcon, ShieldAlert, Layers } from "lucide-react";
import { formatCurrency, formatPercent } from "@/helpers/formatters";
import type {
  ZerodhaSectorBreakdownItem,
  ZerodhaMarketCapBreakdownItem,
} from "@/types/zerodha";

interface ZerodhaSectorAndCapAnalysisProps {
  sectorBreakdown: ZerodhaSectorBreakdownItem[];
  marketCapBreakdown: ZerodhaMarketCapBreakdownItem[];
}

const SECTOR_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#64748b", // Slate
];

const CAP_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  "Large Cap": {
    label: "Large Cap",
    bg: "bg-blue-950/40 hover:bg-blue-950/60",
    text: "text-blue-400",
    border: "border-blue-800/40",
    desc: "Established industry leaders (> ₹20k Cr)",
  },
  "Mid Cap": {
    label: "Mid Cap",
    bg: "bg-teal-950/40 hover:bg-teal-950/60",
    text: "text-teal-400",
    border: "border-teal-800/40",
    desc: "High-growth candidates (₹5k - ₹20k Cr)",
  },
  "Small Cap": {
    label: "Small Cap",
    bg: "bg-amber-950/40 hover:bg-amber-950/60",
    text: "text-amber-400",
    border: "border-amber-800/40",
    desc: "Emerging small businesses (₹1k - ₹5k Cr)",
  },
  "Micro Cap": {
    label: "Micro Cap",
    bg: "bg-rose-950/40 hover:bg-rose-950/60",
    text: "text-rose-400",
    border: "border-rose-800/40",
    desc: "High volatility early opportunities (< ₹1k Cr)",
  },
};

export default function ZerodhaSectorAndCapAnalysis({
  sectorBreakdown,
  marketCapBreakdown,
}: ZerodhaSectorAndCapAnalysisProps) {
  const pieData = sectorBreakdown.map((s, idx) => ({
    name: s.sector,
    value: s.currentValue,
    allocationPct: s.allocationPct,
    color: SECTOR_COLORS[idx % SECTOR_COLORS.length],
  }));

  const totalPortfolioValue = sectorBreakdown.reduce(
    (acc, curr) => acc + curr.currentValue,
    0
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeSector =
    activeIndex !== null && pieData[activeIndex] ? pieData[activeIndex] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
      {/* Sector Allocation Donut Chart & Breakdown */}
      <div className="lg:col-span-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <PieIcon size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest">
                Sector Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Distribution across {sectorBreakdown.length} sectors
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-1">
          {/* Donut Chart with Center Summary Label */}
          <div className="sm:col-span-5 h-[240px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  shape={(
                    props: PieSectorDataItem & {
                      index: number;
                      cx: number;
                      cy: number;
                      midAngle?: number;
                    }
                  ) => {
                    const isHovered = activeIndex === props.index;
                    const midAngle = props.midAngle ?? 0;
                    const RADIAN = Math.PI / 180;
                    const popDist = isHovered ? 7 : 0;
                    const dx = Math.cos(-midAngle * RADIAN) * popDist;
                    const dy = Math.sin(-midAngle * RADIAN) * popDist;
                    const opacity =
                      activeIndex === null || isHovered ? 1 : 0.45;

                    return (
                      <g className="transition-all duration-300 cursor-pointer">
                        <Sector
                          {...props}
                          cx={props.cx + dx}
                          cy={props.cy + dy}
                          outerRadius={
                            isHovered
                              ? (props.outerRadius ?? 88) + 4
                              : props.outerRadius
                          }
                          fill={pieData[props.index]?.color || "#3b82f6"}
                          opacity={opacity}
                        />
                      </g>
                    );
                  }}
                />
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  className="fill-slate-400 font-medium text-[11px] tracking-wide uppercase"
                >
                  {activeSector
                    ? activeSector.name.length > 14
                      ? `${activeSector.name.slice(0, 12)}..`
                      : activeSector.name
                    : "Total Value"}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  className="fill-teal-400 font-extrabold text-xs tracking-tight"
                >
                  {activeSector
                    ? formatCurrency(activeSector.value)
                    : formatCurrency(totalPortfolioValue)}
                </text>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md">
                        <div className="font-bold text-slate-100">
                          {data.name}
                        </div>
                        <div className="text-slate-300">
                          Valuation: {formatCurrency(data.value)}
                        </div>
                        <div className="text-teal-400 font-semibold">
                          Weight: {data.allocationPct.toFixed(1)}%
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sectors Breakdown List */}
          <div className="sm:col-span-7 space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
            {sectorBreakdown.map((sec, idx) => {
              const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
              const isGain = sec.gain >= 0;
              return (
                <div
                  key={sec.sector}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 text-xs hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate max-w-[130px]">
                        {sec.sector}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sec.stockCount} stock{sec.stockCount > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2.5">
                    <div>
                      <div className="font-extrabold text-slate-100">
                        {formatCurrency(sec.currentValue)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sec.allocationPct.toFixed(1)}% weight
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                        isGain
                          ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/40"
                          : "bg-rose-950/70 text-rose-400 border border-rose-800/40"
                      }`}
                    >
                      {formatPercent(sec.gainPct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Market Cap Distribution Cards */}
      <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight">
                Market Cap Distribution
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Market capital risk breakdown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded-lg font-semibold">
            <ShieldAlert size={12} />
            <span>Risk Profile</span>
          </div>
        </div>

        <div className="space-y-3 flex-1 flex flex-col justify-between">
          {marketCapBreakdown.map((item) => {
            const config = CAP_CONFIG[item.category] || CAP_CONFIG["Small Cap"];
            return (
              <div
                key={item.category}
                className={`p-3.5 rounded-xl border ${config.bg} ${config.border} space-y-2 transition`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-extrabold ${config.text}`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {item.stockCount} stock{item.stockCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-100">
                    <span>{formatCurrency(item.currentValue)}</span>
                    <span className="text-[11px] text-slate-400">
                      ({item.allocationPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.category === "Large Cap"
                        ? "bg-blue-500"
                        : item.category === "Mid Cap"
                          ? "bg-teal-400"
                          : item.category === "Small Cap"
                            ? "bg-amber-400"
                            : "bg-rose-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(2, item.allocationPct))}%`,
                    }}
                  />
                </div>

                <div className="text-[10px] text-slate-400 italic">
                  {config.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
