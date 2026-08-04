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
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="text-teal-400" size={18} />
            Portfolio Growth Timeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Current value vs. invested cost across uploaded snapshots
          </p>
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
              data={timelineData}
              margin={{ top: 15, right: 20, left: 15, bottom: 30 }}
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
                fontSize={11}
                tickLine={false}
                height={45}
                tick={{ dy: 2 }}
              >
                <Label
                  value="Snapshot Date"
                  position="insideBottom"
                  offset={0}
                  fill="#94a3b8"
                  fontSize={11}
                  fontWeight={700}
                />
              </XAxis>
              <YAxis
                stroke="#475569"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(tick) =>
                  "₹" +
                  Intl.NumberFormat("en-IN", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(tick)
                }
                width={65}
              >
                <Label
                  value="Portfolio Valuation (₹)"
                  angle={-90}
                  position="insideLeft"
                  style={{
                    textAnchor: "middle",
                    fill: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
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
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
