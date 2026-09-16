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
import { TrendingUp, Calendar, Layers, X, Check } from "lucide-react";
import { formatNullableDate } from "@/helpers/formatters";
import { parseToLocalMidnight } from "@/helpers/dates";
import type {
  ChartActiveDotProps,
  CustomTooltipProps,
  FundTimeframe,
} from "@/types/fund-details";
import type { FactsheetChartPoint } from "@/types/portfolio";
import type { WatchlistPerformanceChartCardProps } from "@/types/watchlist";
import { fetchChartData } from "@/actions/chartActions";

function CustomChartTooltip({
  active,
  payload,
  benchmarkName,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as FactsheetChartPoint;
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
          <span className="text-emerald-400 font-bold flex items-center gap-2">
            <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-500/25"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white"></span>
            </span>
            Fund Return:
          </span>
          <span className="font-bold text-slate-100 font-mono">
            {data.fundReturn >= 0 ? "+" : ""}
            {data.fundReturn.toFixed(2)}%
          </span>
        </div>
        <div className="text-[11px] text-slate-400 pl-3.5 flex justify-between font-mono">
          <span>NAV:</span>
          <span>₹{data.fundNav.toFixed(2)}</span>
        </div>

        {data.benchReturn !== null && data.benchReturn !== undefined && (
          <>
            <div className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-1.5">
              <span className="text-indigo-400 font-bold flex items-center gap-2">
                <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-indigo-500/25"></span>
                  <span className="w-1.5 h-1.5 rotate-45 rounded-[0.5px] bg-indigo-400 border border-white"></span>
                </span>
                {benchmarkName || "Benchmark"}:
              </span>
              <span className="font-bold text-slate-100 font-mono">
                {data.benchReturn >= 0 ? "+" : ""}
                {data.benchReturn.toFixed(2)}%
              </span>
            </div>
            {data.benchNav !== null && (
              <div className="text-[11px] text-slate-400 pl-3.5 flex justify-between font-mono">
                <span>Index NAV:</span>
                <span>₹{data.benchNav.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const HighLabelBadge = (props: {
  viewBox?: { x?: number; y?: number };
  value?: string;
}) => {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 620;
  const rectX = isNearRightEdge ? -108 : -54;
  const textX = isNearRightEdge ? -54 : 0;

  return (
    <g transform={`translate(${x}, ${y - 14})`}>
      <rect
        x={rectX}
        y={-18}
        width={108}
        height={22}
        rx={6}
        fill="#047857"
        stroke="#34d399"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))" }}
      />
      <text
        x={textX}
        y={-6}
        fill="#ecfdf5"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </g>
  );
};

const LowLabelBadge = (props: {
  viewBox?: { x?: number; y?: number };
  value?: string;
}) => {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 620;
  const rectX = isNearRightEdge ? -100 : -50;
  const textX = isNearRightEdge ? -50 : 0;

  return (
    <g transform={`translate(${x}, ${y + 14})`}>
      <rect
        x={rectX}
        y={-4}
        width={100}
        height={22}
        rx={6}
        fill="#be123c"
        stroke="#f43f5e"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))" }}
      />
      <text
        x={textX}
        y={8}
        fill="#fff1f2"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </g>
  );
};

const FundActiveDot = (props: ChartActiveDotProps) => {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) {
    return null;
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="#10b981" fillOpacity={0.25} />
      <circle
        cx={cx}
        cy={cy}
        r={5.5}
        fill="#10b981"
        stroke="#ffffff"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0px 1.5px 3px rgba(0, 0, 0, 0.45))" }}
      />
    </g>
  );
};

const BenchmarkActiveDot = (props: ChartActiveDotProps) => {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) {
    return null;
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="#6366f1" fillOpacity={0.25} />
      <rect
        x={cx - 4.5}
        y={cy - 4.5}
        width={9}
        height={9}
        rx={1}
        fill="#6366f1"
        stroke="#ffffff"
        strokeWidth={2}
        transform={`rotate(45 ${cx} ${cy})`}
        style={{ filter: "drop-shadow(0px 1.5px 3px rgba(0, 0, 0, 0.45))" }}
      />
    </g>
  );
};

