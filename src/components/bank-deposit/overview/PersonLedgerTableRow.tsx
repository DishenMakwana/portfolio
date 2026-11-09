"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Pencil } from "lucide-react";
import type { PersonLedgerTableRowProps } from "@/types/bankDeposit";
import {
  formatDepositInr,
  getMonthlyStatusBadgeStyles,
  getAnnualStatusBadgeStyles,
} from "@/helpers/bankDeposit";
import PersonInspectPanel from "./PersonInspectPanel";

export default function PersonLedgerTableRow({
  person,
  isExpanded,
  onToggleExpand,
  onDepositToAccount,
  onEditAnnualTarget,
  isAllMonths = false,
}: PersonLedgerTableRowProps) {
  const isExceeded = isAllMonths
    ? person.annualRemainingLimit < 0
    : person.totalMonthRemaining < 0;
  const initials = person.personName.slice(0, 2).toUpperCase();

  return (
    <Fragment>
      <tr
        onClick={onToggleExpand}
        className={`transition-colors cursor-pointer text-xs ${
          isExpanded
            ? "bg-teal-500/10 border-l-4 border-l-teal-400"
            : "hover:bg-slate-800/50"
        }`}
      >
        {/* 1. Expand Chevron Indicator */}
        <td className="py-3 px-2 text-center text-slate-500">
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 inline-block ${
              isExpanded ? "rotate-180 text-teal-400" : ""
            }`}
          />
        </td>

        {/* 2. Person Name */}
        <td className="py-3 px-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/80 text-slate-200 font-bold flex items-center justify-center text-xs shrink-0 shadow-inner">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-100 text-xs hover:text-teal-300 transition block truncate">
                {person.personName}
              </span>
              {person.notes && (
                <span className="text-[10px] text-slate-500 block truncate">
                  {person.notes}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* 3. Accounts Count */}
        <td className="py-3 px-2.5 text-center">
          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/70 text-slate-300 font-medium text-[11px] whitespace-nowrap">
            {person.accounts.length}{" "}
            {person.accounts.length === 1 ? "account" : "accounts"}
          </span>
        </td>

        {/* 4. Month Deposited / FY Deposited */}
        <td className="py-3 px-3 text-right font-extrabold text-slate-100">
          {formatDepositInr(
            isAllMonths
              ? person.annualTotalDeposited
              : person.totalMonthDeposited
          )}
        </td>

        {/* 5. Monthly Limit */}
        <td className="py-3 px-3 text-right text-slate-400 font-medium">
          {isAllMonths ? "—" : formatDepositInr(person.totalMonthlyLimit)}
        </td>

        {/* 6. Remaining Balance */}
        <td
          className={`py-3 px-3 text-right font-bold ${
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
        </td>

        {/* 7. Yearly Target + Edit Pencil */}
        <td className="py-3 px-3 text-right">
          <div className="inline-flex items-center gap-1.5 justify-end">
            <span className="text-slate-300 font-semibold">
              {formatDepositInr(person.annualTargetLimit)}
            </span>
            {onEditAnnualTarget && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditAnnualTarget({
                    personId: person.personId,
                    personName: person.personName,
                    annualTargetLimit: person.annualTargetLimit,
                  });
                }}
                className="p-1 rounded-md text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition cursor-pointer"
                title={`Edit Yearly Target for ${person.personName}`}
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
        </td>

        {/* 8. FY Total Deposited */}
        <td className="py-3 px-3 text-right font-extrabold text-teal-300">
          {formatDepositInr(person.annualTotalDeposited)}
        </td>

        {/* 9. Status Badges */}
        <td className="py-3 px-3">
          {(() => {
            const aStyle = getAnnualStatusBadgeStyles(
              person.annualStatus,
              person.annualUtilizationPct
            );
            if (isAllMonths) {
              return (
                <div className="flex flex-wrap items-center gap-1">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${aStyle.badgeClass}`}
                  >
                    {aStyle.label}
                  </span>
                </div>
              );
            }
            const mStyle = getMonthlyStatusBadgeStyles(person.overallStatus);
            return (
              <div className="flex flex-wrap items-center gap-1">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${mStyle.badgeClass}`}
                >
                  {mStyle.label}
                </span>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${aStyle.badgeClass}`}
                >
                  {aStyle.label}
                </span>
              </div>
            );
          })()}
        </td>
      </tr>

      {/* Expanded Row Under Table (Matches SIF Matrix Table Row) */}
      {isExpanded && (
        <tr className="bg-slate-950/60">
          <td colSpan={9} className="p-0">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
              className="overflow-hidden w-full"
            >
              <div className="p-5 sm:p-6 bg-slate-950/90 border-t border-b border-slate-800/80">
                <PersonInspectPanel
                  person={person}
                  onClose={onToggleExpand}
                  onDepositToAccount={onDepositToAccount}
                  isAllMonths={isAllMonths}
                />
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
