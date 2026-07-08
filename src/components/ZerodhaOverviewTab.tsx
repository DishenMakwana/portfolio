"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon, BarChart2 } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
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
  };
  holdings: ZerodhaHolding[];
  COLORS: string[];
}

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
                          key={`cell-${index}`}
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
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="text-slate-300 font-medium">
                        {entry.name}
                      </span>
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
                          key={`cell-${index}`}
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
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{
                          backgroundColor: COLORS[(index + 2) % COLORS.length],
                        }}
                      />
                      <span className="text-slate-300 font-medium truncate max-w-[140px]">
                        {entry.name}
                      </span>
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
                        {formatCurrency(cat.value)} ({pct.toFixed(0)}%)
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
                        {formatCurrency(sec.value)} ({pct.toFixed(0)}%)
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
