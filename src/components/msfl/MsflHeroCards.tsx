"use client";

import MetricCard from "@/components/shared/MetricCard";
import {
  TrendingUp,
  TrendingDown,
  BriefcaseBusiness,
  BarChart3,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatMetricDiff,
} from "@/helpers/formatters";
import type { MsflHeroCardsProps } from "@/types/msfl";

export default function MsflHeroCards({
  totals,
  insights,
  metricDeltas,
  mfCagrDelta,
  benchmarkLabel,
}: MsflHeroCardsProps) {
  const ivDiffRes = formatMetricDiff(
    metricDeltas?.investedDiff,
    "MSFL Connect stock cost",
    "text-slate-400"
  );

  const cvDiffRes = formatMetricDiff(
    metricDeltas?.currentValueDiff,
    "Current market valuation",
    "text-teal-400"
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard
        label="Invested Value"
        value={formatCurrency(totals.invested)}
        sub={ivDiffRes.sub}
        subColor={ivDiffRes.subColor}
        icon={BriefcaseBusiness}
        accentColor="indigo"
      />
      <MetricCard
        label="Current Valuation"
        value={formatCurrency(totals.currentValue)}
        sub={cvDiffRes.sub}
        subColor={cvDiffRes.subColor}
        icon={TrendingUp}
        accentColor="teal"
      />
      <MetricCard
        label="Overall Unrealized P&L"
        value={formatCurrency(totals.gain)}
        sub={`${totals.gain >= 0 ? "+" : ""}${totals.absoluteReturn.toFixed(2)}% Absolute`}
        icon={totals.gain >= 0 ? TrendingUp : TrendingDown}
        accentColor={totals.gain >= 0 ? "emerald" : "rose"}
      />
      <MetricCard
        label="Weighted CAGR"
        value={
          insights.weightedCagr !== null
            ? `${insights.weightedCagr.toFixed(2)}%`
            : "N/A"
        }
        sub={
          mfCagrDelta === null
            ? benchmarkLabel
            : `${formatPercent(mfCagrDelta)} vs Nifty Benchmark`
        }
        icon={BarChart3}
        accentColor="amber"
      />
    </div>
  );
}
