"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Save, AlertCircle } from "lucide-react";
import { upsertAnnualLimitAction } from "@/actions/bankDeposit";
import { formatDepositInr } from "@/helpers/bankDeposit";
import type { EditPersonAnnualTargetModalProps } from "@/types/bankDeposit";

export default function EditPersonAnnualTargetModal({
  isOpen,
  onClose,
  person,
  financialYear,
  onSuccess,
}: EditPersonAnnualTargetModalProps) {
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (person) {
      setTargetAmount(
        person.annualTargetLimit > 0 ? String(person.annualTargetLimit) : ""
      );
      setErrorMsg(null);
    }
  }, [person, isOpen]);

  if (!isOpen || !person) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(targetAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg("Please enter a valid target amount (₹0 or more).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await upsertAnnualLimitAction({
        personId: person.personId,
        financialYear,
        annualTargetLimit: parsedAmount,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("[EditPersonAnnualTargetModal error]", err);
      setErrorMsg("Failed to update yearly target limit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Target size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Edit Yearly Target Limit
                </h3>
                <p className="text-xs text-slate-400">
                  {person.personName} • FY {financialYear}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Yearly Planned Deposit Target (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-semibold focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Preview:{" "}
                <span className="font-bold text-teal-400">
                  {formatDepositInr(parseFloat(targetAmount) || 0)}
                </span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">
                FY Target Isolation Guarantee:
              </p>
              <p>
                Updating this will save the target strictly for FY{" "}
                <span className="text-teal-300 font-medium">
                  {financialYear}
                </span>
                . Historical previous years remain unchanged. Future years will
                use this as their starting fallback target.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-teal-950/30 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSubmitting ? "Saving..." : "Save Target"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
