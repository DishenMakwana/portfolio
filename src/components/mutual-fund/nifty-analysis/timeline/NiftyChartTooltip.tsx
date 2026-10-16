"use client";

import { formatIndianAmount } from "@/helpers/formatters";
import {
  isLumpsumTransaction,
  isSipTransaction,
  isRedemptionTransaction,
  isSwitchOutTransaction,
} from "@/helpers/niftyAnalysis";
import type {
  NiftyChartTooltipProps,
  NiftyTransactionItem,
} from "@/types/nifty-analysis";

export function NiftyChartTooltip({
  active,
  payload,
  monthTxMap,
  currentNifty,
  tradeMode,
}: NiftyChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  const monthKey = data.date.substring(0, 7);
  const monthTxs = monthTxMap.get(monthKey) || [];

  const totalAmount = monthTxs.reduce(
    (sum: number, t: NiftyTransactionItem) => sum + t.purchaseAmount,
    0
  );
  const totalLumpsum = monthTxs
    .filter(isLumpsumTransaction)
    .reduce(
      (sum: number, t: NiftyTransactionItem) => sum + t.purchaseAmount,
      0
    );
  const totalSip = monthTxs
    .filter(isSipTransaction)
    .reduce(
      (sum: number, t: NiftyTransactionItem) => sum + t.purchaseAmount,
      0
    );
  const totalRedemption = monthTxs
    .filter(isRedemptionTransaction)
    .reduce(
      (sum: number, t: NiftyTransactionItem) => sum + t.purchaseAmount,
      0
    );
  const totalSwitchOut = monthTxs
    .filter(isSwitchOutTransaction)
    .reduce(
      (sum: number, t: NiftyTransactionItem) => sum + t.purchaseAmount,
      0
    );
  const totalGain = monthTxs.reduce(
    (sum: number, t: NiftyTransactionItem) => sum + t.gain,
    0
  );

  return (
    <div className="bg-slate-950/95 border border-slate-700/90 p-4 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-3 min-w-[290px] max-w-sm">
      {/* Header Date & Spot */}
      <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-slate-100">
            {data.displayDate}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
          NIFTY 50
        </span>
      </div>

      {/* Nifty Index Spot on this Date */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-teal-400 font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          Nifty 50 Level:
        </span>
        <span className="font-extrabold text-slate-100 text-sm">
          {data.nifty.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      {/* Difference vs Current Spot */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
        <span>Vs Current Spot ({currentNifty.toLocaleString("en-IN")}):</span>
        <span
          className={`font-bold  ${
            data.nifty > currentNifty ? "text-amber-400" : "text-emerald-400"
          }`}
        >
          {data.nifty > currentNifty ? "+" : ""}
          {(((data.nifty - currentNifty) / currentNifty) * 100).toFixed(2)}%
          {data.nifty > currentNifty ? " (Above Spot)" : " (Below Spot)"}
        </span>
      </div>

      {/* ── Monthly Summary Card (BUY or SELL) ── */}
      {monthTxs.length > 0 && (
        <div className="pt-2.5 border-t border-slate-800 space-y-2.5">
          {tradeMode === "BUY" ? (
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 text-center">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Total Purchase
                </span>
                <span className="font-extrabold text-teal-300 text-xs mt-1">
                  {formatIndianAmount(totalAmount, 0)}
                </span>
              </div>
              <div className="flex flex-col border-x border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Lumpsum
                </span>
                <span className="font-extrabold text-amber-300 text-xs mt-1">
                  {formatIndianAmount(totalLumpsum, 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  SIP
                </span>
                <span className="font-extrabold text-purple-300 text-xs mt-1">
                  {formatIndianAmount(totalSip, 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 text-center">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Total Sold
                </span>
                <span className="font-extrabold text-emerald-300 text-xs mt-1">
                  {formatIndianAmount(totalAmount, 0)}
                </span>
              </div>
              <div className="flex flex-col border-x border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Redemptions
                </span>
                <span className="font-extrabold text-teal-300 text-xs mt-1">
                  {formatIndianAmount(totalRedemption, 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Switch Out
                </span>
                <span className="font-extrabold text-purple-300 text-xs mt-1">
                  {formatIndianAmount(totalSwitchOut, 0)}
                </span>
              </div>
            </div>
          )}

          {/* Month Transaction Count */}
          <div className="flex items-center justify-between text-[11px] bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800/80">
            <span className="font-semibold text-slate-400">
              {tradeMode === "BUY" ? "Month Inflows:" : "Month Outflows:"}{" "}
              <span className="text-slate-200 font-bold ">
                {monthTxs.length}{" "}
                {monthTxs.length === 1 ? "transaction" : "transactions"}
              </span>
            </span>
            {tradeMode === "BUY" ? (
              <span
                className={`font-bold ${
                  totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {totalGain >= 0 ? "+" : ""}
                {formatIndianAmount(totalGain, 0)} Gain
              </span>
            ) : (
              <span className="font-bold text-emerald-400">
                {formatIndianAmount(totalAmount, 0)} Realised
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
