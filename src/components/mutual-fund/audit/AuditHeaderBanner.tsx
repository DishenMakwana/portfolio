import { ShieldCheck, Upload, Download } from "lucide-react";
import type { AuditHeaderBannerProps } from "@/types/audit";

export default function AuditHeaderBanner({
  onUploadClick,
  onExportClick,
}: AuditHeaderBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              CAS Audit & Discrepancy Finder
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Full portfolio reconciliation comparing CAS Statement snapshot
              balances against historical transaction logs. Audits both active
              holdings and fully redeemed folios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
          <button
            type="button"
            onClick={onUploadClick}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer shrink-0"
          >
            <Upload size={14} className="stroke-[2.5]" />
            Upload Statement (.xlsx)
          </button>

          <button
            type="button"
            onClick={onExportClick}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-md cursor-pointer shrink-0"
          >
            <Download size={14} className="text-emerald-400" />
            Export XLSX
          </button>
        </div>
      </div>
    </div>
  );
}
