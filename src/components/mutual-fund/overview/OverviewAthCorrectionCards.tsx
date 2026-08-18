"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  Coins,
  LineChart,
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Minus,
} from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type {
  OverviewAthCorrectionCardsProps,
  MetricCardConfig,
} from "@/types/overview";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" as const },
  }),
};

export default function OverviewAthCorrectionCards({
  athData,
  reportIdParam,
}: OverviewAthCorrectionCardsProps) {
  const router = useRouter();
  const pushWithReportId = (href: string) => {
    router.push(`${href}${reportIdParam}`);
  };

  const cards: MetricCardConfig[] = [
    {
      metric: athData.totalInvestment,
      icon: Wallet,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-400",
      borderColor: "border-teal-500/20",
      hoverBorder: "hover:border-teal-500/40",
      gradFrom: "from-teal-500/5",
      valueColor: "text-slate-100",
      athColor: "text-slate-300",
      href: "/holdings",
    },
    {
      metric: athData.currentValue,
      icon: TrendingUp,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
      hoverBorder: "hover:border-blue-500/40",
      gradFrom: "from-blue-500/5",
      valueColor: "text-slate-100",
      athColor: "text-slate-300",
      href: "/holdings",
    },
    {
      metric: athData.gain,
      icon: Coins,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      gradFrom: "from-amber-500/5",
      valueColor: "text-slate-100",
      athColor: "text-slate-300",
      href: "/holdings",
    },
    {
      metric: athData.niftyIndex,
      icon: LineChart,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
      borderColor: "border-violet-500/20",
      hoverBorder: "hover:border-violet-500/40",
      gradFrom: "from-violet-500/5",
      valueColor: "text-slate-100",
      athColor: "text-slate-300",
      href: "/holdings",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Crown size={14} className="text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            All-Time High (ATH) & Correction Tracker
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Peak-to-Current Drawdown Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const m = card.metric;
          const isAtAth = Math.abs(m.diff) < 0.01;
          const isCorrection = m.diff < -0.01;
          const isAboveAth = m.diff > 0.01;

          const formatVal = (v: number) =>
            m.isCurrency
              ? formatCurrency(v)
              : v.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

          const formatDiffAmount = (v: number) => {
            if (Math.abs(v) < 0.01) return m.isCurrency ? "₹0.00" : "0.00 pts";
            const sign = v > 0 ? "+" : "-";
            const absVal = Math.abs(v);
            return m.isCurrency
              ? `${sign}${formatCurrency(absVal)}`
              : `${sign}${absVal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} pts`;
          };

          return (
            <motion.div
              key={m.title}
              custom={idx}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              onClick={() => pushWithReportId(card.href)}
              className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${card.borderColor} rounded-2xl p-5 shadow-xl cursor-pointer ${card.hoverBorder} hover:bg-slate-900 transition-all duration-200 active:scale-[0.99] flex flex-col justify-between`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradFrom} to-transparent pointer-events-none`}
              />

              <div className="relative z-10 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      {m.title}
                    </span>
                    {m.subtitle && (
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {m.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-xl ${card.iconBg}`}>
                    <card.icon size={16} className={card.iconColor} />
                  </div>
                </div>

                {/* Current Value & Date */}
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      Current Value:
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/80">
                      {m.currentDate}
                    </span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight mt-1">
                    {formatVal(m.currentValue)}
                  </div>
                </div>

                {/* ATH Value & Date & Day Difference */}
                <div className="pt-2.5 border-t border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-400 font-semibold">
                      <Crown size={12} className="text-amber-400" />
                      All-Time High:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {m.athDate}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-800/90 text-slate-300 rounded border border-slate-700/60">
                        {m.dayDiff === 0 ? "0d" : `${m.dayDiff}d`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-sm font-bold text-slate-300 tracking-tight">
                      {formatVal(m.athValue)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {m.dayDiff === 0
                        ? "At Peak"
                        : `${m.dayDiff} day${m.dayDiff === 1 ? "" : "s"} ago`}
                    </span>
                  </div>
                </div>

                {/* Correction / Diff Footer */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-semibold truncate">
                    Diff:{" "}
                    <span
                      className={`font-bold ${
                        isCorrection
                          ? "text-rose-400"
                          : isAboveAth
                            ? "text-emerald-400"
                            : "text-slate-300"
                      }`}
                    >
                      {formatDiffAmount(m.diff)}
                    </span>
                  </div>

                  <div
                    className={`px-2 py-0.5 rounded-lg text-xs font-extrabold flex items-center gap-1 border ${
                      isCorrection
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : isAboveAth
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                    }`}
                  >
                    {isCorrection ? (
                      <ArrowDownRight size={12} className="text-rose-400" />
                    ) : isAboveAth ? (
                      <ArrowUpRight size={12} className="text-emerald-400" />
                    ) : (
                      <Minus size={12} className="text-teal-400" />
                    )}
                    <span>
                      {isAtAth
                        ? "0.00%"
                        : `${m.diffPercent >= 0 ? "+" : ""}${m.diffPercent.toFixed(2)}%`}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
