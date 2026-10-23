"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Sector,
  Tooltip,
  ResponsiveContainer,
  type PieSectorDataItem,
} from "recharts";
import { formatCurrency } from "@/helpers/formatters";
import {
  OVERVIEW_COLORS,
  OVERVIEW_BG_CLASSES,
  type OverviewCategoryDonutPanelProps,
} from "@/types/overview";
import type { PieActiveShapePayload } from "@/types/constants";

export default function OverviewCategoryDonutPanel({
  categoryAllocation,
  totalCurrentValue,
}: OverviewCategoryDonutPanelProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeCategory =
    activeIndex !== null && categoryAllocation[activeIndex]
      ? categoryAllocation[activeIndex]
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
    >
      <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
        <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
        Category Allocation
      </h4>
      <div className="h-52 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryAllocation.filter((c) => c.value > 0)}
              innerRadius={52}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              shape={(props: PieSectorDataItem & PieActiveShapePayload) => {
                const isHovered = activeIndex === props.index;
                const midAngle = props.midAngle ?? 0;
                const RADIAN = Math.PI / 180;
                const popDist = isHovered ? 7 : 0;
                const dx = Math.cos(-midAngle * RADIAN) * popDist;
                const dy = Math.sin(-midAngle * RADIAN) * popDist;
                const opacity = activeIndex === null || isHovered ? 1 : 0.45;

                return (
                  <g className="transition-all duration-300 cursor-pointer">
                    <Sector
                      {...props}
                      cx={props.cx + dx}
                      cy={props.cy + dy}
                      outerRadius={
                        isHovered
                          ? (props.outerRadius ?? 75) + 4
                          : props.outerRadius
                      }
                      fill={
                        OVERVIEW_COLORS[props.index % OVERVIEW_COLORS.length]
                      }
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
              className="fill-slate-400 font-medium text-[11px] tracking-wide uppercase"
            >
              {activeCategory
                ? activeCategory.name.length > 14
                  ? `${activeCategory.name.slice(0, 12)}..`
                  : activeCategory.name
                : "Total Value"}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              className="fill-teal-400 font-extrabold text-xs tracking-tight"
            >
              {activeCategory
                ? formatCurrency(activeCategory.value)
                : formatCurrency(totalCurrentValue)}
            </text>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl text-xs font-bold text-slate-100 flex flex-col gap-0.5">
                    <span className="text-slate-400 font-medium">
                      {payload[0].name}
                    </span>
                    <span>{formatCurrency(Number(payload[0].value))}</span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 mt-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar [scrollbar-gutter:stable]">
        {categoryAllocation.map((cat, i) => {
          const pct =
            totalCurrentValue > 0 ? (cat.value / totalCurrentValue) * 100 : 0;
          return (
            <div
              key={cat.name}
              className="flex items-center justify-between text-xs py-1"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${OVERVIEW_BG_CLASSES[i % OVERVIEW_BG_CLASSES.length]}`}
                />
                <span className="text-slate-300 leading-snug">{cat.name}</span>
              </div>
              <div className="flex flex-col items-end ml-2 shrink-0">
                <span className="text-slate-400 font-semibold">
                  {pct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                  {formatCurrency(cat.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
