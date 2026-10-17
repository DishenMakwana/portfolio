"use client";

import { motion } from "framer-motion";
import {
  IndianRupee,
  Repeat2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { SipsKpiCardsProps } from "@/types/sips";

export default function SipsKpiCards({
  totalMonthly,
  totalMandates,
  activeSips,
  pausedSips,
}: SipsKpiCardsProps) {
  const rawCards = [
    {
      label: "Total Monthly SIP",
      value: formatCurrency(totalMonthly),
      sub: "Active mandates only",
      color: "text-teal-400",
      icon: IndianRupee,
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
    },
    {
      label: "Total Mandates",
      value: String(totalMandates),
      sub: `${activeSips} active`,
      color: "text-slate-100",
      icon: Repeat2,
      bg: "bg-slate-700/30",
      border: "border-slate-700/50",
    },
    {
      label: "Active SIPs",
      value: String(activeSips),
      sub: "Running this month",
      color: "text-emerald-400",
      icon: CheckCircle2,
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Paused / Stopped",
      value: String(pausedSips),
      sub: "Zero in latest month",
      color: "text-amber-400",
      icon: AlertTriangle,
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {rawCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className={`bg-slate-900/70 backdrop-blur-md border ${card.border} rounded-2xl p-5 shadow-xl`}
        >
          <div className={`inline-flex p-2 rounded-xl ${card.bg} mb-3`}>
            <card.icon size={18} className={card.color} />
          </div>
          <div className={`text-2xl font-extrabold ${card.color}`}>
            {card.value}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {card.label}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">{card.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
