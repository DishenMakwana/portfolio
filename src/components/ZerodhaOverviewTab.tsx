"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Sector,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart2,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  formatCurrency,
  formatPointDelta,
  formatNullablePercent,
} from "@/helpers/formatters";
import { useRouter } from "next/navigation";
import type { PieSectorDataItem } from "recharts";
import type {
  CustomPerformanceTooltipProps,
  SimplePiePayload,
  SimplePieTooltipProps,
  ZerodhaOverviewTabProps,
} from "@/types/zerodha";

const ZERODHA_COLOR_CLASSES = [
  "bg-emerald-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-red-500",
];

const CustomPerformanceTooltip = ({
  active,
  payload,
}: CustomPerformanceTooltipProps): React.JSX.Element | null => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1.5 shadow-2xl">
        <p className="font-bold text-slate-100 border-b border-slate-800 pb-1 mb-1">
          {data.date}
        </p>
        <div className="space-y-1">
          <p className="text-emerald-400 font-semibold flex justify-between gap-4">
            <span>Equity:</span>
            <span>
              {data.equity.toLocaleString()} (
              {data.equityReturn >= 0 ? "+" : ""}
              {data.equityReturn}%)
            </span>
          </p>
          <p className="text-violet-400 font-semibold flex justify-between gap-4">
            <span>Mutual Funds:</span>
            <span>
              {data.mutualFunds.toLocaleString()} (
              {data.fundsReturn >= 0 ? "+" : ""}
              {data.fundsReturn}%)
            </span>
          </p>
          <p className="text-amber-400 font-semibold flex justify-between gap-4">
            <span>Nifty 50:</span>
            <span>
              {data.nifty50.toLocaleString()} (
              {data.niftyReturn >= 0 ? "+" : ""}
              {data.niftyReturn}%)
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

function DeltaBadge({
  delta,
  label = "vs prev",
}: {
  delta: number | null;
  label?: string;
}) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        No prior snapshot
      </span>
    );
  }

  const isUp = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
        isUp
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
    >
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {formatPointDelta(delta)} {label}
    </span>
  );
}

