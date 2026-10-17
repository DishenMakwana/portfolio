"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Sector,
  type PieSectorDataItem,
} from "recharts";
import { formatCurrency } from "@/helpers/formatters";
import { OVERVIEW_COLORS } from "@/types/overview";
import type { SipCategoryDonutChartProps } from "@/types/sips";
import type { PieActiveShapePayload } from "@/types/constants";

export default function SipCategoryDonutChart({
  pieData,
  categories,
  totalMonthly,
  activeIndex,
  onSetActiveIndex,
}: SipCategoryDonutChartProps) {
  const activeCategory =
    activeIndex !== null && categories[activeIndex]
      ? categories[activeIndex]
      : null;

  return (
    <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
        Visual Category Share
      </h4>

      <div className="h-56 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => onSetActiveIndex(index)}
              onMouseLeave={() => onSetActiveIndex(null)}
              shape={(props: PieSectorDataItem & PieActiveShapePayload) => {
                const isHovered = activeIndex === props.index;
                const midAngle = props.midAngle ?? 0;
                const RADIAN = Math.PI / 180;
                const popDist = isHovered ? 6 : 0;
                const dx = Math.cos(-midAngle * RADIAN) * popDist;
                const dy = Math.sin(-midAngle * RADIAN) * popDist;
                const opacity = activeIndex === null || isHovered ? 1 : 0.45;
                const fillColor =
                  pieData[props.index]?.color ||
                  OVERVIEW_COLORS[props.index % OVERVIEW_COLORS.length];

                return (
                  <g className="transition-all duration-300 cursor-pointer">
                    <Sector
                      {...props}
                      cx={props.cx + dx}
                      cy={props.cy + dy}
                      outerRadius={
                        isHovered
                          ? (props.outerRadius ?? 78) + 4
                          : props.outerRadius
                      }
                      fill={fillColor}
                      opacity={opacity}
                    />
                  </g>
                );
              }}
            />
            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              className="fill-slate-400 font-medium text-[11px] tracking-wide uppercase pointer-events-none"
            >
              {activeCategory
                ? activeCategory.category.length > 14
                  ? `${activeCategory.category.slice(0, 12)}..`
                  : activeCategory.category
                : "Total Monthly"}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              className="fill-teal-400 font-extrabold text-sm tracking-tight pointer-events-none"
            >
              {activeCategory
                ? formatCurrency(activeCategory.monthlyAmount)
                : formatCurrency(totalMonthly)}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend underneath */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 text-xs">
        {categories.map((c) => (
          <div
            key={c.category}
            className="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white transition"
            onMouseEnter={() => {
              const idx = categories.findIndex(
                (x) => x.category === c.category
              );
              onSetActiveIndex(idx >= 0 ? idx : null);
            }}
            onMouseLeave={() => onSetActiveIndex(null)}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: c.color }}
            />
            <span className="font-medium text-[11px]">
              {c.category} ({c.pct.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
