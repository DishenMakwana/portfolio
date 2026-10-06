"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import {
  formatCroreOrLakh,
  formatProjectionChartData,
} from "@/helpers/futureProjection";
import type { FutureProjectionChartProps } from "@/types/futureProjection";

export function FutureProjectionChart({
  summary,
  targetAmount,
  monthlySip,
  expectedXirrPct,
  annualStepUpPct,
  annualLumpSum,
}: FutureProjectionChartProps) {
  const chartData = useMemo(
    () => formatProjectionChartData(summary.yearlyBreakdown),
    [summary.yearlyBreakdown]
  );

  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">
              Wealth Accumulation Curve
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Comparison between Cumulative Investment and Compound Portfolio
            Growth
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-200">
              Total Portfolio Value (Compounded)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-slate-200">
              Total Invested Capital (Principal + SIPs)
            </span>
          </div>
        </div>
      </div>

      {/* Y-Axis Unit Header */}
      <div className="flex justify-between items-center px-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Portfolio Amount (₹)
        </span>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            key={`future-chart-${targetAmount}-${monthlySip}-${expectedXirrPct}-${annualStepUpPct}-${annualLumpSum}`}
            data={chartData}
            margin={{ top: 15, right: 30, left: 15, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              opacity={0.4}
            />
            <XAxis
              dataKey="calendarYear"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              dy={5}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => formatCroreOrLakh(val)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="p-3 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md space-y-1.5 text-xs">
                    <div className="font-extrabold text-slate-200 border-b border-slate-800 pb-1">
                      Year: {label}
                    </div>
                    {payload.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: item.color || item.stroke,
                            }}
                          />
                          <span className="text-slate-300 font-medium">
                            {item.name}:
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-100">
                          {formatCurrency(Number(item.value || 0), 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={targetAmount}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: `Target: ${formatCroreOrLakh(targetAmount)}`,
                fill: "#f59e0b",
                fontSize: 11,
                position: "top",
              }}
            />
            <Area
              type="monotone"
              dataKey="endValue"
              name="Total Portfolio Value"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorValue)"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={100}
            />
            <Area
              type="monotone"
              dataKey="cumulativeInvested"
              name="Total Invested Capital"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorInvested)"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* X-Axis Unit Footer */}
      <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-1">
        Timeline (Calendar Year)
      </div>
    </div>
  );
}
