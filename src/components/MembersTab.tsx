"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface MemberSummary {
  name: string;
  pan: string | null;
  invested: number;
  currentValue: number;
  gain: number;
  cagr: number;
  xirr: number;
  alpha: number;
  cagrDelta: number | null;
  xirrDelta: number | null;
  alphaDelta: number | null;
}

interface Totals {
  invested: number;
  currentValue: number;
  gain: number;
  absoluteReturn: number;
  portfolioXirr: number;
  alpha: number;
  cagr?: number | null;
}

interface MembersTabProps {
  memberSummaries: MemberSummary[];
  totals: Totals;
  metricDeltas: {
    previousDate: string | null;
    portfolioXirr: number | null;
    benchmarkXirr: number | null;
    alpha: number | null;
    cagr: number | null;
  };
  holdings: any[];
}

function formatPointDelta(delta: number) {
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} pp`;
}

function DeltaBadge({
  delta,
  label = "vs prev",
}: {
  delta: number | null;
  label?: string;
}) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        No prior snapshot
      </span>
    );
  }

  const isUp = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
        isUp
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
    >
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {formatPointDelta(delta)} {label}
    </span>
  );
}

export default function MembersTab({
  memberSummaries,
  totals,
  metricDeltas,
  holdings,
}: MembersTabProps) {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const overallCagr =
    totals.cagr !== undefined && totals.cagr !== null
      ? totals.cagr
      : holdings.length > 0
        ? holdings.reduce(
            (acc, h) => acc + (h.cagr || 0) * (h.purchaseValue || 0),
            0
          ) / (totals.invested || 1)
        : 0;

  const avgHoldingDays =
    holdings.length > 0
      ? Math.round(
          holdings.reduce(
            (acc, h) => acc + (h.holdingDays || 0) * (h.purchaseValue || 0),
            0
          ) / (totals.invested || 1)
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* ── GRAND PORTFOLIO SUMMARY CARD ── */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-6 shadow-xl relative overflow-hidden hover:border-slate-700/80 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-full bg-teal-400 inline-block" />
            Grand Portfolio Summary
            {metricDeltas.previousDate && (
              <span className="normal-case tracking-normal font-semibold text-slate-600">
                vs previous snapshot
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-6 font-semibold">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Invested Value
              </div>
              <div className="text-xl font-black text-slate-100 mt-1.5">
                {formatCurrency(totals.invested)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Principal Cost
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Current Value
              </div>
              <div className="text-xl font-black text-slate-100 mt-1.5">
                {formatCurrency(totals.currentValue)}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">
                In Profit ↑
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Unrealised Gain
              </div>
              <div
                className={`text-xl font-black mt-1.5 ${totals.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {formatCurrency(totals.gain)}
              </div>
              <div
                className={`text-[10px] mt-1 font-bold ${totals.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {totals.absoluteReturn.toFixed(2)}% Absolute
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                XIRR
              </div>
              <div className="text-xl font-black text-teal-400 mt-1.5">
                {formatPercent(totals.portfolioXirr)}
              </div>
              <div className="mt-1.5">
                <DeltaBadge delta={metricDeltas.portfolioXirr} />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Annualised XIRR
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                CAGR
              </div>
              <div className="text-xl font-black text-teal-400 mt-1.5">
                {formatPercent(overallCagr)}
              </div>
              <div className="mt-1.5">
                <DeltaBadge delta={metricDeltas.cagr} />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {totals.cagr !== undefined && totals.cagr !== null
                  ? "Excel Reported CAGR"
                  : "Weighted CAGR"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Alpha
              </div>
              <div
                className={`text-xl font-black mt-1.5 ${totals.alpha >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {formatPercent(totals.alpha)}
              </div>
              <div className="mt-1.5">
                <DeltaBadge delta={metricDeltas.alpha} />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Vs Benchmark
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Holding Days
              </div>
              <div className="text-xl font-black text-slate-200 mt-1.5">
                {avgHoldingDays} Days
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Weighted Avg
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MEMBER GRID ── */}
      <motion.div
        key="members"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {memberSummaries.map((member) => (
          <Link
            key={member.name}
            href={
              reportId
                ? {
                    pathname: "/holdings",
                    query: { member: member.name, reportId },
                  }
                : { pathname: "/holdings", query: { member: member.name } }
            }
            className="block bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-6 shadow-lg hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300 cursor-pointer text-left"
          >
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
              <div>
                <h4 className="font-bold text-lg text-slate-100">
                  {member.name}
                </h4>
                {member.pan && (
                  <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded font-mono mt-1 inline-block">
                    PAN: {member.pan}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-400">XIRR</div>
                <div className="text-2xl font-black text-teal-400">
                  {formatPercent(member.xirr)}
                </div>
                <div className="mt-1">
                  <DeltaBadge delta={member.xirrDelta} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 font-semibold">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Invested
                </div>
                <div className="text-base font-bold text-slate-200 mt-1 truncate">
                  {formatCurrency(member.invested)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Current Value
                </div>
                <div className="text-base font-bold text-slate-200 mt-1 truncate">
                  {formatCurrency(member.currentValue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold text-slate-500">
                  Net Returns
                </div>
                <div
                  className={`text-base font-bold mt-1 truncate ${member.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatCurrency(member.gain)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold text-slate-500">
                  CAGR
                </div>
                <div className="text-base font-bold mt-1 text-teal-400 truncate">
                  {formatPercent(member.cagr)}
                </div>
                <div className="mt-1">
                  <DeltaBadge delta={member.cagrDelta} label="" />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold text-slate-500">
                  Alpha
                </div>
                <div
                  className={`text-base font-bold mt-1 truncate ${member.alpha >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatPercent(member.alpha)}
                </div>
                <div className="mt-1">
                  <DeltaBadge delta={member.alphaDelta} label="" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
