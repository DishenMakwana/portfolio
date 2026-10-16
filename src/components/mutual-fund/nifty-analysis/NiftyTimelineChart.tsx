"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, History } from "lucide-react";
import {
  isLumpsumTransaction,
  isSipTransaction,
  isRedemptionTransaction,
  isSwitchOutTransaction,
} from "@/helpers/niftyAnalysis";
import { NiftyChartControls } from "./timeline/NiftyChartControls";
import { NiftyTimelineAreaChart } from "./timeline/NiftyTimelineAreaChart";
import { NiftyChartLegend } from "./timeline/NiftyChartLegend";
import type {
  NiftyTimelineChartProps,
  NiftyTimelineDot,
  NiftyTimelinePoint,
  NiftyTransactionItem,
} from "@/types/nifty-analysis";

export default function NiftyTimelineChart({
  timeline,
  transactions,
  currentNifty,
  allTimeHighNifty,
  weightedAvgNiftyEntry,
  niftyEntryBufferPct,
  timeframe,
  onTimeframeChange,
  txFilter,
  onTxFilterChange,
  availableYears,
  tradeMode = "BUY",
}: NiftyTimelineChartProps) {
  const [showValuationZones, setShowValuationZones] = useState(true);

  const monthTxMap = useMemo(() => {
    const map = new Map<string, NiftyTransactionItem[]>();
    for (const tx of transactions) {
      const monthKey = tx.date.substring(0, 7);
      const list = map.get(monthKey);
      if (list) list.push(tx);
      else map.set(monthKey, [tx]);
    }
    return map;
  }, [transactions]);

  const entryPoints = useMemo(() => {
    const timelineByDate = new Map<string, NiftyTimelinePoint>();
    const timelineByMonth = new Map<string, NiftyTimelinePoint>();

    for (const pt of timeline) {
      timelineByDate.set(pt.date, pt);
      const monthKey = pt.date.substring(0, 7);
      if (!timelineByMonth.has(monthKey)) {
        timelineByMonth.set(monthKey, pt);
      }
    }

    const dots: NiftyTimelineDot[] = [];

    monthTxMap.forEach((txs, monthKey) => {
      // Find the primary transaction with highest amount in this month
      const primaryTx = txs
        .slice()
        .sort((a, b) => b.purchaseAmount - a.purchaseAmount)[0];
      const targetDate = primaryTx?.date;

      // Match exact timeline point for this transaction's date, or fallback to month's point
      let matchedTimelinePoint = targetDate
        ? timelineByDate.get(targetDate)
        : undefined;
      if (!matchedTimelinePoint) {
        matchedTimelinePoint =
          timelineByMonth.get(monthKey) ||
          timeline.find((p) => p.date.startsWith(monthKey));
      }
      if (!matchedTimelinePoint) return;

      const totalAmount = txs.reduce((sum, t) => sum + t.purchaseAmount, 0);
      // Strictly determine above spot vs below spot based on the plotted Y-coordinate vs current spot
      const isHigher = matchedTimelinePoint.nifty > currentNifty;

      dots.push({
        monthKey,
        timestamp: matchedTimelinePoint.timestamp,
        nifty: matchedTimelinePoint.nifty,
        isHigher,
        totalAmount,
      });
    });

    return dots;
  }, [monthTxMap, timeline, currentNifty]);

  const higherCount = useMemo(
    () => transactions.filter((t) => t.isHigherThanCurrent).length,
    [transactions]
  );
  const sipCount = useMemo(
    () => transactions.filter(isSipTransaction).length,
    [transactions]
  );
  const lumpCount = useMemo(
    () => transactions.filter(isLumpsumTransaction).length,
    [transactions]
  );
  const redemptionCount = useMemo(
    () => transactions.filter(isRedemptionTransaction).length,
    [transactions]
  );
  const switchOutCount = useMemo(
    () => transactions.filter(isSwitchOutTransaction).length,
    [transactions]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5"
    >
      {/* Header Title & Subtitle */}
      <div className="border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            {tradeMode === "BUY" ? (
              <TrendingUp size={20} />
            ) : (
              <History size={20} />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <span>
                {tradeMode === "BUY"
                  ? "NIFTY 50 Index vs Buy Transactions Timeline"
                  : "NIFTY 50 Index vs Sell Transactions Timeline"}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {tradeMode === "BUY"
                ? "Visual map of portfolio capital inflows across market cycles & valuation zones."
                : "Visual map of portfolio capital outflows & redemption timing across market cycles."}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Filter & Timeframe Controls */}
      <NiftyChartControls
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        txFilter={txFilter}
        onTxFilterChange={onTxFilterChange}
        showValuationZones={showValuationZones}
        onToggleValuationZones={() =>
          setShowValuationZones(!showValuationZones)
        }
        availableYears={availableYears}
        tradeMode={tradeMode}
        transactionsCount={transactions.length}
        higherCount={higherCount}
        sipCount={sipCount}
        lumpCount={lumpCount}
        redemptionCount={redemptionCount}
        switchOutCount={switchOutCount}
      />

      {/* Recharts Area Chart */}
      <NiftyTimelineAreaChart
        timeline={timeline}
        entryPoints={entryPoints}
        monthTxMap={monthTxMap}
        currentNifty={currentNifty}
        allTimeHighNifty={allTimeHighNifty}
        weightedAvgNiftyEntry={weightedAvgNiftyEntry}
        niftyEntryBufferPct={niftyEntryBufferPct}
        showValuationZones={showValuationZones}
        tradeMode={tradeMode}
        timeframe={timeframe}
        txFilter={txFilter}
      />

      {/* Dedicated Chart Footer: Indicator & Legend Ribbon */}
      <NiftyChartLegend
        showValuationZones={showValuationZones}
        tradeMode={tradeMode}
        currentNifty={currentNifty}
        weightedAvgNiftyEntry={weightedAvgNiftyEntry}
        niftyEntryBufferPct={niftyEntryBufferPct}
      />
    </motion.div>
  );
}