export default function WatchlistPerformanceChartCard({
  fund,
}: WatchlistPerformanceChartCardProps) {
  const [timeframe, setTimeframe] = useState<FundTimeframe>("1y");
  const [showHighLow, setShowHighLow] = useState<boolean>(false);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);

  // Custom Date Range filter states
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] =
    useState<boolean>(false);

  const initialData = useMemo(
    () => fund.initialChartData || [],
    [fund.initialChartData]
  );

  // Active chart data: starts with server-provided 1Y data
  const [activeChartData, setActiveChartData] =
    useState<FactsheetChartPoint[]>(initialData);

  // Client-side cache: Map<timeframe, chartData> — pre-seeded with "1y"
  const chartCache = useRef<Map<FundTimeframe, FactsheetChartPoint[]>>(
    new Map([["1y", initialData]])
  );

  // Subsets of 1Y range: 3M and 6M are sliced instantaneously client-side
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

  // Helper: fetch full historical data if not in cache
  const ensureAllDataFetched = useCallback(async (): Promise<
    FactsheetChartPoint[]
  > => {
    const cachedAll = chartCache.current.get("all");
    if (cachedAll) return cachedAll;

    setIsLoadingChart(true);
    try {
      const result = await fetchChartData(
        fund.schemeCode,
        fund.benchmarkCode || "120716",
        fund.asOfDate || new Date().toISOString().split("T")[0],
        "all",
        [],
        undefined,
        "watchlist"
      );
      chartCache.current.set("all", result.chartData);
      return result.chartData;
    } catch (err) {
      console.error("Failed to fetch full chart data for watchlist:", err);
      return activeChartData;
    } finally {
      setIsLoadingChart(false);
    }
  }, [fund.schemeCode, fund.benchmarkCode, fund.asOfDate, activeChartData]);

  // Helper: slice full dataset by custom date range and re-index returns from 0%
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

  const handleApplyCustomRange = useCallback(
    async (fromOverride?: string, toOverride?: string) => {
      const from = fromOverride ?? customFromDate;
      const to = toOverride ?? customToDate;
      if (!from || !to) return;

      setIsCustomDatePickerOpen(false);
      setTimeframe("custom");

      const fullData = await ensureAllDataFetched();
      const sliced = sliceByDateRange(fullData, from, to);
      setActiveChartData(sliced);
    },
    [customFromDate, customToDate, ensureAllDataFetched, sliceByDateRange]
  );

  const handleTimeframeChange = useCallback(
    async (tf: FundTimeframe) => {
      if (tf === timeframe) return;
      setTimeframe(tf);

      // Fast-path: 3M and 6M sliced client-side from 1Y
      if (tf === "3m" || tf === "6m") {
        let parent1y = chartCache.current.get("1y");
        if (!parent1y) {
          parent1y = initialData;
          chartCache.current.set("1y", parent1y);
        }
        const sliced = sliceFromParent(parent1y, tf);
        setActiveChartData(sliced);
        return;
      }

      // Check cache
      const cached = chartCache.current.get(tf);
      if (cached) {
        setActiveChartData(cached);
        return;
      }

      // Fetch lazily
      setIsLoadingChart(true);
      try {
        const result = await fetchChartData(
          fund.schemeCode,
          fund.benchmarkCode || "120716",
          fund.asOfDate || new Date().toISOString().split("T")[0],
          tf,
          [],
          undefined,
          "watchlist"
        );
        chartCache.current.set(tf, result.chartData);
        setActiveChartData(result.chartData);
      } catch (err) {
        console.error(`Failed to fetch ${tf} chart data:`, err);
      } finally {
        setIsLoadingChart(false);
      }
    },
    [
      timeframe,
      initialData,
      sliceFromParent,
      fund.schemeCode,
      fund.benchmarkCode,
      fund.asOfDate,
    ]
  );

  // Calculate dynamic stats, High/Low markers, and yDomain with 15% headroom padding per AGENTS.md
  const { filteredChartData, minFundPoint, maxFundPoint, yDomain, xAxisTicks } =
    useMemo(() => {
      if (!activeChartData || activeChartData.length === 0) {
        return {
          filteredChartData: [],
          minFundPoint: null,
          maxFundPoint: null,
          yDomain: [-10, 10] as [number, number],
          xAxisTicks: [],
        };
      }

      let min = Infinity;
      let max = -Infinity;
      let minPt: FactsheetChartPoint = activeChartData[0];
      let maxPt: FactsheetChartPoint = activeChartData[0];

      activeChartData.forEach((pt) => {
        if (pt.fundReturn < min) {
          min = pt.fundReturn;
          minPt = pt;
        }
        if (pt.fundReturn > max) {
          max = pt.fundReturn;
          maxPt = pt;
        }
        if (pt.benchReturn !== null && pt.benchReturn !== undefined) {
          if (pt.benchReturn < min) min = pt.benchReturn;
          if (pt.benchReturn > max) max = pt.benchReturn;
        }
      });

      const range = max - min;
      // Mandatory 15% top & bottom headroom padding per AGENTS.md
      const padding = Math.max(range * 0.15, 5);
      const domainMin = Math.floor(min - padding);
      const domainMax = Math.ceil(max + padding);

      // Generate ~6-8 evenly spaced X-axis ticks
      const ticks: number[] = [];
      const totalPoints = activeChartData.length;
      if (totalPoints > 0) {
        const step = Math.max(1, Math.floor(totalPoints / 7));
        for (let i = 0; i < totalPoints; i += step) {
          ticks.push(activeChartData[i].timestamp);
        }
        if (!ticks.includes(activeChartData[totalPoints - 1].timestamp)) {
          ticks.push(activeChartData[totalPoints - 1].timestamp);
        }
      }

      return {
        filteredChartData: activeChartData,
        minFundPoint: minPt,
        maxFundPoint: maxPt,
        yDomain: [domainMin, domainMax] as [number, number],
        xAxisTicks: ticks,
      };
    }, [activeChartData]);

  const benchmarkDisplayName =
    fund.benchmarkName || fund.benchmarkFundName || "Benchmark Index";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md"
    >
      <div className="flex flex-col gap-4 mb-6">
        {/* Row 1: Section Title + Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2.5">
            <TrendingUp size={20} className="text-teal-400" />
            <span>Historical Returns Analysis (%)</span>
          </h3>

          {/* Timeframe Filter Buttons & Custom Date Range Filter */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap relative">
            <div className="flex items-center bg-slate-950/80 border border-slate-800/80 p-1 rounded-xl shadow-inner gap-1">
              {(["3m", "6m", "1y", "3y", "5y", "all"] as FundTimeframe[]).map(
                (tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setIsCustomDatePickerOpen(false);
                      handleTimeframeChange(tf);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition duration-200 cursor-pointer ${
                      timeframe === tf
                        ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50 scale-105"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    }`}
                  >
                    {tf}
                  </button>
                )
              )}
            </div>

            {/* Custom Date Range Filter Popover */}
            <div className="relative">
              <button
                onClick={() => setIsCustomDatePickerOpen((prev) => !prev)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition duration-200 cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                  timeframe === "custom"
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-teal-950/40"
                    : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Calendar
                  size={13}
                  className={timeframe === "custom" ? "text-teal-400" : ""}
                />
                <span>
                  {timeframe === "custom" && customFromDate && customToDate
                    ? `${customFromDate} - ${customToDate}`
                    : "Custom Date"}
                </span>
              </button>

              {isCustomDatePickerOpen && (
                <div className="absolute right-0 top-full mt-2.5 z-50 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl w-72 flex flex-col gap-3.5 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="font-extrabold text-slate-100 flex items-center gap-1.5">
                      <Calendar size={14} className="text-teal-400" />
                      Custom Date Filter
                    </span>
                    <button
                      onClick={() => setIsCustomDatePickerOpen(false)}
                      className="text-slate-500 hover:text-slate-300 p-0.5 rounded-md hover:bg-slate-800/60 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={customFromDate}
                        onChange={(e) => setCustomFromDate(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={customToDate}
                        onChange={(e) => setCustomToDate(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                      Quick Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          const todayStr =
                            fund.asOfDate ||
                            new Date().toISOString().split("T")[0];
                          const ytdStr = `${new Date().getFullYear()}-01-01`;
                          setCustomFromDate(ytdStr);
                          setCustomToDate(todayStr);
                          handleApplyCustomRange(ytdStr, todayStr);
                        }}
                        className="px-2.5 py-1 bg-slate-800/60 text-slate-300 border border-slate-700/50 rounded-lg text-[11px] font-bold hover:bg-slate-700/60 transition"
                      >
                        YTD (Jan 1)
                      </button>
                      {fund.earliestFundDateStr && (
                        <button
                          onClick={() => {
                            const todayStr =
                              fund.asOfDate ||
                              new Date().toISOString().split("T")[0];
                            setCustomFromDate(fund.earliestFundDateStr!);
                            setCustomToDate(todayStr);
                            handleApplyCustomRange(
                              fund.earliestFundDateStr!,
                              todayStr
                            );
                          }}
                          className="px-2.5 py-1 bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 rounded-lg text-[11px] font-bold hover:bg-emerald-900/60 transition"
                        >
                          Inception ({fund.earliestFundDateStr})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => handleApplyCustomRange()}
                      disabled={!customFromDate || !customToDate}
                      className="flex-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black py-1.5 px-3 rounded-xl transition duration-200 text-xs shadow-md shadow-teal-950/40 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Apply Range</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHighLow(!showHighLow)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition duration-200 cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                showHighLow
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-950/40"
                  : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
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
            <span className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-500/20"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white"></span>
            </span>
            <span className="font-bold text-slate-200">
              {fund.schemeName || "Fund"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Available Since:{" "}
              <strong className="text-slate-200">
                {formatNullableDate(fund.earliestFundDateStr || null)}
              </strong>
            </span>
          </div>

          {/* Benchmark Name & Color Dot & Available Date */}
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-slate-300 shadow-sm">
            <span className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-indigo-500/20"></span>
              <span className="w-2 h-2 rotate-45 rounded-[0.5px] bg-indigo-400 border border-white"></span>
            </span>
            <span className="font-bold text-slate-200">
              {benchmarkDisplayName}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Available Since:{" "}
              <strong className="text-slate-200">
                {formatNullableDate(fund.earliestBenchDateStr || null)}
              </strong>
            </span>
          </div>
        </div>
      </div>

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
              key={`watchlist-chart-${timeframe}-${customFromDate}-${customToDate}-${filteredChartData.length}`}
              data={filteredChartData}
              margin={{ top: 15, right: 20, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient
                  id="colorWatchlistFund"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient
                  id="colorWatchlistBench"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
                tick={{ fill: "#64748b", fontSize: 10, dy: 3 }}
                height={34}
              >
                <Label
                  value="Date"
                  position="insideBottom"
                  offset={-8}
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                />
              </XAxis>

              <YAxis
                domain={yDomain}
                tickFormatter={(val: number) => `${val.toFixed(1)}%`}
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 10 }}
                width={50}
              >
                <Label
                  value="Return (%)"
                  angle={-90}
                  position="insideLeft"
                  offset={-2}
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  style={{ textAnchor: "middle" }}
                />
              </YAxis>

              <Tooltip
                content={
                  <CustomChartTooltip benchmarkName={benchmarkDisplayName} />
                }
              />

              <ReferenceLine
                y={0}
                stroke="#475569"
                strokeDasharray="3 3"
                strokeWidth={1}
              />

              {/* Fund Area */}
              <Area
                type="monotone"
                dataKey="fundReturn"
                name={fund.schemeName || "Fund"}
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorWatchlistFund)"
                isAnimationActive={false}
                activeDot={<FundActiveDot />}
              />

              {/* Benchmark Area */}
              <Area
                type="monotone"
                dataKey="benchReturn"
                name={benchmarkDisplayName}
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorWatchlistBench)"
                isAnimationActive={false}
                activeDot={<BenchmarkActiveDot />}
              />

              {/* High and Low Reference Markers */}
              {showHighLow && maxFundPoint && (
                <>
                  <ReferenceLine
                    y={maxFundPoint.fundReturn}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                  <ReferenceDot
                    x={maxFundPoint.timestamp}
                    y={maxFundPoint.fundReturn}
                    r={5}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    <Label
                      content={
                        <HighLabelBadge
                          value={`High: +${maxFundPoint.fundReturn.toFixed(1)}%`}
                        />
                      }
                    />
                  </ReferenceDot>
                </>
              )}

              {showHighLow && minFundPoint && (
                <>
                  <ReferenceLine
                    y={minFundPoint.fundReturn}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                  <ReferenceDot
                    x={minFundPoint.timestamp}
                    y={minFundPoint.fundReturn}
                    r={5}
                    fill="#f43f5e"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    <Label
                      content={
                        <LowLabelBadge
                          value={`Low: ${minFundPoint.fundReturn.toFixed(1)}%`}
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
        <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
          No historical NAV data available for this timeframe.
        </div>
      )}
    </motion.div>
  );
}
