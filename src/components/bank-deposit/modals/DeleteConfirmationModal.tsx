"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";
import type { DeleteConfirmationModalProps } from "@/types/bankDeposit";
import { formatDepositInr, formatShortDate } from "@/helpers/bankDeposit";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  isDeleting,
}: DeleteConfirmationModalProps) {
  if (!isOpen || !transaction) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isDeleting ? undefined : onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>

          {/* Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Are you sure you want to delete this deposit transaction?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                This action cannot be undone. The deposit will be permanently
                removed and the account monthly limit will be recalculated.
              </p>
            </div>
          </div>

          {/* Transaction Summary Card */}
          <div className="my-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Date:</span>
              <span className="font-semibold text-slate-200">
                {formatShortDate(transaction.depositDate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Person:</span>
              <span className="font-semibold text-slate-200">
                {transaction.personName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bank & Account:</span>
              <span className="font-semibold text-slate-200">
                {transaction.bankName} ({transaction.accountIdentifier})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Deposit Amount:</span>
              <span className="font-bold text-rose-400 text-sm">
                {formatDepositInr(transaction.amount)}
              </span>
            </div>
            {transaction.comment && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">Comment:</span>
                <span className="italic text-slate-300">
                  {transaction.comment}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={15} />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
