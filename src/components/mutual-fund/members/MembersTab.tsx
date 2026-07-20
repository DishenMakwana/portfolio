"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  User,
  ExternalLink,
} from "lucide-react";
import DeltaBadge from "@/components/shared/DeltaBadge";
import {
  formatCurrency,
  formatPercent,
  formatHoldingYearsAndDays,
} from "@/helpers/formatters";
import type { MembersTabProps } from "@/types/members";

export default function MembersTab({
  memberSummaries,
  totals,
  metricDeltas,
  holdings,
  selectedReport,
}: MembersTabProps) {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [expandedMembers, setExpandedMembers] = useState<
    Record<string, boolean>
  >({});

  const toggleDemat = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMembers((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

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
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-full bg-teal-400 inline-block" />
              Grand Portfolio Summary
              {metricDeltas.previousDate && (
                <span className="normal-case tracking-normal font-semibold text-slate-600">
                  vs previous snapshot
                </span>
              )}
            </div>
            {selectedReport?.casId && (
              <span className="text-[10px] text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded font-mono font-bold border border-teal-500/25 tracking-normal normal-case">
                CAS ID: {selectedReport.casId}
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
                {formatHoldingYearsAndDays(avgHoldingDays)}
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
          <div
            key={member.name}
            className="block bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition-all duration-300 text-left relative overflow-hidden"
          >
            {member.dpId && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-500/5 to-transparent pointer-events-none" />
            )}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
              <div>
                <h4 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                  {member.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {member.pan && (
                    <span className="bg-slate-850 text-slate-400 text-xs px-2 py-0.5 rounded font-mono">
                      PAN: {member.pan}
                    </span>
                  )}
                  <Link
                    href={
                      reportId
                        ? {
                            pathname: "/holdings",
                            query: { member: member.name, reportId },
                          }
                        : {
                            pathname: "/holdings",
                            query: { member: member.name },
                          }
                    }
                    className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
                  >
                    View Holdings <ExternalLink size={12} />
                  </Link>
                </div>
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

            {/* ── COLLAPSIBLE DEMAT DETAILS SECTION ── */}
            {member.dpId && (
              <>
                <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleDemat(member.name, e)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer select-none"
                  >
                    {expandedMembers[member.name] ? (
                      <>
                        Hide Demat Details{" "}
                        <ChevronUp size={14} className="text-teal-400" />
                      </>
                    ) : (
                      <>
                        Show Demat Details{" "}
                        <ChevronDown size={14} className="text-teal-400" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1 text-[10px] text-teal-300 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={12} className="text-teal-400" /> CDSL
                    DEMAT • {member.accountStatus}
                  </div>
                </div>

                {expandedMembers[member.name] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-4 text-xs overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Specs */}
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Account Specs
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-slate-300">
                          <span className="text-slate-500">Broker:</span>
                          <span className="font-semibold">{member.dpName}</span>
                          <span className="text-slate-500">DP ID:</span>
                          <span className="font-mono">{member.dpId}</span>
                          <span className="text-slate-500">Client ID:</span>
                          <span className="font-mono">{member.clientId}</span>
                          <span className="text-slate-500">BO Status:</span>
                          <span>{member.boStatus}</span>
                          <span className="text-slate-500">Sub-Status:</span>
                          <span>{member.boSubStatus}</span>
                          <span className="text-slate-500">BSDA:</span>
                          <span className="font-bold text-teal-400">
                            {member.bsda}
                          </span>
                          <span className="text-slate-500">RGESS:</span>
                          <span>{member.rgess}</span>
                        </div>
                      </div>

                      {/* Contacts & Nominee */}
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Nomination & Contacts
                        </div>
                        <div className="space-y-2 text-slate-300">
                          <div className="flex items-center gap-2">
                            <User
                              size={13}
                              className="text-teal-400 shrink-0"
                            />
                            <span className="text-slate-500 min-w-16">
                              Nominee:
                            </span>
                            <span className="font-semibold text-slate-200">
                              {member.dematNominee}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail
                              size={13}
                              className="text-teal-400 shrink-0"
                            />
                            <span className="text-slate-500 min-w-16">
                              Email:
                            </span>
                            <span className="font-mono text-slate-200">
                              {member.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone
                              size={13}
                              className="text-teal-400 shrink-0"
                            />
                            <span className="text-slate-500 min-w-16">
                              Mobile:
                            </span>
                            <span className="font-mono text-slate-200">
                              {member.mobile}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck
                              size={13}
                              className="text-teal-400 shrink-0"
                            />
                            <span className="text-slate-500 min-w-16">
                              Status:
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              {member.accountStatus} (Frozen:{" "}
                              {member.frozenStatus})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    {member.address && (
                      <div className="pt-3 border-t border-slate-900 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                          <MapPin size={10} className="text-teal-400" />{" "}
                          Correspondence Address
                        </div>
                        <p className="text-slate-400 leading-relaxed text-[11px] font-medium bg-slate-900/20 p-2.5 rounded border border-slate-900/50">
                          {member.address}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
