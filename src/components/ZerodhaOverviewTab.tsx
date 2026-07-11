"use client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart2, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import type { ZerodhaHolding } from "./ZerodhaDashboard";

interface ZerodhaOverviewTabProps {
  data: {
    assetSplit: { name: string; value: number }[];
    sectorAllocation: { name: string; value: number }[];
    categoryAllocation: { name: string; value: number }[];
    totals: {
      currentValue: number;
      invested: number;
      gain: number;
      absoluteReturn: number;
      stocksInvested: number;
      stocksCurrentValue: number;
      stocksGain: number;
      fundsInvested: number;
      fundsCurrentValue: number;
      fundsGain: number;
    };
    timelineData: {
      date: string;
      equity: number;
      mutualFunds: number;
      nifty50: number;
      equityReturn: number;
      fundsReturn: number;
      niftyReturn: number;
    }[];
  };
  holdings: ZerodhaHolding[];
  COLORS: string[];
}

const CustomPerformanceTooltip = ({ active, payload }: any) => {
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

export default function ZerodhaOverviewTab({
  data,
  holdings,
  COLORS,
}: ZerodhaOverviewTabProps) {
  const router = useRouter();
  const totals = data.totals;

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
                    >
                      {data.assetSplit.map((entry, index) => (
                        <Cell
                          key={`asset-${entry.name}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const entry = payload[0].payload;
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
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
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
                    >
                      {data.sectorAllocation.slice(0, 5).map((entry, index) => (
                        <Cell
                          key={`sector-${entry.name}`}
                          fill={COLORS[(index + 2) % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const entry = payload[0].payload;
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
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{
                          backgroundColor: COLORS[(index + 2) % COLORS.length],
                        }}
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
                      <div
                        className="bg-teal-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
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
                      <div
                        className="bg-violet-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
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
      </div>
    </div>
  );
}
