"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Layers,
  Sparkles,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { clampPct } from "@/utils/styleHelpers";
import { formatInr } from "@/utils/formatters";
import {
  BULLION_METALS,
  type BullionRange52WeekCardProps,
} from "@/types/bullion";

export default function BullionRange52WeekCard({
  rangeData,
  activeMetal,
  selectedCity,
}: BullionRange52WeekCardProps) {
  const { activeMetrics, metalMeta } = useMemo(() => {
    switch (activeMetal) {
      case BULLION_METALS.SILVER:
        return {
          activeMetrics: rangeData.silver,
          metalMeta: {
            title: "999 Silver",
            unit: "/ g",
            icon: Layers,
            accentColor: "teal",
          },
        };
      case BULLION_METALS.PLATINUM:
        return {
          activeMetrics: rangeData.platinum,
          metalMeta: {
            title: "Platinum PT950",
            unit: "/ g",
            icon: Coins,
            accentColor: "indigo",
          },
        };
      case BULLION_METALS.GOLD:
      default:
        return {
          activeMetrics: rangeData.gold,
          metalMeta: {
            title: "24K Gold",
            unit: "/ g",
            icon: Sparkles,
            accentColor: "amber",
          },
        };
    }
  }, [activeMetal, rangeData]);

  const statusConfig = useMemo(() => {
    if (!activeMetrics) {
      return {
        label: "52W Range Analysis",
        badgeBg: "bg-slate-800 text-slate-400 border-slate-700",
        icon: Activity,
      };
    }

    switch (activeMetrics.statusLabel) {
      case "NEAR_LOW":
        return {
          label: "Near 52W Low (Bargain Zone)",
          badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
          icon: TrendingDown,
        };
      case "LOWER_MID":
        return {
          label: "Lower Half of 52W Range",
          badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          icon: Activity,
        };
      case "UPPER_MID":
        return {
          label: "Upper Half of 52W Range",
          badgeBg: "bg-teal-500/15 border-teal-500/30 text-teal-300",
          icon: Activity,
        };
      case "NEAR_HIGH":
      default:
        return {
          label: "Near 52W High (Strong Momentum)",
          badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          icon: TrendingUp,
        };
    }
  }, [activeMetrics]);

  if (!activeMetrics) {
    return null;
  }

  const {
    low52,
    low52DateFormatted,
    high52,
    high52DateFormatted,
    currentPrice,
    pricePct,
    spreadPct,
    gainFromLowPct,
    drawdownFromHighPct,
  } = activeMetrics;

  const priceDecimals = 2;
  const StatusIcon = statusConfig.icon;
  const MetalIcon = metalMeta.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all duration-300 hover:border-slate-750">
      {/* Background Accent Glow */}
      <div
        className={`absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl pointer-events-none opacity-15 ${
          activeMetrics.statusLabel === "NEAR_LOW"
            ? "bg-rose-500"
            : activeMetrics.statusLabel === "NEAR_HIGH"
              ? "bg-emerald-500"
              : "bg-teal-500"
        }`}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl border bg-teal-500/15 border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
            <MetalIcon size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              52-Week Price Range
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              1-Year price corridor, recovery momentum off low, and pullback
              from high for {metalMeta.title} ({selectedCity.name})
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shrink-0 ${statusConfig.badgeBg}`}
        >
          <StatusIcon size={14} />
          {statusConfig.label}
        </span>
      </div>

      {/* Primary Range Slider Track & Extremes */}
      <div className="pt-5 pb-2">
        <div className="flex justify-between items-end mb-2.5">
          {/* 52-Week Low */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center gap-1">
              <span>52-Week Low</span>
            </span>
            <div className="text-base sm:text-xl font-black text-rose-400 tracking-tight mt-0.5">
              {formatInr(low52, priceDecimals)}
            </div>
            {low52DateFormatted && (
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                <Calendar size={10} className="text-slate-500" />
                {low52DateFormatted}
              </span>
            )}
          </div>

          {/* Current Price with Percentile Marker */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] text-teal-300 uppercase tracking-wider font-extrabold">
              Current Price
            </span>
            <div className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight mt-0.5">
              {formatInr(currentPrice, priceDecimals)}{" "}
              <span className="text-xs font-semibold text-slate-400">
                {metalMeta.unit}
              </span>
            </div>
            <span className="text-[10px] text-teal-300 font-bold bg-teal-950/70 border border-teal-500/40 px-2.5 py-0.5 rounded-full mt-1 shadow-sm">
              {pricePct.toFixed(1)}% of 52W Range
            </span>
          </div>

          {/* 52-Week High */}
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center gap-1">
              <span>52-Week High</span>
            </span>
            <div className="text-base sm:text-xl font-black text-emerald-400 tracking-tight mt-0.5">
              {formatInr(high52, priceDecimals)}
            </div>
            {high52DateFormatted && (
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                <Calendar size={10} className="text-slate-500" />
                {high52DateFormatted}
              </span>
            )}
          </div>
        </div>

        {/* 52W Visual Range Slider Bar */}
        <div className="relative py-2.5 flex items-center">
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/90 relative p-0.5 shadow-inner">
            {/* Multi-Stop Gradient Track (Rose -> Amber -> Teal -> Emerald) */}
            <div className="h-full w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-55% via-teal-400 to-emerald-500 opacity-80" />
          </div>

          {/* Cursor Indicator Pin */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-500 pointer-events-none"
            data-position={clampPct(pricePct)}
            style={{ left: `${clampPct(pricePct)}%` }}
          >
            <div className="w-4 h-4 rounded-full bg-white border-2 border-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.9)] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Metric Tiles (4 KPI Cards matching exact screenshot) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4">
        {/* Tile 1: 52-Week Low */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>52-Week Low</span>
            <ArrowDownRight size={14} className="text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-rose-400 tracking-tight">
              {formatInr(low52, priceDecimals)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium flex items-center justify-between">
              <span>Date: {low52DateFormatted || "N/A"}</span>
              <span className="text-emerald-400 font-semibold">
                +{gainFromLowPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Tile 2: Current Price */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Current Price</span>
            <Layers size={14} className="text-teal-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
              {formatInr(currentPrice, priceDecimals)}{" "}
              <span className="text-xs font-semibold text-slate-400">
                {metalMeta.unit}
              </span>
            </div>
            <div className="text-[11px] text-teal-400 mt-1 font-semibold flex items-center justify-between">
              <span>{pricePct.toFixed(1)}% of 52W Range</span>
              <span className="text-slate-400 text-[10px]">
                {selectedCity.name}
              </span>
            </div>
          </div>
        </div>

        {/* Tile 3: 52-Week High */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>52-Week High</span>
            <ArrowUpRight size={14} className="text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-emerald-400 tracking-tight">
              {formatInr(high52, priceDecimals)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium flex items-center justify-between">
              <span>Date: {high52DateFormatted || "N/A"}</span>
              <span className="text-rose-400 font-semibold">
                {drawdownFromHighPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Tile 4: 52W Volatility Spread */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>52W Volatility Spread</span>
            <Activity size={14} className="text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-indigo-300 tracking-tight">
              {spreadPct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              1-Year high to low spread
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
