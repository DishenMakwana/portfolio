"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { buildFyTrendChartData } from "@/helpers/financial-year";
import { FyTrendTooltip } from "./FyTrendTooltip";
import type { FyTrendChartProps } from "@/types/insights";

export function FyTrendChart({
  comparisonRows,
  metric,
  onMetricChange,
}: FyTrendChartProps) {
  const chartData = useMemo(
    () => buildFyTrendChartData(comparisonRows, metric),
    [comparisonRows, metric]
  );

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Financial Year Return Trend ({metric.toUpperCase()})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical portfolio {metric.toUpperCase()} vs UTI Nifty 50
              Benchmark across financial years
            </p>
          </div>
        </div>

        {/* Metric Toggle Buttons (Matching Screenshot Reference UI) */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => onMetricChange("xirr")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all cursor-pointer ${
              metric === "xirr"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            XIRR
          </button>
          <button
            type="button"
            onClick={() => onMetricChange("cagr")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all cursor-pointer ${
              metric === "cagr"
                ? "bg-emerald-600/90 text-emerald-100 shadow-md border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            CAGR View
          </button>
        </div>
      </div>

      {/* Legend Summary */}
      <div className="flex items-center justify-between flex-wrap gap-4 text-xs font-medium px-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
            <span className="text-slate-300 font-semibold">
              My Investment {metric.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-blue-400 inline-block shadow-sm border border-blue-500/40" />
            <span className="text-slate-400">
              Nifty 50 Benchmark {metric.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="text-slate-400 text-[11px]">
          Data points:{" "}
          <span className="text-slate-200 font-bold">
            {comparisonRows.length} Financial Years
          </span>
        </div>
      </div>

      {/* Line Chart */}
      <div className="h-84 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            key={`fy-trend-chart-${metric}-${chartData.length}`}
            data={chartData}
            margin={{ top: 10, right: 15, left: 8, bottom: 18 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="fyLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              height={34}
              tick={{ dy: 3 }}
            >
              <Label
                value="Financial Year"
                position="insideBottom"
                offset={-8}
                fill="#94a3b8"
                fontSize={10}
                fontWeight={600}
              />
            </XAxis>
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
              width={56}
            >
              <Label
                value={`${metric.toUpperCase()} Return Rate (%)`}
                angle={-90}
                position="insideLeft"
                offset={2}
                fill="#94a3b8"
                fontSize={10}
                fontWeight={600}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip content={<FyTrendTooltip metric={metric} />} />
            <Line
              type="linear"
              dataKey="portfolio"
              name={`My Investment ${metric.toUpperCase()}`}
              stroke="#10b981"
              strokeWidth={3}
              dot={{
                r: 5,
                fill: "#10b981",
                stroke: "#0f172a",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 7,
                fill: "#34d399",
                stroke: "#0f172a",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={100}
            />
            <Line
              type="linear"
              dataKey="benchmark"
              name={`Nifty 50 Benchmark ${metric.toUpperCase()}`}
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{
                r: 4,
                fill: "#3b82f6",
                stroke: "#0f172a",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "#60a5fa",
                stroke: "#0f172a",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={200}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
