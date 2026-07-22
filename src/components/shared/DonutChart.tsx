"use client";

import { useState } from "react";
import type { DonutChartProps, DonutSlice } from "@/types/insights";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function DonutChart({ slices }: DonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);

  const total = slices.reduce((s, v) => s + v.value, 0);
  const r = 60;
  const cx = 75;
  const cy = 75;
  const strokeW = 18;

  const cumulativeOffsets: number[] = [];
  for (let i = 0; i < slices.length; i++) {
    cumulativeOffsets.push(
      i === 0 ? 0 : cumulativeOffsets[i - 1] + slices[i - 1].value
    );
  }

  const paths = slices.map((slice, i) => {
    const cum = cumulativeOffsets[i];
    const startAngle = (cum / total) * 360 - 90;
    const endAngle = ((cum + slice.value) / total) * 360 - 90;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return {
      d: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      color: slice.color,
      label: slice.label,
      value: slice.value,
    };
  });

  return (
    <svg viewBox="0 0 150 150" className="w-full h-full select-none">
      {paths.map((p, i) => {
        const isHovered = hoveredSlice?.label === p.label;
        const opacity = hoveredSlice ? (isHovered ? 1.0 : 0.45) : 1.0;
        const currentStrokeW = isHovered ? strokeW + 3 : strokeW;

        return (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={currentStrokeW}
            strokeLinecap="round"
            onMouseEnter={() => setHoveredSlice(p)}
            onMouseLeave={() => setHoveredSlice(null)}
            className={`cursor-pointer transition-[stroke-width,opacity] duration-200 drop-shadow-[0_0_6px_rgba(0,0,0,0.35)] ${
              opacity === 1 ? "opacity-100" : "opacity-[0.45]"
            }`}
          />
        );
      })}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="fill-slate-200 text-xs font-bold font-sans"
        fontSize="10"
      >
        {hoveredSlice ? hoveredSlice.label : "Allocation"}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        className="fill-teal-400 font-extrabold font-sans"
        fontSize="9"
      >
        {hoveredSlice
          ? `${hoveredSlice.value.toFixed(1)}%`
          : `${slices.length} categories`}
      </text>
    </svg>
  );
}
