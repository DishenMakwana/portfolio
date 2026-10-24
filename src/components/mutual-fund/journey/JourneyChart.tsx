"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency, formatIndianAmount } from "@/helpers/formatters";
import { formatDisplayDate } from "@/helpers/dates";
import type {
  JourneyChartProps,
  JourneyChartTooltipProps,
} from "@/types/journey";

function CustomJourneyTooltip({ active, payload }: JourneyChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const mv = point.marketValue || 0;
  const net = point.netInvestment || 0;
  const gain = mv - net;
  const gainPct = net > 0 ? (gain / net) * 100 : 0;
  const isPositive = gain >= 0;

  return (
    <div className="rounded-xl bg-slate-950/95 border border-slate-800 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2.5 min-w-[210px]">
      <div className="font-semibold text-slate-300 border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
        <span>{point.displayDate || point.date}</span>
        <span className="text-[10px] text-slate-500 font-mono">
          {point.date}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Current Value:</span>
          </div>
          <span className="font-bold text-emerald-400">
            {formatCurrency(mv)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-slate-400">Net Investment:</span>
          </div>
          <span className="font-bold text-sky-400">{formatCurrency(net)}</span>
        </div>

        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <span className="text-slate-400">Unrealized Gain:</span>
          <span
            className={`font-semibold ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {formatIndianAmount(gain)} ({gainPct > 0 ? "+" : ""}
            {gainPct.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function JourneyChart({
  points,
  startDate,
  endDate,
}: JourneyChartProps) {
  // Calculate dynamic yDomain with 15% top & bottom headroom padding per standard
  const { yMin, yMax } = useMemo(() => {
    if (!points || points.length === 0) {
      return { yMin: 0, yMax: 100000 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const p of points) {
      const val1 = p.marketValue || 0;
      const val2 = p.netInvestment || 0;
      if (val1 < min) min = val1;
      if (val2 < min) min = val2;
      if (val1 > max) max = val1;
      if (val2 > max) max = val2;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      min = 0;
      max = 100000;
    }

    const range = max - min;
    const padding = Math.max(range * 0.15, 5000);
    const computedMin = Math.max(0, Math.floor(min - padding));
    const computedMax = Math.ceil(max + padding);

    return { yMin: computedMin, yMax: computedMax };
  }, [points]);

  const yTickFormatter = (val: number): string => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)} K`;
    return `₹${val}`;
  };

  return (
    <div className="w-full h-[380px] sm:h-[440px] rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 sm:p-5 backdrop-blur-md shadow-xl shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 px-1 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Market Value vs Net Investment Trajectory
          </div>
          {startDate && endDate && (
            <span className="text-[11px] text-teal-400/90 font-mono font-medium">
              ({formatDisplayDate(startDate)} to {formatDisplayDate(endDate)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300 font-medium">Current Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
            <span className="text-slate-300 font-medium">Net Investment</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[310px] sm:h-[370px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 15, right: 20, left: 10, bottom: 15 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
              opacity={0.6}
            />
            <XAxis
              dataKey="displayDate"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              dy={8}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tickFormatter={yTickFormatter}
              dx={-5}
            />
            <Tooltip content={<CustomJourneyTooltip />} />

            {/* Blue Line: Net Investment */}
            <Line
              type="monotone"
              dataKey="netInvestment"
              name="Net Investment"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={{
                r: 3,
                fill: "#38bdf8",
                stroke: "#0f172a",
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 6,
                fill: "#38bdf8",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />

            {/* Green Line: Market Value (Current Value) */}
            <Line
              type="monotone"
              dataKey="marketValue"
              name="Current Value"
              stroke="#10b981"
              strokeWidth={2.8}
              dot={{
                r: 3.5,
                fill: "#10b981",
                stroke: "#0f172a",
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 6.5,
                fill: "#10b981",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
