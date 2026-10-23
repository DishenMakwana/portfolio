"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { TrendingUp, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type {
  OverviewGrowthChartProps,
  CustomTooltipProps,
  CustomTooltipItem,
} from "@/types/overview";

function CustomAreaTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-slate-400 mb-2 font-semibold">{label}</p>
        {payload.map((p: CustomTooltipItem, i: number) => {
          const dotBg =
            p.name === "Current Value" ? "bg-teal-400" : "bg-slate-400";
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${dotBg}`} />
              <span className="text-slate-300">{p.name}:</span>
              <span className="font-bold text-slate-100">
                {formatCurrency(Number(p.value))}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export default function OverviewGrowthChart({
  timelineData,
}: OverviewGrowthChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                Portfolio Growth Timeline
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                Value vs Cost
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Current value vs. invested cost across uploaded snapshots
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-teal-400 inline-block" />
            <span className="text-slate-400">Current Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-violet-400 inline-block" />
            <span className="text-slate-400">Invested Cost</span>
          </div>
        </div>
      </div>
      <div className="h-80 w-full">
        {timelineData.length < 2 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
            <BarChart2 size={40} className="opacity-25" />
            <p className="text-sm">
              Upload more reports over time to see the growth chart.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              key={`overview-growth-chart-${timelineData.length}`}
              data={timelineData}
              margin={{ top: 10, right: 15, left: 8, bottom: 18 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tickFormatter={(tick) =>
                  Intl.NumberFormat("en-IN", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(tick)
                }
                width={56}
              >
                <Label
                  value="Portfolio Valuation (₹)"
                  angle={-90}
                  position="insideLeft"
                  offset={2}
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  style={{ textAnchor: "middle" }}
                />
              </YAxis>
              <Tooltip content={<CustomAreaTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Current Value"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
                dot={false}
                activeDot={{ r: 5, fill: "#10b981" }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={100}
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Invested Cost"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="6 4"
                fillOpacity={1}
                fill="url(#colorInvested)"
                dot={false}
                activeDot={{ r: 4, fill: "#8b5cf6" }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={200}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
