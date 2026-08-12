"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import { isUnlistedStock } from "@/lib/stockApi";
import type { MsflHoldingsSectionProps } from "@/types/msfl";

export default function MsflHoldingsSection({
  holdings,
  filteredHoldings,
  searchQuery,
  setSearchQuery,
  sortField,
  toggleSort,
  renderSortIcon,
  handleEditMapping,
  beatingFunds,
  laggingFunds,
}: MsflHoldingsSectionProps) {
  const router = useRouter();

  const filteredBase = useMemo(() => {
    return holdings.filter((h) =>
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [holdings, searchQuery]);

  const rankMap = useMemo(() => {
    const descSorted = [...filteredBase].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return valB.localeCompare(valA);
      }
      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return numB - numA;
    });

    const map = new Map<string, number>();
    descSorted.forEach((item, index) => {
      map.set(item.symbol, index + 1);
    });
    return map;
  }, [filteredBase, sortField]);

  return (
    <div className="space-y-6">
      {/* Holdings Table */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800/60">
          <div className="relative max-w-sm w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search stock symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-850 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full transition"
            />
          </div>
          <div className="text-xs text-slate-500 font-bold pr-1">
            Showing {filteredHoldings.length} of {holdings.length} stocks
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
                <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-12 select-none">
                  #
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => toggleSort("symbol")}
                >
                  <div className="flex items-center gap-1">
                    Stock {renderSortIcon("symbol")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("quantity")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Qty {renderSortIcon("quantity")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("averagePrice")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Avg Cost {renderSortIcon("averagePrice")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("currentPrice")}
                >
                  <div className="flex items-center justify-end gap-1">
                    LTP {renderSortIcon("currentPrice")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("investedValue")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Invested {renderSortIcon("investedValue")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("currentValue")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Valuation {renderSortIcon("currentValue")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("unrealizedPnl")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Profit / Loss {renderSortIcon("unrealizedPnl")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("cagr")}
                >
                  <div className="flex items-center justify-end gap-1">
                    XIRR/CAGR {renderSortIcon("cagr")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                  onClick={() => toggleSort("alpha")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Alpha {renderSortIcon("alpha")}
                  </div>
                </th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
              {filteredHoldings.length > 0 ? (
                filteredHoldings.map((h, idx) => (
                  <tr
                    key={idx}
                    onClick={() => router.push(`/fund/msfl_${h.id}`)}
                    className="hover:bg-slate-950/45 transition cursor-pointer select-none"
                  >
                    <td className="p-4 text-center font-mono text-xs font-bold text-slate-500">
                      {rankMap.get(h.symbol) ?? "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span>{h.symbol}</span>
                          {isUnlistedStock(h.symbol) && (
                            <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase animate-pulse leading-none">
                              Unlisted
                            </span>
                          )}
                          {h.tradingStatus && h.tradingStatus !== "Active" && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase leading-none border ${h.tradingStatus.includes("SUSPENDED") || h.tradingStatus.includes("DELETED") ? "bg-rose-950/80 text-rose-400 border-rose-800/40" : "bg-amber-950/80 text-amber-400 border-amber-800/40"}`}
                            >
                              {h.tradingStatus}
                            </span>
                          )}
                        </div>
                        {h.isin && (
                          <span className="text-[10px] text-slate-500 tracking-wider">
                            {h.isin}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-semibold text-slate-200">
                        {h.quantity}
                      </div>
                      {h.faceValue !== null && h.faceValue !== undefined && (
                        <div className="text-[10px] text-slate-500 font-medium">
                          FV: ₹{h.faceValue}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right font-medium text-slate-400">
                      {formatCurrency(h.averagePrice)}
                    </td>
                    <td className="p-4 text-right font-medium text-slate-200">
                      {formatCurrency(h.currentPrice)}
                    </td>
                    <td className="p-4 text-right font-medium text-slate-400">
                      {formatCurrency(h.investedValue)}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-100">
                      {formatCurrency(h.currentValue)}
                    </td>
                    <td className="p-4 text-right">
                      <div
                        className={`font-semibold ${h.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {formatCurrency(h.unrealizedPnl)}
                      </div>
                      <div
                        className={`text-[11px] ${h.unrealizedPnl >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}
                      >
                        {h.unrealizedPnlPct >= 0 ? "+" : ""}
                        {h.unrealizedPnlPct.toFixed(1)}%
                      </div>
                    </td>
                    <td
                      className={`p-4 text-right font-bold ${h.cagr !== null && h.cagr !== undefined && h.cagr >= 0 ? "text-teal-400" : h.cagr !== null && h.cagr !== undefined ? "text-red-400" : "text-teal-400"}`}
                    >
                      {h.cagr !== null && h.cagr !== undefined
                        ? `${h.cagr.toFixed(2)}%`
                        : "-"}
                    </td>
                    <td className="p-4 text-right">
                      {h.alpha !== null && h.alpha !== undefined ? (
                        <span
                          className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${h.alpha >= 0 ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-red-950/80 text-red-400 border border-red-800/40"}`}
                        >
                          {h.alpha >= 0 ? "+" : ""}
                          {h.alpha.toFixed(2)}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMapping(h);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-700 transition cursor-pointer"
                      >
                        Edit Ticker
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    No stocks found matching search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outperforming vs Underperforming breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-emerald-500/10 bg-slate-900/70 p-5 shadow-xl">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-400">
            <CheckCircle2 size={16} />
            Outperforming Nifty ({beatingFunds.length})
          </h3>
          <div className="space-y-3">
            {beatingFunds.length > 0 ? (
              beatingFunds.map((f) => (
                <div
                  key={f.symbol}
                  className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {f.symbol}
                    </p>
                    <p className="text-xs text-slate-500">
                      P&amp;L: {formatCurrency(f.unrealizedPnl)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-emerald-400">
                    {typeof f.cagr === "number"
                      ? `${f.cagr.toFixed(2)}% CAGR`
                      : "N/A"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                No stocks outperforming the nifty benchmark.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-rose-500/10 bg-slate-900/70 p-5 shadow-xl">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-rose-400">
            <AlertTriangle size={16} />
            Underperforming Nifty ({laggingFunds.length})
          </h3>
          <div className="space-y-3">
            {laggingFunds.length > 0 ? (
              laggingFunds.map((f) => (
                <div
                  key={f.symbol}
                  className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {f.symbol}
                    </p>
                    <p className="text-xs text-slate-500">
                      P&amp;L: {formatCurrency(f.unrealizedPnl)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-rose-400">
                    {typeof f.cagr === "number"
                      ? `${f.cagr.toFixed(2)}% CAGR`
                      : "N/A"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                All stocks outperforming the nifty benchmark.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
