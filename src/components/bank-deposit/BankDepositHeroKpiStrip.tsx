"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  CalendarCheck,
  CreditCard,
  PieChart,
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { BankDepositHeroKpiStripProps } from "@/types/bankDeposit";
import { formatDepositInr } from "@/helpers/bankDeposit";

export default function BankDepositHeroKpiStrip({
  kpis,
  financialYear,
  monthLabel,
}: BankDepositHeroKpiStripProps) {
  const isAllMonths = monthLabel === "All Months";
  const annualTarget = kpis.totalFyAnnualTarget;
  const annualDeposited = kpis.totalFyDeposited;
  const annualRemaining = kpis.fyRemainingLimit;
  const annualProgressPct =
    annualTarget > 0
      ? Math.min((annualDeposited / annualTarget) * 100, 100)
      : 0;

  const monthProgressPct = isAllMonths
    ? annualProgressPct
    : kpis.monthTotalLimit > 0
      ? Math.min((kpis.monthDeposited / kpis.monthTotalLimit) * 100, 100)
      : 0;

  const isMonthExceeded = isAllMonths
    ? annualRemaining < 0
    : kpis.monthRemainingLimit < 0;
  const monthShortName = monthLabel.split(" ")[0] || "Month";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-6">
      {/* 1. Total FY Deposits - Active Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="h-[168px] flex flex-col justify-between bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-teal-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-teal-500/10 blur-2xl pointer-events-none group-hover:bg-teal-500/20 transition-all duration-500" />

        {/* Top Header */}
        <div className="min-h-[38px] flex items-start justify-between text-slate-400 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400/90 leading-tight">
            FY {financialYear}
            <br />
            Deposits
          </span>
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-inner shrink-0">
            <Wallet size={15} />
          </div>
        </div>

        {/* Middle Value */}
        <div className="text-2xl font-extrabold tracking-tight text-white relative z-10">
          {formatDepositInr(annualDeposited)}
        </div>

        {/* Bottom Footer */}
        <div className="h-[38px] flex flex-col justify-end relative z-10">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Target: {formatDepositInr(annualTarget)}</span>
            <span
              className={`font-semibold ${
                annualRemaining >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {annualRemaining >= 0 ? "Rem: " : "Over: "}
              {formatDepositInr(Math.abs(annualRemaining))}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Month's Deposits - Active Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.04 }}
        className="h-[168px] flex flex-col justify-between bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />

        {/* Top Header */}
        <div className="min-h-[38px] flex items-start justify-between text-slate-400 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 leading-tight">
            Deposited
            <br />
            {isAllMonths ? "(All Months)" : `(${monthShortName})`}
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <CalendarCheck size={15} />
          </div>
        </div>

        {/* Middle Value */}
        <div className="text-2xl font-extrabold tracking-tight text-white relative z-10">
          {formatDepositInr(
            isAllMonths ? annualDeposited : kpis.monthDeposited
          )}
        </div>

        {/* Bottom Footer with Progress Bar */}
        <div className="h-[38px] flex flex-col justify-end relative z-10">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{kpis.totalTransactionsCount} total records</span>
            <span
              className={`font-bold ${
                isMonthExceeded ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {monthProgressPct.toFixed(0)}% used
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full mt-2 overflow-hidden ring-1 ring-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isMonthExceeded
                  ? "bg-rose-500"
                  : "bg-gradient-to-r from-emerald-500 to-teal-400"
              }`}
              style={{ width: `${monthProgressPct}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* 3. Monthly Total Limit / Yearly Target - Clean presentation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        className="h-[168px] flex flex-col justify-between bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500" />

        {/* Top Header */}
        <div className="min-h-[38px] flex items-start justify-between text-slate-400 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400/90 leading-tight">
            {isAllMonths ? "Yearly" : "Monthly"}
            <br />
            {isAllMonths ? "Target" : "Limit"}
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <CreditCard size={15} />
          </div>
        </div>

        {/* Middle Value */}
        <div className="text-2xl font-extrabold tracking-tight text-white relative z-10">
          {formatDepositInr(isAllMonths ? annualTarget : kpis.monthTotalLimit)}
        </div>

        {/* Bottom Footer */}
        <div className="h-[38px] flex flex-col justify-end relative z-10 pb-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-indigo-400 shrink-0" />
            <span>
              {isAllMonths
                ? "Combined yearly targets"
                : "Active accounts combined"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 4. Month Remaining / Yearly Remaining */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12 }}
        className={`h-[168px] flex flex-col justify-between bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 ${
          isMonthExceeded
            ? "border-rose-500/40 hover:border-rose-500/60"
            : "border-slate-800/80 hover:border-amber-500/30"
        }`}
      >
        <div
          className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
            isMonthExceeded ? "bg-rose-500/15" : "bg-amber-500/10"
          }`}
        />

        {/* Top Header */}
        <div className="min-h-[38px] flex items-start justify-between text-slate-400 relative z-10">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider leading-tight ${
              isMonthExceeded ? "text-rose-400" : "text-amber-400/90"
            }`}
          >
            {isAllMonths ? "Yearly" : "Month"}
            <br />
            Remaining
          </span>
          <div
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-inner shrink-0 ${
              isMonthExceeded
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            <PieChart size={15} />
          </div>
        </div>

        {/* Middle Value */}
        <div
          className={`text-2xl font-extrabold tracking-tight relative z-10 ${
            isMonthExceeded ? "text-rose-400" : "text-white"
          }`}
        >
          {formatDepositInr(
            Math.abs(isAllMonths ? annualRemaining : kpis.monthRemainingLimit)
          )}
        </div>

        {/* Bottom Footer */}
        <div className="h-[38px] flex flex-col justify-end relative z-10 pb-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            {isMonthExceeded ? (
              <>
                <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                <span className="text-rose-400/90 font-medium">
                  {isAllMonths ? "Yearly target exceeded" : "Limit exceeded"}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span>
                  {isAllMonths
                    ? "Available annual target"
                    : "Available to deposit"}
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* 5. Tracked Persons - Static bar removed */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.16 }}
        className="h-[168px] flex flex-col justify-between bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-500/10 blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

        {/* Top Header */}
        <div className="min-h-[38px] flex items-start justify-between text-slate-400 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400/90 leading-tight">
            Tracked
            <br />
            Persons
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner shrink-0">
            <Users size={15} />
          </div>
        </div>

        {/* Middle Value */}
        <div className="text-2xl font-extrabold tracking-tight text-white relative z-10">
          {kpis.totalPersonsCount}
        </div>

        {/* Bottom Footer - Clean text without static bar */}
        <div className="h-[38px] flex flex-col justify-end relative z-10 pb-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Active family & entities</span>
          </div>
        </div>
      </motion.div>

      {/* 6. Active Bank Accounts - Static bar removed */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="h-[168px] flex flex-col justify-between bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-sky-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-sky-500/10 blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500" />

        {/* Top Header */}
        <div className="min-h-[38px] flex items-start justify-between text-slate-400 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400/90 leading-tight">
            Bank
            <br />
            Accounts
          </span>
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-inner shrink-0">
            <Building2 size={15} />
          </div>
        </div>

        {/* Middle Value */}
        <div className="text-2xl font-extrabold tracking-tight text-white relative z-10">
          {kpis.totalAccountsCount}
        </div>

        {/* Bottom Footer - Clean text without static bar */}
        <div className="h-[38px] flex flex-col justify-end relative z-10 pb-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Distinct bank accounts</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
