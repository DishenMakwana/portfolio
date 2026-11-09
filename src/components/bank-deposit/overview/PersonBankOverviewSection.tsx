"use client";

import { AlertCircle, Users, Calendar, Sliders, Copy } from "lucide-react";
import type { PersonBankOverviewSectionProps } from "@/types/bankDeposit";
import CustomDropdown from "@/components/shared/CustomDropdown";
import PersonBentoCard from "./PersonBentoCard";
import PersonLedgerTable from "./PersonLedgerTable";

export default function PersonBankOverviewSection({
  persons,
  financialYear,
  onFinancialYearChange,
  availableFinancialYears,
  monthLabel,
  viewMode,
  onDepositToAccount,
  onEditAnnualTarget,
  onOpenManageLimits,
  onOpenCloneLimits,
}: PersonBankOverviewSectionProps) {
  if (persons.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 mb-8">
        <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm font-semibold">No person records found.</p>
        <p className="text-xs text-slate-600 mt-1">
          Adjust search or filter criteria in the toolbar.
        </p>
      </div>
    );
  }

  const isAllMonths = monthLabel === "All Months";

  return (
    <div className="relative z-10 space-y-4 mb-8">
      {/* Switchable View: Cards vs Ledger */}
      {viewMode === "cards" ? (
        <>
          {/* Section Header for Cards View */}
          <div className="flex flex-wrap items-center justify-between gap-3">
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

            <div className="flex flex-wrap items-center gap-2.5">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {persons.map((person) => (
              <PersonBentoCard
                key={person.personId}
                person={person}
                onDepositToAccount={onDepositToAccount}
                onEditAnnualTarget={onEditAnnualTarget}
                isAllMonths={isAllMonths}
              />
            ))}
          </div>
        </>
      ) : (
        <PersonLedgerTable
          persons={persons}
          financialYear={financialYear}
          onFinancialYearChange={onFinancialYearChange}
          availableFinancialYears={availableFinancialYears}
          monthLabel={monthLabel}
          onDepositToAccount={onDepositToAccount}
          onEditAnnualTarget={onEditAnnualTarget}
          onOpenManageLimits={onOpenManageLimits}
          onOpenCloneLimits={onOpenCloneLimits}
          isAllMonths={isAllMonths}
        />
      )}
    </div>
  );
}
