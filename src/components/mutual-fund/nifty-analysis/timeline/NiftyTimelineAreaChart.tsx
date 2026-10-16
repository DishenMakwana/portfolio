"use client";

import { useMemo } from "react";
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
import { NiftyChartTooltip } from "./NiftyChartTooltip";
import type { NiftyTimelineAreaChartProps } from "@/types/nifty-analysis";

export function NiftyTimelineAreaChart({
  timeline,
  entryPoints,
  monthTxMap,
  currentNifty,
  allTimeHighNifty,
  weightedAvgNiftyEntry,
  niftyEntryBufferPct,
  showValuationZones,
  tradeMode,
  timeframe,
  txFilter,
}: NiftyTimelineAreaChartProps) {
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

  return (
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
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
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
  );
}
