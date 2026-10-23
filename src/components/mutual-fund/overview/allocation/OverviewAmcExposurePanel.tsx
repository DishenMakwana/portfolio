"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/helpers/formatters";
import {
  OVERVIEW_GRAD_CLASSES,
  type OverviewAmcExposurePanelProps,
} from "@/types/overview";

export default function OverviewAmcExposurePanel({
  amcAllocation,
  totalCurrentValue,
}: OverviewAmcExposurePanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col"
    >
      <h4 className="font-bold text-slate-100 mb-5 flex items-center gap-2 text-xs uppercase tracking-widest">
        <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
        AMC Exposure
      </h4>
      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar [scrollbar-gutter:stable]">
        {amcAllocation.map((amc, i) => {
          const pct =
            totalCurrentValue > 0 ? (amc.value / totalCurrentValue) * 100 : 0;
          return (
            <div key={amc.name}>
              <div className="flex justify-between gap-3 text-xs mb-2">
                <span className="font-medium text-slate-200 leading-snug">
                  {amc.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-500 tabular-nums text-[10px]">
                    {formatCurrency(amc.value)}
                  </span>
                  <span className="text-slate-300 font-bold tabular-nums w-10 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${OVERVIEW_GRAD_CLASSES[i % OVERVIEW_GRAD_CLASSES.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    delay: 0.5 + i * 0.05,
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
