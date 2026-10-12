"use client";

import { motion } from "framer-motion";
import {
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { FyTrackerHeroCardsProps } from "@/types/insights";

const CARD_HOVER_ANIMATION = {
  whileHover: { y: -3, scale: 1.01 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
} as const;

export function FyTrackerHeroCards({
  summary,
  selectedFy,
  isPending,
}: FyTrackerHeroCardsProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 transition-opacity duration-200 ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      {/* Card 1: Previously Invested / Opening Valuation */}
      <motion.div
        whileHover={CARD_HOVER_ANIMATION.whileHover}
        transition={CARD_HOVER_ANIMATION.transition}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Opening Valuation
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <Shield size={16} className="text-indigo-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatCurrency(
              summary.openingValuation ?? summary.previouslyInvested
            )}
          </div>
        </div>
        <div className="relative z-10 text-xs font-semibold mt-2.5 text-slate-400">
          As of {selectedFy.startDate}
        </div>
      </motion.div>

      {/* Card 2: FY Invested (BUY) */}
      <motion.div
        whileHover={CARD_HOVER_ANIMATION.whileHover}
        transition={CARD_HOVER_ANIMATION.transition}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Invested in {selectedFy.label}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <ArrowUpRight size={16} className="text-emerald-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatCurrency(summary.fyInvested)}
          </div>
        </div>
        <div className="relative z-10 text-xs font-semibold mt-2.5 text-emerald-400">
          Total Purchases (BUY)
        </div>
      </motion.div>

      {/* Card 3: FY Sold (SELL) */}
      <motion.div
        whileHover={CARD_HOVER_ANIMATION.whileHover}
        transition={CARD_HOVER_ANIMATION.transition}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-rose-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Sold in {selectedFy.label}
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10">
              <ArrowDownRight size={16} className="text-rose-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatCurrency(summary.fySold)}
          </div>
        </div>
        <div className="relative z-10 text-xs font-semibold mt-2.5 text-rose-400">
          Total Redemptions (SELL)
        </div>
      </motion.div>

      {/* Card 4: End of FY Valuation */}
      <motion.div
        whileHover={CARD_HOVER_ANIMATION.whileHover}
        transition={CARD_HOVER_ANIMATION.transition}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Closing Valuation
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10">
              <IndianRupee size={16} className="text-teal-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatCurrency(summary.closingValuation)}
          </div>
        </div>
        <div className="relative z-10 text-xs font-semibold mt-2.5 text-slate-400">
          As of {selectedFy.endDate}
        </div>
      </motion.div>

      {/* Card 5: FY Return (Net Gain, Abs Return, XIRR, CAGR) */}
      <motion.div
        whileHover={CARD_HOVER_ANIMATION.whileHover}
        transition={CARD_HOVER_ANIMATION.transition}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            summary.netGain >= 0 ? "from-emerald-500/10" : "from-rose-500/10"
          } to-transparent pointer-events-none`}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              FY Returns
            </span>
            <div
              className={`p-2 rounded-xl ${
                summary.netGain >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
              }`}
            >
              <Sparkles
                size={16}
                className={
                  summary.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
                }
              />
            </div>
          </div>
          <div
            className={`text-xl font-extrabold leading-tight tracking-tight ${
              summary.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {summary.netGain >= 0 ? "+" : ""}
            {formatCurrency(summary.netGain)}
          </div>
        </div>
        <div className="relative z-10 text-[11px] font-semibold mt-2.5 text-teal-400 flex flex-wrap gap-1">
          <span>Abs: {summary.absReturn.toFixed(2)}%</span>
          <span>·</span>
          <span>XIRR: {summary.xirr.toFixed(2)}%</span>
          <span>·</span>
          <span>CAGR: {summary.cagr.toFixed(2)}%</span>
        </div>
      </motion.div>
    </div>
  );
}
