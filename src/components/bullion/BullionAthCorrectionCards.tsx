"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Coins, Crown, Sparkles, Layers, TrendingUp } from "lucide-react";
import { formatInr } from "@/helpers/formatters";
import {
  BULLION_METALS,
  GOLD_PURITIES,
  SILVER_PURITIES,
  PLATINUM_PURITIES,
  type BullionAthCorrectionCardsProps,
  type BullionAthMetric,
  type BullionMetal,
} from "@/types/bullion";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" as const },
  }),
};

interface BullionCardConfig {
  metric: BullionAthMetric;
  metal: BullionMetal;
  purity: string;
  icon: typeof Coins;
}

export default function BullionAthCorrectionCards({
  athData,
  onSelectMetal,
}: BullionAthCorrectionCardsProps) {
  const cards: BullionCardConfig[] = [
    {
      metric: athData.gold24K,
      metal: BULLION_METALS.GOLD,
      purity: GOLD_PURITIES.K24,
      icon: Sparkles,
    },
    {
      metric: athData.gold22K,
      metal: BULLION_METALS.GOLD,
      purity: GOLD_PURITIES.K22,
      icon: Coins,
    },
    {
      metric: athData.silver999,
      metal: BULLION_METALS.SILVER,
      purity: SILVER_PURITIES.P999,
      icon: Layers,
    },
    {
      metric: athData.platinumPT950,
      metal: BULLION_METALS.PLATINUM,
      purity: PLATINUM_PURITIES.PT950,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Crown size={14} className="text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            All-Time High (ATH) & Correction Tracker
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Peak-to-Current Bullion Drawdown
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const m = card.metric;
          const isAtAth = Math.abs(m.diff) < 0.01;
          const isCorrection = m.diff < -0.01;
          const isAboveAth = m.diff > 0.01;

          const formatVal = (v: number) => `${formatInr(v)}`;

          const formatDiffAmount = (v: number) => {
            if (Math.abs(v) < 0.01) return `₹0.00`;
            const sign = v > 0 ? "+" : "-";
            const absVal = Math.abs(v);
            return `${sign}${formatInr(absVal)}`;
          };

          return (
            <motion.div
              key={m.title}
              custom={idx}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              onClick={() => onSelectMetal?.(card.metal, card.purity)}
              className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer active:scale-[0.99]"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {m.title} {m.unit}
                    </span>
                    {m.subtitle && (
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {m.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <card.icon size={15} />
                  </div>
                </div>

                {/* Current Value & Date */}
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      Current Rate:
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                      {m.currentDate}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-100 tracking-tight mt-0.5">
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
                    <div className="text-sm font-extrabold text-slate-300 tracking-tight">
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
                          ? "text-red-400"
                          : isAboveAth
                            ? "text-emerald-400"
                            : "text-slate-300"
                      }`}
                    >
                      {formatDiffAmount(m.diff)}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${
                      isCorrection
                        ? "border-red-500/20 bg-red-500/10 text-red-400"
                        : isAboveAth
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-teal-500/20 bg-teal-500/10 text-teal-400"
                    }`}
                  >
                    <span>
                      {isAtAth
                        ? "0.00%"
                        : `${m.diffPercent >= 0 ? "+" : ""}${m.diffPercent.toFixed(2)}%`}
                    </span>
                    <span>{isCorrection ? "▼" : isAboveAth ? "▲" : "—"}</span>
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
