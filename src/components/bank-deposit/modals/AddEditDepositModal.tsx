"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PlusCircle, Check } from "lucide-react";
import CustomDropdown from "@/components/shared/CustomDropdown";
import type { AddEditDepositModalProps } from "@/types/bankDeposit";

export default function AddEditDepositModal({
  isOpen,
  onClose,
  onSave,
  transaction,
  allPersonsList,
  allAccountsList,
  defaultDate,
}: AddEditDepositModalProps) {
  const isEditing = Boolean(transaction);

  const [selectedPersonId, setSelectedPersonId] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [depositDate, setDepositDate] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (transaction) {
      setSelectedPersonId(transaction.personId);
      setSelectedAccountId(transaction.personBankAccountId);
      setDepositDate(transaction.depositDate);
      setAmountStr(String(transaction.amount));
      setComment(transaction.comment || "");
    } else {
      const firstPersonId = allPersonsList[0]?.id || 0;
      setSelectedPersonId(firstPersonId);

      const matchingAccounts = allAccountsList.filter(
        (a) => a.personId === firstPersonId
      );
      setSelectedAccountId(matchingAccounts[0]?.id || 0);

      const today = new Date().toISOString().split("T")[0];
      setDepositDate(defaultDate || today);
      setAmountStr("");
      setComment("");
    }
    setErrorMsg("");
  }, [transaction, isOpen, allPersonsList, allAccountsList, defaultDate]);

  // When person changes, update account selector to person's first account
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

    const parsedAmount = parseFloat(amountStr);
    if (!selectedAccountId) {
      setErrorMsg("Please select a bank account.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter a valid deposit amount greater than zero.");
      return;
    }
    if (!depositDate) {
      setErrorMsg("Please choose a deposit date.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && transaction) {
        const res = await onSave({
          id: transaction.id,
          personBankAccountId: selectedAccountId,
          depositDate,
          amount: parsedAmount,
          comment: comment.trim() || null,
        });
        if (!res.success) {
          setErrorMsg(res.message);
        } else {
          onClose();
        }
      } else {
        const res = await onSave({
          personBankAccountId: selectedAccountId,
          depositDate,
          amount: parsedAmount,
          comment: comment.trim() || null,
        });
        if (!res.success) {
          setErrorMsg(res.message);
        } else {
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to save deposit."
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
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <PlusCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {isEditing
                    ? "Edit Deposit Transaction"
                    : "Record New Deposit"}
                </h3>
                <p className="text-xs text-slate-400">
                  Maintains actual deposit date, person, and account limits.
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Person Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Person
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

            {/* Bank Account Selector (Filtered dynamically by chosen person) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bank Account
              </label>
              <CustomDropdown<number>
                value={selectedAccountId}
                onChange={setSelectedAccountId}
                disabled={isSubmitting || filteredAccounts.length === 0}
                placeholder={
                  filteredAccounts.length === 0
                    ? "No accounts found"
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

            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deposit Date
                </label>
                <input
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  step="any"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                />
              </div>
            </div>

            {/* Comment / Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Remarks / Comment (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. rail ticket, advance transfer"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
              />
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-950/40 disabled:opacity-50 cursor-pointer"
              >
                <Check size={16} />
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Deposit"
                    : "Save Deposit"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
