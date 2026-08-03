"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Shield, IndianRupee, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatMetricDiff } from "@/helpers/formatters";
import type { OverviewHeroCardsProps } from "@/types/overview";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function OverviewHeroCards({
  totals,
  topFund,
  worstFund,
  metricDeltas,
  reportIdParam,
}: OverviewHeroCardsProps & {
  metricDeltas: {
    currentValueDiff: number | null;
    investedDiff: number | null;
  };
  reportIdParam: string;
}) {
  const router = useRouter();
  const pushWithReportId = (href: string) => {
    router.push(`${href}${reportIdParam}`);
  };

  const isProfit = totals.gain >= 0;
  const cvDiff = formatMetricDiff(
    metricDeltas.currentValueDiff,
    "Valuation",
    "text-slate-400"
  );
  const ivDiffRes = formatMetricDiff(
    metricDeltas.investedDiff,
    "Principal Cost",
    "text-slate-400"
  );

  const row1Cards = [
    {
      label: "Invested Value",
      value: formatCurrency(totals.invested),
      sub: ivDiffRes.sub,
      subColor: ivDiffRes.subColor,
      icon: Shield,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      gradFrom: "from-indigo-500/10",
      border: "border-indigo-500/20",
      href: "/allocation",
      hoverBorder: "hover:border-indigo-500/40",
    },
    {
      label: "Current Value",
      value: formatCurrency(totals.currentValue),
      sub: cvDiff.sub,
      subColor: cvDiff.subColor,
      icon: IndianRupee,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-400",
      gradFrom: "from-teal-500/10",
      border: "border-teal-500/20",
      href: "/holdings",
      hoverBorder: "hover:border-teal-500/40",
    },
    {
      label: "Unrealised Gain",
      value: formatCurrency(totals.gain),
      sub: `${totals.absoluteReturn.toFixed(2)}% Absolute`,
      subColor: isProfit ? "text-emerald-400" : "text-red-400",
      icon: isProfit ? TrendingUp : TrendingDown,
      iconBg: isProfit ? "bg-emerald-500/10" : "bg-red-500/10",
      iconColor: isProfit ? "text-emerald-400" : "text-red-400",
      gradFrom: isProfit ? "from-emerald-500/10" : "from-red-500/10",
      border: isProfit ? "border-emerald-500/20" : "border-red-500/20",
      href: "/holdings",
      hoverBorder: isProfit
        ? "hover:border-emerald-500/40"
        : "hover:border-red-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {row1Cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
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
            <div className={`text-xs font-semibold mt-2 ${card.subColor}`}>
              {card.sub}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Best Performer */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        onClick={() => topFund && router.push(`/fund/${topFund.id}`)}
        className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl ${topFund ? "cursor-pointer hover:border-teal-500/40 hover:bg-slate-900 transition-all duration-200 active:scale-[0.99]" : ""}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Best Performer
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10">
              <TrendingUp size={17} className="text-teal-400" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-200 leading-snug line-clamp-2 min-h-[36px]">
            {topFund ? topFund.schemeName : "—"}
          </div>
          <div className="text-xs font-semibold mt-2 text-teal-400">
            {topFund
              ? `+${topFund.absoluteReturn.toFixed(1)}% abs. return`
              : "—"}
          </div>
        </div>
      </motion.div>

      {/* Worst Fund */}
      <motion.div
        custom={4}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        onClick={() => worstFund && router.push(`/fund/${worstFund.id}`)}
        className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-red-500/20 rounded-2xl p-5 shadow-xl ${worstFund ? "cursor-pointer hover:border-red-500/40 hover:bg-slate-900 transition-all duration-200 active:scale-[0.99]" : ""}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Needs Attention
            </span>
            <div className="p-2 rounded-xl bg-red-500/10">
              <TrendingDown size={17} className="text-red-400" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-200 leading-snug line-clamp-2 min-h-[36px]">
            {worstFund ? worstFund.schemeName : "—"}
          </div>
          <div className="text-xs font-semibold mt-2 text-red-400">
            {worstFund
              ? `${worstFund.absoluteReturn.toFixed(1)}% abs. return`
              : "—"}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
