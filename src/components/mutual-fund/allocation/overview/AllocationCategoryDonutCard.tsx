"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Sector,
  Tooltip,
  ResponsiveContainer,
  type PieSectorDataItem,
} from "recharts";
import {
  formatCurrency,
  formatIndianNumber,
  formatPct,
} from "@/helpers/formatters";
import {
  ALLOCATION_BG_CLASSES,
  ALLOCATION_PALETTE,
  type AllocationCategoryDonutCardProps,
  type ChartTooltipProps,
} from "@/types/allocation";
import type { PieActiveShapePayload } from "@/types/constants";

/* ─── Custom Tooltip ─── */
const ChartTooltip = ({
  active,
  payload,
}: ChartTooltipProps): React.JSX.Element | null => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl z-50">
      <div className="font-bold text-slate-100 text-sm">{d.name}</div>
      <div className="text-teal-400 font-extrabold text-base mt-1">
        {formatCurrency(d.value)}
      </div>
      <div className="text-slate-400 text-xs mt-0.5">
        {d.payload.pct?.toFixed(2)}% of total
      </div>
    </div>
  );
};

export default function AllocationCategoryDonutCard({
  categoryData,
}: AllocationCategoryDonutCardProps) {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const totalValue = categoryData.reduce((acc, c) => acc + c.value, 0);

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Custom Legend */}
        <div className="lg:w-56 w-full h-[320px] overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] space-y-0.5 pr-1">
          {categoryData.map((d, i) => (
            <div
              key={d.name}
              className="flex items-start gap-2.5 py-2 border-b border-slate-800/30 last:border-0"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                  ALLOCATION_BG_CLASSES[i % ALLOCATION_BG_CLASSES.length]
                }`}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-slate-200 text-xs font-semibold leading-tight truncate"
                  title={d.name}
                >
                  {d.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-slate-300 text-xs tabular-nums font-medium">
                    {formatIndianNumber(d.value)}
                  </span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-slate-400 text-xs tabular-nums">
                    {formatPct(d.pct)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Donut Chart */}
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={65}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                shape={(props: PieSectorDataItem & PieActiveShapePayload) => {
                  const { index } = props;
                  const isHovered = hoveredCell === index;
                  const midAngle = props.midAngle ?? 0;
                  const RADIAN = Math.PI / 180;
                  const popDist = isHovered ? 8 : 0;
                  const dx = Math.cos(-midAngle * RADIAN) * popDist;
                  const dy = Math.sin(-midAngle * RADIAN) * popDist;
                  const opacity =
                    hoveredCell === null || hoveredCell === index ? 1 : 0.4;
                  return (
                    <g className="transition-all duration-300 cursor-pointer">
                      <Sector
                        {...props}
                        cx={props.cx + dx}
                        cy={props.cy + dy}
                        outerRadius={isHovered ? 105 : 100}
                        fill={
                          ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length]
                        }
                        opacity={opacity}
                        onMouseEnter={() => setHoveredCell(index)}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    </g>
                  );
                }}
              />
              <text
                x="50%"
                y="46%"
                textAnchor="middle"
                className="fill-slate-400 font-medium text-[11px] tracking-wide uppercase"
              >
                {hoveredCell !== null && categoryData[hoveredCell]
                  ? categoryData[hoveredCell].name.length > 14
                    ? `${categoryData[hoveredCell].name.slice(0, 12)}..`
                    : categoryData[hoveredCell].name
                  : "Total Value"}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                className="fill-teal-400 font-extrabold text-sm tracking-tight"
              >
                {hoveredCell !== null && categoryData[hoveredCell]
                  ? formatCurrency(categoryData[hoveredCell].value)
                  : formatCurrency(totalValue)}
              </text>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
