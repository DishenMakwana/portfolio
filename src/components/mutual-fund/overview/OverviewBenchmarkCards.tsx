"use client";

import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Clock,
} from "lucide-react";
import {
  formatPercent,
  formatNullablePercent,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import DeltaBadge from "@/components/shared/DeltaBadge";
import type { OverviewBenchmarkCardsProps } from "@/types/overview";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" as const },
  }),
};

export default function OverviewBenchmarkCards({
  totals,
  metricDeltas,
  portfolioCagr,
  avgHoldingDays,
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

  const cards = [
    {
      label: "Portfolio XIRR",
      value: formatPercent(totals.portfolioXirr),
      sub: "Compounded Annualised",
      subColor: "text-slate-400",
      icon: Activity,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      gradFrom: "from-amber-500/5",
      border: "border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      badge: <DeltaBadge delta={metricDeltas.portfolioXirr} />,
      href: "/holdings",
    },
    {
      label: "Benchmark XIRR",
      value: formatPercent(totals.benchmarkXirr),
      sub: "UTI Nifty 50 Index Direct",
      subColor: "text-slate-400",
      icon: BarChart2,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
      gradFrom: "from-violet-500/5",
      border: "border-violet-500/20",
      hoverBorder: "hover:border-violet-500/40",
      badge: <DeltaBadge delta={metricDeltas.benchmarkXirr} />,
      href: "/holdings",
    },
    {
      label: "Alpha Generated",
      value: `${totals.alpha >= 0 ? "+" : ""}${totals.alpha.toFixed(2)}%`,
      sub: isAlphaPositive ? "Outperforming market" : "Underperforming market",
      subColor: isAlphaPositive ? "text-emerald-400" : "text-red-400",
      icon: Zap,
      iconBg: isAlphaPositive ? "bg-emerald-500/10" : "bg-red-500/10",
      iconColor: isAlphaPositive ? "text-emerald-400" : "text-red-400",
      gradFrom: isAlphaPositive ? "from-emerald-500/5" : "from-red-500/5",
      border: isAlphaPositive ? "border-emerald-500/20" : "border-red-500/20",
      hoverBorder: isAlphaPositive
        ? "hover:border-emerald-500/40"
        : "hover:border-red-500/40",
      badge: <DeltaBadge delta={metricDeltas.alpha} />,
      badgeSubIcon: isAlphaPositive ? (
        <ArrowUpRight size={12} className="inline mr-1 text-emerald-400" />
      ) : (
        <ArrowDownRight size={12} className="inline mr-1 text-red-400" />
      ),
      href: "/holdings",
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
      gradFrom: "from-pink-500/5",
      border: "border-pink-500/20",
      hoverBorder: "hover:border-pink-500/40",
      badge: <DeltaBadge delta={metricDeltas.cagr} />,
      href: "/holdings",
    },
    {
      label: "Holding Days",
      value: avgHoldingDays
        ? `${Math.round(avgHoldingDays).toLocaleString("en-IN")} Days`
        : "—",
      sub: "Weighted Avg",
      subColor: "text-slate-400",
      icon: Clock,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-400",
      gradFrom: "from-cyan-500/5",
      border: "border-cyan-500/20",
      hoverBorder: "hover:border-cyan-500/40",
      badge: (
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
          {avgHoldingDays
            ? formatHoldingYearsAndDays(avgHoldingDays)
            : "No data"}
        </span>
      ),
      href: "/holdings",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={5 + i}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          onClick={() => pushWithReportId(card.href)}
          className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${card.border} rounded-2xl p-4 sm:p-4.5 shadow-xl cursor-pointer ${card.hoverBorder} hover:bg-slate-900 transition-all duration-200 active:scale-[0.99] flex flex-col justify-between`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${card.gradFrom} to-transparent pointer-events-none`}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-1 mb-2 sm:mb-2.5">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.iconBg} shrink-0`}>
                <card.icon size={15} className={card.iconColor} />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-100 leading-tight tracking-tight whitespace-nowrap">
              {card.value}
            </div>
            <div className="mt-1.5 sm:mt-2 min-h-[22px] flex items-center">
              {card.badge}
            </div>
            <div
              className={`text-[11px] sm:text-xs font-medium mt-1.5 sm:mt-2 truncate ${card.subColor}`}
            >
              {"badgeSubIcon" in card && card.badgeSubIcon}
              {card.sub}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
