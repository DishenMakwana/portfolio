"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { formatCurrency, formatPercent } from "@/helpers/formatters";
import type { MsflTimeSeriesPoint } from "@/types/msfl";

interface MsflPortfolioTimeSeriesChartProps {
  timeSeries: MsflTimeSeriesPoint[];
  currentValuation: number;
  totalInvested: number;
}

export default function MsflPortfolioTimeSeriesChart({
  timeSeries,
  currentValuation,
  totalInvested,
}: MsflPortfolioTimeSeriesChartProps) {
  if (!timeSeries || timeSeries.length === 0) return null;

  const totalGain = currentValuation - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const isGain = totalGain >= 0;

  const formattedChartData = timeSeries.map((point) => {
    const formattedDate = point.timestamp
      ? new Date(point.timestamp).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : point.date;

    return {
      ...point,
      formattedDate,
    };
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm sm:text-base">
              Portfolio Growth & Valuation Time Series
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical portfolio valuation trajectory across uploaded snapshot
            dates
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <div className="text-slate-400">Current Value</div>
            <div className="font-bold text-slate-100 text-sm sm:text-base">
              {formatCurrency(currentValuation)}
            </div>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <div className="text-slate-400">Overall PnL</div>
            <div
              className={`font-extrabold text-sm sm:text-base ${
                isGain ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(totalGain)} ({formatPercent(gainPct)})
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedChartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="msflValuationGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="msflInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="formattedDate"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0]
                  .payload as (typeof formattedChartData)[0];
                const g = data.currentValue - data.invested;
                const gP = data.invested > 0 ? (g / data.invested) * 100 : 0;
                const gainPositive = g >= 0;

                return (
                  <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
                    <div className="text-slate-400 font-semibold border-b border-slate-800 pb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-teal-400" />
                        {data.formattedDate}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-200">
                      <span>Valuation:</span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(data.currentValue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-200">
                      <span>Invested:</span>
                      <span className="font-semibold text-slate-300">
                        {formatCurrency(data.invested)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-200 border-t border-slate-800/60 pt-1">
                      <span>Profit / Loss:</span>
                      <span
                        className={`font-extrabold ${
                          gainPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(g)} ({formatPercent(gP)})
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="currentValue"
              name="Valuation"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#msflValuationGrad)"
            />
            <Area
              type="monotone"
              dataKey="invested"
              name="Invested"
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#msflInvestedGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
