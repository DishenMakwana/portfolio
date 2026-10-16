"use client";

import { motion } from "framer-motion";
import { TrendingUp, History } from "lucide-react";
import type { NiftyTradeModeSelectorProps } from "@/types/nifty-analysis";

export function NiftyTradeModeSelector({
  tradeMode,
  onTradeModeChange,
  buyCount,
  sellCount,
}: NiftyTradeModeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-3.5 px-5 rounded-2xl shadow-xl"
    >
      {/* Segment Toggle Buttons */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 self-start">
        <button
          type="button"
          onClick={() => onTradeModeChange("BUY")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tradeMode === "BUY"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-lg shadow-teal-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>All Buy Activity</span>
          <span
            className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              tradeMode === "BUY"
                ? "bg-teal-950/80 text-teal-400 border border-teal-800/40"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {buyCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTradeModeChange("SELL")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tradeMode === "SELL"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>All Sold Activity</span>
          <span
            className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              tradeMode === "SELL"
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {sellCount}
          </span>
        </button>
      </div>

      {/* Trade Mode Context Subtext */}
      <div className="text-xs text-slate-400">
        Showing{" "}
        <span className="font-semibold text-slate-200">
          {tradeMode === "BUY"
            ? "Capital Inflow (Purchases & SIPs)"
            : "Capital Outflow (Redemptions & Switch Outs)"}
        </span>{" "}
        mapped against NIFTY 50 spot & valuation cycles.
      </div>
    </motion.div>
  );
}
