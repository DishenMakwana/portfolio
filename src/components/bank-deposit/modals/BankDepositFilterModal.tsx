"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, Check, X } from "lucide-react";
import type { BankDepositFilterModalProps } from "@/types/bankDeposit";

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: "ALL", label: "All Statuses" },
  { id: "AVAILABLE", label: "Within Limit" },
  { id: "NEAR_LIMIT", label: "Near Limit (≥80%)" },
  { id: "REACHED", label: "Limit Reached" },
  { id: "EXCEEDED", label: "Over Deposited" },
];

export default function BankDepositFilterModal({
  isOpen,
  onClose,
  filter,
  onFilterChange,
  onClearAll,
  allPersonsList,
  allBanksList,
  selectedMonth,
  onMonthChange,
  monthsMeta,
  totalFilteredCount,
}: BankDepositFilterModalProps) {
  const sortedBanks = useMemo(() => {
    return [...allBanksList].sort((a, b) =>
      a.bankName.localeCompare(b.bankName, undefined, { sensitivity: "base" })
    );
  }, [allBanksList]);

  const sortedPersons = useMemo(() => {
    return [...allPersonsList].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [allPersonsList]);

  if (!isOpen || typeof document === "undefined") return null;

  const currentPersonId = filter.personId || 0;
  const currentBankId = filter.bankId || 0;
  const currentStatus = filter.status || "ALL";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">
              Filter Bank Deposits
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs cursor-pointer"
            aria-label="Close filters"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5 text-xs">
          {/* 1. Financial Month (April to March or All Months) */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Financial Month
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {/* All Months / Full Year default option */}
              <button
                type="button"
                onClick={() => onMonthChange(null)}
                className={`col-span-2 sm:col-span-3 px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                  selectedMonth === null || selectedMonth === 0
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm font-bold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <span>All Months (Full Financial Year)</span>
                {(selectedMonth === null || selectedMonth === 0) && (
                  <Check size={12} className="text-teal-400" />
                )}
              </button>
              {monthsMeta.map((m) => {
                const isSelected = m.month === selectedMonth;
                return (
                  <button
                    type="button"
                    key={m.month}
                    onClick={() => onMonthChange(m.month)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <span>{m.label}</span>
                    {isSelected && (
                      <Check size={12} className="text-teal-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            {/* 2. Bank Account Filter */}
            <label className="block text-slate-300 font-semibold mb-2">
              Demat / Bank
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onFilterChange({ bankId: 0 })}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  currentBankId === 0
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {currentBankId === 0 && <Check size={12} />}
                <span>All Banks</span>
              </button>
              {sortedBanks.map((bank) => (
                <button
                  type="button"
                  key={bank.id}
                  onClick={() => onFilterChange({ bankId: bank.id })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    currentBankId === bank.id
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {currentBankId === bank.id && <Check size={12} />}
                  <span>{bank.bankName}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            {/* 3. Person / Family Member Filter */}
            <label className="block text-slate-300 font-semibold mb-2">
              Person / Family Member
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onFilterChange({ personId: 0 })}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  currentPersonId === 0
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {currentPersonId === 0 && <Check size={12} />}
                <span>All Persons</span>
              </button>
              {sortedPersons.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  onClick={() => onFilterChange({ personId: person.id })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    currentPersonId === person.id
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {currentPersonId === person.id && <Check size={12} />}
                  <span>{person.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            {/* 4. Deposit Status Filter */}
            <label className="block text-slate-300 font-semibold mb-2">
              Monthly Utilization Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((status) => (
                <button
                  type="button"
                  key={status.id}
                  onClick={() => onFilterChange({ status: status.id })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    currentStatus === status.id
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {currentStatus === status.id && <Check size={12} />}
                  <span>{status.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-rose-400 transition font-medium cursor-pointer"
          >
            Clear all filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-sm cursor-pointer"
          >
            Show {totalFilteredCount}{" "}
            {totalFilteredCount === 1 ? "Person" : "Persons"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
