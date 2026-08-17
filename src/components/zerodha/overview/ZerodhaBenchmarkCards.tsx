"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  BarChart2,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { formatPercent } from "@/helpers/formatters";
import DeltaBadge from "@/components/shared/DeltaBadge";
import type { ZerodhaBenchmarkCardsProps } from "@/types/zerodha";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function ZerodhaBenchmarkCards({
  totals,
  metricDeltas,
  title = "Portfolio XIRR",
  benchmarkLabel,
}: ZerodhaBenchmarkCardsProps): React.JSX.Element {
  const isAlphaPositive = totals.alpha >= 0;
  const activeBenchmarkLabel =
    benchmarkLabel ||
    (title === "Stocks XIRR"
      ? "UTI Nifty 50 Index Fund Direct Growth"
      : "UTI Nifty 50 Index Direct");

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Benchmark XIRR */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-violet-500/20 rounded-2xl p-5 shadow-xl hover:border-violet-500/40 hover:bg-slate-900 transition-all duration-200"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Benchmark XIRR
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10">
              <BarChart2 size={17} className="text-violet-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatPercent(totals.benchmarkXirr)}
          </div>
          <div className="mt-2">
            <DeltaBadge delta={metricDeltas.benchmarkXirr} />
          </div>
          <div className="text-xs font-semibold mt-2 text-slate-400">
            {activeBenchmarkLabel}
          </div>
        </div>
      </motion.div>

      {/* Alpha Generated */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${
          isAlphaPositive
            ? "border-emerald-500/20 hover:border-emerald-500/40"
            : "border-red-500/20 hover:border-red-500/40"
        } rounded-2xl p-5 shadow-xl hover:bg-slate-900 transition-all duration-200`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            isAlphaPositive ? "from-emerald-500/5" : "from-red-500/5"
          } to-transparent pointer-events-none`}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Alpha Generated
            </span>
            <div
              className={`p-2 rounded-xl ${
                isAlphaPositive ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}
            >
              <Zap
                size={17}
                className={
                  isAlphaPositive ? "text-emerald-400" : "text-red-400"
                }
              />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {totals.alpha >= 0 ? "+" : ""}
            {totals.alpha.toFixed(2)}%
          </div>
          <div className="mt-2">
            <DeltaBadge delta={metricDeltas.alpha} />
          </div>
          <div
            className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
              isAlphaPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isAlphaPositive ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {isAlphaPositive
              ? "Outperforming market"
              : "Underperforming market"}
          </div>
        </div>
      </motion.div>

      {/* Portfolio XIRR */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-amber-500/20 rounded-2xl p-5 shadow-xl hover:border-amber-500/40 hover:bg-slate-900 transition-all duration-200"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {title}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Activity size={17} className="text-amber-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
            {formatPercent(totals.portfolioXirr)}
          </div>
          <div className="mt-2">
            <DeltaBadge delta={metricDeltas.portfolioXirr} />
          </div>
          <div className="text-xs font-semibold mt-2 text-slate-400">
            Compounded Annualised
          </div>
        </div>
      </motion.div>
    </div>
  );
}
