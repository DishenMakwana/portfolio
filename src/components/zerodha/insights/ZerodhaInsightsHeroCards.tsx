"use client";

import {
  BriefcaseBusiness,
  TrendingUp,
  BarChart3,
  LineChart,
} from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import { formatCurrency, formatNullablePercent } from "@/helpers/formatters";
import type { ZerodhaInsightsHeroCardsProps } from "@/types/zerodha";

export default function ZerodhaInsightsHeroCards({
  cagrAssetType,
  setCagrAssetType,
  mfCount,
  stockCount,
  activeTotalInvested,
  activeCurrentValue,
  activeTotalGain,
  activeAbsReturn,
  activeWeightedCagr,
  activeCagrDelta,
  activeInvestedDiff,
  activeCurrentValueDiff,
  benchmarkLabel,
  assetTypeLabel,
}: ZerodhaInsightsHeroCardsProps) {
  return (
    <div className="space-y-4">
      {/* Asset View Selector Segment Buttons */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800/80 p-1.5 rounded-xl shadow-inner">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Asset View:
          </span>
          <button
            onClick={() => setCagrAssetType("mutual_fund")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition duration-200 cursor-pointer flex items-center gap-1.5 ${
              cagrAssetType === "mutual_fund"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50 scale-105"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <BriefcaseBusiness size={14} />
            Mutual Funds ({mfCount})
          </button>
          <button
            onClick={() => setCagrAssetType("equity")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition duration-200 cursor-pointer flex items-center gap-1.5 ${
              cagrAssetType === "equity"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50 scale-105"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <LineChart size={14} />
            Stocks ({stockCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label={`${assetTypeLabel} Total Invested`}
          value={formatCurrency(activeTotalInvested)}
          sub={activeInvestedDiff.sub}
          subColor={activeInvestedDiff.subColor}
          icon={BriefcaseBusiness}
          accentColor="indigo"
        />
        <MetricCard
          label={`${assetTypeLabel} Current Value`}
          value={formatCurrency(activeCurrentValue)}
          sub={activeCurrentValueDiff.sub}
          subColor={activeCurrentValueDiff.subColor}
          icon={TrendingUp}
          accentColor="teal"
        />
        <MetricCard
          label={`${assetTypeLabel} Total Gain`}
          value={formatCurrency(activeTotalGain)}
          sub={`${formatNullablePercent(activeAbsReturn)} absolute return`}
          icon={TrendingUp}
          accentColor={activeTotalGain >= 0 ? "emerald" : "rose"}
        />
        <MetricCard
          label={`${assetTypeLabel} Weighted CAGR`}
          value={
            activeWeightedCagr !== null
              ? `${activeWeightedCagr.toFixed(2)}%`
              : "N/A"
          }
          sub={
            activeCagrDelta === null
              ? benchmarkLabel
              : `${formatNullablePercent(activeCagrDelta)} vs benchmark`
          }
          icon={BarChart3}
          accentColor="amber"
        />
      </div>
    </div>
  );
}
