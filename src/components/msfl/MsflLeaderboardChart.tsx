"use client";

import { MsflLeaderboardChartProps } from "@/types/msfl";
import { useState } from "react";

export default function MsflLeaderboardChart({
  mfHoldings,
  niftyBenchmark,
}: MsflLeaderboardChartProps) {
  const [hoveredBar, setHoveredBar] = useState<{
    x: number;
    y: number;
    symbol: string;
    cagr: number;
  } | null>(null);

  const maxCagr = Math.max(...mfHoldings.map((m) => m.cagr), 0);
  const minCagr = Math.min(...mfHoldings.map((m) => m.cagr), 0);
  const chartH = 320;
  const barW = 60;
  const minGap = 28;
  const padX = 65;
  const padY = 40;
  const benchmark = niftyBenchmark;

  // Set bounds for Y scale
  const yMax = Math.max(maxCagr, benchmark, 1) * 1.15;
  const yMin = minCagr < 0 ? minCagr * 1.35 : 0; // Pad negative side slightly to prevent text clipping
  const totalRange = yMax - yMin;

  const getY = (v: number) =>
    padY + chartH - ((v - yMin) / totalRange) * chartH;

  const zeroY = getY(0);
  const benchmarkY = getY(benchmark);

  const n = mfHoldings.length;
  const neededW = padX * 2 + n * (barW + minGap) - minGap;
  const totalW = Math.max(800, neededW);
  const gap = n > 1 ? (totalW - padX * 2 - n * barW) / (n - 1) : 30;

  return (
    <div className="overflow-x-auto select-none relative">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + padY * 2 + 60}`}
        className="w-full min-w-[700px] h-[480px]"
      >
        {/* Grid lines */}
        {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 75, 100, 150].map(
          (v) => {
            if (v > yMax || v < yMin) return null;
            const y = getY(v);
            return (
              <g key={v}>
                <line
                  x1={padX}
                  y1={y}
                  x2={totalW - padX}
                  y2={y}
                  stroke={v === 0 ? "#475569" : "#1e293b"}
                  strokeWidth={v === 0 ? "1.5" : "1"}
                  strokeOpacity={v === 0 ? "0.8" : "1"}
                />
                <text
                  x={padX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill={v === 0 ? "#94a3b8" : "#475569"}
                  fontWeight={v === 0 ? "bold" : "normal"}
                >
                  {v}%
                </text>
              </g>
            );
          }
        )}

        {/* Benchmark line */}
        <line
          x1={padX}
          y1={benchmarkY}
          x2={totalW - padX}
          y2={benchmarkY}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="5,3"
        />
        <text
          x={totalW - padX + 4}
          y={benchmarkY + 3}
          fontSize="9"
          fill="#f59e0b"
          fontWeight="bold"
        >
          Nifty {benchmark.toFixed(1)}%
        </text>

        {/* Bars */}
        {mfHoldings.map((m, i) => {
          const x = padX + i * (barW + gap);
          const valY = getY(m.cagr);
          const isNegative = m.cagr < 0;

          const rectY = isNegative ? zeroY : valY;
          const rectH = isNegative ? valY - zeroY : zeroY - valY;

          const isTop = i === 0;

          const isHovered = hoveredBar?.symbol === m.symbol;

          return (
            <g
              key={m.symbol}
              onMouseEnter={() =>
                setHoveredBar({
                  x,
                  y: valY,
                  symbol: m.symbol,
                  cagr: m.cagr,
                })
              }
              onMouseLeave={() => setHoveredBar(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={rectY}
                width={barW}
                height={Math.max(2, rectH)}
                rx="6"
                fill={
                  isTop
                    ? "url(#topGrad)"
                    : m.cagr >= niftyBenchmark
                      ? "url(#goodGrad)"
                      : "url(#lowGrad)"
                }
                className={`transition-[opacity,filter] duration-200 ${
                  isTop ? "drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" : ""
                } ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              />
              <text
                x={x + barW / 2}
                y={isNegative ? valY + 12 : valY - 6}
                textAnchor="middle"
                fontSize="9"
                fill={isNegative ? "#f87171" : "#94a3b8"}
                fontWeight="bold"
                className={`transition-opacity duration-200 ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              >
                {m.cagr.toFixed(1)}%
              </text>
              <text
                x={x + barW / 2}
                y={padY + chartH + 16}
                textAnchor="middle"
                fontSize="8.5"
                fill="#64748b"
                fontWeight="bold"
                className={`transition-opacity duration-200 ${
                  hoveredBar
                    ? isHovered
                      ? "opacity-100"
                      : "opacity-[0.45]"
                    : "opacity-100"
                }`}
              >
                {m.symbol}
              </text>
            </g>
          );
        })}

        {/* Custom SVG Tooltip */}
        {hoveredBar &&
          (() => {
            const tooltipX = Math.max(
              5,
              Math.min(hoveredBar.x + barW / 2 - 85, totalW - 175)
            );
            const isNegative = hoveredBar.cagr < 0;
            const tooltipY = isNegative
              ? Math.min(hoveredBar.y + 15, chartH + padY * 2 - 15)
              : Math.max(hoveredBar.y - 70, 5);
            return (
              <g className="pointer-events-none">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width="170"
                  height="58"
                  rx="8"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                  className="drop-shadow-[0_10px_15px_rgba(0,0,0,0.65)]"
                />
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 18}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {hoveredBar.symbol}
                </text>
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 33}
                  textAnchor="middle"
                  fill="#14b8a6"
                  fontSize="9"
                  fontWeight="extrabold"
                >
                  CAGR: {hoveredBar.cagr.toFixed(2)}%
                </text>
                <text
                  x={tooltipX + 85}
                  y={tooltipY + 46}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="7"
                >
                  {hoveredBar.cagr >= niftyBenchmark
                    ? "🏆 Outperforming Nifty"
                    : "Below Nifty"}
                </text>
              </g>
            );
          })()}

        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id="goodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
