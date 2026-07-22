"use client";

import { motion } from "framer-motion";
import type { MetricCardProps } from "@/types/insights";

export default function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor = "teal",
}: MetricCardProps) {
  const styles = {
    indigo: {
      border: "border-indigo-500/20",
      gradFrom: "from-indigo-500/10",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      subColor: "text-slate-400",
    },
    teal: {
      border: "border-teal-500/20",
      gradFrom: "from-teal-500/10",
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-400",
      subColor: "text-teal-400",
    },
    emerald: {
      border: "border-emerald-500/20",
      gradFrom: "from-emerald-500/10",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      subColor: "text-emerald-400",
    },
    rose: {
      border: "border-rose-500/20",
      gradFrom: "from-rose-500/10",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
      subColor: "text-rose-400",
    },
    amber: {
      border: "border-amber-500/20",
      gradFrom: "from-amber-500/10",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      subColor: "text-amber-400",
    },
  };

  const currentStyle = styles[accentColor];

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${currentStyle.border} rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${currentStyle.gradFrom} to-transparent pointer-events-none`}
      />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {label}
            </span>
            <div className={`p-2 rounded-xl ${currentStyle.iconBg}`}>
              <Icon size={16} className={currentStyle.iconColor} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 leading-tight font-sans">
            {value}
          </div>
        </div>
        {sub && (
          <div
            className={`text-xs font-semibold mt-2.5 ${currentStyle.subColor}`}
          >
            {sub}
          </div>
        )}
      </div>
    </motion.div>
  );
}
