"use client";

import { motion } from "framer-motion";
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
import { Activity, BarChart2 } from "lucide-react";
import { formatPercent } from "@/helpers/formatters";
import type {
  OverviewXirrChartProps,
  CustomTooltipProps,
  CustomTooltipItem,
} from "@/types/overview";

function CustomXirrTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-slate-400 mb-2 font-semibold">{label}</p>
        {payload.map((p: CustomTooltipItem, i: number) => {
          const color =
            p.name === "Portfolio XIRR" ? "text-amber-400" : "text-violet-400";
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-slate-300">{p.name}:</span>
              <span className={`font-bold ${color}`}>
                {formatPercent(Number(p.value))}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export default function OverviewXirrChart({
  timelineData,
}: OverviewXirrChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 shrink-0">
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                XIRR Return Timeline
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                Benchmark Comparison
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Portfolio XIRR vs benchmark XIRR across uploaded snapshot dates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-slate-400">Portfolio XIRR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-violet-400 inline-block" />
            <span
              className="text-slate-400"
              title="UTI Nifty 50 Index Fund Direct Growth (120716)"
            >
              Benchmark (UTI Nifty 50)
            </span>
          </div>
        </div>
      </div>
      <div className="h-80 w-full">
        {timelineData.length < 2 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
            <BarChart2 size={40} className="opacity-25" />
            <p className="text-sm">
              Upload more reports over time to compare XIRR history.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              key={`overview-xirr-chart-${timelineData.length}`}
              data={timelineData}
              margin={{ top: 10, right: 15, left: 8, bottom: 18 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                height={34}
                tick={{ dy: 3 }}
              >
                <Label
                  value="Snapshot Date"
                  position="insideBottom"
                  offset={-8}
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                />
              </XAxis>
              <YAxis
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(tick) => `${Number(tick).toFixed(0)}%`}
                width={56}
              >
                <Label
                  value="XIRR Return (%)"
                  angle={-90}
                  position="insideLeft"
                  offset={2}
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  style={{ textAnchor: "middle" }}
                />
              </YAxis>
              <Tooltip content={<CustomXirrTooltip />} />
              <Line
                type="monotone"
                dataKey="portfolioXirr"
                name="Portfolio XIRR"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#f59e0b" }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={100}
              />
              <Line
                type="monotone"
                dataKey="benchmarkXirr"
                name="Benchmark XIRR"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#8b5cf6" }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={200}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
