"use client";

import { useState } from "react";
import {
  TrendingUp,
  RotateCw,
  Info,
  Building2,
  PieChart,
  DollarSign,
  Briefcase,
  CheckCircle2,
  UserCheck,
  Calendar,
} from "lucide-react";
import type { StockFundamentalsData } from "@/types/stock-fundamentals";
import type { StockInsightsPanelsProps } from "@/types/fund-details";
import { refreshStockFundamentalsAction } from "@/actions/stockFundamentals";
import { formatDateSlashDDMMYYYY } from "@/helpers/formatters";
import { motion } from "framer-motion";

export function StockInsightsPanels({
  stockData: initialData,
  symbol,
  currentPrice,
  listingDate,
  indexBenchmark,
  sector,
  marketCapCategory,
}: StockInsightsPanelsProps) {
  const [data, setData] = useState<StockFundamentalsData | null>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await refreshStockFundamentalsAction(symbol);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Error refreshing stock data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const cleanSector = data?.industryName || sector || "General";
  const cleanMarketCapCategory =
    marketCapCategory || data?.marketCapCategory || "—";
  const benchmarkName = indexBenchmark || "Nifty 50 Index";

  // Calculate 52W position percentage
  const low52 = data?.yearLow ?? null;
  const high52 = data?.yearHigh ?? null;
  let pricePct = 50;
  if (currentPrice && low52 !== null && high52 !== null && high52 > low52) {
    pricePct = Math.min(
      100,
      Math.max(0, ((currentPrice - low52) / (high52 - low52)) * 100)
    );
  }

  // Format Helper for Growth
  const renderGrowthBadge = (valStr: string | null | undefined) => {
    if (!valStr || valStr === "--") {
      return (
        <span className="text-slate-500 font-medium text-xs sm:text-sm">
          --
        </span>
      );
    }
    const isNegative = valStr.startsWith("-");
    return (
      <span
        className={`font-extrabold text-xs sm:text-sm tracking-tight ${
          isNegative ? "text-rose-400" : "text-emerald-400"
        }`}
      >
        {valStr}
      </span>
    );
  };

  const shareholding = data?.shareholding;

  return (
    <div className="space-y-6">
      {/* TOP ROW: FUNDAMENTALS (EXACT 2-COLUMN SPLIT FROM SCREENSHOT 1) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-teal-400" />
            <h3 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
              <span>Fundamentals</span>
              <div
                className="text-slate-400 hover:text-slate-300 transition-colors cursor-help"
                title="Key financial ratios, valuation multiples, and per-share figures from Groww"
              >
                <Info size={14} />
              </div>
            </h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {cleanSector}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 transition-all hover:text-teal-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm self-start sm:self-auto"
            title="Re-scrape and update stock fundamentals from Groww"
          >
            <RotateCw
              size={13}
              className={`text-teal-400 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Syncing..." : "Sync Live Stock Data"}</span>
          </button>
        </div>

        {/* 2-Column Fundamentals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
          {/* Left Column (5 metrics) */}
          <div className="space-y-3.5 md:border-r md:border-slate-800/80 md:pr-12">
            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">Market Cap</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.marketCap || "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">P/E Ratio(TTM)</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.peRatio !== null && data?.peRatio !== undefined
                  ? data.peRatio.toFixed(2)
                  : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">P/B Ratio</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.pbRatio !== null && data?.pbRatio !== undefined
                  ? data.pbRatio.toFixed(2)
                  : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">Industry P/E</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.industryPe !== null && data?.industryPe !== undefined
                  ? data.industryPe.toFixed(2)
                  : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">Debt to Equity</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.debtToEquity !== null && data?.debtToEquity !== undefined
                  ? data.debtToEquity.toFixed(2)
                  : "--"}
              </span>
            </div>
          </div>

          {/* Right Column (5 metrics) */}
          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">ROE</span>
              <span className="font-bold text-emerald-400 text-sm">
                {data?.roe !== null && data?.roe !== undefined
                  ? `${data.roe.toFixed(2)}%`
                  : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">EPS(TTM)</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.eps !== null && data?.eps !== undefined
                  ? `₹${data.eps.toFixed(2)}`
                  : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">Dividend Yield</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.dividendYield !== null &&
                data?.dividendYield !== undefined
                  ? `${data.dividendYield.toFixed(2)}%`
                  : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">Book Value</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.bookValue !== null && data?.bookValue !== undefined
                  ? `₹${data.bookValue.toFixed(2)}`
                  : "--"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-slate-850/50 pb-2">
              <span className="text-slate-400 font-medium">Face Value</span>
              <span className="font-bold text-slate-100 text-sm">
                {data?.faceValue !== null && data?.faceValue !== undefined
                  ? data.faceValue
                  : "--"}
              </span>
            </div>
          </div>
        </div>

        {/* 52-Week Range Bar */}
        {low52 !== null && high52 !== null && (
          <div className="border-t border-slate-800/80 pt-4 mt-2">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  52-Week Low
                </span>
                <span className="text-rose-400 font-black text-sm">
                  ₹{low52.toFixed(2)}
                </span>
              </div>

              {currentPrice && (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                    Current Price
                  </span>
                  <span className="text-teal-300 font-black text-sm">
                    ₹{currentPrice.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  52-Week High
                </span>
                <span className="text-emerald-400 font-black text-sm">
                  ₹{high52.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Slider track */}
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80 relative">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full opacity-75"
                style={{ width: "100%" }}
              />
              <div
                className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)] -ml-1 transition-all duration-500"
                style={{ left: `${pricePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* SECOND ROW: FINANCIAL GROWTH (EXACT SPLIT FROM SCREENSHOT 2) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {/* REVENUE GROWTH */}
          <div className="md:border-r md:border-slate-800/80 md:pr-12">
            <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2.5 mb-3">
              <span>REVENUE GROWTH</span>
              <span>VALUE</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-850/40 pb-2">
                <span className="text-slate-300 font-medium">1Y (TTM)</span>
                {renderGrowthBadge(data?.revenueGrowth1Y)}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300 font-medium">3Y CAGR</span>
                {renderGrowthBadge(data?.revenueGrowth3Y)}
              </div>
            </div>
          </div>

          {/* PROFIT GROWTH */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2.5 mb-3">
              <span>PROFIT GROWTH</span>
              <span>VALUE</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-850/40 pb-2">
                <span className="text-slate-300 font-medium">1Y (TTM)</span>
                {renderGrowthBadge(data?.profitGrowth1Y)}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300 font-medium">3Y CAGR</span>
                {renderGrowthBadge(data?.profitGrowth3Y)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THIRD ROW: 2 PANELS (SHAREHOLDING PATTERN & COMPANY PROFILE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: SHAREHOLDING PATTERN */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <PieChart size={18} className="text-teal-400" />
                <span>Shareholding Pattern</span>
              </div>
              {shareholding?.quarter && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {shareholding.quarter}
                </span>
              )}
            </h3>

            {shareholding ? (
              <div className="space-y-4">
                {/* Promoters */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Promoters</span>
                    <span className="text-indigo-400 font-extrabold">
                      {shareholding.promoters}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, shareholding.promoters))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* FII */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">
                      Foreign Institutions (FII)
                    </span>
                    <span className="text-sky-400 font-extrabold">
                      {shareholding.fii}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-sky-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, shareholding.fii))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* DII */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">
                      Domestic Institutions (DII / MFs)
                    </span>
                    <span className="text-emerald-400 font-extrabold">
                      {shareholding.dii}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, shareholding.dii))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Retail & Others */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Retail & Others</span>
                    <span className="text-amber-400 font-extrabold">
                      {shareholding.retail}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                    <motion.div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(0, shareholding.retail))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-6 text-center">
                Shareholding data not yet synced. Click &quot;Sync Live Stock
                Data&quot; to fetch.
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-3 mt-5 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-teal-400/70 shrink-0" />
            <span>Quarterly ownership pattern filed with exchanges</span>
          </div>
        </div>

        {/* PANEL B: COMPANY PROFILE & LEADERSHIP */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
              <Building2 size={18} className="text-teal-400" />
              <span>Company Profile &amp; Leadership</span>
            </h3>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500" />
                  <span>Listing Date</span>
                </span>
                <span className="font-semibold text-slate-200">
                  {listingDate || "--"}
                </span>
              </div>

              {data?.foundedYear && (
                <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Building2 size={13} className="text-slate-500" />
                    <span>Founded Year</span>
                  </span>
                  <span className="font-semibold text-slate-200">
                    {data.foundedYear}
                  </span>
                </div>
              )}

              {data?.managingDirector && (
                <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <UserCheck size={13} className="text-slate-500" />
                    <span>Managing Director / CEO</span>
                  </span>
                  <span className="font-semibold text-teal-300">
                    {data.managingDirector}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Briefcase size={13} className="text-slate-500" />
                  <span>Sector / Industry</span>
                </span>
                <span className="font-semibold text-slate-200">
                  {cleanSector}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <PieChart size={13} className="text-slate-500" />
                  <span>Market Cap Category</span>
                </span>
                <span className="font-semibold text-slate-200">
                  {cleanMarketCapCategory}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-slate-500" />
                  <span>Index Benchmark</span>
                </span>
                <span className="font-semibold text-indigo-400 text-xs">
                  {benchmarkName}
                </span>
              </div>

              {data?.businessSummary && (
                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                    Business Summary
                  </span>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed max-h-32 overflow-y-auto">
                    {data.businessSummary}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-850 pt-3 mt-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-teal-400/70 shrink-0" />
              <span>Source: Groww Stocks Fundamentals API</span>
            </div>
            {data?.lastScrapedAt && (
              <span>
                Last synced: {formatDateSlashDDMMYYYY(data.lastScrapedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
