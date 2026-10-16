"use client";

import { motion } from "framer-motion";
import { Target, Zap, Compass } from "lucide-react";
import { formatIndianAmount } from "@/helpers/formatters";
import type { NiftyStrategicCardsProps } from "@/types/nifty-analysis";

export function NiftyStrategicCards({
  summary,
  tradeMode,
  valuationZone,
  athPct,
}: NiftyStrategicCardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* 1. Weighted Average Entry/Exit & Cushion */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-sky-500/20 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Target size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                {tradeMode === "BUY"
                  ? "Weighted Avg Entry"
                  : "Weighted Avg Exit"}
              </span>
              <span className="text-lg font-extrabold text-slate-100 ">
                {summary.weightedAvgNiftyEntry.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border  ${
              summary.niftyEntryBufferPct >= 0
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            }`}
          >
            {summary.niftyEntryBufferPct >= 0 ? "+" : ""}
            {summary.niftyEntryBufferPct.toFixed(1)}%{" "}
            {tradeMode === "BUY" ? "Buffer" : "vs Spot"}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {tradeMode === "BUY"
            ? `Your capital-weighted index entry level. Current spot of ${summary.currentNifty.toLocaleString(
                "en-IN"
              )} is trading with a +${summary.niftyEntryBufferPct.toFixed(
                1
              )}% safety margin.`
            : `Your capital-weighted index exit level across all sell orders compared to today's spot of ${summary.currentNifty.toLocaleString(
                "en-IN"
              )}.`}
        </p>
      </div>

      {/* 2. Timing Quality Indicator */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Zap size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                {tradeMode === "BUY" ? "Dip-Buying Alpha" : "Peak Exit Quality"}
              </span>
              <span className="text-lg font-extrabold text-emerald-400 ">
                {tradeMode === "BUY"
                  ? `${summary.dipAlpha >= 0 ? "+" : ""}${summary.dipAlpha.toFixed(2)}% Extra CAGR`
                  : `${summary.higherNiftyInvestedPct.toFixed(1)}% Sold Above Spot`}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            {tradeMode === "BUY"
              ? `${summary.dipBuysCount} Dips Bought`
              : `${summary.peakBuysCount} Peak Exits`}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-2">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              {tradeMode === "BUY" ? "Dip Buys CAGR" : "Peak Exit Capital"}
            </span>
            <span className="font-bold text-emerald-400">
              {tradeMode === "BUY"
                ? `+${summary.dipBuysCagr.toFixed(1)}%`
                : formatIndianAmount(summary.peakBuysInvestedAmount, 0)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              {tradeMode === "BUY" ? "Peak Buys CAGR" : "Dip Exit Capital"}
            </span>
            <span className="font-bold text-amber-400">
              {tradeMode === "BUY"
                ? `+${summary.peakBuysCagr.toFixed(1)}%`
                : formatIndianAmount(summary.dipBuysInvestedAmount, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Valuation & Capital Deployment Guide */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Compass size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Market Zone Guide
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded border inline-block ${valuationZone.color}`}
              >
                {valuationZone.label} ({athPct.toFixed(1)}% ATH)
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {valuationZone.advice}
        </p>
      </div>
    </motion.div>
  );
}
