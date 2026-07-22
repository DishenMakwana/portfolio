"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import { isUnlistedStock } from "@/lib/stockApi";
import type { ZerodhaStocksTabProps } from "@/types/zerodha";

export default function ZerodhaStocksTab({
  stocks,
  renderStockSortIcon,
  toggleStockSort,
  stockSortField,
  stockSortOrder,
  formatPrice,
}: ZerodhaStocksTabProps) {
  const router = useRouter();
  const [stockSearch, setStockSearch] = useState("");

  const filteredStocks = stocks
    .filter((s) => s.symbol.toLowerCase().includes(stockSearch.toLowerCase()))
    .sort((a, b) => {
      const valA = a[stockSortField];
      const valB = b[stockSortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return stockSortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return stockSortOrder === "asc" ? numA - numB : numB - numA;
    });

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800/60">
        <div className="relative max-w-sm w-full">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search stock symbol..."
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full transition"
          />
        </div>
        <div className="text-xs text-slate-500 font-bold pr-1">
          Showing {filteredStocks.length} of {stocks.length} stocks
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleStockSort("symbol")}
              >
                <div className="flex items-center gap-1">
                  Stock Details {renderStockSortIcon("symbol")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("quantity")}
              >
                <div className="flex items-center justify-end gap-1">
                  Qty {renderStockSortIcon("quantity")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("averagePrice")}
              >
                <div className="flex items-center justify-end gap-1">
                  Avg Cost {renderStockSortIcon("averagePrice")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("currentPrice")}
              >
                <div className="flex items-center justify-end gap-1">
                  LTP {renderStockSortIcon("currentPrice")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("investedValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Invested {renderStockSortIcon("investedValue")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("currentValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Valuation {renderStockSortIcon("currentValue")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("unrealizedPnl")}
              >
                <div className="flex items-center justify-end gap-1">
                  Profit / Loss {renderStockSortIcon("unrealizedPnl")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("xirr")}
              >
                <div className="flex items-center justify-end gap-1">
                  XIRR {renderStockSortIcon("xirr")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleStockSort("alpha")}
              >
                <div className="flex items-center justify-end gap-1">
                  Alpha {renderStockSortIcon("alpha")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
            {filteredStocks.length > 0 ? (
              filteredStocks.map((s, idx) => (
                <tr
                  key={idx}
                  onClick={() => router.push(`/fund/z_${s.id}`)}
                  className="hover:bg-slate-950/45 transition cursor-pointer select-none"
                >
                  {/* Stock name + ISIN */}
                  <td className="p-4">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span>{s.symbol}</span>
                      {isUnlistedStock(s.symbol) && (
                        <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase animate-pulse leading-none">
                          Unlisted
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] shrink-0 whitespace-nowrap">
                        {s.instrumentType || "EQ"}
                      </span>
                      <span className="font-mono shrink-0">{s.isin}</span>
                    </div>
                  </td>
                  {/* Quantity */}
                  <td className="p-4 text-right font-bold text-slate-100">
                    {s.quantity}
                  </td>
                  {/* Avg cost */}
                  <td className="p-4 text-right font-medium text-slate-300">
                    {formatPrice(s.averagePrice)}
                  </td>
                  {/* LTP */}
                  <td className="p-4 text-right font-medium text-slate-200">
                    {formatPrice(s.currentPrice)}
                  </td>
                  {/* Invested */}
                  <td className="p-4 text-right font-medium text-slate-400">
                    {formatCurrency(s.investedValue)}
                  </td>
                  {/* Valuation */}
                  <td className="p-4 text-right font-bold text-slate-100">
                    {formatCurrency(s.currentValue)}
                  </td>
                  {/* P&L + abs return sub-line */}
                  <td className="p-4 text-right">
                    <div
                      className={`font-semibold ${
                        s.unrealizedPnl >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatCurrency(s.unrealizedPnl)}
                    </div>
                    <div
                      className={`text-[11px] ${
                        s.unrealizedPnl >= 0
                          ? "text-emerald-500/80"
                          : "text-red-500/80"
                      }`}
                    >
                      {s.unrealizedPnlPct >= 0 ? "+" : ""}
                      {s.unrealizedPnlPct.toFixed(1)}% Abs
                    </div>
                  </td>
                  {/* XIRR */}
                  <td
                    className={`p-4 text-right font-bold ${
                      s.xirr !== null && s.xirr !== undefined && s.xirr >= 0
                        ? "text-teal-400"
                        : s.xirr !== null && s.xirr !== undefined
                          ? "text-red-400"
                          : "text-teal-400"
                    }`}
                  >
                    {s.xirr !== null && s.xirr !== undefined
                      ? formatPercent(s.xirr)
                      : "-"}
                  </td>
                  {/* Alpha */}
                  <td className="p-4 text-right">
                    {s.alpha !== null && s.alpha !== undefined ? (
                      <span
                        className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${
                          s.alpha >= 0
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                            : "bg-red-950/80 text-red-400 border border-red-800/40"
                        }`}
                      >
                        {s.alpha >= 0 ? "+" : ""}
                        {s.alpha.toFixed(2)}%
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  No stocks found matching search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
