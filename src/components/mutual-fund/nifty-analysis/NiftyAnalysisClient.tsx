"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  filterTimelineByTimeframe,
  filterTransactionsByTimeframe,
  filterTransactionsByType,
  getNiftyValuationZone,
} from "@/helpers/niftyAnalysis";
import { NiftyTradeModeSelector } from "./NiftyTradeModeSelector";
import NiftyTrajectoryHeroCards from "./NiftyTrajectoryHeroCards";
import { NiftyStrategicCards } from "./NiftyStrategicCards";
import NiftyTimelineChart from "./NiftyTimelineChart";
import NiftyTransactionsTable from "./NiftyTransactionsTable";
import type {
  NiftyAnalysisClientProps,
  NiftyTimeframe,
  NiftyTradeMode,
  NiftyTxFilter,
} from "@/types/nifty-analysis";

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
  const valuationZone = useMemo(
    () =>
      getNiftyValuationZone(
        summary.currentNifty,
        summary.allTimeHighNifty,
        tradeMode
      ),
    [summary.currentNifty, summary.allTimeHighNifty, tradeMode]
  );

  return (
    <div className="space-y-6">
      {/* ── TOP LEVEL TRADE MODE SELECTOR ── */}
      <NiftyTradeModeSelector
        tradeMode={tradeMode}
        onTradeModeChange={handleTradeModeChange}
        buyCount={data.buyTransactions.length}
        sellCount={data.sellTransactions.length}
      />

      {/* ── TOP KPI SUMMARY CARDS ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
      >
        <NiftyTrajectoryHeroCards summary={summary} tradeMode={tradeMode} />
      </motion.div>

      {/* ── STRATEGIC DECISION-MAKING & TIMING FRAMEWORK ── */}
      <NiftyStrategicCards
        summary={summary}
        tradeMode={tradeMode}
        valuationZone={valuationZone}
        athPct={athPct}
      />

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
