"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ShieldAlert,
  Activity,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Waves,
  Calendar,
  Info,
  Shield,
  Zap,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  ActiveRiskPeriodStats,
  PortfolioRiskKpiCardsProps,
  RiskPeriodKey,
} from "@/types/insights";

const validPeriods: RiskPeriodKey[] = [
  "trailing3Y",
  "trailing5Y",
  "sinceInception",
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" as const },
  }),
};

export default function PortfolioRiskKpiCards({
  riskMetrics,
}: PortfolioRiskKpiCardsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlPeriod = searchParams.get("riskPeriod") as RiskPeriodKey | null;
  const initialPeriod: RiskPeriodKey =
    urlPeriod && validPeriods.includes(urlPeriod) ? urlPeriod : "trailing3Y";

  const [selectedPeriod, setSelectedPeriod] =
    useState<RiskPeriodKey>(initialPeriod);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  useEffect(() => {
    const p = searchParams.get("riskPeriod") as RiskPeriodKey | null;
    if (p && validPeriods.includes(p)) {
      setSelectedPeriod(p);
    }
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  };

  const handlePeriodChange = (period: RiskPeriodKey) => {
    setSelectedPeriod(period);
    updateUrl({ riskPeriod: period });
  };

  if (!riskMetrics) return null;

  const getActiveStats = (): ActiveRiskPeriodStats => {
    switch (selectedPeriod) {
      case "trailing3Y":
        return {
          stats: riskMetrics.trailing3Y,
          label: "3-Year",
          subtitle:
            "Trailing 3-Year Market Cycle (156 Weeks) — Industry standard benchmark for risk ratios",
        };
      case "trailing5Y":
        return {
          stats: riskMetrics.trailing5Y,
          label: "5-Year",
          subtitle:
            "Trailing 5-Year Equity Cycle (260 Weeks) — Long-term rolling volatility & compounding",
        };
      case "sinceInception":
      default:
        return {
          stats: riskMetrics.sinceInception,
          label: "Since Inception",
          subtitle: `From initial mutual fund investment (${riskMetrics.inceptionDate} · ${riskMetrics.totalYears} Years / ${riskMetrics.totalWeeks} Weeks)`,
        };
    }
  };

  const { stats: currentStats, subtitle } = getActiveStats();

  const betaDiff = Math.abs(Math.round((1.0 - currentStats.beta) * 100));
  const isBetaLower = currentStats.beta < 1.0;
  const isAlphaPositive = currentStats.alpha >= 0;
  const isSharpeBetter =
    currentStats.sharpeRatio >= currentStats.benchmark.sharpeRatio;
  const isSortinoBetter =
    currentStats.sortinoRatio >= currentStats.benchmark.sortinoRatio;
  const isVolLower =
    currentStats.volatilityStdDev <= currentStats.benchmark.volatilityStdDev;
  const cagrDiff = (
    currentStats.weightedCagr - currentStats.benchmark.cagr
  ).toFixed(2);
  const isCagrBetter = Number(cagrDiff) >= 0;

  const cards = [
    {
      id: "beta",
      label: "Portfolio Beta (β)",
      value: currentStats.beta.toFixed(2),
      icon: Shield,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      borderColor: "border-indigo-500/20",
      hoverBorder: "hover:border-indigo-500/40",
      gradFrom: "from-indigo-500/10",
      tagText: isBetaLower ? `${betaDiff}% Lower Risk` : "High Beta",
      tagColor: isBetaLower
        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      benchmarkText: "NIFTY 50: 1.00",
      statusText: isBetaLower ? "Defensive Cushion" : "Aggressive",
      statusColor: isBetaLower ? "text-emerald-400" : "text-amber-400",
      desc: "Measures sensitivity to market moves. Lower beta protects capital during market drawdowns.",
    },
    {
      id: "volatility",
      label: "Annual Volatility (σ)",
      value: `${currentStats.volatilityStdDev.toFixed(2)}%`,
      icon: Waves,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-400",
      borderColor: "border-cyan-500/20",
      hoverBorder: "hover:border-cyan-500/40",
      gradFrom: "from-cyan-500/10",
      tagText: isVolLower ? "Calmer Dispersion" : "Higher Dispersion",
      tagColor: isVolLower
        ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
        : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      benchmarkText: `NIFTY 50: ${currentStats.benchmark.volatilityStdDev.toFixed(2)}%`,
      statusText: isVolLower ? "Steadier Returns" : "Volatile Swings",
      statusColor: isVolLower ? "text-cyan-400" : "text-amber-400",
      desc: "Annualized standard deviation of returns. Lower volatility indicates steadier growth.",
    },
    {
      id: "alpha",
      label: "Annual Alpha (α)",
      value: `${isAlphaPositive ? "+" : ""}${currentStats.alpha.toFixed(2)}%`,
      icon: Sparkles,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/20",
      hoverBorder: "hover:border-purple-500/40",
      gradFrom: "from-purple-500/10",
      tagText: isAlphaPositive ? "Value Added" : "Lagging",
      tagColor: isAlphaPositive
        ? "text-purple-300 bg-purple-500/15 border-purple-500/30"
        : "text-rose-400 bg-rose-500/10 border-rose-500/20",
      benchmarkText: "CAPM Baseline: 0.00%",
      statusText: isAlphaPositive ? "Active Alpha" : "Underperforming",
      statusColor: isAlphaPositive ? "text-purple-400" : "text-rose-400",
      desc: "Excess return generated by active fund selection over and above CAPM benchmark expectations.",
    },
    {
      id: "sharpe",
      label: "Sharpe Ratio",
      value: currentStats.sharpeRatio.toFixed(2),
      icon: Activity,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-400",
      borderColor: "border-teal-500/20",
      hoverBorder: "hover:border-teal-500/40",
      gradFrom: "from-teal-500/10",
      tagText: isSharpeBetter ? "Risk Efficient" : "Standard",
      tagColor: isSharpeBetter
        ? "text-teal-400 bg-teal-500/10 border-teal-500/20"
        : "text-slate-400 bg-slate-800 border-slate-700",
      benchmarkText: `NIFTY 50: ${currentStats.benchmark.sharpeRatio.toFixed(2)}`,
      statusText: isSharpeBetter ? "Superior Efficiency" : "Market Parity",
      statusColor: isSharpeBetter ? "text-teal-400" : "text-slate-400",
      desc: "Excess return earned per unit of total risk relative to the 6.50% p.a. risk-free rate.",
    },
    {
      id: "sortino",
      label: "Sortino Ratio",
      value: currentStats.sortinoRatio.toFixed(2),
      icon: ShieldCheck,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
      hoverBorder: "hover:border-emerald-500/40",
      gradFrom: "from-emerald-500/10",
      tagText: isSortinoBetter ? "Downside Shield" : "Standard",
      tagColor: isSortinoBetter
        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        : "text-slate-400 bg-slate-800 border-slate-700",
      benchmarkText: `NIFTY 50: ${currentStats.benchmark.sortinoRatio.toFixed(2)}`,
      statusText: isSortinoBetter ? "Drawdown Protected" : "Standard",
      statusColor: isSortinoBetter ? "text-emerald-400" : "text-slate-400",
      desc: "Focuses strictly on downside risk; ignores positive upside volatility jumps.",
    },
    {
      id: "cagr",
      label: "Compounding CAGR",
      value: `${currentStats.weightedCagr.toFixed(2)}%`,
      icon: TrendingUp,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      gradFrom: "from-amber-500/10",
      tagText: isCagrBetter
        ? `+${cagrDiff}% Outperform`
        : `${cagrDiff}% Lagging`,
      tagColor: isCagrBetter
        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-rose-400 bg-rose-500/10 border-rose-500/20",
      benchmarkText: `NIFTY 50: ${currentStats.benchmark.cagr.toFixed(2)}%`,
      statusText: `${isCagrBetter ? "+" : ""}${cagrDiff}% vs Benchmark`,
      statusColor: isCagrBetter ? "text-amber-400" : "text-rose-400",
      desc: "Portfolio weighted annual compounding growth rate vs NIFTY 50 benchmark rate.",
    },
  ];

  const peVal = currentStats.peRatio ?? riskMetrics?.peRatio ?? 27.24;
  const pbVal = currentStats.pbRatio ?? riskMetrics?.pbRatio ?? 3.58;
  const rSquaredVal = currentStats.rSquared ?? riskMetrics?.rSquared ?? 85.0;
  const benchPe = currentStats.benchmark.peRatio ?? 22.5;
  const benchPb = currentStats.benchmark.pbRatio ?? 3.8;
  const benchRSquared = currentStats.benchmark.rSquared ?? 100.0;
  const peDiffPct = Math.round(((peVal - benchPe) / benchPe) * 100);
  const pbDiffPct = Math.round(((pbVal - benchPb) / benchPb) * 100);

  const bottomCards = [
    {
      id: "pe",
      label: "Portfolio P/E Ratio (Price-to-Earnings)",
      value: peVal.toFixed(2),
      icon: TrendingUp,
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-400",
      borderColor: "border-sky-500/20",
      hoverBorder: "hover:border-sky-500/40",
      gradFrom: "from-sky-500/10",
      tagText: peVal > 25 ? "Growth Orientation" : "Value Orientation",
      tagColor: "text-sky-300 bg-sky-500/15 border-sky-500/30",
      benchmarkText: `NIFTY 50: ${benchPe.toFixed(2)}`,
      statusText: `${peDiffPct >= 0 ? "+" : ""}${peDiffPct}% Premium`,
      statusColor: peDiffPct > 0 ? "text-sky-400" : "text-emerald-400",
      desc: "Weighted price-to-earnings ratio of underlying companies. Higher P/E indicates aggressive growth expectations; lower provides value margin of safety.",
    },
    {
      id: "pb",
      label: "Portfolio P/B Ratio (Price-to-Book)",
      value: pbVal.toFixed(2),
      icon: ShieldCheck,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      gradFrom: "from-amber-500/10",
      tagText:
        pbVal <= benchPb ? "Healthy Value Anchor" : "Premium Book Multiples",
      tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
      benchmarkText: `NIFTY 50: ${benchPb.toFixed(2)}`,
      statusText: `${pbDiffPct >= 0 ? "+" : ""}${pbDiffPct}% vs Index`,
      statusColor: pbVal <= benchPb ? "text-emerald-400" : "text-amber-400",
      desc: "Weighted price-to-book value of underlying companies. Measures tangible asset backing and financial strength relative to balance sheet equity.",
    },
    {
      id: "rsquared",
      label: "R-Squared (R² Benchmark Fit)",
      value: `${rSquaredVal.toFixed(1)}%`,
      icon: Activity,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      borderColor: "border-indigo-500/20",
      hoverBorder: "hover:border-indigo-500/40",
      gradFrom: "from-indigo-500/10",
      tagText:
        rSquaredVal >= 80 ? "🟢 High Index Fit (>80%)" : "🟡 Active Divergence",
      tagColor:
        rSquaredVal >= 80
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          : "text-amber-300 bg-amber-500/10 border-amber-500/20",
      benchmarkText: `NIFTY 50: ${benchRSquared.toFixed(1)}%`,
      statusText:
        rSquaredVal >= 80 ? "Reliable Beta & Alpha" : "Active Alpha Selection",
      statusColor: rSquaredVal >= 80 ? "text-indigo-400" : "text-amber-400",
      desc: "Measures percentage of portfolio movement explained by NIFTY 50. Above 80% confirms Beta and Alpha metrics are statistically reliable.",
    },
  ];

  const allCards = [...cards, ...bottomCards];

  return (
    <div className="space-y-4">
      {/* Header bar matching Overview section style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ShieldAlert size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                Portfolio Risk & Volatility Intelligence
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Zap size={10} /> vs NIFTY 50
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Calendar size={12} className="text-slate-500 shrink-0" />
              <span>{subtitle}</span>
            </p>
          </div>
        </div>

        {/* Timeframe selector pill buttons */}
        <div className="inline-flex p-1 bg-slate-950/80 rounded-xl border border-slate-800/90 shadow-inner shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handlePeriodChange("trailing3Y")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedPeriod === "trailing3Y"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3-Year Trailing
            <span className="ml-1 text-[9px] opacity-75 font-normal">
              (Industry Standard)
            </span>
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("trailing5Y")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedPeriod === "trailing5Y"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            5-Year Trailing
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("sinceInception")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedPeriod === "sinceInception"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Since Inception
            <span className="ml-1 text-[9px] opacity-75 font-normal">
              ({riskMetrics?.totalYears || 0}Y)
            </span>
          </button>
        </div>
      </div>

      {/* Grid of 9 Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPeriod}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {allCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border ${card.borderColor} ${card.hoverBorder} p-5 shadow-xl transition-all duration-300 backdrop-blur-sm group hover:-translate-y-0.5`}
              >
                {/* Subtle top-corner gradient glow */}
                <div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradFrom} to-transparent rounded-bl-full pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-300`}
                />

                <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      {card.label}
                    </span>
                    <div
                      className={`p-2 rounded-xl ${card.iconBg} ${card.iconColor}`}
                    >
                      <Icon size={16} />
                    </div>
                  </div>

                  {/* Primary value + Status badge */}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-3xl font-black tracking-tight text-white ">
                      {card.value}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${card.tagColor}`}
                    >
                      {card.tagText}
                    </span>
                  </div>

                  {/* Benchmark comparison & status */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400  text-[11px]">
                      {card.benchmarkText}
                    </span>
                    <span
                      className={`font-bold text-[11px] ${card.statusColor}`}
                    >
                      {card.statusText}
                    </span>
                  </div>

                  {/* Descriptive subtext */}
                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Collapsible Formulas & Understanding Section */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-850/50 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-teal-400" />
            <h4 className="text-xs font-black text-slate-300 tracking-tight">
              Understanding Volatility, Advanced Ratios, Valuation (P/E &amp;
              P/B) &amp; R-Squared (R²) Formulas
            </h4>
          </div>
          {showExplanation ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>

        {showExplanation && (
          <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Beta */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Shield size={14} className="text-indigo-400" />
                    Portfolio Beta (β)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    🛡️ &lt; 1.0 = Defensive | &gt; 1.0 = Aggressive
                  </span>
                </div>
                <div className="text-[11px]  text-indigo-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: β = Cov(R_p, R_m) / Var(R_m)
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Measures portfolio volatility
                  sensitivity relative to NIFTY 50 (1.00). A beta of{" "}
                  <strong>0.85</strong> means the portfolio is 15% less volatile
                  than the benchmark and cushions capital during market
                  corrections.
                </p>
              </div>

              {/* 2. Annual Volatility */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Waves size={14} className="text-sky-400" />
                    Annual Volatility (σ)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
                    🛡️ Lower is Calmer / Steadier
                  </span>
                </div>
                <div className="text-[11px]  text-sky-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: σ_annual = σ_weekly × √52
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Annualized standard deviation
                  of weekly returns. Quantifies return dispersion; lower
                  volatility indicates smoother, steadier compounding with
                  smaller peak-to-trough drawdowns.
                </p>
              </div>

              {/* 3. Alpha */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Sparkles size={14} className="text-purple-400" />
                    Annual Alpha (α)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    🟢 Higher is Better (&gt; 0)
                  </span>
                </div>
                <div className="text-[11px]  text-purple-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: α = CAGR - [R_f + β × (R_bench - R_f)]
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Measures the active excess
                  return generated by portfolio fund selection over CAPM
                  benchmark expectations. A positive alpha (+2.50%) confirms
                  active management generated pure value beyond passive market
                  beta.
                </p>
              </div>

              {/* 4. Sharpe Ratio */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Activity size={14} className="text-teal-400" />
                    Sharpe Ratio
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    🟢 Higher is Better (&gt; 0.50)
                  </span>
                </div>
                <div className="text-[11px]  text-teal-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: Sharpe = (CAGR - R_f) / σ_annual
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Quantifies excess return
                  earned per unit of total risk (standard deviation) above the
                  6.50% risk-free rate. A higher Sharpe ratio indicates superior
                  risk-reward efficiency.
                </p>
              </div>

              {/* 5. Sortino Ratio */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Sortino Ratio
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    🟢 Higher is Better (&gt; 0.70)
                  </span>
                </div>
                <div className="text-[11px]  text-emerald-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: Sortino = (CAGR - R_f) / σ_downside
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Similar to Sharpe, but
                  strictly penalizes harmful negative downside volatility while
                  ignoring positive upside price surges. Ideal for evaluating
                  downside capital protection.
                </p>
              </div>

              {/* 6. Compounding CAGR */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <TrendingUp size={14} className="text-amber-400" />
                    Compounding CAGR
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    🟢 Higher is Better (&gt; Benchmark)
                  </span>
                </div>
                <div className="text-[11px]  text-amber-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: CAGR = (End NAV / Start NAV)^(1 / Years) - 1
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> The annualized geometric
                  growth rate of portfolio wealth across market cycles.
                  Comparing portfolio CAGR against NIFTY 50 CAGR demonstrates
                  long-term wealth compounding outperformance.
                </p>
              </div>

              {/* 7. Portfolio P/E */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <TrendingUp size={14} className="text-sky-400" />
                    Portfolio P/E Ratio (Price-to-Earnings)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
                    🟢 Lower = Value Margin | Higher = Growth Tilt
                  </span>
                </div>
                <div className="text-[11px]  text-sky-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: Portfolio P/E = Σ(Fund P/E × Fund Equity Weight)
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Asset-weighted
                  price-to-earnings multiple of portfolio holdings. Compares how
                  much you pay per ₹1 of earnings versus NIFTY 50 (22.50). High
                  P/E indicates strong earnings growth expectations; lower P/E
                  offers downside valuation safety.
                </p>
              </div>

              {/* 8. Portfolio P/B */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <ShieldCheck size={14} className="text-amber-400" />
                    Portfolio P/B Ratio (Price-to-Book)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    🛡️ Lower = Tangible Book Backing
                  </span>
                </div>
                <div className="text-[11px]  text-amber-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: Portfolio P/B = Σ(Fund P/B × Fund Equity Weight)
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Asset-weighted price-to-book
                  multiple. Evaluates underlying company valuation against
                  tangible balance sheet net worth. Lower P/B relative to index
                  signals robust capital backing and value resilience.
                </p>
              </div>

              {/* 9. R-Squared */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <Activity size={14} className="text-indigo-400" />
                    R-Squared (R² Benchmark Fit)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    🟢 &gt; 80% Reliable Benchmark
                  </span>
                </div>
                <div className="text-[11px]  text-indigo-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                  Formula: R² = [Corr(R_portfolio, R_bench)]² × 100
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Interpretation:</strong> Percentage of portfolio
                  returns variance explained by the NIFTY 50 benchmark. An R²
                  &gt; 80% confirms that the calculated Beta and Alpha are
                  statistically robust and reliable.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Methodology footnote */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-2.5 backdrop-blur-md">
        <Info size={14} className="text-indigo-400 shrink-0" />
        <span>
          {"Benchmark is "}
          <strong className="font-semibold text-slate-300">
            NIFTY 50 Index (UTI Nifty 50 Index Fund)
          </strong>
          {". Risk-free rate is set to "}
          <strong className="font-semibold text-slate-300">6.50% p.a.</strong>
          {
            " (RBI 364-day T-Bill standard). Industry gold standard (Morningstar & CRISIL) uses 3-Year weekly rolling observations."
          }
        </span>
      </div>
    </div>
  );
}
