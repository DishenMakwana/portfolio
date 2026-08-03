"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Info,
  BarChart2,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
} from "lucide-react";
import { formatPercent, formatNullablePercent } from "@/helpers/formatters";
import DeltaBadge from "@/components/shared/DeltaBadge";
import type { OverviewBenchmarkCardsProps } from "@/types/overview";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function OverviewBenchmarkCards({
  totals,
  metricDeltas,
  portfolioCagr,
  reportIdParam,
}: OverviewBenchmarkCardsProps & {
  portfolioCagr: number | null;
  reportIdParam: string;
}) {
  const router = useRouter();
  const pushWithReportId = (href: string) => {
    router.push(`${href}${reportIdParam}`);
  };

  const isAlphaPositive = totals.alpha >= 0;

  const performanceCards = [
    {
      label: "Portfolio XIRR",
      value: formatPercent(totals.portfolioXirr),
      sub: "Compounded Annualised",
      subColor: "text-slate-400",
      icon: Activity,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      gradFrom: "from-amber-500/10",
      border: "border-amber-500/20",
      delta: metricDeltas.portfolioXirr,
      href: "/holdings",
      hoverBorder: "hover:border-amber-500/40",
    },
    {
      label: "Portfolio CAGR",
      value: formatNullablePercent(portfolioCagr),
      sub:
        totals.cagr !== undefined && totals.cagr !== null
          ? "Excel Reported CAGR"
          : "Compounded Annualised",
      subColor: "text-slate-400",
      icon: Target,
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-400",
      gradFrom: "from-pink-500/10",
      border: "border-pink-500/20",
      delta: metricDeltas.cagr,
      href: "/holdings",
      hoverBorder: "hover:border-pink-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Benchmark XIRR */}
      <motion.div
        custom={5}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        onClick={() => pushWithReportId("/holdings")}
        className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-violet-500/20 rounded-2xl p-5 shadow-xl cursor-pointer hover:border-violet-500/40 hover:bg-slate-900 transition-all duration-200 active:scale-[0.99]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1">
              Benchmark XIRR{" "}
              <span title="Simulated UTI Nifty 50 Index Fund Direct Growth (120716) XIRR">
                <Info size={10} className="text-slate-600" />
              </span>
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10">
              <BarChart2 size={17} className="text-violet-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-violet-400 leading-tight tracking-tight">
            {formatPercent(totals.benchmarkXirr)}
          </div>
          <div className="mt-2">
            <DeltaBadge delta={metricDeltas.benchmarkXirr} />
          </div>
          <div className="text-xs font-semibold mt-2 text-slate-400">
            UTI Nifty 50 Index Direct
          </div>
        </div>
      </motion.div>

      {/* Alpha */}
      <motion.div
        custom={6}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        onClick={() => pushWithReportId("/holdings")}
        className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${isAlphaPositive ? "border-emerald-500/20" : "border-red-500/20"} rounded-2xl p-5 shadow-xl cursor-pointer hover:border-${isAlphaPositive ? "emerald-500" : "red-500"}/40 hover:bg-slate-900 transition-all duration-200 active:scale-[0.99]`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${isAlphaPositive ? "from-emerald-500/10" : "from-red-500/10"} to-transparent pointer-events-none`}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1">
              Alpha Generated{" "}
              <span title="Portfolio XIRR – UTI Nifty 50 Index Fund Direct (120716) XIRR">
                <Info size={10} className="text-slate-600" />
              </span>
            </span>
            <div
              className={`p-2 rounded-xl ${isAlphaPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}
            >
              <Zap
                size={17}
                className={
                  isAlphaPositive ? "text-emerald-400" : "text-red-400"
                }
              />
            </div>
          </div>
          <div
            className={`text-xl font-extrabold leading-tight tracking-tight ${isAlphaPositive ? "text-emerald-400" : "text-red-400"}`}
          >
            {totals.alpha >= 0 ? "+" : ""}
            {totals.alpha.toFixed(2)}%
          </div>
          <div className="mt-2">
            <DeltaBadge delta={metricDeltas.alpha} />
          </div>
          <div
            className={`text-xs font-semibold mt-2 flex items-center gap-1 ${isAlphaPositive ? "text-emerald-400" : "text-red-400"}`}
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

      {performanceCards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={7 + i}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          onClick={() => pushWithReportId(card.href)}
          className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${card.border} rounded-2xl p-5 shadow-xl cursor-pointer ${card.hoverBorder} hover:bg-slate-900 transition-all duration-200 active:scale-[0.99]`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${card.gradFrom} to-transparent pointer-events-none`}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl ${card.iconBg}`}>
                <card.icon size={17} className={card.iconColor} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {card.value}
            </div>
            <div className="mt-2">
              <DeltaBadge delta={card.delta ?? null} />
            </div>
            <div className={`text-xs font-semibold mt-2 ${card.subColor}`}>
              {card.sub}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
