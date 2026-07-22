"use client";

import { motion } from "framer-motion";

interface CagrBarProps {
  cagr: number;
  maxCagr: number;
}

export default function CagrBar({ cagr, maxCagr }: CagrBarProps) {
  const pct = maxCagr > 0 ? (cagr / maxCagr) * 100 : 0;
  const color =
    cagr >= 15
      ? "from-emerald-500 to-teal-400"
      : cagr >= 10
        ? "from-amber-500 to-yellow-400"
        : "from-rose-500 to-red-400";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${color} rounded-full`}
        />
      </div>
      <span
        className={`text-xs font-bold w-12 text-right shrink-0 ${
          cagr >= 15
            ? "text-emerald-400"
            : cagr >= 10
              ? "text-amber-400"
              : "text-rose-400"
        }`}
      >
        {cagr.toFixed(2)}%
      </span>
    </div>
  );
}
