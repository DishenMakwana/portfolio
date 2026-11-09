"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sliders, Check } from "lucide-react";
import CustomDropdown from "@/components/shared/CustomDropdown";
import type { ManageMonthlyLimitsModalProps } from "@/types/bankDeposit";
import { getFinancialYearMonths } from "@/helpers/bankDeposit";

export default function ManageMonthlyLimitsModal({
  isOpen,
  onClose,
  onSaveMonthlyLimit,
  onSaveAnnualLimit,
  financialYear,
  allPersonsList,
  allAccountsList,
}: ManageMonthlyLimitsModalProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // 4 = April
  const [applyToAllMonths, setApplyToAllMonths] = useState<boolean>(true);
  const [limitStr, setLimitStr] = useState<string>("");
  const [annualLimitStr, setAnnualLimitStr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const monthsMeta = getFinancialYearMonths(financialYear);

  useEffect(() => {
    if (isOpen) {
      const firstPersonId = allPersonsList[0]?.id || 0;
      setSelectedPersonId(firstPersonId);

      const matchingAccounts = allAccountsList.filter(
        (a) => a.personId === firstPersonId
      );
      setSelectedAccountId(matchingAccounts[0]?.id || 0);

      setSelectedMonth(4);
      setLimitStr("");
      setAnnualLimitStr("");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, allPersonsList, allAccountsList]);

  const handlePersonChange = (personId: number) => {
    setSelectedPersonId(personId);
    const matchingAccounts = allAccountsList.filter(
      (a) => a.personId === personId
    );
    setSelectedAccountId(matchingAccounts[0]?.id || 0);
  };

  const filteredAccounts = allAccountsList.filter(
    (a) => a.personId === selectedPersonId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const parsedLimit = parseFloat(limitStr);
    const parsedAnnual = parseFloat(annualLimitStr);

    if (isNaN(parsedLimit) && isNaN(parsedAnnual)) {
      setErrorMsg(
        "Please enter either a monthly limit or an annual target limit."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. If annual limit was provided, save it
      if (!isNaN(parsedAnnual) && parsedAnnual >= 0) {
        const annualRes = await onSaveAnnualLimit({
          personId: selectedPersonId,
          financialYear,
          annualTargetLimit: parsedAnnual,
        });
        if (!annualRes.success) {
          setErrorMsg(annualRes.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. If monthly limit was provided, save it
      if (!isNaN(parsedLimit) && parsedLimit >= 0 && selectedAccountId) {
        if (applyToAllMonths) {
          for (let m = 1; m <= 12; m++) {
            await onSaveMonthlyLimit({
              personBankAccountId: selectedAccountId,
              financialYear,
              month: m,
              monthlyLimit: parsedLimit,
            });
          }
        } else {
          await onSaveMonthlyLimit({
            personBankAccountId: selectedAccountId,
            financialYear,
            month: selectedMonth,
            monthlyLimit: parsedLimit,
          });
        }
      }

      setSuccessMsg("Limits configured successfully.");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update limits."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isSubmitting ? undefined : onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Configure Deposit Limits (FY {financialYear})
                </h3>
                <p className="text-xs text-slate-400">
                  Set yearly targets and bank-account-level monthly limits.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium">
                {successMsg}
              </div>
            )}

            {/* Person Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Person
              </label>
              <CustomDropdown<number>
                value={selectedPersonId}
                onChange={handlePersonChange}
                disabled={isSubmitting}
                options={allPersonsList.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                className="w-full"
                buttonClassName="w-full py-2.5 bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>

            {/* Annual Planned Target */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Annual Planned Deposit Target for FY {financialYear} (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 500000"
                step="any"
                value={annualLimitStr}
                onChange={(e) => setAnnualLimitStr(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Total planned deposit capacity for this person across all
                accounts in FY {financialYear}.
              </span>
            </div>

            {/* Bank Account Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Bank Account to Set Monthly Limit
              </label>
              <CustomDropdown<number>
                value={selectedAccountId}
                onChange={setSelectedAccountId}
                disabled={isSubmitting || filteredAccounts.length === 0}
                placeholder={
                  filteredAccounts.length === 0
                    ? "No active accounts configured"
                    : "Select Bank Account"
                }
                options={filteredAccounts.map((a) => ({
                  value: a.id,
                  label:
                    a.accountIdentifier && a.accountIdentifier !== "Default"
                      ? `${a.bankName} (${a.accountIdentifier})`
                      : a.bankName,
                }))}
                className="w-full"
                buttonClassName="w-full py-2.5 bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>

            {/* Scope / Month selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="applyAll"
                  checked={applyToAllMonths}
                  onChange={(e) => setApplyToAllMonths(e.target.checked)}
                  disabled={isSubmitting}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
                />
                <label
                  htmlFor="applyAll"
                  className="text-xs text-slate-300 font-medium cursor-pointer"
                >
                  Apply this monthly limit to all 12 months of FY{" "}
                  {financialYear}
                </label>
              </div>

              {!applyToAllMonths && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Specific Month
                  </label>
                  <CustomDropdown<number>
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    disabled={isSubmitting}
                    options={monthsMeta.map((m) => ({
                      value: m.month,
                      label: m.label,
                    }))}
                    className="w-full"
                    buttonClassName="w-full py-2.5 bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* Monthly Limit Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Monthly Deposit Limit Amount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 200000"
                step="any"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-950/40 disabled:opacity-50 cursor-pointer"
              >
                <Check size={16} />
                {isSubmitting ? "Saving..." : "Save Limits"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
