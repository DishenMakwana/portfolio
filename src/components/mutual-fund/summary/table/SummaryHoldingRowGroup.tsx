"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PlusCircle, MinusCircle } from "lucide-react";
import { formatIndianAmount, getFundDetailsUrl } from "@/helpers/formatters";
import SummarySoaStatementDrawer from "@/components/mutual-fund/summary/table/SummarySoaStatementDrawer";
import type { SummaryHoldingRowGroupProps } from "@/types/summary";

export default function SummaryHoldingRowGroup({
  holding,
  isExpanded,
  onToggle,
}: SummaryHoldingRowGroupProps): React.JSX.Element {
  const router = useRouter();
  const hasTransactions = holding.transactions.length > 0;
  const isSold = holding.isSold || holding.currentValue <= 0;

  const fundUrl = getFundDetailsUrl(
    holding.holdingId,
    isSold || holding.holdingId < 0
  );

  return (
    <>
      <tr className="border-t border-slate-800/40 hover:bg-slate-800/30 transition-colors text-slate-300">
        {/* Folio Column */}
        <td
          className={`py-2 px-3 font-medium whitespace-nowrap ${
            isSold ? "text-slate-400" : "text-[#00c9a7]"
          }`}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {hasTransactions ? (
              <button
                onClick={onToggle}
                className={`transition cursor-pointer flex-shrink-0 p-0.5 ${
                  isSold
                    ? "text-slate-400 hover:text-slate-300"
                    : "text-teal-400 hover:text-teal-300"
                }`}
                title={isExpanded ? "Collapse statement" : "Expand statement"}
              >
                <motion.span
                  initial={false}
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  className="inline-flex items-center justify-center"
                >
                  {isExpanded ? (
                    <MinusCircle
                      size={13}
                      className={isSold ? "text-slate-400" : "text-teal-400"}
                    />
                  ) : (
                    <PlusCircle
                      size={13}
                      className={isSold ? "text-slate-400" : "text-teal-400"}
                    />
                  )}
                </motion.span>
              </button>
            ) : (
              <span className="w-3.5 inline-block" />
            )}
            <span className="font-mono tracking-tight select-all">
              {holding.folioNo || "—"}
            </span>
          </div>
        </td>

        {/* Scheme Column */}
        <td
          className={`py-2 px-2.5 font-medium align-middle ${
            isSold ? "text-slate-400" : "text-[#00c9a7]"
          }`}
        >
          <button
            type="button"
            onClick={() => router.push(fundUrl)}
            className="text-left hover:text-teal-400 transition cursor-pointer font-medium hover:underline underline-offset-4 leading-snug break-words whitespace-normal block"
          >
            {holding.schemeName}
          </button>
        </td>

        {/* Purchase */}
        <td className="py-2 px-2 text-right text-slate-200">
          {formatIndianAmount(holding.purchaseAmount, 0)}
        </td>

        {/* Switch In */}
        <td className="py-2 px-2 text-right text-slate-200">
          {formatIndianAmount(holding.switchInAmount, 0)}
        </td>

        {/* Redemption */}
        <td className="py-2 px-2 text-right text-slate-200">
          {formatIndianAmount(holding.redemptionAmount, 0)}
        </td>

        {/* Switch Out */}
        <td className="py-2 px-2 text-right text-slate-200">
          {formatIndianAmount(holding.switchOutAmount, 0)}
        </td>

        {/* Current Value */}
        <td className="py-2 px-2 text-right font-semibold text-slate-100">
          {formatIndianAmount(holding.currentValue, 0)}
        </td>

        {/* Realized Gain */}
        <td className="py-2 px-2 text-right text-slate-200">
          {formatIndianAmount(holding.realizedGain, 0)}
        </td>

        {/* Unrealized Gain */}
        <td className="py-2 px-2 text-right text-slate-200">
          {formatIndianAmount(holding.unrealizedGain, 0)}
        </td>

        {/* XIRR (%) */}
        <td
          className={`py-2 px-2 text-right font-semibold ${
            holding.xirr >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {holding.xirr >= 0 ? "+" : ""}
          {holding.xirr.toFixed(2)}%
        </td>

        {/* Absolute Return (%) */}
        <td
          className={`py-2 px-3 text-right font-semibold ${
            holding.absReturn >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {holding.absReturn >= 0 ? "+" : ""}
          {holding.absReturn.toFixed(2)}%
        </td>
      </tr>

      {/* ── EXPANDED SOA STATEMENT / LOTS DRAWER ── */}
      <SummarySoaStatementDrawer holding={holding} isExpanded={isExpanded} />
    </>
  );
}
