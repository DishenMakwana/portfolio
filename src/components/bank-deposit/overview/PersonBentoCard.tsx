"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, Pencil, Plus } from "lucide-react";
import type { PersonBentoCardProps } from "@/types/bankDeposit";
import {
  formatDepositInr,
  getMonthlyStatusBadgeStyles,
  getAnnualStatusBadgeStyles,
} from "@/helpers/bankDeposit";

export default function PersonBentoCard({
  person,
  onDepositToAccount,
  onEditAnnualTarget,
  isAllMonths = false,
}: PersonBentoCardProps) {
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);

  const initials = person.personName.slice(0, 2).toUpperCase();
  const isExceeded = isAllMonths
    ? person.annualRemainingLimit < 0
    : person.totalMonthRemaining < 0;
  const utilizationPct = isAllMonths
    ? person.annualUtilizationPct
    : person.monthUtilizationPct;
  const progressPct = Math.min(Math.max(utilizationPct, 0), 100);
  const depositedAmount = isAllMonths
    ? person.annualTotalDeposited
    : person.totalMonthDeposited;
  const limitAmount = isAllMonths
    ? person.annualTargetLimit
    : person.totalMonthlyLimit;
  const remainingAmount = isAllMonths
    ? person.annualRemainingLimit
    : person.totalMonthRemaining;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-5 shadow-sm transition flex flex-col justify-between relative overflow-hidden group">
      {/* Glow highlight */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none transition ${
          isExceeded
            ? "bg-rose-500/5 group-hover:bg-rose-500/10"
            : "bg-teal-500/5 group-hover:bg-teal-500/10"
        }`}
      />

      <div>
        {/* Top Row: Avatar, Name, Badges & Edit Pencil */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-200 font-bold flex items-center justify-center text-xs shrink-0 shadow-inner">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-100 truncate hover:text-teal-300 transition">
                {person.personName}
              </h3>
              <p className="text-[11px] text-slate-400">
                {person.accounts.length}{" "}
                {person.accounts.length === 1
                  ? "bank account"
                  : "bank accounts"}
              </p>
            </div>
          </div>

          {onEditAnnualTarget && (
            <button
              type="button"
              onClick={() =>
                onEditAnnualTarget({
                  personId: person.personId,
                  personName: person.personName,
                  annualTargetLimit: person.annualTargetLimit,
                })
              }
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800/80 transition cursor-pointer"
              title="Edit Yearly Target Limit"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>

        {/* Status Badges Row */}
        {(() => {
          const aStyle = getAnnualStatusBadgeStyles(
            person.annualStatus,
            person.annualUtilizationPct
          );
          if (isAllMonths) {
            return (
              <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${aStyle.badgeClass}`}
                >
                  {aStyle.label}
                </span>
              </div>
            );
          }
          const mStyle = getMonthlyStatusBadgeStyles(person.overallStatus);
          return (
            <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${mStyle.badgeClass}`}
              >
                {mStyle.label}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${aStyle.badgeClass}`}
              >
                {aStyle.label}
              </span>
            </div>
          );
        })()}

        {/* Hero Utilization Card */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 mb-3.5">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isAllMonths ? "FY Total Deposited" : "Month Deposited"}
            </span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                isExceeded
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-teal-500/10 text-teal-400 border-teal-500/20"
              }`}
            >
              {utilizationPct.toFixed(0)}% used
            </span>
          </div>

          <div
            className={`text-2xl font-black tracking-tight ${
              isExceeded ? "text-rose-400" : "text-white"
            }`}
          >
            {formatDepositInr(depositedAmount)}
          </div>

          {/* Limit Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full mt-2 overflow-hidden ring-1 ring-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isExceeded
                  ? "bg-rose-500"
                  : utilizationPct >= 80
                    ? "bg-amber-400"
                    : "bg-teal-400"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {isAllMonths ? "Target: " : "Limit: "}
              {formatDepositInr(limitAmount)}
            </span>
            <span
              className={`font-bold ${
                isExceeded ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {isExceeded ? "Over: " : "Rem: "}
              {formatDepositInr(Math.abs(remainingAmount))}
            </span>
          </div>
        </div>

        {/* Yearly Target vs FY Deposited Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3.5">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
              Yearly Target
            </span>
            <div className="font-extrabold text-slate-200">
              {formatDepositInr(person.annualTargetLimit)}
            </div>
            <span className="text-[10px] text-slate-400">Fixed target</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
              {isAllMonths ? "Yearly Status" : "FY Total Deposited"}
            </span>
            <div
              className={`font-extrabold ${
                isAllMonths
                  ? isExceeded
                    ? "text-rose-400"
                    : "text-emerald-400"
                  : "text-teal-300"
              }`}
            >
              {isAllMonths
                ? isExceeded
                  ? `Over ${formatDepositInr(Math.abs(person.annualRemainingLimit))}`
                  : `Rem ${formatDepositInr(person.annualRemainingLimit)}`
                : formatDepositInr(person.annualTotalDeposited)}
            </div>
            <span
              className={`text-[10px] font-semibold ${
                person.annualRemainingLimit < 0
                  ? "text-rose-400"
                  : "text-emerald-400"
              }`}
            >
              {isAllMonths
                ? isExceeded
                  ? "Exceeded target"
                  : "Within target"
                : person.annualRemainingLimit < 0
                  ? "Over " +
                    formatDepositInr(Math.abs(person.annualRemainingLimit))
                  : "Rem " + formatDepositInr(person.annualRemainingLimit)}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Bank Accounts Accordion Drawer */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          type="button"
          onClick={() => setIsAccountsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-teal-300 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Building2 size={13} className="text-teal-400" />
            <span>Bank Accounts ({person.accounts.length})</span>
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              isAccountsOpen ? "rotate-180 text-teal-400" : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isAccountsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-3 space-y-2"
            >
              {person.accounts.map((acc) => {
                const isAccExceeded = acc.remainingLimit < 0;
                return (
                  <div
                    key={acc.accountId}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">
                        {acc.bankName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {acc.accountIdentifier}
                        {acc.accountNumber ? ` • ${acc.accountNumber}` : ""}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        {formatDepositInr(acc.depositedAmount)}{" "}
                        {!isAllMonths && acc.monthlyLimit > 0 && (
                          <span className="text-slate-500">
                            / {formatDepositInr(acc.monthlyLimit)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!isAllMonths && acc.monthlyLimit > 0 && (
                        <span
                          className={`text-[10px] font-bold ${
                            isAccExceeded ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {isAccExceeded ? "-" : "+"}
                          {formatDepositInr(Math.abs(acc.remainingLimit))}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onDepositToAccount(acc.accountId, person.personId)
                        }
                        className="px-2 py-0.5 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Add deposit"
                      >
                        <Plus size={10} />
                        <span>Deposit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
