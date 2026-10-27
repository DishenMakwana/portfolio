"use client";

import {
  formatHoldingYearsAndDays,
  formatInrCompact,
  formatPercent,
} from "@/helpers/formatters";
import type { AbsReturnComboChartProps } from "@/types/insights";

export default function AbsReturnComboChart({
  svgRef,
  analysisWithReturns,
  entityLabel,
  hoveredIdx,
  onHoverIdx,
}: AbsReturnComboChartProps) {
  const chartW = 800;
  const chartH = 460;
  const padLeft = 65;
  const padRight = 65;
  const padTop = 45;
  const padBottomAbs = 80;

  const width = chartW - padLeft - padRight;
  const heightAbs = chartH - padTop - padBottomAbs;

  const maxAbsReturn = Math.max(
    ...analysisWithReturns.map((d) => d.absReturn),
    15
  );
  const minAbsReturn = Math.min(
    ...analysisWithReturns.map((d) => d.absReturn),
    0
  );
  const maxYLeft = Math.ceil(maxAbsReturn / 10) * 10;
  const minYLeft = minAbsReturn < 0 ? Math.floor(minAbsReturn / 10) * 10 : 0;
  const getYLeft = (val: number) =>
    padTop + heightAbs - ((val - minYLeft) / (maxYLeft - minYLeft)) * heightAbs;

  const maxHoldingDays = Math.max(
    ...analysisWithReturns.map((d) => d.avgHoldingDays),
    365
  );
  const maxYRight = Math.ceil(maxHoldingDays / 182.5) * 182.5;
  const getYRight = (val: number) =>
    padTop + heightAbs - (val / maxYRight) * heightAbs;

  const stepXAbs = width / (analysisWithReturns.length || 1);
  const getXAbs = (index: number) => padLeft + stepXAbs * index + stepXAbs / 2;

  const yLeftTicks: number[] = [];
  const leftStep = maxYLeft - minYLeft > 50 ? 20 : 10;
  for (let y = minYLeft; y <= maxYLeft; y += leftStep) {
    yLeftTicks.push(y);
  }

  const yRightTicks: number[] = [];
  const rightStep = maxYRight / 5;
  for (let y = 0; y <= maxYRight; y += rightStep) {
    yRightTicks.push(y);
  }

  const linePoints = analysisWithReturns.map((item, i) => ({
    x: getXAbs(i),
    y: getYRight(item.avgHoldingDays),
  }));

  let linePath = "";
  if (linePoints.length > 0) {
    linePath = linePoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full min-w-[700px] h-[460px]"
    >
      {yLeftTicks.map((yVal) => {
        const y = getYLeft(yVal);
        return (
          <g key={`left-${yVal}`}>
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

      {yRightTicks.map((yVal) => {
        const y = getYRight(yVal);
        const yrs = yVal / 365;
        let label = `${yrs.toFixed(1)}Y`;
        if (Math.abs(yrs - Math.round(yrs)) < 0.05) {
          label = `${Math.round(yrs)}Y`;
        }
        if (yVal === 0) label = "0d";
        return (
          <g key={`right-${yVal}`}>
            <text
              x={chartW - padRight + 10}
              y={y + 4}
              textAnchor="start"
              fontSize="10"
              fill="#f59e0b"
              opacity="0.85"
            >
              {label}
            </text>
          </g>
        );
      })}

      <line
        x1={padLeft}
        y1={padTop}
        x2={padLeft}
        y2={chartH - padBottomAbs}
        stroke="#334155"
        strokeWidth="1.5"
      />
      <line
        x1={chartW - padRight}
        y1={padTop}
        x2={chartW - padRight}
        y2={chartH - padBottomAbs}
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <line
        x1={padLeft}
        y1={chartH - padBottomAbs}
        x2={chartW - padRight}
        y2={chartH - padBottomAbs}
        stroke="#334155"
        strokeWidth="1.5"
      />

      <text
        transform={`rotate(-90 ${15} ${padTop + heightAbs / 2})`}
        x={15}
        y={padTop + heightAbs / 2}
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="#2dd4bf"
      >
        Absolute Return (%)
      </text>
      <text
        transform={`rotate(90 ${chartW - 15} ${padTop + heightAbs / 2})`}
        x={chartW - 15}
        y={padTop + heightAbs / 2}
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="#f59e0b"
      >
        Holding Period (Years)
      </text>

      {analysisWithReturns.map((amc, i) => {
        const cx = getXAbs(i);
        const cy = getYLeft(amc.absReturn);
        const cyZero = getYLeft(0);
        const barW = Math.min(32, stepXAbs * 0.5);

        const rx = cx - barW / 2;
        const isNegative = amc.absReturn < 0;
        const ry = isNegative ? cyZero : cy;
        const rh = isNegative ? cy - cyZero : cyZero - cy;

        const isHovered = hoveredIdx === i;
        const opacity = hoveredIdx !== null ? (isHovered ? 1.0 : 0.25) : 0.85;

        const gradId = `amcAbsGrad-${i}`;
        const stopColor1 = isNegative ? "#f43f5e" : "#06b6d4";
        const stopColor2 = isNegative ? "#be123c" : "#0891b2";

        return (
          <g key={`bar-${amc.name}`}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stopColor1} />
                <stop offset="100%" stopColor={stopColor2} />
              </linearGradient>
            </defs>

            <rect
              x={rx}
              y={ry}
              width={barW}
              height={Math.max(2, rh)}
              rx="4"
              fill={`url(#${gradId})`}
              className="transition-all duration-200 cursor-pointer"
              opacity={opacity}
              onMouseEnter={() => onHoverIdx(i)}
              onMouseLeave={() => onHoverIdx(null)}
            />
          </g>
        );
      })}

      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)] pointer-events-none"
          opacity={hoveredIdx !== null ? 0.35 : 0.85}
        />
      )}

      {analysisWithReturns.map((amc, i) => {
        const cx = getXAbs(i);
        const cy = getYRight(amc.avgHoldingDays);

        const isHovered = hoveredIdx === i;
        const opacity = hoveredIdx !== null ? (isHovered ? 1.0 : 0.25) : 0.9;

        return (
          <g key={`node-${amc.name}`}>
            <circle
              cx={cx}
              cy={cy}
              r={isHovered ? 7 : 4.5}
              fill="#1e1b4b"
              stroke="#f59e0b"
              strokeWidth={isHovered ? "3.5" : "2.5"}
              className="transition-all duration-200 cursor-pointer"
              opacity={opacity}
              onMouseEnter={() => onHoverIdx(i)}
              onMouseLeave={() => onHoverIdx(null)}
            />
          </g>
        );
      })}

      {analysisWithReturns.map((amc, i) => {
        const x = getXAbs(i);
        const isHovered = hoveredIdx === i;
        const shortName = amc.name
          .replace(" Mutual Fund", "")
          .replace(" India", "")
          .replace(" Sun Life", "")
          .replace(" Templeton", "")
          .split(" ")
          .slice(0, 2)
          .join(" ");

        return (
          <g key={`x-lbl-${amc.name}`}>
            <text
              x={x}
              y={chartH - padBottomAbs + 18}
              textAnchor="end"
              fontSize="11"
              fontWeight={isHovered ? "bold" : "semibold"}
              fill={isHovered ? "#2dd4bf" : "#94a3b8"}
              className="transition-colors duration-150"
              transform={`rotate(-40, ${x}, ${chartH - padBottomAbs + 18})`}
            >
              {shortName}
            </text>
          </g>
        );
      })}

      {/* X-axis Title for entity names */}
      <text
        x={padLeft + width / 2}
        y={chartH - 8}
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="#64748b"
      >
        {entityLabel} Exposure
      </text>

      {hoveredIdx !== null &&
        (() => {
          const amc = analysisWithReturns[hoveredIdx];
          const cx = getXAbs(hoveredIdx);
          const cy = getYLeft(amc.absReturn);

          const tooltipW = 200;
          const tooltipH = 105;
          let tx = cx + 15;
          if (tx + tooltipW > chartW) {
            tx = cx - tooltipW - 15;
          }
          let ty = cy - tooltipH / 2;
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
                {amc.name.split(" ").slice(0, 3).join(" ")}
              </text>
              <text x={tx + 12} y={ty + 42} fontSize="9" fill="#94a3b8">
                Weight:{" "}
                <tspan fill="#f1f5f9" fontWeight="bold">
                  {amc.weight.toFixed(1)}%
                </tspan>{" "}
                ({formatInrCompact(amc.current)})
              </text>
              <text x={tx + 12} y={ty + 60} fontSize="9" fill="#94a3b8">
                Absolute Return:{" "}
                <tspan
                  fill={amc.absReturn >= 0 ? "#2dd4bf" : "#fb7185"}
                  fontWeight="black"
                >
                  {formatPercent(amc.absReturn)}
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
                {formatHoldingYearsAndDays(amc.avgHoldingDays)}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
