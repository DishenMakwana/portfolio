"use client";

import { useState } from "react";
import { Users, Calendar, Sliders, Copy } from "lucide-react";
import type { PersonLedgerTableProps } from "@/types/bankDeposit";
import { formatDepositInr } from "@/helpers/bankDeposit";
import CustomDropdown from "@/components/shared/CustomDropdown";
import PersonLedgerTableRow from "./PersonLedgerTableRow";

export default function PersonLedgerTable({
  persons,
  financialYear,
  onFinancialYearChange,
  availableFinancialYears,
  monthLabel,
  onDepositToAccount,
  onEditAnnualTarget,
  onOpenManageLimits,
  onOpenCloneLimits,
  isAllMonths = false,
}: PersonLedgerTableProps) {
  const [expandedPersonIds, setExpandedPersonIds] = useState<Set<number>>(
    new Set()
  );

  const togglePerson = (id: number) => {
    setExpandedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPersonIds(new Set(persons.map((p) => p.personId)));
  };

  const collapseAll = () => {
    setExpandedPersonIds(new Set());
  };

  // Compute table totals
  const totalAccounts = persons.reduce((sum, p) => sum + p.accounts.length, 0);
  const totalMonthDeposited = persons.reduce(
    (sum, p) => sum + p.totalMonthDeposited,
    0
  );
  const totalMonthlyLimit = persons.reduce(
    (sum, p) => sum + p.totalMonthlyLimit,
    0
  );
  const totalMonthRemaining = totalMonthlyLimit - totalMonthDeposited;
  const totalAnnualTarget = persons.reduce(
    (sum, p) => sum + p.annualTargetLimit,
    0
  );
  const totalAnnualDeposited = persons.reduce(
    (sum, p) => sum + p.annualTotalDeposited,
    0
  );
  const totalAnnualRemaining = totalAnnualTarget - totalAnnualDeposited;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Table Header Strip matching Deposit Transaction Ledger */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Users size={18} className="text-teal-400" />
            <span>Person & Bank Account Overview</span>
            <span className="text-xs font-normal text-slate-400">
              ({monthLabel})
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Account-level monthly deposit limits, utilization tracking, and
            remaining balance.
          </p>
        </div>

        {/* Right: Expand/Collapse All + Limits Actions + Financial Year Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs mr-1">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-medium text-slate-400 hover:text-teal-300 transition cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-medium text-slate-400 hover:text-teal-300 transition cursor-pointer"
            >
              Collapse All
            </button>
          </div>

          {/* Manage Limits Button */}
          {onOpenManageLimits && (
            <button
              type="button"
              onClick={onOpenManageLimits}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
              title="Configure Monthly & Yearly Limits"
            >
              <Sliders size={13} className="text-slate-400" />
              <span>Manage Limits</span>
            </button>
          )}

          {/* Rollover FY Button */}
          {onOpenCloneLimits && (
            <button
              type="button"
              onClick={onOpenCloneLimits}
              title="Copy all limits from this FY to a new FY"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-extrabold text-purple-300 transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Copy size={13} className="text-purple-400" />
              <span>Rollover FY</span>
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Calendar size={14} className="text-teal-400" />
              Financial Year:
            </span>
            <CustomDropdown<string>
              value={financialYear}
              onChange={onFinancialYearChange}
              options={availableFinancialYears.map((fy) => ({
                value: fy,
                label: `FY ${fy}`,
              }))}
              buttonClassName="font-bold text-teal-300 bg-slate-950 border-slate-800 hover:border-teal-500/40 text-xs py-1.5 px-3"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-2 w-8 text-center" />
              <th className="py-2.5 px-3 font-semibold">Person</th>
              <th className="py-2.5 px-2.5 font-semibold text-center">
                Accounts
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">
                {isAllMonths ? "FY Deposited" : "Month Deposited"}
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">
                {isAllMonths ? "Monthly Limit" : "Monthly Limit"}
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">
                {isAllMonths ? "FY Remaining" : "Remaining"}
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">
                Yearly Target
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">FY Total</th>
              <th className="py-2.5 px-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {persons.map((person) => (
              <PersonLedgerTableRow
                key={person.personId}
                person={person}
                isExpanded={expandedPersonIds.has(person.personId)}
                onToggleExpand={() => togglePerson(person.personId)}
                onDepositToAccount={onDepositToAccount}
                onEditAnnualTarget={onEditAnnualTarget}
                isAllMonths={isAllMonths}
              />
            ))}
          </tbody>
          {/* Totals Row */}
          <tfoot>
            <tr className="bg-slate-950/90 border-t-2 border-slate-800 text-xs font-bold text-slate-200">
              <td className="py-3 px-2 text-center" />
              <td className="py-3 px-3">
                Total ({persons.length}{" "}
                {persons.length === 1 ? "Person" : "Persons"})
              </td>
              <td className="py-3 px-2.5 text-center text-slate-400">
                {totalAccounts} accts
              </td>
              <td className="py-3 px-3 text-right text-slate-100">
                {formatDepositInr(
                  isAllMonths ? totalAnnualDeposited : totalMonthDeposited
                )}
              </td>
              <td className="py-3 px-3 text-right text-slate-400">
                {isAllMonths ? "—" : formatDepositInr(totalMonthlyLimit)}
              </td>
              <td
                className={`py-3 px-3 text-right ${
                  isAllMonths
                    ? totalAnnualRemaining < 0
                      ? "text-rose-400"
                      : "text-emerald-400"
                    : totalMonthRemaining < 0
                      ? "text-rose-400"
                      : "text-emerald-400"
                }`}
              >
                {isAllMonths
                  ? `${totalAnnualRemaining < 0 ? "-" : "+"}${formatDepositInr(
                      Math.abs(totalAnnualRemaining)
                    )}`
                  : `${totalMonthRemaining < 0 ? "-" : "+"}${formatDepositInr(
                      Math.abs(totalMonthRemaining)
                    )}`}
              </td>
              <td className="py-3 px-3 text-right text-slate-300">
                {formatDepositInr(totalAnnualTarget)}
              </td>
              <td className="py-3 px-3 text-right text-teal-300">
                {formatDepositInr(totalAnnualDeposited)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
