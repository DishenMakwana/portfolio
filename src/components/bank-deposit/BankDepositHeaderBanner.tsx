"use client";

import { Landmark, Plus, Download, Loader2 } from "lucide-react";
import type { BankDepositHeaderBannerProps } from "@/types/bankDeposit";

export default function BankDepositHeaderBanner({
  onOpenAddDeposit,
  onDownloadExcel,
  isExporting = false,
}: BankDepositHeaderBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Icon Badge & Title + Description */}
        <div className="flex items-start sm:items-center gap-3.5">
          <span className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner shrink-0">
            <Landmark className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              Bank Deposit Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Track entity-level bank deposits, monthly limits, yearly targets,
              and rollover capacity across financial years.
            </p>
          </div>
        </div>

        {/* Right: Action Buttons Group (New Deposit, Download Excel) */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-end lg:self-center shrink-0">
          {/* New Deposit Button */}
          <button
            type="button"
            onClick={onOpenAddDeposit}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition cursor-pointer shrink-0"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>New Deposit</span>
          </button>

          {/* Download Excel Button */}
          <button
            type="button"
            onClick={onDownloadExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-extrabold text-emerald-300 transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin text-emerald-400" />
            ) : (
              <Download size={14} className="text-emerald-400" />
            )}
            <span>{isExporting ? "Exporting..." : "Download Excel"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