export default function ZerodhaOverviewTab({
  data,
  holdings,
  COLORS,
}: ZerodhaOverviewTabProps) {
  const router = useRouter();
  const totals = data.totals;

  const insights = useMemo(() => {
    const stockHoldings = holdings.filter((h) => h.holdingType === "equity");
    const fundHoldings = holdings.filter(
      (h) => h.holdingType === "mutual_fund"
    );

    const totalVal = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    const sortedStocks = [...stockHoldings].sort(
      (a, b) => b.currentValue - a.currentValue
    );
    const topStock = sortedStocks[0] || null;

    const sortedFunds = [...fundHoldings].sort(
      (a, b) => b.currentValue - a.currentValue
    );
    const topFund = sortedFunds[0] || null;

    const sortedAll = [...holdings].sort(
      (a, b) => b.currentValue - a.currentValue
    );
    const top3Val = sortedAll
      .slice(0, 3)
      .reduce((sum, h) => sum + h.currentValue, 0);
    const top3Pct = totalVal > 0 ? (top3Val / totalVal) * 100 : 0;

    let diversificationStatus = "Well Diversified";
    let statusColor = "text-emerald-400";
    if (top3Pct > 70) {
      diversificationStatus = "Highly Concentrated";
      statusColor = "text-amber-400";
    } else if (top3Pct > 45) {
      diversificationStatus = "Moderately Concentrated";
      statusColor = "text-teal-400";
    }

    const amcMap: Record<string, number> = {};
    for (const h of fundHoldings) {
      if (h.symbol) {
        const amc = h.symbol.split(" ")[0];
        amcMap[amc] = (amcMap[amc] || 0) + h.currentValue;
      }
    }
    let topAmc = "—";
    let topAmcVal = 0;
    for (const [name, val] of Object.entries(amcMap)) {
      if (val > topAmcVal) {
        topAmc = name;
        topAmcVal = val;
      }
    }
    const amcPct = totalVal > 0 ? (topAmcVal / totalVal) * 100 : 0;

    const fundHoldingsWithDays = fundHoldings.filter(
      (h) => h.holdingDays !== null && h.holdingDays !== undefined
    );
    const fundDays = fundHoldingsWithDays.reduce(
      (sum, h) => sum + (h.holdingDays || 0),
      0
    );
    const avgDays =
      fundHoldingsWithDays.length > 0
        ? Math.round(fundDays / fundHoldingsWithDays.length)
        : 0;

    return {
      stocksCount: stockHoldings.length,
      fundsCount: fundHoldings.length,
      topStock,
      topStockPct:
        topStock && totalVal > 0 ? (topStock.currentValue / totalVal) * 100 : 0,
      topFund,
      topFundPct:
        topFund && totalVal > 0 ? (topFund.currentValue / totalVal) * 100 : 0,
      top3Pct,
      diversificationStatus,
      statusColor,
      topAmc,
      amcPct,
      avgDays,
    };
  }, [holdings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Split & Top holdings */}
      <div className="lg:col-span-2 space-y-6">
        {/* Asset Split (Pie) & Allocation (Bar) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asset Class Split */}
          <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-slate-100 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
              <span className="w-1 h-4 bg-teal-400 rounded-full inline-block" />
              Asset Distribution
            </h3>
            <div className="h-48 flex items-center justify-center">
              {data.assetSplit.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.assetSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      shape={(props: PieSectorDataItem & { index: number }) => (
                        <Sector
                          {...props}
                          fill={COLORS[props.index % COLORS.length]}
                        />
                      )}
                    />
                    <Tooltip
                      content={({
                        active,
                        payload,
                      }: SimplePieTooltipProps): React.JSX.Element | null => {
                        if (
                          active &&
                          payload &&
                          payload.length &&
                          payload[0].payload
                        ) {
                          const entry = payload[0].payload as SimplePiePayload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs">
                              <p className="font-bold text-slate-100">
                                {entry.name}
                              </p>
                              <p className="text-slate-400 mt-1">
                                {formatCurrency(entry.value)} (
                                {(
                                  (entry.value / totals.currentValue) *
                                  100
                                ).toFixed(1)}
                                %)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 text-xs">No split data</div>
              )}
            </div>
            <div className="space-y-2 mt-4">
              {data.assetSplit.map((entry, index) => {
                const pct =
                  totals.currentValue > 0
                    ? (entry.value / totals.currentValue) * 100
                    : 0;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${ZERODHA_COLOR_CLASSES[index % ZERODHA_COLOR_CLASSES.length]}`}
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium">
                          {entry.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-bold">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fund categories or sectors summary */}
          <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-slate-100 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
              <span className="w-1 h-4 bg-teal-400 rounded-full inline-block" />
              Sector Weightages
            </h3>
            <div className="h-48 flex items-center justify-center">
              {data.sectorAllocation.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sectorAllocation.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                      shape={(props: PieSectorDataItem & { index: number }) => (
                        <Sector
                          {...props}
                          fill={COLORS[(props.index + 2) % COLORS.length]}
                        />
                      )}
                    />
                    <Tooltip
                      content={({
                        active,
                        payload,
                      }: SimplePieTooltipProps): React.JSX.Element | null => {
                        if (
                          active &&
                          payload &&
                          payload.length &&
                          payload[0].payload
                        ) {
                          const entry = payload[0].payload as SimplePiePayload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs">
                              <p className="font-bold text-slate-100">
                                {entry.name}
                              </p>
                              <p className="text-slate-400 mt-1">
                                {formatCurrency(entry.value)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 text-xs">No sector data</div>
              )}
            </div>
            <div className="space-y-2 mt-4">
              {data.sectorAllocation.slice(0, 5).map((entry, index) => {
                const totalSectorValue =
                  data.sectorAllocation.reduce(
                    (acc, curr) => acc + curr.value,
                    0
                  ) || 1;
                const pct = (entry.value / totalSectorValue) * 100;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${ZERODHA_COLOR_CLASSES[(index + 2) % ZERODHA_COLOR_CLASSES.length]}`}
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium truncate max-w-[140px]">
                          {entry.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-bold">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Holdings Table */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 pt-5 pb-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BarChart2 size={18} className="text-teal-400" />
              Top Holdings by Valuation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Highest value positions across equity & funds
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
                  <th className="p-3">Asset</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Invested</th>
                  <th className="p-3 text-right">Valuation</th>
                  <th className="p-3 text-right">P&amp;L</th>
                  <th className="p-3 text-right">Return %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
                {holdings
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .slice(0, 6)
                  .map((h, i) => (
                    <tr
                      key={i}
                      onClick={() => {
                        if (h.holdingType === "mutual_fund") {
                          router.push(`/fund/z_${h.id}`);
                        }
                      }}
                      className={`hover:bg-slate-950/45 transition ${
                        h.holdingType === "mutual_fund"
                          ? "cursor-pointer select-none"
                          : ""
                      }`}
                    >
                      <td className="p-3 font-bold text-slate-100">
                        {h.symbol}
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          {h.holdingType === "equity" ? "EQ" : "MF"}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {formatCurrency(h.investedValue)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-slate-100">
                          {formatCurrency(h.currentValue)}
                        </div>
                      </td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          h.unrealizedPnl >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatCurrency(h.unrealizedPnl)}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${
                            h.unrealizedPnl >= 0
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                              : "bg-red-950/80 text-red-400 border border-red-800/40"
                          }`}
                        >
                          {h.unrealizedPnlPct >= 0 ? "+" : ""}
                          {h.unrealizedPnlPct.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Portfolio Performance Chart */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="text-teal-400" size={18} />
                Portfolio Performance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Growth comparison of Equity, Mutual Funds, and Nifty 50 Index
                (Base 1,000)
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-400">Equity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="text-slate-400">Mutual Funds</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />
                <span
                  className="text-slate-400"
                  title="UTI Nifty 50 Index Fund Direct Growth"
                >
                  Nifty 50
                </span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            {data.timelineData.length < 2 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                <BarChart2 size={40} className="opacity-25" />
                <p className="text-sm">
                  Upload more reports over time to view performance history.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.timelineData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(tick) => `${Number(tick).toLocaleString()}`}
                  />
                  <Tooltip content={<CustomPerformanceTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    name="Equity"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#10b981" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mutualFunds"
                    name="Mutual Funds"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#f59e0b" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nifty50"
                    name="Nifty 50"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Side summary details */}
      <div className="space-y-6">
        {/* XIRR Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest">
              XIRR vs Benchmark
            </h4>
            <div className="bg-teal-500/10 p-1.5 rounded-lg">
              <Target size={14} className="text-teal-400" />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Your Portfolio</span>
                <span className="flex items-center gap-2 font-bold text-teal-400">
                  {formatNullablePercent(totals.portfolioXirr)}
                  <DeltaBadge
                    delta={data.metricDeltas.portfolioXirr}
                    label=""
                  />
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(Math.max(totals.portfolioXirr, 0) * 2.5, 100)}%`,
                  }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Nifty 50 Index</span>
                <span className="flex items-center gap-2 font-bold text-violet-400">
                  {formatNullablePercent(totals.benchmarkXirr)}
                  <DeltaBadge
                    delta={data.metricDeltas.benchmarkXirr}
                    label=""
                  />
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-violet-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(Math.max(totals.benchmarkXirr, 0) * 2.5, 100)}%`,
                  }}
                  transition={{ delay: 0.4, duration: 0.7 }}
                />
              </div>
            </div>
            <div
              className={`text-center text-[11px] font-bold py-1.5 rounded-lg ${
                totals.alpha >= 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <span>
                Alpha: {totals.alpha >= 0 ? "+" : ""}
                {totals.alpha.toFixed(2)}% —{" "}
                {totals.alpha >= 0 ? "Beating the market" : "Lagging behind"}
              </span>
              <span className="ml-2 inline-flex align-middle">
                <DeltaBadge delta={data.metricDeltas.alpha} label="" />
              </span>
            </div>
          </div>
        </motion.div>

        {/* Mutual Fund Category Allocation list */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-4">
            Fund Allocation
          </h3>
          <div className="space-y-4">
            {data.categoryAllocation.length > 0 ? (
              data.categoryAllocation.map((cat, index) => {
                const totalFundsVal = totals.fundsCurrentValue || 1;
                const pct = (cat.value / totalFundsVal) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span
                        className="text-slate-300 truncate max-w-[170px]"
                        title={cat.name}
                      >
                        {cat.name}
                      </span>
                      <span className="text-slate-400">
                        {formatCurrency(cat.value)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-teal-500 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 text-xs">No funds allocated</div>
            )}
          </div>
        </div>

        {/* Equity Sector breakdown list */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-4">
            Stock Sectors
          </h3>
          <div className="space-y-4">
            {data.sectorAllocation.length > 0 ? (
              data.sectorAllocation.slice(0, 8).map((sec, index) => {
                const totalStocksVal = totals.stocksCurrentValue || 1;
                const pct = (sec.value / totalStocksVal) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span
                        className="text-slate-300 truncate max-w-[170px]"
                        title={sec.name}
                      >
                        {sec.name}
                      </span>
                      <span className="text-slate-400">
                        {formatCurrency(sec.value)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-violet-500 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 text-xs">
                No equity sectors allocated
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Stats & Insights Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-3 hover:border-slate-700/80 transition-all duration-300"
        >
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <Activity size={15} className="text-teal-400 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">
              Portfolio Stats & Insights
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Holdings Count */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Holdings Count
              </div>
              <div className="text-base font-extrabold text-slate-100">
                {insights.stocksCount} Stocks / {insights.fundsCount} Funds
              </div>
              <div className="text-[10px] text-slate-500">
                Active positions in account
              </div>
            </div>

            {/* Concentration */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Top 3 Concentration
              </div>
              <div className="text-base font-extrabold text-slate-100">
                {insights.top3Pct.toFixed(1)}%
              </div>
              <div className={`text-[10px] font-bold ${insights.statusColor}`}>
                {insights.diversificationStatus}
              </div>
            </div>

            {/* Top AMC Exposure */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Top AMC Exposure
              </div>
              <div
                className="text-base font-extrabold text-slate-100 truncate"
                title={insights.topAmc}
              >
                {insights.topAmc}
              </div>
              <div className="text-[10px] text-teal-400 font-bold">
                {insights.amcPct.toFixed(1)}% share
              </div>
            </div>

            {/* Avg Holding Period */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Avg Holding Age
              </div>
              <div className="text-base font-extrabold text-slate-100">
                {insights.avgDays} Days
              </div>
              <div className="text-[10px] text-slate-500">
                per mutual fund scheme
              </div>
            </div>
          </div>

          {/* Top Assets */}
          <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-2 text-xs">
            {insights.topStock ? (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">
                  Top Stock Asset
                </span>
                <span
                  className="text-teal-400 font-bold truncate max-w-[180px] text-right"
                  title={insights.topStock.symbol}
                >
                  {insights.topStock.symbol} ({insights.topStockPct.toFixed(1)}%
                  share)
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">
                  Top Stock Asset
                </span>
                <span className="text-slate-500">—</span>
              </div>
            )}
            {insights.topFund ? (
              <div className="flex justify-between items-center border-t border-slate-800/50 pt-2">
                <span className="text-slate-400 font-medium">
                  Top Mutual Fund
                </span>
                <span
                  className="text-violet-400 font-bold truncate max-w-[180px] text-right"
                  title={insights.topFund.symbol}
                >
                  {insights.topFund.symbol.split(" ")[0]} (
                  {insights.topFundPct.toFixed(1)}% share)
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center border-t border-slate-800/50 pt-2">
                <span className="text-slate-400 font-medium">
                  Top Mutual Fund
                </span>
                <span className="text-slate-500">—</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
