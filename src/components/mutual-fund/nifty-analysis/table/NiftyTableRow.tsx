"use client";

import FolioBadge from "@/components/shared/FolioBadge";
import { formatIndianAmount, getFundDetailsUrl } from "@/helpers/formatters";
import type { NiftyTableRowProps } from "@/types/nifty-analysis";

export function NiftyTableRow({
  tx,
  tradeMode,
  onFundClick,
}: NiftyTableRowProps) {
  const fundUrl = getFundDetailsUrl(tx.holdingId, tx.isSold);

  return (
    <tr
      className={`hover:bg-slate-800/40 transition-colors duration-150 group ${
        tx.isHigherThanCurrent ? "bg-amber-950/15 hover:bg-amber-900/25" : ""
      }`}
    >
      <td className="py-3 px-3.5 text-slate-300 whitespace-nowrap">
        {tx.displayDate}
      </td>

      <td className="py-3 px-3.5">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onFundClick(fundUrl)}
            className="text-left font-semibold text-slate-100 hover:text-teal-400 hover:underline transition cursor-pointer leading-snug"
          >
            {tx.schemeName}
          </button>
          <span className="text-[10.5px] text-slate-300 font-medium leading-tight">
            {tx.memberName}
          </span>
          <div className="mt-0.5">
            <FolioBadge folioNo={tx.folioNo} />
          </div>
        </div>
      </td>

      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
            tx.transactionType === "SIP"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
              : tx.transactionType === "SWITCH_IN" ||
                  tx.transactionType === "SWITCH_OUT"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : tx.transactionType === "SELL"
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          }`}
          title={tx.rawTransactionType}
        >
          {tx.rawTransactionType}
        </span>
      </td>

      <td className="py-2.5 px-3 text-right text-slate-100 font-semibold whitespace-nowrap">
        {formatIndianAmount(tx.purchaseAmount, 0)}
      </td>

      <td className="py-2.5 px-2.5 text-right text-slate-400 whitespace-nowrap text-[11px]">
        {tx.purchaseNav.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}
      </td>

      <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-200">
        {tx.niftyAtPurchase > 0
          ? tx.niftyAtPurchase.toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : "—"}
      </td>

      <td className="py-2.5 px-3 text-right whitespace-nowrap">
        {tx.niftyAtPurchase > 0 ? (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
              tx.isHigherThanCurrent
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}
          >
            {tx.niftyDiffPct >= 0 ? "+" : ""}
            {tx.niftyDiffPct.toFixed(2)}%
          </span>
        ) : (
          "—"
        )}
      </td>

      {tradeMode === "BUY" ? (
        <>
          <td className="py-2.5 px-3 text-right whitespace-nowrap">
            <div className="flex flex-col items-end">
              <span
                className={`font-semibold ${
                  tx.gain >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {tx.gain >= 0 ? "+" : ""}
                {formatIndianAmount(tx.gain, 0)}
              </span>
              <span
                className={`text-[10px] ${
                  tx.absReturn >= 0 ? "text-emerald-500/80" : "text-rose-500/80"
                }`}
              >
                ({tx.absReturn >= 0 ? "+" : ""}
                {tx.absReturn.toFixed(2)}%)
              </span>
            </div>
          </td>

          <td className="py-2.5 px-2.5 text-right text-slate-400 whitespace-nowrap text-[11px]">
            {tx.holdingDays}d
          </td>

          <td
            className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
              tx.cagr >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {tx.cagr >= 0 ? "+" : ""}
            {tx.cagr.toFixed(2)}%
          </td>
        </>
      ) : (
        <>
          <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap text-[11px]">
            {tx.units > 0
              ? tx.units.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })
              : "—"}
          </td>

          <td className="py-2.5 px-3 text-center whitespace-nowrap">
            {tx.isHigherThanCurrent ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Above Spot Level
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                Below Spot Level
              </span>
            )}
          </td>
        </>
      )}
    </tr>
  );
}
