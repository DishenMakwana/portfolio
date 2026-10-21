import { motion, AnimatePresence } from "framer-motion";
import { FileSpreadsheet } from "lucide-react";
import FolioBadge from "@/components/shared/FolioBadge";
import { formatDisplayDate } from "@/helpers/dates";
import { formatIndianAmount } from "@/helpers/formatters";
import type { ValuationSoaDrawerProps } from "@/types/valuation";

export default function ValuationSoaDrawer({
  holding,
  isExpanded,
}: ValuationSoaDrawerProps): React.JSX.Element {
  const sortedTransactions = [...holding.transactions].sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id
  );

  return (
    <AnimatePresence initial={false}>
      {isExpanded && holding.transactions.length > 0 && (
        <tr className="bg-slate-950/80 border-b border-slate-800">
          <td colSpan={12} className="p-0">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden py-2 px-4"
            >
              <div className="bg-slate-900/90 border border-teal-500/20 rounded-xl overflow-hidden shadow-lg p-2.5">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-xs">
                  <span className="font-bold text-teal-400 flex items-center gap-1.5">
                    <FileSpreadsheet size={13} /> Transaction SOA Breakdown (
                    {holding.transactions.length} lots)
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <FolioBadge folioNo={holding.folioNo} />
                    <span className="text-[10.5px] text-slate-500">·</span>
                    <span className="text-slate-400 font-medium truncate max-w-sm">
                      {holding.schemeName}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[10.5px] text-left">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/50">
                        <th className="py-1.5 px-2 font-semibold">Date</th>
                        <th className="py-1.5 px-2 font-semibold">Type</th>
                        <th className="py-1.5 px-2 text-right font-semibold">
                          Units
                        </th>
                        <th className="py-1.5 px-2 text-right font-semibold leading-tight">
                          <div>Purchase</div>
                          <div>NAV</div>
                        </th>

                        <th className="py-1.5 px-2 text-right font-semibold leading-tight">
                          <div>Current</div>
                          <div>NAV</div>
                        </th>
                        <th className="py-1.5 px-2 text-right font-semibold leading-tight">
                          <div>Purchase</div>
                          <div>Value</div>
                        </th>
                        <th className="py-1.5 px-2 text-right font-semibold leading-tight">
                          <div>Current</div>
                          <div>Value</div>
                        </th>
                        <th className="py-1.5 px-2 text-right font-semibold">
                          Gain
                        </th>
                        <th className="py-1.5 px-1.5 text-right font-semibold leading-tight">
                          <div>Holding</div>
                          <div>Days</div>
                        </th>
                        <th className="py-1.5 px-1.5 text-right font-semibold leading-tight">
                          <div>Abs</div>
                          <div>Return (%)</div>
                        </th>
                        <th className="py-1.5 px-2 text-right font-semibold leading-tight">
                          <div>XIRR</div>
                          <div>(%)</div>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/40">
                      {sortedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="py-1 px-2 text-slate-300 ">
                            {formatDisplayDate(tx.date)}
                          </td>

                          <td className="py-1 px-2 text-slate-400 font-medium">
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-800 text-slate-300 uppercase">
                              {tx.transactionType || tx.type}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-right  text-slate-300">
                            {tx.units.toLocaleString("en-IN", {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })}
                          </td>
                          <td className="py-1 px-2 text-right  text-slate-400">
                            {tx.purchaseNav.toLocaleString("en-IN", {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td className="py-1 px-2 text-right  text-slate-300">
                            {tx.currentNav.toLocaleString("en-IN", {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td className="py-1 px-2 text-right  text-slate-200">
                            {formatIndianAmount(tx.purchaseAmount, 0)}
                          </td>
                          <td className="py-1 px-2 text-right  text-slate-100 font-semibold">
                            {formatIndianAmount(tx.currentValue, 0)}
                          </td>
                          <td
                            className={`py-1 px-2 text-right  font-semibold ${
                              tx.gain >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {formatIndianAmount(tx.gain, 0)}
                          </td>
                          <td className="py-1 px-1.5 text-right  text-slate-300">
                            {tx.holdingDays.toLocaleString("en-IN")}
                          </td>
                          <td
                            className={`py-1 px-1.5 text-right  font-semibold ${
                              tx.absReturn >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {tx.absReturn >= 0 ? "+" : ""}
                            {tx.absReturn.toFixed(2)}
                          </td>
                          <td
                            className={`py-1 px-2 text-right  font-semibold ${
                              tx.xirr >= 0 ? "text-teal-400" : "text-rose-400"
                            }`}
                          >
                            {tx.xirr >= 0 ? "+" : ""}
                            {tx.xirr.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </AnimatePresence>
  );
}
