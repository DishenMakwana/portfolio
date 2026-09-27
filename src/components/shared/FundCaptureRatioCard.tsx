"use client";

import { useState, useMemo } from "react";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Shield,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { calculateCaptureRatios } from "@/helpers/riskMetrics";
import type {
  CaptureTimeframe,
  FundCaptureRatioCardProps,
} from "@/types/fund-details";

const TIMEFRAME_OPTIONS: Array<{ label: string; value: CaptureTimeframe }> = [
  { label: "1Y", value: "1Y" },
  { label: "3Y", value: "3Y" },
  { label: "5Y", value: "5Y" },
  { label: "ALL", value: "ALL" },
];

export default function FundCaptureRatioCard({
  fundNavHistory,
  benchNavHistory,
  benchmarkName = "Benchmark",
}: FundCaptureRatioCardProps) {
  const [timeframe, setTimeframe] = useState<CaptureTimeframe>("3Y");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const captureData = useMemo(() => {
    return calculateCaptureRatios(fundNavHistory, benchNavHistory, timeframe);
  }, [fundNavHistory, benchNavHistory, timeframe]);

  // Fallback to "ALL" if 3Y data isn't sufficient
  const effectiveData = useMemo(() => {
    if (captureData) return captureData;
    return calculateCaptureRatios(fundNavHistory, benchNavHistory, "ALL");
  }, [captureData, fundNavHistory, benchNavHistory]);

  if (!effectiveData) {
    return null;
  }

  const {
    upsideCapture,
    downsideCapture,
    captureRatio,
    captureSpread,
    upPeriodsCount,
    downPeriodsCount,
    fundUpReturnAnnualized,
    benchUpReturnAnnualized,
    fundDownReturnAnnualized,
    benchDownReturnAnnualized,
    verdictTitle,
  } = effectiveData;

  const isPositiveSpread = captureSpread >= 0;
  const isGoodDownside = downsideCapture <= 100;
  const isGoodUpside = upsideCapture >= 100;

  // Differences vs Benchmark
  const upReturnDiff = Number(
    (fundUpReturnAnnualized - benchUpReturnAnnualized).toFixed(2)
  );
  const downReturnDiff = Number(
    (fundDownReturnAnnualized - benchDownReturnAnnualized).toFixed(2)
  );

  // Scaled bar percentages for direct head-to-head comparison
  // 1. Bull market returns
  const maxUpReturn =
    Math.max(
      Math.abs(fundUpReturnAnnualized),
      Math.abs(benchUpReturnAnnualized),
      1
    ) * 1.15;
  const upFundPct = Math.min(
    100,
    Math.max(10, (Math.abs(fundUpReturnAnnualized) / maxUpReturn) * 100)
  );
  const upBenchPct = Math.min(
    100,
    Math.max(10, (Math.abs(benchUpReturnAnnualized) / maxUpReturn) * 100)
  );

  // 2. Bear market returns (magnitude of loss)
  const maxDownReturn =
    Math.max(
      Math.abs(fundDownReturnAnnualized),
      Math.abs(benchDownReturnAnnualized),
      1
    ) * 1.15;
  const downFundPct = Math.min(
    100,
    Math.max(10, (Math.abs(fundDownReturnAnnualized) / maxDownReturn) * 100)
  );
  const downBenchPct = Math.min(
    100,
    Math.max(10, (Math.abs(benchDownReturnAnnualized) / maxDownReturn) * 100)
  );

  // 3. Capture ratio scale (Fund vs 1.00x Benchmark baseline)
  const maxRatio = Math.max(captureRatio, 1.0, 1.2) * 1.15;
  const ratioFundPct = Math.min(
    100,
    Math.max(10, (captureRatio / maxRatio) * 100)
  );
  const ratioBenchPct = Math.min(100, Math.max(10, (1.0 / maxRatio) * 100));

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md space-y-3.5">
      {/* Header: Title + Benchmark Badge + View Toggle + Timeframe Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Scale size={16} className="text-teal-400 shrink-0" />
          <h3 className="text-sm font-bold text-slate-100">
            Market Capture vs Benchmark
          </h3>
          {benchmarkName && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-medium hidden sm:inline-flex items-center gap-1 truncate max-w-[260px] border border-slate-700/50"
              title={benchmarkName}
            >
              <span className="text-slate-400">vs</span>
              <span className="truncate">{benchmarkName}</span>
            </span>
          )}
        </div>

        {/* Controls: View Toggle (Cards/Table) + Timeframe Pills */}
        <div className="flex items-center gap-2">
          {/* Minimal View Mode Toggle */}
          <div className="flex items-center bg-slate-950/70 p-0.5 rounded-lg border border-slate-800/80 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Card View"
              className={`p-1 rounded-md transition ${
                viewMode === "cards"
                  ? "bg-slate-800 text-teal-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table Comparison View"
              className={`p-1 rounded-md transition ${
                viewMode === "table"
                  ? "bg-slate-800 text-teal-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TableIcon size={13} />
            </button>
          </div>

          {/* Minimal Timeframe Pills */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800/80 text-xs">
            {TIMEFRAME_OPTIONS.map((opt) => {
              const isActive = timeframe === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeframe(opt.value)}
                  className={`px-2.5 py-0.5 rounded-md font-bold transition text-[11px] ${
                    isActive
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {viewMode === "cards" ? (
        /* 3 Compact Metric Cards with Dual Benchmark Comparison */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Upside Capture */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                  <TrendingUp size={13} className="text-emerald-400" />
                  Upside (UCR)
                </span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    isGoodUpside
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {isGoodUpside
                    ? `+${(upsideCapture - 100).toFixed(1)}% vs Bmk`
                    : `${(upsideCapture - 100).toFixed(1)}% vs Bmk`}
                </span>
              </div>

              {/* Primary Value: Fund vs Benchmark Parity */}
              <div className="flex items-baseline justify-between mt-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-400 tracking-tight">
                    {upsideCapture}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Fund
                  </span>
                </div>
                <div className="flex items-baseline gap-1 text-slate-400">
                  <span className="text-[10px] text-slate-500">vs</span>
                  <span className="text-sm font-bold text-slate-300">
                    100.0%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Bmk
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Head-to-Head Comparison Bars */}
            <div className="space-y-2 pt-2.5 mt-2 border-t border-slate-850">
              {/* Fund Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Fund Bull Return
                  </span>
                  <span className="font-bold text-emerald-400">
                    +{fundUpReturnAnnualized}% p.a.
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${upFundPct}%` }}
                  />
                </div>
              </div>

              {/* Benchmark Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Benchmark Return
                  </span>
                  <span className="font-medium text-slate-400">
                    +{benchUpReturnAnnualized}% p.a.
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${upBenchPct}%` }}
                  />
                </div>
              </div>

              {/* Net Bull Alpha */}
              <div className="flex justify-between items-center text-[10px] pt-1 text-slate-400">
                <span>Bull Market Alpha</span>
                <span
                  className={`font-semibold ${
                    upReturnDiff >= 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {upReturnDiff >= 0
                    ? `+${upReturnDiff.toFixed(2)}%`
                    : `${upReturnDiff.toFixed(2)}%`}{" "}
                  p.a.
                </span>
              </div>
            </div>
          </div>

          {/* Capture Ratio & Spread */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                  <Sparkles size={13} className="text-teal-400" />
                  Capture Ratio
                </span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    isPositiveSpread
                      ? "bg-teal-950/80 text-teal-300 border border-teal-500/30"
                      : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  Spread: {isPositiveSpread ? "+" : ""}
                  {captureSpread}%
                </span>
              </div>

              {/* Primary Value: Fund Ratio vs 1.00x Parity */}
              <div className="flex items-baseline justify-between mt-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-teal-300 tracking-tight">
                    {captureRatio}x
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Fund
                  </span>
                </div>
                <div className="flex items-baseline gap-1 text-slate-400">
                  <span className="text-[10px] text-slate-500">vs</span>
                  <span className="text-sm font-bold text-slate-300">
                    1.00x
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Bmk
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Comparison Bars */}
            <div className="space-y-2 pt-2.5 mt-2 border-t border-slate-850">
              {/* Fund Ratio Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    Fund Payoff Ratio
                  </span>
                  <span className="font-bold text-teal-300">
                    {captureRatio}x
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${ratioFundPct}%` }}
                  />
                </div>
              </div>

              {/* Benchmark Ratio Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Benchmark Baseline
                  </span>
                  <span className="font-medium text-slate-400">1.00x</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${ratioBenchPct}%` }}
                  />
                </div>
              </div>

              {/* Asymmetry Edge */}
              <div className="flex justify-between items-center text-[10px] pt-1 text-slate-400">
                <span>Payoff Advantage</span>
                <span
                  className={`font-semibold ${
                    isPositiveSpread ? "text-teal-300" : "text-rose-400"
                  }`}
                >
                  {isPositiveSpread
                    ? `+${captureSpread}% Edge`
                    : `${captureSpread}% Deficit`}
                </span>
              </div>
            </div>
          </div>

          {/* Downside Capture */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                  <TrendingDown
                    size={13}
                    className={
                      isGoodDownside ? "text-emerald-400" : "text-rose-400"
                    }
                  />
                  Downside (DCR)
                </span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    isGoodDownside
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {isGoodDownside ? (
                    <span className="flex items-center gap-0.5">
                      <Shield size={9} />
                      {(100 - downsideCapture).toFixed(1)}% Cushion
                    </span>
                  ) : (
                    `+${(downsideCapture - 100).toFixed(1)}% Risk`
                  )}
                </span>
              </div>

              {/* Primary Value: Fund vs Benchmark Parity */}
              <div className="flex items-baseline justify-between mt-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-2xl font-black tracking-tight ${
                      isGoodDownside ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {downsideCapture}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Fund
                  </span>
                </div>
                <div className="flex items-baseline gap-1 text-slate-400">
                  <span className="text-[10px] text-slate-500">vs</span>
                  <span className="text-sm font-bold text-slate-300">
                    100.0%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Bmk
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Head-to-Head Comparison Bars */}
            <div className="space-y-2 pt-2.5 mt-2 border-t border-slate-850">
              {/* Fund Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isGoodDownside ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    Fund Bear Return
                  </span>
                  <span
                    className={`font-bold ${
                      isGoodDownside ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {fundDownReturnAnnualized}% p.a.
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isGoodDownside ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                    style={{ width: `${downFundPct}%` }}
                  />
                </div>
              </div>

              {/* Benchmark Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Benchmark Return
                  </span>
                  <span className="font-medium text-slate-400">
                    {benchDownReturnAnnualized}% p.a.
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${downBenchPct}%` }}
                  />
                </div>
              </div>

              {/* Net Downside Shield / Drag */}
              <div className="flex justify-between items-center text-[10px] pt-1 text-slate-400">
                <span>Downside Cushion</span>
                <span
                  className={`font-semibold ${
                    downReturnDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {downReturnDiff >= 0
                    ? `+${downReturnDiff.toFixed(2)}% Shield`
                    : `${downReturnDiff.toFixed(2)}% Drag`}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Minimal Tabular Head-to-Head Comparison */
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 sm:p-4 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2 font-semibold">Metric</th>
                <th className="pb-2 font-semibold text-right">Fund</th>
                <th className="pb-2 font-semibold text-right">Benchmark</th>
                <th className="pb-2 font-semibold text-right">
                  Comparison / Advantage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-200">
              <tr>
                <td className="py-2.5 font-medium text-slate-300 flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-emerald-400" />
                  Bull Market Return (p.a.)
                </td>
                <td className="py-2.5 text-right font-bold text-emerald-400">
                  +{fundUpReturnAnnualized}%
                </td>
                <td className="py-2.5 text-right text-slate-400">
                  +{benchUpReturnAnnualized}%
                </td>
                <td
                  className={`py-2.5 text-right font-semibold ${
                    upReturnDiff >= 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {upReturnDiff >= 0
                    ? `+${upReturnDiff.toFixed(2)}% Alpha`
                    : `${upReturnDiff.toFixed(2)}% Alpha`}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-300 flex items-center gap-1.5">
                  <TrendingDown size={12} className="text-rose-400" />
                  Bear Market Return (p.a.)
                </td>
                <td
                  className={`py-2.5 text-right font-bold ${
                    isGoodDownside ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {fundDownReturnAnnualized}%
                </td>
                <td className="py-2.5 text-right text-slate-400">
                  {benchDownReturnAnnualized}%
                </td>
                <td
                  className={`py-2.5 text-right font-semibold ${
                    downReturnDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {downReturnDiff >= 0
                    ? `+${downReturnDiff.toFixed(2)}% Shield`
                    : `${downReturnDiff.toFixed(2)}% Drag`}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-300 flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-teal-400" />
                  Upside Capture Ratio (UCR)
                </td>
                <td className="py-2.5 text-right font-bold text-emerald-400">
                  {upsideCapture}%
                </td>
                <td className="py-2.5 text-right text-slate-400">100.0%</td>
                <td
                  className={`py-2.5 text-right font-semibold ${
                    isGoodUpside ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {upsideCapture >= 100
                    ? `+${(upsideCapture - 100).toFixed(1)}% Extra Capture`
                    : `${(upsideCapture - 100).toFixed(1)}% Lag`}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-300 flex items-center gap-1.5">
                  <Shield size={12} className="text-amber-400" />
                  Downside Capture Ratio (DCR)
                </td>
                <td
                  className={`py-2.5 text-right font-bold ${
                    isGoodDownside ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {downsideCapture}%
                </td>
                <td className="py-2.5 text-right text-slate-400">100.0%</td>
                <td
                  className={`py-2.5 text-right font-semibold ${
                    isGoodDownside ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isGoodDownside
                    ? `${(100 - downsideCapture).toFixed(1)}% Cushion`
                    : `+${(downsideCapture - 100).toFixed(1)}% Risk Exposure`}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-teal-400" />
                  Overall Capture Ratio (UCR / DCR)
                </td>
                <td className="py-2.5 text-right font-bold text-teal-300">
                  {captureRatio}x
                </td>
                <td className="py-2.5 text-right text-slate-400">1.00x</td>
                <td
                  className={`py-2.5 text-right font-semibold ${
                    isPositiveSpread ? "text-teal-300" : "text-rose-400"
                  }`}
                >
                  {isPositiveSpread
                    ? `+${captureSpread}% Spread`
                    : `${captureSpread}% Spread`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Single-Line Minimal Footer: Verdict + Horizon count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-850 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-200">{verdictTitle}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 text-[11px]">
            {upPeriodsCount} Bull / {downPeriodsCount} Bear Months evaluated
          </span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          Monthly Compounded (SEBI Standard)
        </span>
      </div>
    </div>
  );
}
