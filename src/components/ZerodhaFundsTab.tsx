"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import type { ZerodhaFundsTabProps } from "@/types/zerodha";

export default function ZerodhaFundsTab({
  funds,
  renderFundSortIcon,
  toggleFundSort,
  fundSortField,
  fundSortOrder,
}: ZerodhaFundsTabProps) {
  const router = useRouter();
  const [fundSearch, setFundSearch] = useState("");

  const filteredFunds = funds
    .filter((f) => f.symbol.toLowerCase().includes(fundSearch.toLowerCase()))
    .sort((a, b) => {
      const valA = a[fundSortField];
      const valB = b[fundSortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return fundSortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return fundSortOrder === "asc" ? numA - numB : numB - numA;
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
        <table className="w-full min-w-[1180px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700/80">
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("symbol")}
              >
                <div className="flex items-center gap-1">
                  Scheme Details {renderFundSortIcon("symbol")}
                </div>
              </th>
              <th className="p-4">Holder</th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("currentValue")}
              >
                <div className="flex items-center gap-1">
                  Valuation {renderFundSortIcon("currentValue")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("unrealizedPnl")}
              >
                <div className="flex items-center gap-1">
                  Profit/Loss {renderFundSortIcon("unrealizedPnl")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => toggleFundSort("holdingDays")}
              >
                <div className="flex items-center gap-1">
                  Holding Days {renderFundSortIcon("holdingDays")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("cagr")}
              >
                <div className="flex items-center gap-1">
                  CAGR {renderFundSortIcon("cagr")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("xirr")}
              >
                <div className="flex items-center gap-1">
                  XIRR {renderFundSortIcon("xirr")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleFundSort("alpha")}
              >
                <div className="flex items-center gap-1">
                  Alpha {renderFundSortIcon("alpha")}
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
                      className="font-bold text-slate-100 break-words max-w-[320px] text-base leading-snug"
                      title={f.symbol}
                    >
                      {f.symbol}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] capitalize">
                        {f.instrumentType || "Mutual Fund"}
                      </span>
                      <span>• Units: {f.quantity.toFixed(3)}</span>
                      <span>• NAV: ₹{f.currentPrice.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-200 uppercase tracking-wide">
                    Dishen
                  </td>
                  <td className="p-4 font-bold text-slate-100">
                    <div>{formatCurrency(f.currentValue)}</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Cost: {formatCurrency(f.investedValue)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div
                      className={`font-semibold ${f.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {formatCurrency(f.unrealizedPnl)}
                    </div>
                    <div
                      className={`text-[11px] ${f.unrealizedPnl >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}
                    >
                      {f.unrealizedPnlPct.toFixed(1)}% Abs
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-200 whitespace-nowrap">
                    {f.holdingDays ?? "-"}
                  </td>
                  <td
                    className={`p-4 font-bold ${
                      f.cagr !== null && f.cagr !== undefined && f.cagr >= 0
                        ? "text-slate-200"
                        : f.cagr !== null && f.cagr !== undefined
                          ? "text-red-400"
                          : "text-slate-200"
                    }`}
                  >
                    {f.cagr !== null && f.cagr !== undefined
                      ? formatPercent(f.cagr)
                      : "-"}
                  </td>
                  <td
                    className={`p-4 font-bold ${
                      f.xirr !== null && f.xirr !== undefined && f.xirr >= 0
                        ? "text-teal-400"
                        : f.xirr !== null && f.xirr !== undefined
                          ? "text-red-400"
                          : "text-teal-400"
                    }`}
                  >
                    {f.xirr !== null && f.xirr !== undefined
                      ? formatPercent(f.xirr)
                      : "-"}
                  </td>
                  <td className="p-4">
                    {f.alpha !== null && f.alpha !== undefined ? (
                      <span
                        className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${
                          f.alpha >= 0
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                            : "bg-red-950/80 text-red-400 border border-red-800/40"
                        }`}
                      >
                        {f.alpha >= 0 ? "+" : ""}
                        {f.alpha.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
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
