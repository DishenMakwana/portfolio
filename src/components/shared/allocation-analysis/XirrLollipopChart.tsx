"use client";

import {
  formatHoldingYearsAndDays,
  formatInrCompact,
} from "@/helpers/formatters";
import type { XirrLollipopChartProps } from "@/types/insights";

export default function XirrLollipopChart({
  svgRef,
  analysisData,
  niftyBenchmark,
  entityLabel,
  hoveredPoint,
  onHoverPoint,
}: XirrLollipopChartProps) {
  const chartW = 800;
  const chartH = 460;
  const padLeft = 65;
  const padRight = 65;
  const padTop = 45;
  const padBottom = 55;

  const width = chartW - padLeft - padRight;
  const height = chartH - padTop - padBottom;

  const maxDays = Math.max(...analysisData.map((d) => d.avgHoldingDays), 365);
  const maxX = Math.ceil(maxDays / 182.5) * 182.5;

  const maxVal = Math.max(...analysisData.map((d) => d.xirr), 15);
  const minVal = Math.min(...analysisData.map((d) => d.xirr), 0);

  const maxYVal = Math.ceil(maxVal / 5) * 5;
  const minYVal = minVal < 0 ? Math.floor(minVal / 5) * 5 : 0;

  const getX = (days: number) => padLeft + (days / maxX) * width;
  const getYVal = (val: number) =>
    padTop + height - ((val - minYVal) / (maxYVal - minYVal)) * height;

  const xTicksRaw: number[] = [];
  for (let d = 182.5; d <= maxX; d += 182.5) {
    xTicksRaw.push(d);
  }
  const xTicks =
    xTicksRaw.length > 10 ? xTicksRaw.filter((_, i) => i % 2 === 0) : xTicksRaw;

  const yTicksVal: number[] = [];
  const yStep = maxYVal - minYVal > 30 ? 10 : 5;
  for (let y = minYVal; y <= maxYVal; y += yStep) {
    yTicksVal.push(y);
  }

  const benchmarkY = getYVal(niftyBenchmark);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full min-w-[700px] h-[460px]"
    >
      {/* Y-axis grid lines & labels */}
      {yTicksVal.map((yVal) => {
        const y = getYVal(yVal);
        return (
          <g key={yVal}>
            <line
              x1={padLeft}
              y1={y}
              x2={chartW - padRight}
              y2={y}
              stroke={yVal === 0 ? "#475569" : "#1e293b"}
              strokeWidth={yVal === 0 ? "1.5" : "1"}
              strokeOpacity={yVal === 0 ? "0.8" : "1"}
            />
            <text
              x={padLeft - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill={yVal === 0 ? "#94a3b8" : "#475569"}
              fontWeight={yVal === 0 ? "bold" : "normal"}
            >
              {yVal.toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* X-axis grid lines & labels (Time in Years) */}
      {xTicks.map((tick) => {
        const x = getX(tick);
        const yrs = tick / 365;
        let label = `${yrs.toFixed(1)}Y`;
        if (Math.abs(yrs - Math.round(yrs)) < 0.05) {
          label = `${Math.round(yrs)}Y`;
        }
        return (
          <g key={tick}>
            <line
              x1={x}
              y1={padTop}
              x2={x}
              y2={chartH - padBottom}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <text
              x={x}
              y={chartH - padBottom + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#475569"
            >
              {label} ({Math.round(tick)}d)
            </text>
          </g>
        );
      })}

      {/* Main Axis Lines */}
      <line
        x1={padLeft}
        y1={chartH - padBottom}
        x2={chartW - padRight}
        y2={chartH - padBottom}
        stroke="#334155"
        strokeWidth="1.5"
      />
      <line
        x1={padLeft}
        y1={padTop}
        x2={padLeft}
        y2={chartH - padBottom}
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Axis Titles */}
      <text
        x={padLeft + width / 2}
        y={chartH - 8}
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="#64748b"
      >
        Average Holding Period (Years & Days)
      </text>
      <text
        transform={`rotate(-90 ${15} ${padTop + height / 2})`}
        x={15}
        y={padTop + height / 2}
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="#64748b"
      >
        {entityLabel} XIRR Return (%)
      </text>

      {/* Nifty 3Y Benchmark Line */}
      <line
        x1={padLeft}
        y1={benchmarkY}
        x2={chartW - padRight}
        y2={benchmarkY}
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeDasharray="6,4"
        strokeOpacity="0.85"
      />
      <text
        x={chartW - padRight - 5}
        y={benchmarkY - 6}
        textAnchor="end"
        fontSize="9"
        fill="#f59e0b"
        fontWeight="semibold"
      >
        Nifty Benchmark ({niftyBenchmark.toFixed(1)}% XIRR)
      </text>

      {/* Hover Crosshairs */}
      {hoveredPoint && (
        <g className="pointer-events-none">
          <line
            x1={padLeft}
            y1={hoveredPoint.y}
            x2={hoveredPoint.x}
            y2={hoveredPoint.y}
            stroke="#fbbf24"
            strokeWidth="1.25"
            strokeDasharray="4,3"
            opacity="0.75"
          />
          <line
            x1={hoveredPoint.x}
            y1={hoveredPoint.y}
            x2={hoveredPoint.x}
            y2={chartH - padBottom}
            stroke="#fbbf24"
            strokeWidth="1.25"
            strokeDasharray="4,3"
            opacity="0.75"
          />
          <circle cx={padLeft} cy={hoveredPoint.y} r="3" fill="#fbbf24" />
          <circle
            cx={hoveredPoint.x}
            cy={chartH - padBottom}
            r="3"
            fill="#fbbf24"
          />
        </g>
      )}

      {/* Lollipop Sticks and Heads */}
      {analysisData.map((amc) => {
        const cx = getX(amc.avgHoldingDays);
        const cy = getYVal(amc.xirr);
        const cyZero = getYVal(0);

        const isHovered = hoveredPoint?.name === amc.name;
        const opacity = hoveredPoint ? (isHovered ? 1.0 : 0.25) : 0.85;

        let color = "#3b82f6";
        if (amc.xirr >= 15) {
          color = "#10b981";
        } else if (amc.xirr < 8) {
          color = "#ef4444";
        } else if (amc.xirr < 11) {
          color = "#f59e0b";
        }

        const r = 6 + Math.sqrt(amc.weight) * 2.2;

        const shortName = amc.name
          .replace(" Mutual Fund", "")
          .replace(" India", "")
          .replace(" Sun Life", "")
          .replace(" Templeton", "")
          .split(" ")
          .slice(0, 2)
          .join(" ");

        return (
          <g
            key={`lolipop-${amc.name}`}
            className="cursor-pointer"
            onMouseEnter={() =>
              onHoverPoint({
                x: cx,
                y: cy,
                ...amc,
              })
            }
            onMouseLeave={() => onHoverPoint(null)}
          >
            {isHovered && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 3.5}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeOpacity="0.5"
                className="animate-ping"
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            )}

            {/* Lollipop Stick */}
            <line
              x1={cx}
              y1={cyZero}
              x2={cx}
              y2={cy}
              stroke={color}
              strokeWidth={isHovered ? "3.5" : "2"}
              strokeDasharray={isHovered ? "0" : "3,2"}
              opacity={opacity}
              className="transition-all duration-200"
            />

            {/* Lollipop Head */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              stroke={isHovered ? "#ffffff" : "#1e293b"}
              strokeWidth={isHovered ? "2.5" : "1.5"}
              opacity={opacity}
              className="transition-all duration-200"
            />

            {/* Lollipop name label */}
            <text
              x={cx}
              y={amc.xirr >= 0 ? cy - r - 5 : cy + r + 12}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isHovered ? "bold" : "semibold"}
              fill={isHovered ? "#ffffff" : "#cbd5e1"}
              opacity={hoveredPoint ? (isHovered ? 1.0 : 0.35) : 0.9}
              className="transition-all duration-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              {shortName}
            </text>
          </g>
        );
      })}

      {/* Custom Tooltip */}
      {hoveredPoint &&
        (() => {
          const tooltipW = 200;
          const tooltipH = 105;
          let tx = hoveredPoint.x + 15;
          if (tx + tooltipW > chartW) {
            tx = hoveredPoint.x - tooltipW - 15;
          }
          let ty = hoveredPoint.y - tooltipH / 2;
          if (ty < 10) ty = 10;
          if (ty + tooltipH > chartH - 10) ty = chartH - tooltipH - 10;

          return (
            <g className="pointer-events-none transition-all duration-200">
              <rect
                x={tx}
                y={ty}
                width={tooltipW}
                height={tooltipH}
                rx="12"
                fill="#0b0f19"
                stroke="#1e293b"
                strokeWidth="1.5"
                className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
              />

              <text
                x={tx + 12}
                y={ty + 22}
                fontSize="10"
                fontWeight="black"
                fill="#f1f5f9"
              >
                {hoveredPoint.name.split(" ").slice(0, 3).join(" ")}
              </text>

              <text x={tx + 12} y={ty + 42} fontSize="9" fill="#94a3b8">
                Weight:{" "}
                <tspan fill="#f1f5f9" fontWeight="bold">
                  {hoveredPoint.weight.toFixed(1)}%
                </tspan>{" "}
                ({formatInrCompact(hoveredPoint.current)})
              </text>

              <text x={tx + 12} y={ty + 60} fontSize="9" fill="#94a3b8">
                {entityLabel} XIRR Return:{" "}
                <tspan
                  fill={
                    hoveredPoint.xirr >= 15
                      ? "#2dd4bf"
                      : hoveredPoint.xirr >= 10
                        ? "#fbbf24"
                        : "#fb7185"
                  }
                  fontWeight="black"
                >
                  {hoveredPoint.xirr.toFixed(2)}%
                </tspan>
              </text>

              <text x={tx + 12} y={ty + 78} fontSize="9" fill="#94a3b8">
                Avg. Holding Period:
              </text>
              <text
                x={tx + 12}
                y={ty + 92}
                fontSize="8.5"
                fill="#f1f5f9"
                fontWeight="semibold"
              >
                {formatHoldingYearsAndDays(hoveredPoint.avgHoldingDays)}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
