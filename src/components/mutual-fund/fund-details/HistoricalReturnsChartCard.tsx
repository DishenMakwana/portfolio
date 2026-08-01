"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
} from "recharts";
import { TrendingUp, AlertTriangle, Calendar, Layers } from "lucide-react";
import { formatNullableDate } from "@/helpers/formatters";
import { parseToLocalMidnight } from "@/helpers/dates";
import {
  HistoricalReturnsChartCardProps,
  FundTimeframe,
  EntryPointMarker,
  CustomTooltipProps,
} from "@/types/fund-details";
import { FactsheetChartPoint } from "@/types/portfolio";
import { fetchChartData } from "@/actions/chartActions";

function CustomChartTooltip({
  active,
  payload,
  benchmarkName,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  const fullDateStr = data.timestamp
    ? new Date(data.timestamp).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : data.date;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[200px]">
      <div className="text-slate-400 font-semibold border-b border-slate-800 pb-1.5 flex items-center justify-between">
        <span>{fullDateStr}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Fund Return:
          </span>
          <span className="font-bold text-slate-100">
            {data.fundReturn >= 0 ? "+" : ""}
            {data.fundReturn.toFixed(2)}%
          </span>
        </div>
        <div className="text-[11px] text-slate-400 pl-3.5 flex justify-between">
          <span>NAV:</span>
          <span>₹{data.fundNav.toFixed(2)}</span>
        </div>

        {data.benchReturn !== null && data.benchReturn !== undefined && (
          <>
            <div className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-1.5">
              <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                {benchmarkName || "Benchmark"}:
              </span>
              <span className="font-bold text-slate-100">
                {data.benchReturn >= 0 ? "+" : ""}
                {data.benchReturn.toFixed(2)}%
              </span>
            </div>
            {data.benchNav !== null && (
              <div className="text-[11px] text-slate-400 pl-3.5 flex justify-between">
                <span>Index NAV:</span>
                <span>₹{data.benchNav.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        {data.txs && data.txs.length > 0 && (
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-1">
            {data.txs.map((tx: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px] bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/50"
              >
                <span
                  className={`font-semibold ${
                    tx.type === "BUY" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {tx.type === "BUY" ? "BUY TRANSACTION" : "SELL TRANSACTION"}
                </span>
                {tx.amount > 0 && (
                  <span className="text-slate-200 font-mono">
                    ₹{tx.amount.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoricalReturnsChartCard({
  holding,
  transactions,
  factsheetMeta,
  currentChartData,
  earliestFundDateStr,
  earliestBenchDateStr,
  isStock,
  isApproximateProxy,
  schemeCodeApi,
  benchmarkCode,
  holdingType,
  source,
}: HistoricalReturnsChartCardProps) {
  const [timeframe, setTimeframe] = useState<FundTimeframe>("1y");
  const [showHighLow, setShowHighLow] = useState<boolean>(false);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);

  // Active chart data: starts with server-provided 1Y data
  const [activeChartData, setActiveChartData] =
    useState<FactsheetChartPoint[]>(currentChartData);

  // Client-side cache: Map<timeframe, chartData> — pre-seeded with "1y"
  const chartCache = useRef<Map<FundTimeframe, FactsheetChartPoint[]>>(
    new Map([["1y", currentChartData]])
  );

  // Timeframes that are subsets of a wider cached range.
  // 3m and 6m can always be sliced from 1y data client-side.
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
      if (monthsToSubtract === 0) return parentData; // "all" or unknown

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

  // The active data is already pre-indexed by the server, so filteredChartData = activeChartData.
  // For the initial 1y render, the server data is used directly.
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

  // Adaptive X-Axis Ticks: Generate clean date ticks based on selected timeframe
  const xAxisTicks = useMemo(() => {
    if (!filteredChartData.length) return undefined;

    const firstTime = filteredChartData[0].timestamp;
    const lastTime = filteredChartData[filteredChartData.length - 1].timestamp;

    // For short timeframes (3M, 6M, 1Y): Tick per month (MMM-YY)
    if (timeframe === "3m" || timeframe === "6m" || timeframe === "1y") {
      const ticks: number[] = [];
      const current = new Date(firstTime);
      current.setDate(1); // start at beginning of month

      while (current.getTime() <= lastTime) {
        if (current.getTime() >= firstTime) {
          ticks.push(current.getTime());
        }
        current.setMonth(current.getMonth() + 1);
      }
      return ticks.length >= 2 ? ticks : undefined;
    }

    // For 3Y timeframe: Quarterly ticks (MMM-YY)
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

    // For 5Y timeframe: Bi-annual ticks (every 6 months)
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

    // For ALL timeframe: Annual ticks (every 12 months)
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
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-4 mb-6">
        {/* Row 1: Section Title + Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2.5">
            <TrendingUp size={20} className="text-teal-400" />
            <span>Historical Returns Analysis (%)</span>
          </h3>

          {/* Timeframe Filter Buttons & High/Low Toggle */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <div className="flex items-center bg-slate-950/80 border border-slate-800/80 p-1 rounded-xl shadow-inner gap-1">
              {(["3m", "6m", "1y", "3y", "5y", "all"] as FundTimeframe[]).map(
                (tf) => (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeChange(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition duration-200 cursor-pointer ${timeframe === tf ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50 scale-105" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"}`}
                  >
                    {tf}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setShowHighLow(!showHighLow)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition duration-200 cursor-pointer border flex items-center gap-1.5 shadow-sm ${showHighLow ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-950/40" : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"}`}
              title="Toggle High and Low points on graph"
            >
              <Layers size={13} />
              <span>High / Low</span>
            </button>
          </div>
        </div>

        {/* Row 2: Legend Cards (Fund & Benchmark Side-by-Side) */}
        <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-800/60">
          {/* Fund Name & Color Dot & Available Date */}
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-slate-300 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="font-bold text-slate-200">
              {holding.schemeName || "Fund"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Available Since:{" "}
              <strong className="text-slate-200">
                {formatNullableDate(earliestFundDateStr || null)}
              </strong>
            </span>
          </div>

          {/* Benchmark Name & Color Dot & Available Date */}
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-slate-300 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0"></span>
            <span className="font-bold text-slate-200">
              {factsheetMeta.profile.benchmarkName || "Benchmark"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Available Since:{" "}
              <strong className="text-slate-200">
                {formatNullableDate(earliestBenchDateStr || null)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Chart Viewport */}
      {filteredChartData.length > 0 || isLoadingChart ? (
        <div className="h-80 w-full relative">
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
              margin={{ top: 15, right: 10, left: 5, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorFund" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.3}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={xAxisTicks}
                tickFormatter={(val: number) => {
                  const d = new Date(val);
                  return d.toLocaleDateString("en-IN", {
                    month: "short",
                    year: "2-digit",
                  });
                }}
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                width={52}
                dx={-4}
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={(val: number) => {
                  if (Math.abs(val) >= 100) return `${val.toFixed(0)}%`;
                  return `${val.toFixed(1)}%`;
                }}
              />
              <Tooltip
                content={
                  <CustomChartTooltip
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
              />

              {entryPoints.map((ep, idx) => (
                <ReferenceLine
                  key={`entry-line-${idx}`}
                  x={ep.timestamp}
                  stroke={ep.txType === "BUY" ? "#14b8a6" : "#f43f5e"}
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
              ))}
              {entryPoints.map((ep, idx) => (
                <ReferenceDot
                  key={`entry-dot-${idx}`}
                  x={ep.timestamp}
                  y={ep.fundReturn}
                  r={6}
                  fill={ep.txType === "BUY" ? "#14b8a6" : "#f43f5e"}
                  stroke="#0f172a"
                  strokeWidth={2}
                  label={{
                    value: ep.label,
                    position: idx % 2 === 0 ? "top" : "bottom",
                    fill: ep.txType === "BUY" ? "#34d399" : "#fb7185",
                    fontSize: 10,
                    fontWeight: "bold",
                    offset: 10,
                  }}
                />
              ))}

              {showHighLow && periodHighLow && (
                <>
                  {/* Period High Reference Lines */}
                  <ReferenceLine
                    x={periodHighLow.highPt.timestamp}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                  <ReferenceLine
                    y={periodHighLow.highPt.fundReturn}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                  <ReferenceDot
                    x={periodHighLow.highPt.timestamp}
                    y={periodHighLow.highPt.fundReturn}
                    r={7}
                    fill="#10b981"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    label={{
                      value: `High: +${periodHighLow.highPt.fundReturn.toFixed(1)}%`,
                      position: "top",
                      fill: "#34d399",
                      fontSize: 11,
                      fontWeight: "bold",
                      offset: 12,
                    }}
                  />

                  {/* Period Low Reference Lines */}
                  <ReferenceLine
                    x={periodHighLow.lowPt.timestamp}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                  <ReferenceLine
                    y={periodHighLow.lowPt.fundReturn}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                  {periodHighLow.lowPt.timestamp !==
                    periodHighLow.highPt.timestamp && (
                    <ReferenceDot
                      x={periodHighLow.lowPt.timestamp}
                      y={periodHighLow.lowPt.fundReturn}
                      r={7}
                      fill="#f43f5e"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      label={{
                        value: `Low: ${periodHighLow.lowPt.fundReturn >= 0 ? "+" : ""}${periodHighLow.lowPt.fundReturn.toFixed(1)}%`,
                        position: "bottom",
                        fill: "#fb7185",
                        fontSize: 11,
                        fontWeight: "bold",
                        offset: 12,
                      }}
                    />
                  )}
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : isStock ? (
        <div className="h-72 border border-dashed border-slate-800 rounded-xl flex flex-col justify-center items-center text-center p-8 bg-slate-950/40">
          <AlertTriangle className="text-amber-500 mb-3" size={32} />
          <h4 className="text-sm font-bold text-slate-300">
            Unlisted Stock / No Price History
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            This asset is currently unlisted or suspended from trading on the
            stock exchange. No historical price tracking feed is available.
          </p>
        </div>
      ) : (
        <div className="h-72 border border-dashed border-slate-800 rounded-xl flex flex-col justify-center items-center text-center p-8 bg-slate-950/40">
          <AlertTriangle className="text-amber-500 mb-3" size={32} />
          <h4 className="text-sm font-bold text-slate-300">
            NAV History Not Found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
            Please map this scheme to an AMFI Scheme Code in the mapping tab to
            unlock dynamic line chart visualisations and comparison stats.
          </p>
        </div>
      )}

      {/* High / Low Stat Pill Summary Bar (Under Graph View) */}
      {showHighLow && periodHighLow && (
        <div className="mt-5 p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400 font-semibold">Period High:</span>
            <strong className="text-emerald-400 font-bold">
              ₹{periodHighLow.highPt.fundNav.toFixed(2)}
            </strong>
            <span className="text-slate-500">
              (
              {new Date(periodHighLow.highPt.timestamp).toLocaleDateString(
                "en-IN",
                { day: "2-digit", month: "short", year: "numeric" }
              )}
              , +{periodHighLow.highPt.fundReturn.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-slate-400 font-semibold">Period Low:</span>
            <strong className="text-rose-400 font-bold">
              ₹{periodHighLow.lowPt.fundNav.toFixed(2)}
            </strong>
            <span className="text-slate-500">
              (
              {new Date(periodHighLow.lowPt.timestamp).toLocaleDateString(
                "en-IN",
                { day: "2-digit", month: "short", year: "numeric" }
              )}
              , {periodHighLow.lowPt.fundReturn >= 0 ? "+" : ""}
              {periodHighLow.lowPt.fundReturn.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 font-medium border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
            <span>Range:</span>
            <strong className="text-amber-400 font-bold">
              {(
                periodHighLow.highPt.fundReturn - periodHighLow.lowPt.fundReturn
              ).toFixed(1)}
              %
            </strong>

            {(() => {
              const daysDiff = Math.round(
                Math.abs(
                  periodHighLow.highPt.timestamp - periodHighLow.lowPt.timestamp
                ) /
                  (24 * 60 * 60 * 1000)
              );
              return (
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 ml-1">
                  <Calendar size={12} className="text-amber-400" />
                  <span>
                    {daysDiff} {daysDiff === 1 ? "day" : "days"} apart
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {isApproximateProxy && (
        <div className="mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-300 leading-relaxed font-medium">
            {holding.category?.toLowerCase().includes("multi asset")
              ? "Approximate Proxy: No clean passive equivalent or index fund exists for the Multi Asset Allocation category. ICICI Prudential Equity & Debt (Aggressive Hybrid) is used as a proxy, so alpha figures represent an approximation."
              : "Strategy Mismatch: This is a Long-Short / Specialized SIF strategy, which targets absolute/hedged returns rather than traditional long-only benchmarks. Comparing performance to the Nifty 50 TRI is for informational purposes only and alpha metrics are not directly comparable to regular long-only mutual funds."}
          </p>
        </div>
      )}
    </div>
  );
}
