"use client";

import {
  Building2,
  Plus,
  X,
  Wallet,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import type { PersonInspectPanelProps } from "@/types/bankDeposit";
import {
  formatDepositInr,
  getMonthlyStatusBadgeStyles,
  getAnnualStatusBadgeStyles,
} from "@/helpers/bankDeposit";

export default function PersonInspectPanel({
  person,
  onClose,
  onDepositToAccount,
  isAllMonths = false,
}: PersonInspectPanelProps) {
  const isExceeded = isAllMonths
    ? person.annualRemainingLimit < 0
    : person.totalMonthRemaining < 0;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {(() => {
            const aStyle = getAnnualStatusBadgeStyles(
              person.annualStatus,
              person.annualUtilizationPct
            );
            if (isAllMonths) {
              return (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-300">
                    Account Breakdown
                  </span>
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
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-300">
                  Account Breakdown
                </span>
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
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{person.personName}</span>
            <span className="text-xs font-normal text-slate-400">
              ({person.accounts.length}{" "}
              {person.accounts.length === 1 ? "bank account" : "bank accounts"})
            </span>
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition cursor-pointer"
          aria-label="Close inspector"
        >
          <X size={14} />
        </button>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {person.accounts.map((acc) => {
          const isAccExceeded = acc.remainingLimit < 0;
          const pct = Math.min(Math.max(acc.utilizationPct, 0), 100);

          return (
            <div
              key={acc.accountId}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                      <Building2 size={13} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-100 truncate">
                        {acc.bankName}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {acc.accountIdentifier}
                        {acc.accountNumber ? ` • ${acc.accountNumber}` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onDepositToAccount(acc.accountId, person.personId)
                    }
                    className="px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                    title="Add deposit for this account"
                  >
                    <Plus size={11} />
                    <span>Deposit</span>
                  </button>
                </div>

                {/* Numbers */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Deposited
                    </span>
                    <span className="font-extrabold text-slate-100">
                      {formatDepositInr(acc.depositedAmount)}{" "}
                      {!isAllMonths && acc.monthlyLimit > 0 && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          / {formatDepositInr(acc.monthlyLimit)}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Progress Bar (Only shown for specific month) */}
                  {!isAllMonths && acc.monthlyLimit > 0 && (
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden ring-1 ring-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAccExceeded
                            ? "bg-rose-500"
                            : acc.utilizationPct >= 80
                              ? "bg-amber-400"
                              : "bg-teal-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Account Remaining Tag (Only shown for specific month) */}
              {!isAllMonths && acc.monthlyLimit > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    {isAccExceeded ? (
                      <ShieldAlert size={11} className="text-rose-400" />
                    ) : (
                      <CheckCircle2 size={11} className="text-emerald-400" />
                    )}
                    <span>
                      {isAccExceeded ? "Exceeded limit" : "Available balance"}
                    </span>
                  </span>
                  <span
                    className={`font-bold ${
                      isAccExceeded ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {isAccExceeded ? "-" : "+"}
                    {formatDepositInr(Math.abs(acc.remainingLimit))}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Wallet size={13} className="text-teal-400" />
          <span className="text-slate-400">
            {isAllMonths ? "FY Deposited:" : "Total Month:"}
          </span>
          <span className="font-extrabold text-slate-100">
            {formatDepositInr(
              isAllMonths
                ? person.annualTotalDeposited
                : person.totalMonthDeposited
            )}
          </span>
          {!isAllMonths && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">
                {formatDepositInr(person.totalMonthlyLimit)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400">
              {isAllMonths ? "FY Remaining: " : "Month Rem: "}
            </span>
            <span
              className={`font-bold ${
                isExceeded ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {isExceeded ? "-" : "+"}
              {formatDepositInr(
                Math.abs(
                  isAllMonths
                    ? person.annualRemainingLimit
                    : person.totalMonthRemaining
                )
              )}
            </span>
          </div>

          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-400">Yearly Target: </span>
            <span className="font-bold text-slate-200">
              {formatDepositInr(person.annualTargetLimit)}
            </span>
          </div>

          {!isAllMonths && (
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400">FY Deposited: </span>
              <span className="font-bold text-teal-300">
                {formatDepositInr(person.annualTotalDeposited)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
