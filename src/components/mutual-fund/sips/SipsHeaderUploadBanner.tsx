"use client";

import { Repeat2, Trash2, Loader2, Upload } from "lucide-react";
import type { SipsHeaderUploadBannerProps } from "@/types/sips";

export default function SipsHeaderUploadBanner({
  mandatesCount,
  isUploading,
  onUpload,
  onOpenClearModal,
}: SipsHeaderUploadBannerProps) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Repeat2 size={20} className="text-teal-400" /> My SIP Mandates
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Fixed monthly SIP schedule for all family members. Upload your
            &ldquo;My SIP&rsquo;s&rdquo; Excel export to sync.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mandatesCount > 0 && (
            <button
              onClick={onOpenClearModal}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 border border-red-800/40 bg-red-950/20 hover:bg-red-950/50 px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
          <label className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg cursor-pointer transition text-sm">
            {isUploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            {isUploading ? "Uploading…" : "Upload SIP's Excel"}
            <input
              type="file"
              accept=".xlsx"
              onChange={onUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
