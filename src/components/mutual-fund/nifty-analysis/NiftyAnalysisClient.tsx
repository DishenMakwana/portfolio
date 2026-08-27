"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { TrendingUp, Target, Compass, History, Zap } from "lucide-react";
import { formatIndianAmount } from "@/helpers/formatters";
import {
  filterTimelineByTimeframe,
  filterTransactionsByTimeframe,
  filterTransactionsByType,
} from "@/helpers/niftyAnalysis";
import NiftyTimelineChart from "./NiftyTimelineChart";
import NiftyTransactionsTable from "./NiftyTransactionsTable";
import NiftyTrajectoryHeroCards from "./NiftyTrajectoryHeroCards";
import type {
  NiftyAnalysisData,
  NiftyTimeframe,
  NiftyTxFilter,
  NiftyTradeMode,
} from "@/types/nifty-analysis";

interface NiftyAnalysisClientProps {
  data: NiftyAnalysisData;
}

export default function NiftyAnalysisClient({
  data,
}: NiftyAnalysisClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Query parameter state with defaults
  const paramMode = (searchParams.get("mode") as NiftyTradeMode) || "BUY";
  const paramTf = (searchParams.get("tf") as NiftyTimeframe) || "3Y";
  const paramFilter = (searchParams.get("filter") as NiftyTxFilter) || "all";
  const paramMember = searchParams.get("member") || "all";
  const paramSearch = searchParams.get("q") || "";

  const [tradeMode, setTradeMode] = useState<NiftyTradeMode>(
    paramMode === "SELL" ? "SELL" : "BUY"
  );
  const [timeframe, setTimeframe] = useState<NiftyTimeframe>(paramTf);
  const [txFilter, setTxFilter] = useState<NiftyTxFilter>(paramFilter);
  const [selectedMember, setSelectedMember] = useState<string>(paramMember);
  const [searchQuery, setSearchQuery] = useState<string>(paramSearch);

  // Sync state with URL params
  const updateQueryParams = (updates: Record<string, string>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const params = new URLSearchParams(searchString);
    Object.entries(updates).forEach(([key, val]) => {
      if (
        val === "" ||
        val === "all" ||
        (key === "tf" && val === "3Y") ||
        (key === "mode" && val === "BUY")
      ) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    const query = params.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  const handleTradeModeChange = (mode: NiftyTradeMode) => {
    setTradeMode(mode);
    setTxFilter("all");
    updateQueryParams({ mode, filter: "all" });
  };

  const handleTimeframeChange = (tf: NiftyTimeframe) => {
    setTimeframe(tf);
    updateQueryParams({ tf });
  };

  const handleTxFilterChange = (filter: NiftyTxFilter) => {
    setTxFilter(filter);
    updateQueryParams({ filter });
  };

  const handleMemberChange = (member: string) => {
    setSelectedMember(member);
    updateQueryParams({ member });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    updateQueryParams({ q });
  };

  // Active dataset according to Trade Mode (BUY vs SELL)
  const activeTransactions = useMemo(() => {
    return tradeMode === "BUY" ? data.buyTransactions : data.sellTransactions;
  }, [data.buyTransactions, data.sellTransactions, tradeMode]);

  const summary = useMemo(() => {
    return tradeMode === "BUY" ? data.buySummary : data.sellSummary;
  }, [data.buySummary, data.sellSummary, tradeMode]);

  // 1. Filter timeline by selected timeframe
  const filteredTimeline = useMemo(() => {
    return filterTimelineByTimeframe(data.timeline, timeframe);
  }, [data.timeline, timeframe]);

  // 2. Filter transactions by timeframe
  const timeFilteredTransactions = useMemo(() => {
    return filterTransactionsByTimeframe(activeTransactions, timeframe);
  }, [activeTransactions, timeframe]);

  // 3. Filter transactions by member (for chart view)
  const memberFilteredTransactions = useMemo(() => {
    if (selectedMember === "all" || selectedMember === "All") {
      return timeFilteredTransactions;
    }
    return timeFilteredTransactions.filter(
      (t) => t.memberName === selectedMember
    );
  }, [timeFilteredTransactions, selectedMember]);

  // 4. Filter transactions by transaction type / category
  const filteredTransactions = useMemo(() => {
    return filterTransactionsByType(memberFilteredTransactions, txFilter);
  }, [memberFilteredTransactions, txFilter]);

  // Valuation zone determination
  const athPct =
    summary.allTimeHighNifty > 0
      ? (summary.currentNifty / summary.allTimeHighNifty) * 100
      : 100;
  const valuationZone =
    athPct >= 97
      ? {
          label: "Premium / Peak Zone",
          color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
          advice:
            tradeMode === "BUY"
              ? "Rely on regular SIP instalments. Avoid deploying large lumpsums near market peaks."
              : "Attractive profit-taking territory for rebalancing equity gains to debt or safer assets.",
        }
      : athPct >= 90
        ? {
            label: "Fair Value Zone",
            color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
            advice:
              tradeMode === "BUY"
                ? "Maintain systematic SIPs and keep dry powder ready for market pullbacks."
                : "Balanced zone for planned goal redemptions without significant timing penalties.",
          }
        : {
            label: "Deep Value Dip Zone",
            color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
            advice:
              tradeMode === "BUY"
                ? "Prime accumulation territory! High reward-to-risk for lumpsum top-ups and booster SIPs."
                : "Avoid panic redemptions or liquidating quality equity funds during major market dips.",
          };

  return (
    <div className="space-y-6">
      {/* ── TOP LEVEL TRADE MODE SELECTOR ── */}
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
            onClick={() => handleTradeModeChange("BUY")}
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
              {data.buyTransactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTradeModeChange("SELL")}
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
              {data.sellTransactions.length}
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

      {/* ── TOP KPI SUMMARY CARDS ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
      >
        <NiftyTrajectoryHeroCards summary={summary} tradeMode={tradeMode} />
      </motion.div>

      {/* ── STRATEGIC DECISION-MAKING & TIMING FRAMEWORK ── */}
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
                <span className="text-lg font-extrabold text-slate-100 font-mono">
                  {summary.weightedAvgNiftyEntry.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono ${
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
                  {tradeMode === "BUY"
                    ? "Dip-Buying Alpha"
                    : "Peak Exit Quality"}
                </span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono">
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
              <span className="font-mono font-bold text-emerald-400">
                {tradeMode === "BUY"
                  ? `+${summary.dipBuysCagr.toFixed(1)}%`
                  : formatIndianAmount(summary.peakBuysInvestedAmount, 0)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                {tradeMode === "BUY" ? "Peak Buys CAGR" : "Dip Exit Capital"}
              </span>
              <span className="font-mono font-bold text-amber-400">
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

      {/* ── INTERACTIVE TIMELINE CHART ── */}
      <NiftyTimelineChart
        timeline={filteredTimeline}
        transactions={filteredTransactions}
        currentNifty={summary.currentNifty}
        allTimeHighNifty={summary.allTimeHighNifty}
        weightedAvgNiftyEntry={summary.weightedAvgNiftyEntry}
        niftyEntryBufferPct={summary.niftyEntryBufferPct}
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        txFilter={txFilter}
        onTxFilterChange={handleTxFilterChange}
        availableYears={data.availableYears}
        tradeMode={tradeMode}
      />

      {/* ── DETAILED TRANSACTIONS BREAKDOWN TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.28, ease: "easeOut" }}
      >
        <NiftyTransactionsTable
          transactions={activeTransactions}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedMember={selectedMember}
          onMemberChange={handleMemberChange}
          membersList={data.membersList}
          currentNifty={summary.currentNifty}
          tradeMode={tradeMode}
        />
      </motion.div>
    </div>
  );
}
