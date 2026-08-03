"use client";

import { motion } from "framer-motion";
import { Zap, Star, AlertTriangle, Archive } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { ActionsTabProps } from "@/types/insights";

export default function ActionsTab({
  scaleUpFunds,
  watchlistFunds,
  zeroValueFunds = [],
  actionMonths,
  reverseInsights,
}: ActionsTabProps) {
  return (
    <div className="space-y-6">
      {/* Reverse Engineering & Strategic Portfolio Audit */}
      {reverseInsights && (
        <div className="rounded-2xl border border-indigo-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap size={14} className="text-indigo-400 animate-pulse" />
            Decompiled Portfolio Audit & Strategic Insights
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Ashok Leyland stock concentration */}
            {reverseInsights.ashokPct > 0 && (
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Single-Stock Concentration
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                    High Risk
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  Ashok Leyland constitutes{" "}
                  <span className="text-rose-400 font-bold">
                    {reverseInsights.ashokPct.toFixed(1)}%
                  </span>{" "}
                  of your MSFL stock portfolio.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Top 3 stock positions in MSFL (Ashok Leyland, Reliance, and
                  NTPC) represent{" "}
                  <span className="text-slate-300 font-semibold">
                    {reverseInsights.top3MsflPct.toFixed(1)}%
                  </span>
                  . Scale back Ashok Leyland to under 15% of the account to
                  diversify sector risk.
                </p>
              </div>
            )}

            {/* Regular plan fee drag */}
            {reverseInsights.totalRegularVal > 0 && (
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Expense Ratio Optimization
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                    Distributor Commission
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  You have{" "}
                  <span className="text-amber-400 font-bold">
                    {formatCurrency(reverseInsights.totalRegularVal)}
                  </span>{" "}
                  locked in Regular Plans.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Switching to commission-free Direct Plans can save you
                  approximately{" "}
                  <span className="text-emerald-400 font-bold">
                    {formatCurrency(reverseInsights.annualDrag)} every single
                    year
                  </span>
                  . Over 10 years compounding, this drag costs{" "}
                  <span className="text-slate-300 font-semibold">
                    ₹70 Lakhs+
                  </span>{" "}
                  in potential wealth.
                </p>
              </div>
            )}

            {/* Closet Indexing / Scheme overlaps */}
            {reverseInsights.overlaps.length > 0 && (
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2 col-span-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Closet Indexing & Scheme Redundancy
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
                    Portfolio Clutter
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  You hold multiple active schemes in overlapping categories.
                </p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {reverseInsights.overlaps.slice(0, 3).map((ov) => (
                    <div
                      key={ov.category}
                      className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg"
                    >
                      <div className="flex justify-between text-xs font-bold text-slate-200">
                        <span>{ov.category}</span>
                        <span className="text-indigo-400">
                          {ov.count} Funds
                        </span>
                      </div>
                      <p
                        className="text-[10px] text-slate-500 mt-1 leading-normal truncate"
                        title={ov.funds.join(", ")}
                      >
                        {ov.funds.join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Consolidate these overlapping holdings. Holding 7 broad-market
                  funds in identical styles dilutes active outperformance and
                  multiplies platform overhead. Keep only 1 high-conviction fund
                  per category.
                </p>
              </div>
            )}

            {/* Tax bracket optimization */}
            {reverseInsights.sonalbenPct > 0 && (
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2 col-span-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Tax Bracket Optimization
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold uppercase">
                    PAN Exposure
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  Sonalben holds{" "}
                  <span className="text-teal-400 font-bold">
                    {reverseInsights.sonalbenPct.toFixed(1)}%
                  </span>{" "}
                  of the family mutual fund assets.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This concentrates the future capital gains tax liability
                  (12.5% LTCG) heavily under one PAN. Distribute future SIP
                  allocations or rebalanced proceeds under other family members
                  (e.g. Alpeshkumar who holds just 1.4%) to utilize lower-income
                  slabs and save tax outgo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scale Up */}
      <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          Scale Up — Top Performers
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scaleUpFunds.map((fund) => (
            <motion.div
              key={fund.scheme}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 space-y-2 shadow-md hover:border-emerald-500/40 transition-colors"
            >
              <p className="text-sm font-bold text-slate-100 leading-tight">
                {fund.scheme}
              </p>
              <p className="text-xs text-slate-500">{fund.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-extrabold text-lg">
                  {fund.avgCagr.toFixed(2)}%
                </span>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer font-semibold"
                >
                  Increase SIP
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      <div className="rounded-2xl border border-rose-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={14} className="text-rose-400" />
          Watch List — Review These Funds
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {watchlistFunds.map((fund) => {
            const isInsuranceLinked =
              fund.scheme.toLowerCase().includes("lic") ||
              fund.scheme.toLowerCase().includes("uli");
            const isTooNew = fund.avgCagr < 5 && fund.invested >= 5_00_000;
            const tag = isInsuranceLinked
              ? "Insurance-Linked"
              : isTooNew
                ? "Too New"
                : "Underperforming";
            const tagColor = isInsuranceLinked
              ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30";
            return (
              <motion.div
                key={fund.scheme}
                whileHover={{ y: -2 }}
                className="rounded-xl border border-rose-500/20 bg-slate-900/60 p-4 space-y-2 shadow-md hover:border-rose-500/40 transition-colors"
              >
                <p className="text-sm font-bold text-slate-100 leading-tight">
                  {fund.scheme}
                </p>
                <p className="text-xs text-slate-500">{fund.category}</p>
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-extrabold text-lg">
                    {fund.avgCagr.toFixed(2)}%
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tagColor}`}
                  >
                    {tag}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {isInsuranceLinked
                    ? "Insurance-linked plan — consider pure equity alternatives."
                    : isTooNew
                      ? "Fund is relatively new — monitor closely."
                      : "CAGR below 8% threshold — review allocation."}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Exited & Zero-Value Schemes — Historical Theme Review */}
      {zeroValueFunds && zeroValueFunds.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Archive size={14} className="text-amber-400" />
            Exited & Zero-Value Schemes — Historical Theme Review
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zeroValueFunds.map((fund) => {
              const isThematic =
                fund.category.toLowerCase().includes("thematic") ||
                fund.category.toLowerCase().includes("sector");
              const themeTag = isThematic
                ? "Thematic / Sectoral"
                : "Fully Redeemed";
              const tagColor = isThematic
                ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30";

              return (
                <motion.div
                  key={fund.scheme}
                  whileHover={{ y: -2 }}
                  className="rounded-xl border border-amber-500/20 bg-slate-900/60 p-4 space-y-2 shadow-md hover:border-amber-500/40 transition-colors"
                >
                  <p className="text-sm font-bold text-slate-100 leading-tight">
                    {fund.scheme}
                  </p>
                  <p className="text-xs text-slate-500">{fund.category}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-extrabold text-sm">
                      {formatCurrency(0)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tagColor}`}
                    >
                      {themeTag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isThematic
                      ? "Thematic / sectoral scheme with zero current balance."
                      : "Scheme fully redeemed / zero current holding value."}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 12-Month Action Calendar */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          12-Month Action Calendar
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {actionMonths.map((month, i) => {
            const isQ = (i + 1) % 3 === 0;
            const isReview = i === 5 || i === 11;
            return (
              <div
                key={month}
                className={`rounded-xl border p-3 text-center space-y-1 transition-all ${
                  isReview
                    ? "border-teal-500/30 bg-teal-500/10"
                    : isQ
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-slate-800/60 bg-slate-900/55 hover:border-slate-700 transition-colors"
                }`}
              >
                <p className="text-xs font-bold text-slate-300">{month}</p>
                <p className="text-xs text-slate-500">
                  {isReview ? "📊 Review" : isQ ? "⚡ Step-Up" : "✅ SIP"}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          📊 = Semi-annual portfolio review · ⚡ = Quarterly SIP step-up check ·
          ✅ = Regular SIP debit
        </p>
      </div>
    </div>
  );
}
