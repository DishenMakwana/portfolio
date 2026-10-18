"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ArrowLeftRight, FileSpreadsheet } from "lucide-react";
import { formatIndianAmount, getFundDetailsUrl } from "@/helpers/formatters";
import { formatDisplayDate } from "@/helpers/dates";
import FolioBadge from "@/components/shared/FolioBadge";
import type { SummarySoaStatementDrawerProps } from "@/types/summary";

export default function SummarySoaStatementDrawer({
  holding,
  isExpanded,
}: SummarySoaStatementDrawerProps): React.JSX.Element {
  const router = useRouter();
  const hasTransactions = holding.transactions.length > 0;
  const isSold = holding.isSold || holding.currentValue <= 0;
  const activeLots = holding.activeLots || [];
  const realizedLots = holding.realizedLots || [];

  const fundUrl = getFundDetailsUrl(
    holding.holdingId,
    isSold || holding.holdingId < 0
  );

  const defaultTab: "lots" | "realized" | "ledger" = isSold
    ? realizedLots.length > 0
      ? "realized"
      : "ledger"
    : activeLots.length > 0
      ? "lots"
      : "ledger";

  const [activeTab, setActiveTab] = useState<"lots" | "realized" | "ledger">(
    defaultTab
  );

  const sortedTransactions = useMemo(() => {
    return [...holding.transactions].sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id
    );
  }, [holding.transactions]);

  return (
    <AnimatePresence initial={false}>
      {isExpanded && hasTransactions && (
        <tr className="bg-slate-950/70 border-t border-slate-800">
          <td colSpan={11} className="p-0">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden p-3 pl-8"
            >
              <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 shadow-xl">
                {/* Header / Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    {!isSold && activeLots.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("lots")}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          activeTab === "lots"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                            : "text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-transparent"
                        }`}
                      >
                        <TrendingUp size={12} />
                        <span>Active Lots ({activeLots.length})</span>
                      </button>
                    )}

                    {realizedLots.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("realized")}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          activeTab === "realized"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-transparent"
                        }`}
                      >
                        <ArrowLeftRight size={12} />
                        <span>Realized Lots ({realizedLots.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab("ledger")}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "ledger"
                          ? "bg-slate-700 text-slate-200 border border-slate-600"
                          : "text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-transparent"
                      }`}
                    >
                      <FileSpreadsheet size={12} />
                      <span>Statement SOA ({sortedTransactions.length})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 hidden sm:flex truncate max-w-md">
                    <FolioBadge folioNo={holding.folioNo} />
                    <span className="text-[10.5px] text-slate-500">·</span>
                    <button
                      type="button"
                      onClick={() => router.push(fundUrl)}
                      className="hover:text-teal-400 transition cursor-pointer hover:underline text-left inline text-slate-400 text-xs truncate"
                    >
                      {holding.schemeName}
                    </button>
                  </div>
                </div>

                {/* Tab 1: Active Lots */}
                {activeTab === "lots" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10.5px] text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/50 font-semibold align-top">
                          <th className="py-1.5 px-2">Date</th>
                          <th className="py-1.5 px-2">Type</th>
                          <th className="py-1.5 px-2 text-right">Units</th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Purchase</div>
                            <div>NAV</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Current</div>
                            <div>NAV</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Purchase</div>
                            <div>Value</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Current</div>
                            <div>Value</div>
                          </th>
                          <th className="py-1.5 px-2 text-right">Gain</th>
                          <th className="py-1.5 px-1.5 text-right leading-tight">
                            <div>Holding</div>
                            <div>Days</div>
                          </th>
                          <th className="py-1.5 px-1.5 text-right leading-tight">
                            <div>Abs</div>
                            <div>Return (%)</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>XIRR</div>
                            <div>(%)</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {activeLots.map((lot) => (
                          <tr key={lot.id} className="hover:bg-slate-800/30">
                            <td className="py-1 px-2 text-slate-300 ">
                              {formatDisplayDate(lot.date)}
                            </td>
                            <td className="py-1 px-2 text-slate-400 font-medium">
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-400 uppercase">
                                {lot.transactionType || lot.type}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-300">
                              {lot.units.toLocaleString("en-IN", {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-400">
                              {lot.purchaseNav.toLocaleString("en-IN", {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              })}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-300">
                              {lot.currentNav.toLocaleString("en-IN", {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              })}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-200">
                              {formatIndianAmount(lot.purchaseAmount, 0)}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-100 font-semibold">
                              {formatIndianAmount(lot.currentValue, 0)}
                            </td>
                            <td
                              className={`py-1 px-2 text-right  font-semibold ${
                                lot.gain >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {formatIndianAmount(lot.gain, 0)}
                            </td>
                            <td className="py-1 px-1.5 text-right  text-slate-300">
                              {lot.holdingDays.toLocaleString("en-IN")}
                            </td>
                            <td
                              className={`py-1 px-1.5 text-right  font-semibold ${
                                lot.absReturn >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {lot.absReturn >= 0 ? "+" : ""}
                              {lot.absReturn.toFixed(2)}
                            </td>
                            <td
                              className={`py-1 px-2 text-right  font-semibold ${
                                lot.xirr >= 0
                                  ? "text-teal-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {lot.xirr >= 0 ? "+" : ""}
                              {lot.xirr.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 2: Realized Lots */}
                {activeTab === "realized" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10.5px] text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/50 font-semibold align-top">
                          <th className="py-1.5 px-2">Buy Date</th>
                          <th className="py-1.5 px-2">Sell Date</th>
                          <th className="py-1.5 px-2">Type</th>
                          <th className="py-1.5 px-2 text-right">Units</th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Buy</div>
                            <div>NAV</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Sell</div>
                            <div>NAV</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Cost</div>
                            <div>Basis</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Realized</div>
                            <div>Amount</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>Realized</div>
                            <div>Gain</div>
                          </th>
                          <th className="py-1.5 px-1.5 text-right leading-tight">
                            <div>Holding</div>
                            <div>Days</div>
                          </th>
                          <th className="py-1.5 px-1.5 text-right leading-tight">
                            <div>Abs</div>
                            <div>Return (%)</div>
                          </th>
                          <th className="py-1.5 px-2 text-right leading-tight">
                            <div>XIRR</div>
                            <div>(%)</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {realizedLots.map((lot, idx) => (
                          <tr
                            key={`${lot.id}-${idx}`}
                            className="hover:bg-slate-800/30"
                          >
                            <td className="py-1 px-2 text-slate-400 ">
                              {formatDisplayDate(lot.date)}
                            </td>
                            <td className="py-1 px-2 text-slate-300 ">
                              {lot.sellDate
                                ? formatDisplayDate(lot.sellDate)
                                : "—"}
                            </td>
                            <td className="py-1 px-2 text-slate-400 font-medium">
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/10 text-amber-400 uppercase">
                                {lot.transactionType || lot.type}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-300">
                              {lot.units.toLocaleString("en-IN", {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-400">
                              {lot.purchaseNav.toLocaleString("en-IN", {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              })}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-300">
                              {(lot.sellNav ?? 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              })}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-200">
                              {formatIndianAmount(lot.purchaseAmount, 0)}
                            </td>
                            <td className="py-1 px-2 text-right  text-slate-100 font-semibold">
                              {formatIndianAmount(lot.redemptionAmount ?? 0, 0)}
                            </td>
                            <td
                              className={`py-1 px-2 text-right  font-semibold ${
                                lot.gain >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {formatIndianAmount(lot.gain, 0)}
                            </td>
                            <td className="py-1 px-1.5 text-right  text-slate-300">
                              {lot.holdingDays.toLocaleString("en-IN")}
                            </td>
                            <td
                              className={`py-1 px-1.5 text-right  font-semibold ${
                                lot.absReturn >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {lot.absReturn >= 0 ? "+" : ""}
                              {lot.absReturn.toFixed(2)}
                            </td>
                            <td
                              className={`py-1 px-2 text-right  font-semibold ${
                                lot.xirr >= 0
                                  ? "text-teal-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {lot.xirr >= 0 ? "+" : ""}
                              {lot.xirr.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 3: Statement SOA Ledger */}
                {activeTab === "ledger" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 font-semibold bg-slate-950/50">
                          <th className="py-1 px-2">Date</th>
                          <th className="py-1 px-2">Type</th>
                          <th className="py-1 px-2 text-right">Units</th>
                          <th className="py-1 px-2 text-right">NAV</th>
                          <th className="py-1 px-2 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="border-b border-slate-800/40 text-slate-300"
                          >
                            <td className="py-1 px-2  text-slate-400">
                              {formatDisplayDate(tx.date)}
                            </td>
                            <td className="py-1 px-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  tx.type === "BUY"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {tx.transactionType}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-right ">
                              {tx.units.toFixed(3)}
                            </td>
                            <td className="py-1 px-2 text-right ">
                              ₹{tx.nav.toFixed(2)}
                            </td>
                            <td className="py-1 px-2 text-right  font-semibold text-slate-100">
                              {formatIndianAmount(tx.amount, 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </AnimatePresence>
  );
}
