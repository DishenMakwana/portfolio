"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import type { CloneLimitsModalProps } from "@/types/bankDeposit";

export default function CloneLimitsModal({
  isOpen,
  onClose,
  onClone,
  currentFY,
}: CloneLimitsModalProps) {
  const [sourceFY, setSourceFY] = useState<string>(currentFY);
  const [targetFY, setTargetFY] = useState<string>("2027-28");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!sourceFY || !targetFY) {
      setErrorMsg("Both source and target financial years are required.");
      return;
    }

    if (sourceFY === targetFY) {
      setErrorMsg("Source and target financial years must be different.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onClone({ sourceFY, targetFY });
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to clone limits."
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
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Copy size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Rollover Limits to Future Year
                </h3>
                <p className="text-xs text-slate-400">
                  Copy all yearly targets and monthly limits across accounts.
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Source Financial Year (Copy From)
              </label>
              <input
                type="text"
                value={sourceFY}
                onChange={(e) => setSourceFY(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. 2026-27"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Financial Year (Copy To)
              </label>
              <input
                type="text"
                value={targetFY}
                onChange={(e) => setTargetFY(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. 2027-28"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Limits will be initialized for all 12 months in the target year.
              </span>
            </div>

            {/* Actions */}
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
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-purple-950/40 disabled:opacity-50 cursor-pointer"
              >
                <Check size={16} />
                {isSubmitting ? "Copying..." : "Rollover Limits"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
