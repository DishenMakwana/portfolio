"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  Label,
} from "recharts";
import {
  TrendingUp,
  History,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";
import { formatIndianAmount } from "@/helpers/formatters";
import {
  isLumpsumTransaction,
  isSipTransaction,
  isRedemptionTransaction,
  isSwitchOutTransaction,
} from "@/helpers/niftyAnalysis";
import type {
  NiftyTimelinePoint,
  NiftyTransactionItem,
  NiftyTimeframe,
  NiftyTxFilter,
  NiftyTradeMode,
} from "@/types/nifty-analysis";

interface NiftyTimelineChartProps {
  timeline: NiftyTimelinePoint[];
  transactions: NiftyTransactionItem[];
  currentNifty: number;
  allTimeHighNifty: number;
  weightedAvgNiftyEntry: number;
  niftyEntryBufferPct: number;
  timeframe: NiftyTimeframe;
  onTimeframeChange: (tf: NiftyTimeframe) => void;
  txFilter: NiftyTxFilter;
  onTxFilterChange: (f: NiftyTxFilter) => void;
  availableYears: number[];
  tradeMode?: NiftyTradeMode;
}

interface CustomTooltipPayloadItem {
  payload: NiftyTimelinePoint;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  monthTxMap: Map<string, NiftyTransactionItem[]>;
  currentNifty: number;
  tradeMode: NiftyTradeMode;
}

function NiftyChartTooltip({
  active,
  payload,
  monthTxMap,
  currentNifty,
  tradeMode,
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  const monthKey = data.date.substring(0, 7);
  const monthTxs = monthTxMap.get(monthKey) || [];

  const totalAmount = monthTxs.reduce((sum, t) => sum + t.purchaseAmount, 0);
  const totalLumpsum = monthTxs
    .filter(isLumpsumTransaction)
    .reduce((sum, t) => sum + t.purchaseAmount, 0);
  const totalSip = monthTxs
    .filter(isSipTransaction)
    .reduce((sum, t) => sum + t.purchaseAmount, 0);
  const totalRedemption = monthTxs
    .filter(isRedemptionTransaction)
    .reduce((sum, t) => sum + t.purchaseAmount, 0);
  const totalSwitchOut = monthTxs
    .filter(isSwitchOutTransaction)
    .reduce((sum, t) => sum + t.purchaseAmount, 0);
  const totalGain = monthTxs.reduce((sum, t) => sum + t.gain, 0);

  return (
    <div className="bg-slate-950/95 border border-slate-700/90 p-4 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-3 min-w-[290px] max-w-sm">
      {/* Header Date & Spot */}
      <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
        <div>
          <span className="font-mono text-sm font-bold text-slate-100">
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
          <span className="w-2 h-2 rounded-full bg-teal-400"></span>
          Nifty 50 Level:
        </span>
        <span className="font-mono font-extrabold text-slate-100 text-sm">
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
          className={`font-bold font-mono ${
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
                <span className="font-mono font-extrabold text-teal-300 text-xs mt-1">
                  {formatIndianAmount(totalAmount, 0)}
                </span>
              </div>
              <div className="flex flex-col border-x border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Lumpsum
                </span>
                <span className="font-mono font-extrabold text-amber-300 text-xs mt-1">
                  {formatIndianAmount(totalLumpsum, 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  SIP
                </span>
                <span className="font-mono font-extrabold text-purple-300 text-xs mt-1">
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
                <span className="font-mono font-extrabold text-emerald-300 text-xs mt-1">
                  {formatIndianAmount(totalAmount, 0)}
                </span>
              </div>
              <div className="flex flex-col border-x border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Redemptions
                </span>
                <span className="font-mono font-extrabold text-teal-300 text-xs mt-1">
                  {formatIndianAmount(totalRedemption, 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Switch Out
                </span>
                <span className="font-mono font-extrabold text-purple-300 text-xs mt-1">
                  {formatIndianAmount(totalSwitchOut, 0)}
                </span>
              </div>
            </div>
          )}

          {/* Month Transaction Count */}
          <div className="flex items-center justify-between text-[11px] bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800/80">
            <span className="font-semibold text-slate-400">
              {tradeMode === "BUY" ? "Month Inflows:" : "Month Outflows:"}{" "}
              <span className="text-slate-200 font-bold font-mono">
                {monthTxs.length}{" "}
                {monthTxs.length === 1 ? "transaction" : "transactions"}
              </span>
            </span>
            {tradeMode === "BUY" ? (
              <span
                className={`font-mono font-bold ${
                  totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {totalGain >= 0 ? "+" : ""}
                {formatIndianAmount(totalGain, 0)} Gain
              </span>
            ) : (
              <span className="font-mono font-bold text-emerald-400">
                {formatIndianAmount(totalAmount, 0)} Realised
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

    const dots: {
      monthKey: string;
      timestamp: number;
      nifty: number;
      isHigher: boolean;
      totalAmount: number;
    }[] = [];

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

  const { minY, maxY } = useMemo(() => {
    if (timeline.length === 0) return { minY: 10000, maxY: 26000 };
    let min = Infinity;
    let max = -Infinity;
    for (const pt of timeline) {
      if (pt.nifty < min) min = pt.nifty;
      if (pt.nifty > max) max = pt.nifty;
    }
    min = Math.floor(min * 0.95);
    max = Math.ceil(max * 1.05);
    return { minY: min, maxY: max };
  }, [timeline]);

  const isYearSelected = timeframe.startsWith("year_");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5"
    >
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

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 overflow-x-auto">
          {/* All Transactions (Buys or Sells) */}
          <button
            onClick={() => onTxFilterChange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              txFilter === "all"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>{tradeMode === "BUY" ? "All Buys" : "All Sells"}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                txFilter === "all"
                  ? "bg-slate-950/30 text-slate-950"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {transactions.length}
            </span>
          </button>

          {/* Above Spot */}
          <button
            onClick={() => onTxFilterChange("higher_only")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              txFilter === "higher_only"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Above Spot</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                txFilter === "higher_only"
                  ? "bg-amber-500/30 text-amber-200"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {higherCount}
            </span>
          </button>

          {/* Type-Specific Filter Tabs */}
          {tradeMode === "BUY" ? (
            <>
              {/* SIPs Only */}
              <button
                onClick={() => onTxFilterChange("sip_only")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  txFilter === "sip_only"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span>SIPs</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    txFilter === "sip_only"
                      ? "bg-slate-950/30 text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {sipCount}
                </span>
              </button>

              {/* Lumpsum Only */}
              <button
                onClick={() => onTxFilterChange("lumpsum_only")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  txFilter === "lumpsum_only"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span>Lumpsum</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    txFilter === "lumpsum_only"
                      ? "bg-slate-950/30 text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {lumpCount}
                </span>
              </button>
            </>
          ) : (
            <>
              {/* Redemptions Only */}
              <button
                onClick={() => onTxFilterChange("redemption_only")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  txFilter === "redemption_only"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span>Redemptions</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    txFilter === "redemption_only"
                      ? "bg-slate-950/30 text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {redemptionCount}
                </span>
              </button>

              {/* Switch Out Only */}
              <button
                onClick={() => onTxFilterChange("switch_out_only")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  txFilter === "switch_out_only"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span>Switch Out</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    txFilter === "switch_out_only"
                      ? "bg-slate-950/30 text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {switchOutCount}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Right: Timeframe & Valuation Zones Controls Capsule */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Horizon Relative Ranges Segmented Bar */}
          <div className="flex items-center h-9 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner box-border">
            {(["1Y", "3Y", "5Y", "10Y", "ALL"] as NiftyTimeframe[]).map(
              (tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`h-full px-3 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeframe === tf
                      ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {tf}
                </button>
              )
            )}
          </div>

          {/* Clean Dropdown for Specific Calendar Year */}
          {availableYears.length > 0 && (
            <div
              className={`relative flex items-center h-9 bg-slate-950/80 border rounded-xl px-3 transition text-xs font-semibold shadow-inner box-border ${
                isYearSelected
                  ? "border-indigo-500/60 text-indigo-300 bg-indigo-500/10"
                  : "border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Calendar
                size={13}
                className={
                  isYearSelected
                    ? "text-indigo-400 mr-2 shrink-0"
                    : "text-slate-500 mr-2 shrink-0"
                }
              />
              <select
                value={isYearSelected ? timeframe : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    onTimeframeChange(e.target.value as NiftyTimeframe);
                  } else {
                    onTimeframeChange("3Y");
                  }
                }}
                className="h-full bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1 appearance-none"
              >
                <option value="" className="bg-slate-900 text-slate-400">
                  {isYearSelected
                    ? `Year: ${timeframe.replace("year_", "")}`
                    : "Select Year..."}
                </option>
                {availableYears.map((yr) => (
                  <option
                    key={yr}
                    value={`year_${yr}`}
                    className="bg-slate-900 text-slate-100 font-semibold"
                  >
                    Year {yr}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="text-slate-500 pointer-events-none ml-1 shrink-0"
              />
            </div>
          )}

          {/* Valuation Zones Toggle Chip */}
          <button
            onClick={() => setShowValuationZones(!showValuationZones)}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shadow-inner box-border ${
              showValuationZones
                ? "bg-teal-500/15 text-teal-300 border-teal-500/40"
                : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title="Toggle Valuation Zone shading (Deep Value, Fair, Peak)"
          >
            <Layers
              size={13}
              className={
                showValuationZones
                  ? "text-teal-400 shrink-0"
                  : "text-slate-500 shrink-0"
              }
            />
            <span>Valuation Zones</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] sm:h-[440px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            key={`nifty-chart-${timeframe}-${tradeMode}-${txFilter}`}
            data={timeline}
            margin={{ top: 10, right: 15, left: 8, bottom: 18 }}
          >
            <defs>
              <linearGradient id="colorNifty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00c9a7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00c9a7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              opacity={0.7}
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(unix) =>
                new Date(unix).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "2-digit",
                })
              }
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              height={34}
              tick={{ dy: 3 }}
            >
              <Label
                value="Timeline Date"
                position="insideBottom"
                offset={-8}
                fill="#94a3b8"
                fontSize={10}
                fontWeight={600}
              />
            </XAxis>
            <YAxis
              domain={[minY, maxY]}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => Number(v).toLocaleString("en-IN")}
              width={56}
            >
              <Label
                value="NIFTY 50 (Points)"
                angle={-90}
                position="insideLeft"
                offset={2}
                fill="#94a3b8"
                fontSize={10}
                fontWeight={600}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip
              content={
                <NiftyChartTooltip
                  monthTxMap={monthTxMap}
                  currentNifty={currentNifty}
                  tradeMode={tradeMode}
                />
              }
            />

            {/* Valuation Zones Background Shading */}
            {showValuationZones && allTimeHighNifty > 0 && (
              <>
                {/* Premium / Peak Zone (within 3% of ATH) */}
                <ReferenceArea
                  y1={allTimeHighNifty * 0.97}
                  y2={maxY}
                  fill="#f59e0b"
                  fillOpacity={0.06}
                  label={{
                    value: "Peak Zone (>97% ATH)",
                    position: "insideTopRight",
                    fill: "#fbbf24",
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                />
                {/* Middle Band: Fair Value Zone (90% to 97% of ATH) */}
                <ReferenceArea
                  y1={allTimeHighNifty * 0.9}
                  y2={allTimeHighNifty * 0.97}
                  fill="#0284c7"
                  fillOpacity={0.07}
                  label={{
                    value: "Fair Value Zone (90-97% ATH)",
                    position: "insideTopRight",
                    fill: "#38bdf8",
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                />
                {/* Deep Value / Accumulation Dip Zone (<90% of ATH) */}
                <ReferenceArea
                  y1={minY}
                  y2={allTimeHighNifty * 0.9}
                  fill="#10b981"
                  fillOpacity={0.06}
                  label={{
                    value: "Deep Accumulation (<90% ATH)",
                    position: "insideBottomRight",
                    fill: "#34d399",
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                />
              </>
            )}

            {/* Current Nifty Reference Line */}
            {currentNifty > 0 && (
              <ReferenceLine
                y={currentNifty}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Current Nifty: ${currentNifty.toLocaleString("en-IN")}`,
                  position: "insideBottomLeft",
                  fill: "#34d399",
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              />
            )}

            {/* Weighted Average Entry/Exit Nifty Level */}
            {weightedAvgNiftyEntry > 0 && (
              <ReferenceLine
                y={weightedAvgNiftyEntry}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value:
                    tradeMode === "BUY"
                      ? `Avg Entry: ${weightedAvgNiftyEntry.toLocaleString("en-IN")} (${niftyEntryBufferPct >= 0 ? "+" : ""}${niftyEntryBufferPct.toFixed(1)}% buffer)`
                      : `Avg Exit: ${weightedAvgNiftyEntry.toLocaleString("en-IN")} (${niftyEntryBufferPct >= 0 ? "+" : ""}${niftyEntryBufferPct.toFixed(1)}% vs Spot)`,
                  position: "insideTopLeft",
                  fill: "#38bdf8",
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              />
            )}

            {/* All-Time High Nifty Reference Line */}
            {allTimeHighNifty > currentNifty && (
              <ReferenceLine
                y={allTimeHighNifty}
                stroke="#818cf8"
                strokeDasharray="3 3"
                strokeWidth={1}
                opacity={0.7}
                label={{
                  value: `ATH: ${allTimeHighNifty.toLocaleString("en-IN")}`,
                  position: "insideTopLeft",
                  fill: "#a5b4fc",
                  fontSize: 10,
                }}
              />
            )}

            {/* Continuous NIFTY 50 Area Curve with Smooth Path Animation */}
            <Area
              type="monotone"
              dataKey="nifty"
              stroke="#00c9a7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorNifty)"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={100}
            />

            {/* 1 Single Aggregated Dot Per Month on the Curve */}
            {entryPoints.map((ep) => (
              <ReferenceDot
                key={`tx-dot-${ep.monthKey}`}
                x={ep.timestamp}
                y={ep.nifty}
                r={ep.isHigher ? 4.5 : 3.5}
                fill={ep.isHigher ? "#f59e0b" : "#2dd4bf"}
                stroke={ep.isHigher ? "#fbbf24" : "#0f172a"}
                strokeWidth={1.5}
                opacity={1}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── DEDICATED CHART FOOTER: INDICATOR & LEGEND RIBBON ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-3 px-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs">
        {/* Left Side: Legend Item Colors */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/30" />
            <span className="text-slate-300 font-medium text-[11px]">
              {tradeMode === "BUY" ? "Above Current Spot" : "Sold Above Spot"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-2 ring-teal-500/30" />
            <span className="text-slate-300 font-medium text-[11px]">
              {tradeMode === "BUY" ? "Below Current Spot" : "Sold Below Spot"}
            </span>
          </div>

          {showValuationZones && (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/30" />
              <span className="text-sky-300 font-medium text-[11px]">
                Fair Value Band (90-97% ATH)
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Key Reference Benchmark Values */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-400" />
            <span className="text-slate-400 text-[11px]">Spot:</span>
            <span className="text-emerald-400 font-bold font-mono text-[11px]">
              {currentNifty.toLocaleString("en-IN")}
            </span>
          </div>

          {weightedAvgNiftyEntry > 0 && (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-sky-400" />
              <span className="text-slate-400 text-[11px]">
                {tradeMode === "BUY" ? "Avg Entry:" : "Avg Exit:"}
              </span>
              <span className="text-sky-400 font-bold font-mono text-[11px]">
                {weightedAvgNiftyEntry.toLocaleString("en-IN")}{" "}
                <span className="text-slate-400 font-normal">
                  ({niftyEntryBufferPct >= 0 ? "+" : ""}
                  {niftyEntryBufferPct.toFixed(1)}%{" "}
                  {tradeMode === "BUY" ? "buffer" : "vs Spot"})
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
