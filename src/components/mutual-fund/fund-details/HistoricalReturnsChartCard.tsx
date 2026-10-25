"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
  Label,
} from "recharts";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { parseToLocalMidnight } from "@/helpers/dates";
import type {
  EntryPointMarker,
  FundTimeframe,
  HistoricalReturnsChartCardProps,
} from "@/types/fund-details";
import type { FactsheetChartPoint } from "@/types/portfolio";
import { fetchChartData } from "@/actions/chartActions";

import HistoricalReturnsChartHeader from "./HistoricalReturnsChartHeader";
import HistoricalReturnsChartTooltip from "./HistoricalReturnsChartTooltip";
import {
  HighLabelBadge,
  LowLabelBadge,
  FundActiveDot,
  BenchmarkActiveDot,
} from "./HistoricalReturnsChartBadges";

export default function HistoricalReturnsChartCard({
  holding,
  transactions,
  factsheetMeta,
  currentChartData,
  earliestFundDateStr,
  earliestBenchDateStr,
  isApproximateProxy,
  schemeCodeApi,
  benchmarkCode,
  holdingType,
  source,
}: HistoricalReturnsChartCardProps) {
  const [timeframe, setTimeframe] = useState<FundTimeframe>("1y");
  const [showHighLow, setShowHighLow] = useState<boolean>(false);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);

  // Custom Date Range filter states
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] =
    useState<boolean>(false);

  // Earliest transaction date for "Since 1st Tx" (Inv Date) filter
  const earliestTxDateStr = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    return transactions.reduce(
      (earliest, tx) => (tx.date < earliest ? tx.date : earliest),
      transactions[0].date
    );
  }, [transactions]);

  // Active chart data: starts with server-provided 1Y data
  const [activeChartData, setActiveChartData] =
    useState<FactsheetChartPoint[]>(currentChartData);

  // Client-side cache: Map<timeframe, chartData> — pre-seeded with "1y"
  const chartCache = useRef<Map<FundTimeframe, FactsheetChartPoint[]>>(
    new Map([["1y", currentChartData]])
  );

  // Timeframes that are subsets of a wider cached range.
  const SUBSET_PARENTS: Partial<Record<FundTimeframe, FundTimeframe>> = {
    "3m": "1y",
    "6m": "1y",
  };

  // Helper: slice a parent dataset to a narrower timeframe (client-side re-index)
  const sliceFromParent = useCallback(
    (
      parentData: FactsheetChartPoint[],
      tf: FundTimeframe
    ): FactsheetChartPoint[] => {
      if (!parentData.length) return [];

      const tfMonths: Record<string, number> = {
        "3m": 3,
        "6m": 6,
        "1y": 12,
        "3y": 36,
        "5y": 60,
      };
      const monthsToSubtract = tfMonths[tf] ?? 0;
      if (monthsToSubtract === 0) return parentData;

      const latestTime = parentData[parentData.length - 1].timestamp;
      const cutoffDate = new Date(latestTime);
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsToSubtract);
      const cutoffTime = cutoffDate.getTime();

      const sliced = parentData.filter((pt) => pt.timestamp >= cutoffTime);
      if (sliced.length < 2) return parentData;

      // Re-index from 0%
      const baseFundNav = sliced[0].fundNav;
      const firstBenchPt = sliced.find(
        (pt) =>
          pt.benchNav !== null && pt.benchNav !== undefined && pt.benchNav > 0
      );
      const baseBenchNav = firstBenchPt ? firstBenchPt.benchNav : null;

      return sliced.map((pt) => {
        const fundReturn =
          baseFundNav > 0
            ? ((pt.fundNav - baseFundNav) / baseFundNav) * 100
            : 0;

        let benchReturn: number | null = null;
        if (
          baseBenchNav &&
          baseBenchNav > 0 &&
          pt.benchNav &&
          firstBenchPt &&
          pt.timestamp >= firstBenchPt.timestamp
        ) {
          benchReturn = ((pt.benchNav - baseBenchNav) / baseBenchNav) * 100;
        }

        return { ...pt, fundReturn, benchReturn };
      });
    },
    []
  );

  // Mapped transactions for the Server Action
  const mappedTxs = useMemo(
    () =>
      transactions.map((tx) => ({
        date: tx.date,
        type: tx.type as "BUY" | "SELL",
        amount: tx.amount,
      })),
    [transactions]
  );

  // Helper: fetch full historical data if not in cache
  const ensureAllDataFetched = useCallback(async (): Promise<
    FactsheetChartPoint[]
  > => {
    const cachedAll = chartCache.current.get("all");
    if (cachedAll) return cachedAll;

    setIsLoadingChart(true);
    try {
      const result = await fetchChartData(
        schemeCodeApi,
        benchmarkCode,
        holding.asOfDate || new Date().toISOString().split("T")[0],
        "all",
        mappedTxs,
        holdingType,
        source
      );
      chartCache.current.set("all", result.chartData);
      return result.chartData;
    } catch (err) {
      console.error("Failed to fetch full chart data:", err);
      return activeChartData;
    } finally {
      setIsLoadingChart(false);
    }
  }, [
    schemeCodeApi,
    benchmarkCode,
    holding.asOfDate,
    mappedTxs,
    holdingType,
    source,
    activeChartData,
  ]);

  // Helper: slice full dataset by custom date range and re-index returns from 0% at start date
  const sliceByDateRange = useCallback(
    (
      fullData: FactsheetChartPoint[],
      fromDateStr: string,
      toDateStr: string
    ): FactsheetChartPoint[] => {
      if (!fullData.length) return [];

      const fromTime = parseToLocalMidnight(fromDateStr).getTime();
      const toTime = parseToLocalMidnight(toDateStr).getTime() + 86400000;

      const sliced = fullData.filter(
        (pt) => pt.timestamp >= fromTime && pt.timestamp <= toTime
      );

      if (sliced.length < 2) return fullData;

      // Re-index from 0% at start of custom range
      const baseFundNav = sliced[0].fundNav;
      const firstBenchPt = sliced.find(
        (pt) =>
          pt.benchNav !== null && pt.benchNav !== undefined && pt.benchNav > 0
      );
      const baseBenchNav = firstBenchPt ? firstBenchPt.benchNav : null;

      return sliced.map((pt) => {
        const fundReturn =
          baseFundNav > 0
            ? ((pt.fundNav - baseFundNav) / baseFundNav) * 100
            : 0;

        let benchReturn: number | null = null;
        if (
          baseBenchNav &&
          baseBenchNav > 0 &&
          pt.benchNav &&
          firstBenchPt &&
          pt.timestamp >= firstBenchPt.timestamp
        ) {
          benchReturn = ((pt.benchNav - baseBenchNav) / baseBenchNav) * 100;
        }

        return { ...pt, fundReturn, benchReturn };
      });
    },
    []
  );

  const handleTimeframeChange = useCallback(
    async (tf: FundTimeframe) => {
      setTimeframe(tf);

      // 1. Check direct cache hit
      const cached = chartCache.current.get(tf);
      if (cached) {
        setActiveChartData(cached);
        return;
      }

      // 2. Check if this is a subset of a cached parent (3m/6m from 1y)
      const parentTf = SUBSET_PARENTS[tf];
      if (parentTf) {
        const parentData = chartCache.current.get(parentTf);
        if (parentData) {
          const sliced = sliceFromParent(parentData, tf);
          chartCache.current.set(tf, sliced);
          setActiveChartData(sliced);
          return;
        }
      }

      // 3. Cache miss: fetch from server
      setIsLoadingChart(true);
      try {
        const result = await fetchChartData(
          schemeCodeApi,
          benchmarkCode,
          holding.asOfDate || new Date().toISOString().split("T")[0],
          tf,
          mappedTxs,
          holdingType,
          source
        );

        // Store in cache
        chartCache.current.set(tf, result.chartData);

        setActiveChartData(result.chartData);
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
      } finally {
        setIsLoadingChart(false);
      }
    },
    [
      schemeCodeApi,
      benchmarkCode,
      holding.asOfDate,
      mappedTxs,
      holdingType,
      source,
      sliceFromParent,
    ]
  );

  // Handler for "Since 1st Tx" (Inv Date) filter button
  const handleInvDateClick = useCallback(async () => {
    if (!earliestTxDateStr) return;
    const toDate = holding.asOfDate || new Date().toISOString().split("T")[0];
    setTimeframe("invDate");
    setCustomFromDate(earliestTxDateStr);
    setCustomToDate(toDate);
    setIsCustomDatePickerOpen(false);

    const allData = await ensureAllDataFetched();
    const sliced = sliceByDateRange(allData, earliestTxDateStr, toDate);
    setActiveChartData(sliced);
  }, [
    earliestTxDateStr,
    holding.asOfDate,
    ensureAllDataFetched,
    sliceByDateRange,
  ]);

  // Handler for applying Custom Date Range Filter
  const handleApplyCustomRange = useCallback(
    async (fromStr?: string, toStr?: string) => {
      const targetFrom = fromStr || customFromDate;
      const targetTo = toStr || customToDate;
      if (!targetFrom || !targetTo) return;

      setTimeframe("custom");
      setCustomFromDate(targetFrom);
      setCustomToDate(targetTo);
      setIsCustomDatePickerOpen(false);

      const allData = await ensureAllDataFetched();
      const sliced = sliceByDateRange(allData, targetFrom, targetTo);
      setActiveChartData(sliced);
    },
    [customFromDate, customToDate, ensureAllDataFetched, sliceByDateRange]
  );

  const filteredChartData = activeChartData;

  // Calculate Period High and Period Low data points within the active timeframe
  const periodHighLow = useMemo(() => {
    if (!filteredChartData.length) return null;

    let highPt = filteredChartData[0];
    let lowPt = filteredChartData[0];

    for (const pt of filteredChartData) {
      if (pt.fundReturn > highPt.fundReturn) {
        highPt = pt;
      }
      if (pt.fundReturn < lowPt.fundReturn) {
        lowPt = pt;
      }
    }

    return { highPt, lowPt };
  }, [filteredChartData]);

  // Y-Axis domain with 15% top & bottom headroom padding so High/Low badges never get cut off
  const yDomain = useMemo(() => {
    if (!filteredChartData.length) return ["auto", "auto"];

    let min = Infinity;
    let max = -Infinity;

    for (const pt of filteredChartData) {
      if (pt.fundReturn < min) min = pt.fundReturn;
      if (pt.fundReturn > max) max = pt.fundReturn;
      if (pt.benchReturn !== null && pt.benchReturn !== undefined) {
        if (pt.benchReturn < min) min = pt.benchReturn;
        if (pt.benchReturn > max) max = pt.benchReturn;
      }
    }

    if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"];

    const range = max - min || 10;
    const padding = Math.max(range * 0.15, 5);

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [filteredChartData]);

  // Adaptive X-Axis Ticks: Generate clean date ticks based on selected timeframe
  const xAxisTicks = useMemo(() => {
    if (!filteredChartData.length) return undefined;

    const firstTime = filteredChartData[0].timestamp;
    const lastTime = filteredChartData[filteredChartData.length - 1].timestamp;

    if (timeframe === "3m" || timeframe === "6m" || timeframe === "1y") {
      const ticks: number[] = [];
      const current = new Date(firstTime);
      current.setDate(1);

      while (current.getTime() <= lastTime) {
        if (current.getTime() >= firstTime) {
          ticks.push(current.getTime());
        }
        current.setMonth(current.getMonth() + 1);
      }
      return ticks.length >= 2 ? ticks : undefined;
    }

    if (timeframe === "3y") {
      const ticks: number[] = [];
      const current = new Date(firstTime);
      current.setDate(1);

      while (current.getTime() <= lastTime) {
        if (current.getTime() >= firstTime && current.getMonth() % 3 === 0) {
          ticks.push(current.getTime());
        }
        current.setMonth(current.getMonth() + 1);
      }
      return ticks.length >= 2 ? ticks : undefined;
    }

    if (timeframe === "5y") {
      const ticks: number[] = [];
      const current = new Date(firstTime);
      current.setDate(1);

      while (current.getTime() <= lastTime) {
        if (current.getTime() >= firstTime && current.getMonth() % 6 === 0) {
          ticks.push(current.getTime());
        }
        current.setMonth(current.getMonth() + 1);
      }
      return ticks.length >= 2 ? ticks : undefined;
    }

    if (timeframe === "all") {
      const ticks: number[] = [];
      const current = new Date(firstTime);
      current.setDate(1);

      while (current.getTime() <= lastTime) {
        if (current.getTime() >= firstTime && current.getMonth() === 0) {
          ticks.push(current.getTime());
        }
        current.setMonth(current.getMonth() + 1);
      }
      return ticks.length >= 2 ? ticks : undefined;
    }

    return undefined;
  }, [filteredChartData, timeframe]);

  // Find buy/sell entry points to display as markers on the chart
  const entryPoints: EntryPointMarker[] = useMemo(() => {
    if (!filteredChartData.length || !currentChartData.length) return [];

    const MATCH_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

    // 1. For standard funds with transactions:
    const allTxs = transactions.filter(
      (t) => t.type === "BUY" || t.type === "SELL"
    );
    if (allTxs.length > 0) {
      const markers: EntryPointMarker[] = [];

      for (const tx of allTxs) {
        const txD = parseToLocalMidnight(tx.date);
        if (!txD) continue;
        const txTime = txD.getTime();
        const txType = tx.type as "BUY" | "SELL";

        const isVisible = filteredChartData.some(
          (pt) => Math.abs(pt.timestamp - txTime) < MATCH_THRESHOLD_MS
        );
        if (!isVisible) continue;

        const txPoint = filteredChartData.reduce((prev, cur) =>
          Math.abs(cur.timestamp - txTime) < Math.abs(prev.timestamp - txTime)
            ? cur
            : prev
        );

        const alreadyMarked = markers.some(
          (m) => m.timestamp === txPoint.timestamp && m.txType === txType
        );
        if (alreadyMarked) continue;

        markers.push({
          timestamp: txPoint.timestamp,
          fundReturn: txPoint.fundReturn,
          nav: txPoint.fundNav,
          label: txType === "BUY" ? "Buy" : "Sell",
          txType,
        });
      }

      return markers;
    }

    // 2. For Zerodha/MSFL (using purchaseNav fallback):
    const targetNav = holding.purchaseNav || 0;
    if (targetNav <= 0) {
      const firstPt = currentChartData[0];
      if (firstPt) {
        const visibleFirstPt = filteredChartData.find(
          (pt) => pt.timestamp === firstPt.timestamp
        );
        if (visibleFirstPt) {
          return [
            {
              timestamp: visibleFirstPt.timestamp,
              fundReturn: visibleFirstPt.fundReturn,
              nav: visibleFirstPt.fundNav,
              label: `Allotment: ₹${visibleFirstPt.fundNav.toFixed(2)}`,
              txType: "BUY" as const,
            },
          ];
        }
      }
      return [];
    }

    let bestFullPt = currentChartData[0];
    let bestFullDiff = Math.abs(currentChartData[0].fundNav - targetNav);
    for (const pt of currentChartData) {
      const diff = Math.abs(pt.fundNav - targetNav);
      if (diff < bestFullDiff) {
        bestFullDiff = diff;
        bestFullPt = pt;
      }
    }

    const visiblePt = filteredChartData.find(
      (pt) => pt.timestamp === bestFullPt.timestamp
    );
    if (visiblePt) {
      return [
        {
          timestamp: visiblePt.timestamp,
          fundReturn: visiblePt.fundReturn,
          nav: visiblePt.fundNav,
          label: `Avg Cost: ₹${targetNav.toLocaleString("en-IN")}`,
          txType: "BUY" as const,
        },
      ];
    }

    return [];
  }, [filteredChartData, currentChartData, holding.purchaseNav, transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm"
    >
      <HistoricalReturnsChartHeader
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        earliestTxDateStr={earliestTxDateStr}
        onInvDateClick={handleInvDateClick}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onCustomFromDateChange={setCustomFromDate}
        onCustomToDateChange={setCustomToDate}
        isCustomDatePickerOpen={isCustomDatePickerOpen}
        onToggleCustomDatePicker={() =>
          setIsCustomDatePickerOpen((prev) => !prev)
        }
        onCloseCustomDatePicker={() => setIsCustomDatePickerOpen(false)}
        onApplyCustomRange={handleApplyCustomRange}
        showHighLow={showHighLow}
        onToggleHighLow={() => setShowHighLow(!showHighLow)}
        schemeName={holding.schemeName}
        benchmarkName={factsheetMeta.profile.benchmarkName}
        earliestFundDateStr={earliestFundDateStr ?? null}
        earliestBenchDateStr={earliestBenchDateStr ?? null}
        asOfDate={holding.asOfDate}
      />

      {/* Chart Viewport */}
      {filteredChartData.length > 0 || isLoadingChart ? (
        <div className="h-84 w-full relative">
          {isLoadingChart && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold text-teal-400">
                  Loading {timeframe.toUpperCase()} data…
                </span>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredChartData}
              margin={{ top: 28, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorFund" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                domain={["dataMin", "dataMax"]}
                type="number"
                scale="time"
                ticks={xAxisTicks}
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={(ts: number) => {
                  const d = new Date(ts);
                  const mon = d.toLocaleDateString("en-IN", {
                    month: "short",
                    timeZone: "UTC",
                  });
                  const yr = String(d.getUTCFullYear()).slice(-2);
                  return `${mon}-${yr}`;
                }}
              />
              <YAxis
                domain={yDomain}
                width={56}
                dx={-2}
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={(val: number) => {
                  if (Math.abs(val) >= 100) return `${val.toFixed(0)}%`;
                  return `${val.toFixed(1)}%`;
                }}
              >
                <Label
                  value="Return (%)"
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
                  <HistoricalReturnsChartTooltip
                    benchmarkName={factsheetMeta.profile.benchmarkName}
                  />
                }
              />

              <Area
                type="monotone"
                dataKey="fundReturn"
                name="Fund Return"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorFund)"
                activeDot={<FundActiveDot />}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={100}
              />

              <Area
                type="monotone"
                dataKey="benchReturn"
                name={factsheetMeta.profile.benchmarkName || "Benchmark"}
                stroke="#6366f1"
                strokeWidth={1.8}
                fillOpacity={1}
                fill="url(#colorBench)"
                strokeDasharray="4 4"
                activeDot={<BenchmarkActiveDot />}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={150}
              />

              {entryPoints.map((ep, idx) => (
                <ReferenceLine
                  key={`entry-line-${idx}`}
                  x={ep.timestamp}
                  stroke={ep.txType === "BUY" ? "#14b8a6" : "#f43f5e"}
                  strokeDasharray="3 3"
                  opacity={0.3}
                />
              ))}
              {entryPoints.map((ep, idx) => (
                <ReferenceDot
                  key={`entry-dot-${idx}`}
                  x={ep.timestamp}
                  y={ep.fundReturn}
                  r={entryPoints.length > 8 ? 3.5 : 5}
                  fill={ep.txType === "BUY" ? "#14b8a6" : "#f43f5e"}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                  opacity={entryPoints.length > 8 ? 0.7 : 1}
                  label={
                    entryPoints.length <= 8
                      ? {
                          value: ep.label,
                          position: idx % 2 === 0 ? "top" : "bottom",
                          fill: ep.txType === "BUY" ? "#34d399" : "#fb7185",
                          fontSize: 10,
                          fontWeight: "bold",
                          offset: 8,
                        }
                      : undefined
                  }
                />
              ))}

              {showHighLow && periodHighLow && (
                <>
                  <ReferenceLine
                    x={periodHighLow.highPt.timestamp}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                  <ReferenceDot
                    x={periodHighLow.highPt.timestamp}
                    y={periodHighLow.highPt.fundReturn}
                    r={6}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={2}
                    style={{
                      filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.4))",
                    }}
                  >
                    <Label
                      content={
                        <HighLabelBadge
                          value={`High: ${periodHighLow.highPt.fundReturn >= 0 ? "+" : ""}${periodHighLow.highPt.fundReturn.toFixed(1)}%`}
                        />
                      }
                    />
                  </ReferenceDot>

                  <ReferenceLine
                    x={periodHighLow.lowPt.timestamp}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                  <ReferenceDot
                    x={periodHighLow.lowPt.timestamp}
                    y={periodHighLow.lowPt.fundReturn}
                    r={6}
                    fill="#f43f5e"
                    stroke="#ffffff"
                    strokeWidth={2}
                    style={{
                      filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.4))",
                    }}
                  >
                    <Label
                      content={
                        <LowLabelBadge
                          value={`Low: ${periodHighLow.lowPt.fundReturn >= 0 ? "+" : ""}${periodHighLow.lowPt.fundReturn.toFixed(1)}%`}
                        />
                      }
                    />
                  </ReferenceDot>
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500">
          <TrendingUp size={36} className="mb-2 opacity-50" />
          <p className="text-sm font-semibold">
            Historical NAV data unavailable
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Data points will appear once sync is complete.
          </p>
        </div>
      )}

      {/* Approximate Benchmark Notice */}
      {isApproximateProxy && (
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            Showing category-average benchmark proxy. Exact index NAV tracking
            will reflect on full sync.
          </span>
        </div>
      )}

      {/* Interactive Legend & Transaction Markers Guide Footer */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Green line: Fund Return
          </span>
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <span className="w-2 h-2 rotate-45 rounded-[0.5px] bg-indigo-400"></span>
            Dashed blue: Benchmark Return
          </span>
          <span className="flex items-center gap-1.5 text-teal-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            Dots: Buy / Sell Transactions
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-semibold">
          {filteredChartData.length} data points
          {filteredChartData.length > 0 && (
            <span className="ml-1 text-slate-400">
              ({filteredChartData[0].date} to{" "}
              {filteredChartData[filteredChartData.length - 1].date})
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
