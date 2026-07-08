"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import type { ZerodhaHolding } from "./ZerodhaDashboard";

interface ZerodhaFundsTabProps {
  funds: ZerodhaHolding[];
  renderFundSortIcon: (field: any) => React.ReactNode;
  toggleFundSort: (field: any) => void;
  fundSortField: string;
  fundSortOrder: "asc" | "desc";
  formatPrice: (v: number) => string;
}

export default function ZerodhaFundsTab({
  funds,
  renderFundSortIcon,
  toggleFundSort,
  fundSortField,
  fundSortOrder,
  formatPrice,
}: ZerodhaFundsTabProps) {
  const router = useRouter();
  const [fundSearch, setFundSearch] = useState("");

  const filteredFunds = funds
    .filter((f) => f.symbol.toLowerCase().includes(fundSearch.toLowerCase()))
    .sort((a, b) => {
      let valA: any = a[fundSortField as keyof ZerodhaHolding];
      let valB: any = b[fundSortField as keyof ZerodhaHolding];
      if (typeof valA === "string") {
        return fundSortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return fundSortOrder === "asc"
        ? (valA || 0) - (valB || 0)
        : (valB || 0) - (valA || 0);
    });

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
      {/* Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800/60">
        <div className="relative max-w-sm w-full">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search scheme name..."
            value={fundSearch}
            onChange={(e) => setFundSearch(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full transition"
          />
        </div>
        <div className="text-xs text-slate-500 font-bold pr-1">
          Showing {filteredFunds.length} of {funds.length} funds
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("symbol")}
              >
                <div className="flex items-center gap-1">
                  Scheme {renderFundSortIcon("symbol")}
                </div>
              </th>
              <th className="p-4">Category</th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("quantity")}
              >
                <div className="flex items-center justify-end gap-1">
                  Units {renderFundSortIcon("quantity")}
                </div>
              </th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("averagePrice")}
              >
                <div className="flex items-center justify-end gap-1">
                  Avg Price {renderFundSortIcon("averagePrice")}
                </div>
              </th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("currentPrice")}
              >
                <div className="flex items-center justify-end gap-1">
                  LTP {renderFundSortIcon("currentPrice")}
                </div>
              </th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("investedValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Invested {renderFundSortIcon("investedValue")}
                </div>
              </th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("currentValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Valuation {renderFundSortIcon("currentValue")}
                </div>
              </th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("unrealizedPnl")}
              >
                <div className="flex items-center justify-end gap-1">
                  P&amp;L {renderFundSortIcon("unrealizedPnl")}
                </div>
              </th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("unrealizedPnlPct")}
              >
                <div className="flex items-center justify-end gap-1">
                  Return % {renderFundSortIcon("unrealizedPnlPct")}
                </div>
              </th>
              <th
                className="p-4 text-right cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("xirr")}
              >
                <div className="flex items-center justify-end gap-1">
                  XIRR {renderFundSortIcon("xirr")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
            {filteredFunds.length > 0 ? (
              filteredFunds.map((f, idx) => (
                <tr
                  key={idx}
                  onClick={() => router.push(`/fund/z_${f.id}`)}
                  className="hover:bg-slate-950/45 transition cursor-pointer select-none"
                >
                  <td className="p-4">
                    <div
                      className="font-bold text-slate-100 break-words max-w-[280px]"
                      title={f.symbol}
                    >
                      {f.symbol}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {f.isin}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400 capitalize">
                    {f.instrumentType || "Mutual Fund"}
                  </td>
                  <td className="p-4 text-right text-slate-300 font-medium">
                    {f.quantity.toFixed(3)}
                  </td>
                  <td className="p-4 text-right text-slate-400">
                    {formatPrice(f.averagePrice)}
                  </td>
                  <td className="p-4 text-right text-slate-400">
                    {formatPrice(f.currentPrice)}
                  </td>
                  <td className="p-4 text-right text-slate-400">
                    {formatCurrency(f.investedValue)}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-100">
                    {formatCurrency(f.currentValue)}
                  </td>
                  <td
                    className={`p-4 text-right font-semibold ${
                      f.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatCurrency(f.unrealizedPnl)}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${
                        f.unrealizedPnl >= 0
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                          : "bg-red-950/80 text-red-400 border border-red-800/40"
                      }`}
                    >
                      {f.unrealizedPnlPct >= 0 ? "+" : ""}
                      {f.unrealizedPnlPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-teal-400">
                    {f.xirr !== null && f.xirr !== undefined
                      ? formatPercent(f.xirr)
                      : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  No mutual funds found matching search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
