"use client";

import { useState, useMemo, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  LineChart,
} from "lucide-react";
import {
  formatInrCompact,
  formatCurrency,
  formatHoldingYearsAndDays,
  formatPercent,
} from "@/helpers/formatters";
import type {
  HoveredAmcPoint,
  AllocationAnalysisSortKey,
  AllocationAnalysisTabProps,
} from "@/types/insights";

export default function AllocationAnalysisTab({
  analysisData,
  niftyBenchmark,
  sortKey,
  sortDir,
  onSort,
  entityLabel,
  entityDescription,
  title,
  downloadPrefix,
}: AllocationAnalysisTabProps) {
  const [graphView, setGraphView] = useState<"cagr" | "abs" | "xirr">("cagr");
  const [hoveredPoint, setHoveredPoint] = useState<HoveredAmcPoint | null>(
    null
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cagrSvgRef = useRef<SVGSVGElement | null>(null);
  const absSvgRef = useRef<SVGSVGElement | null>(null);
  const xirrSvgRef = useRef<SVGSVGElement | null>(null);

  const downloadSvgAsPng = (svgElement: SVGSVGElement, filename: string) => {
    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute("width", "800");
      clonedSvg.setAttribute("height", "460");

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const scale = 3;
        const width = 800 * scale;
        const height = 460 * scale;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = "#0f172a"; // slate-900 background match
          ctx.fillRect(0, 0, width, height);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const downloadURL = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = downloadURL;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(downloadURL);
            }
          }, "image/png");
        }
        URL.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    let activeSvg: SVGSVGElement | null = null;
    let filename = `${downloadPrefix}_analysis`;

    if (graphView === "cagr") {
      activeSvg = cagrSvgRef.current;
      filename = `${downloadPrefix}_cagr_returns`;
    } else if (graphView === "abs") {
      activeSvg = absSvgRef.current;
      filename = `${downloadPrefix}_absolute_returns`;
    } else if (graphView === "xirr") {
      activeSvg = xirrSvgRef.current;
      filename = `${downloadPrefix}_xirr_returns`;
    }

    if (activeSvg) {
      const dateStr = new Date().toISOString().split("T")[0];
      downloadSvgAsPng(activeSvg, `${filename}_${dateStr}.png`);
    }
  };

  function SortIcon({ col }: { col: AllocationAnalysisSortKey }) {
    if (sortKey !== col)
      return (
        <ChevronsUpDown
          size={11}
          className="text-slate-600 inline ml-1.5 align-middle"
        />
      );
    return sortDir === "asc" ? (
      <ChevronUp
        size={11}
        className="text-teal-400 inline ml-1.5 align-middle"
      />
    ) : (
      <ChevronDown
        size={11}
        className="text-teal-400 inline ml-1.5 align-middle"
      />
    );
  }

  // Unified dimensions for the SVG chart
  const chartW = 800;
  const chartH = 460;
  const padLeft = 65;
  const padRight = 65;
  const padTop = 45;
  const padBottom = 55;

  const width = chartW - padLeft - padRight;
  const height = chartH - padTop - padBottom;

  // --- Math for CAGR Bubble Chart ---
  const maxDays = Math.max(...analysisData.map((d) => d.avgHoldingDays), 365);
  const maxX = Math.ceil(maxDays / 182.5) * 182.5;

  const maxVal =
    graphView === "cagr"
      ? Math.max(...analysisData.map((d) => d.cagr), 15)
      : Math.max(...analysisData.map((d) => d.xirr), 15);
  const minVal =
    graphView === "cagr"
      ? Math.min(...analysisData.map((d) => d.cagr), 0)
      : Math.min(...analysisData.map((d) => d.xirr), 0);

  const maxYVal = Math.ceil(maxVal / 5) * 5;
  const minYVal = minVal < 0 ? Math.floor(minVal / 5) * 5 : 0;

  const getX = (days: number) => padLeft + (days / maxX) * width;
  const getYVal = (val: number) =>
    padTop + height - ((val - minYVal) / (maxYVal - minYVal)) * height;

  const xTicks: number[] = [];
  for (let d = 182.5; d <= maxX; d += 182.5) {
    xTicks.push(d);
  }

  const yTicksVal: number[] = [];
  const yStep = maxYVal - minYVal > 30 ? 10 : 5;
  for (let y = minYVal; y <= maxYVal; y += yStep) {
    yTicksVal.push(y);
  }

  const benchmarkY = getYVal(niftyBenchmark);

  // --- Math for Absolute Returns Combo Chart ---
  const analysisWithReturns = useMemo(() => {
    return analysisData.map((item) => {
      const absReturn =
        item.invested > 0 ? (item.gain / item.invested) * 100 : 0;
      return {
        ...item,
        absReturn,
      };
    });
  }, [analysisData]);

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
    padTop + height - ((val - minYLeft) / (maxYLeft - minYLeft)) * height;

  const maxHoldingDays = Math.max(
    ...analysisWithReturns.map((d) => d.avgHoldingDays),
    365
  );
  const maxYRight = Math.ceil(maxHoldingDays / 182.5) * 182.5;
  const getYRight = (val: number) =>
    padTop + height - (val / maxYRight) * height;

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
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-2xl border border-teal-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl">
        <div className="flex items-center gap-2">
          <LineChart className="text-teal-400" size={18} />
          <h2 className="text-base font-bold text-slate-100">{title}</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {graphView === "cagr" && (
            <>
              This Cartesian graph plots each {entityDescription} where the{" "}
              <strong>X-axis</strong> represents the weighted average holding
              period (Time) in days/years, the <strong>Y-axis</strong>{" "}
              represents the weighted CAGR return (%), and the{" "}
              <strong>Bubble Size</strong> represents its relative weight in
              your mutual fund portfolio.
            </>
          )}
          {graphView === "abs" && (
            <>
              This Cartesian graph displays two metrics for each {entityLabel}:{" "}
              <strong className="text-teal-400">Absolute Return (%)</strong> as
              vertical bars (left Y-axis) and{" "}
              <strong className="text-amber-500">
                Average Holding Period (Days)
              </strong>{" "}
              as a line overlay (right Y-axis).
            </>
          )}
          {graphView === "xirr" && (
            <>
              This Cartesian graph displays {entityLabel} performance using a{" "}
              <strong className="text-teal-400">Lollipop Chart</strong> where
              the <strong>X-axis</strong> represents average holding period in
              days/years, the <strong>Y-axis</strong> represents {entityLabel}{" "}
              XIRR return (%), and stick height indicates the magnitude of
              return. Node size represents relative portfolio weight (%).
            </>
          )}
        </p>
      </div>

      {/* Unified Graph Card */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            {graphView === "cagr"
              ? `${entityLabel} CAGR Returns vs Weighted Holding Time`
              : graphView === "abs"
                ? `${entityLabel} Absolute Returns vs Weighted Holding Time`
                : `${entityLabel} XIRR Returns vs Weighted Holding Time`}
          </h3>

          {/* Graph View Selector & Download */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setGraphView("cagr")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphView === "cagr"
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                CAGR Bubble
              </button>
              <button
                onClick={() => setGraphView("abs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphView === "abs"
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                Abs Return Combo
              </button>
              <button
                onClick={() => setGraphView("xirr")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphView === "xirr"
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                XIRR Lollipop
              </button>
            </div>

            <button
              onClick={handleDownload}
              title="Download Graph as PNG"
              className="flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/30 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 transition-all cursor-pointer"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto select-none relative">
          {graphView === "cagr" && (
            <svg
              ref={cagrSvgRef}
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
                Weighted CAGR Return (%)
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
                Nifty Benchmark ({niftyBenchmark.toFixed(1)}% CAGR)
              </text>

              {/* Hover Crosshairs */}
              {hoveredPoint && (
                <g className="pointer-events-none">
                  <line
                    x1={padLeft}
                    y1={hoveredPoint.y}
                    x2={hoveredPoint.x}
                    y2={hoveredPoint.y}
                    stroke="#2dd4bf"
                    strokeWidth="1.25"
                    strokeDasharray="4,3"
                    opacity="0.75"
                  />
                  <line
                    x1={hoveredPoint.x}
                    y1={hoveredPoint.y}
                    x2={hoveredPoint.x}
                    y2={chartH - padBottom}
                    stroke="#2dd4bf"
                    strokeWidth="1.25"
                    strokeDasharray="4,3"
                    opacity="0.75"
                  />
                  <circle
                    cx={padLeft}
                    cy={hoveredPoint.y}
                    r="3"
                    fill="#2dd4bf"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={chartH - padBottom}
                    r="3"
                    fill="#2dd4bf"
                  />
                </g>
              )}

              {/* Bubbles / Points */}
              {analysisData.map((amc, i) => {
                const cx = getX(amc.avgHoldingDays);
                const cy = getYVal(amc.cagr);
                const r = 8 + Math.sqrt(amc.weight) * 3.2;

                const isHovered = hoveredPoint?.name === amc.name;
                const opacity = hoveredPoint ? (isHovered ? 1.0 : 0.25) : 0.85;

                const gradId = `amcGrad-${i}`;
                let stopColor1 = "#3b82f6";
                let stopColor2 = "#1d4ed8";
                if (amc.cagr >= 15) {
                  stopColor1 = "#14b8a6";
                  stopColor2 = "#0f766e";
                } else if (amc.cagr < 8) {
                  stopColor1 = "#f43f5e";
                  stopColor2 = "#be123c";
                } else if (amc.cagr < 11) {
                  stopColor1 = "#f59e0b";
                  stopColor2 = "#b45309";
                }

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
                    key={amc.name}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        x: cx,
                        y: cy,
                        ...amc,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <defs>
                      <radialGradient id={gradId} cx="35%" cy="35%" r="65%">
                        <stop
                          offset="0%"
                          stopColor={stopColor1}
                          stopOpacity="1"
                        />
                        <stop
                          offset="70%"
                          stopColor={stopColor2}
                          stopOpacity="0.85"
                        />
                        <stop
                          offset="100%"
                          stopColor={stopColor2}
                          stopOpacity="0.6"
                        />
                      </radialGradient>
                    </defs>

                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 4}
                        fill="none"
                        stroke={stopColor1}
                        strokeWidth="2.5"
                        strokeOpacity="0.6"
                        className="animate-ping"
                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                      />
                    )}

                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={`url(#${gradId})`}
                      stroke={isHovered ? "#ffffff" : stopColor1}
                      strokeWidth={isHovered ? "2" : "1"}
                      strokeOpacity={isHovered ? "1" : "0.7"}
                      className="transition-all duration-200"
                      opacity={opacity}
                    />

                    {r > 13 && (
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        fontSize={r > 18 ? "9" : "8"}
                        fontWeight="black"
                        fill="#ffffff"
                        opacity={opacity}
                        className="pointer-events-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.85)] font-sans"
                      >
                        {shortName}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Custom Tooltip rendered inside SVG */}
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
                        Weighted CAGR:{" "}
                        <tspan
                          fill={
                            hoveredPoint.cagr >= 15
                              ? "#2dd4bf"
                              : hoveredPoint.cagr >= 10
                                ? "#fbbf24"
                                : "#fb7185"
                          }
                          fontWeight="black"
                        >
                          {hoveredPoint.cagr.toFixed(2)}%
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
          )}

          {graphView === "abs" && (
            <svg
              ref={absSvgRef}
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
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <line
                x1={chartW - padRight}
                y1={padTop}
                x2={chartW - padRight}
                y2={chartH - padBottom}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <line
                x1={padLeft}
                y1={chartH - padBottom}
                x2={chartW - padRight}
                y2={chartH - padBottom}
                stroke="#334155"
                strokeWidth="1.5"
              />

              <text
                transform={`rotate(-90 ${15} ${padTop + height / 2})`}
                x={15}
                y={padTop + height / 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#2dd4bf"
              >
                Absolute Return (%)
              </text>
              <text
                transform={`rotate(90 ${chartW - 15} ${padTop + height / 2})`}
                x={chartW - 15}
                y={padTop + height / 2}
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
                const opacity =
                  hoveredIdx !== null ? (isHovered ? 1.0 : 0.25) : 0.85;

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
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
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
                const opacity =
                  hoveredIdx !== null ? (isHovered ? 1.0 : 0.25) : 0.9;

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
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
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
                      y={chartH - padBottom + 20}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight={isHovered ? "bold" : "normal"}
                      fill={isHovered ? "#2dd4bf" : "#64748b"}
                      className="transition-colors duration-150"
                    >
                      {shortName}
                    </text>
                  </g>
                );
              })}

              {/* X-axis Title for AMC names */}
              <text
                x={padLeft + width / 2}
                y={chartH - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#64748b"
                className="font-sans"
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
          )}

          {graphView === "xirr" && (
            <svg
              ref={xirrSvgRef}
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
                  {/* Horizontal line to Y-axis */}
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
                  {/* Vertical line to X-axis */}
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
                  <circle
                    cx={padLeft}
                    cy={hoveredPoint.y}
                    r="3"
                    fill="#fbbf24"
                  />
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

                // Color selection based on XIRR performance
                let color = "#3b82f6";
                if (amc.xirr >= 15) {
                  color = "#10b981";
                } else if (amc.xirr < 8) {
                  color = "#ef4444";
                } else if (amc.xirr < 11) {
                  color = "#f59e0b";
                }

                // Head radius based on weight
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
                      setHoveredPoint({
                        x: cx,
                        y: cy,
                        ...amc,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Glow ring on hover */}
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
                      y={amc.xirr >= 0 ? cy - r - 5 : cy + r + 11}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={isHovered ? "black" : "semibold"}
                      fill={isHovered ? "#f1f5f9" : "#64748b"}
                      opacity={hoveredPoint ? (isHovered ? 1.0 : 0.3) : 0.85}
                      className="transition-all duration-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] font-sans"
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
          )}
        </div>
      </div>

      {/* Detailed allocation performance table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          {entityLabel} Performance Details
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                <th
                  className="pb-3 pr-4 pl-4 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("name")}
                >
                  {entityLabel} Name <SortIcon col="name" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("weight")}
                >
                  Weight <SortIcon col="weight" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("current")}
                >
                  Current Value <SortIcon col="current" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("invested")}
                >
                  Invested Value <SortIcon col="invested" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("gain")}
                >
                  Gain / Loss <SortIcon col="gain" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("cagr")}
                >
                  Weighted CAGR <SortIcon col="cagr" />
                </th>
                <th
                  className="pb-3 px-4 text-right cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("xirr")}
                >
                  {entityLabel} XIRR <SortIcon col="xirr" />
                </th>
                <th
                  className="pb-3 pl-4 text-right pr-4 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onSort("avgHoldingDays")}
                >
                  Avg. Holding Period <SortIcon col="avgHoldingDays" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {analysisWithReturns.map((amc) => {
                const gainPct =
                  amc.invested > 0 ? (amc.gain / amc.invested) * 100 : 0;

                return (
                  <tr
                    key={amc.name}
                    className="hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 pr-4 pl-4 font-semibold text-slate-200">
                      {amc.name}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-400 tabular-nums">
                      {amc.weight.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-300 tabular-nums">
                      {formatCurrency(amc.current)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 tabular-nums">
                      {formatCurrency(amc.invested)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold tabular-nums ${
                        amc.gain >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(amc.gain)}
                      <span className="text-[10px] ml-1.5 font-normal opacity-85">
                        ({formatPercent(gainPct)})
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-extrabold tabular-nums ${
                        amc.cagr >= 15
                          ? "text-teal-400"
                          : amc.cagr >= 10
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {amc.cagr.toFixed(2)}%
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-extrabold tabular-nums ${
                        amc.xirr >= 15
                          ? "text-emerald-400"
                          : amc.xirr >= 10
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {amc.xirr.toFixed(2)}%
                    </td>
                    <td className="py-3 pl-4 text-right pr-4 text-slate-400 tabular-nums">
                      {formatHoldingYearsAndDays(amc.avgHoldingDays)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
