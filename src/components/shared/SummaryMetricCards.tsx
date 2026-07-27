"use client";

import { IndianRupee, TrendingUp, BarChart3 } from "lucide-react";
import MetricCard from "./MetricCard";
import { formatCurrency, formatPct } from "@/helpers/formatters";
import type { SummaryMetricCardsProps } from "@/types/insights";

export default function SummaryMetricCards({
  invested,
  current,
  gain,
  absReturn,
  weightedCagr,
  benchmarkDelta,
}: SummaryMetricCardsProps) {
  const isProfit = gain >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Invested"
        value={formatCurrency(invested)}
        icon={IndianRupee}
        accentColor="indigo"
      />
      <MetricCard
        label="Current Value"
        value={formatCurrency(current)}
        sub={`${gain >= 0 ? "+" : ""}${formatCurrency(gain)} gain`}
        icon={TrendingUp}
        accentColor="teal"
      />
      <MetricCard
        label="Total Gain"
        value={formatCurrency(gain)}
        sub={`${formatPct(absReturn)} absolute`}
        icon={TrendingUp}
        accentColor={isProfit ? "emerald" : "rose"}
      />
      <MetricCard
        label="Weighted CAGR"
        value={`${weightedCagr.toFixed(2)}%`}
        sub={`${benchmarkDelta >= 0 ? "+" : ""}${benchmarkDelta.toFixed(2)}% vs benchmark`}
        icon={BarChart3}
        accentColor="amber"
      />
    </div>
  );
}
