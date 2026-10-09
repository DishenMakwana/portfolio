"use client";

import { Upload, Loader2 } from "lucide-react";
import type { MsflHeaderUploadBannerProps } from "@/types/msfl";

export default function MsflHeaderUploadBanner({
  isPending,
  onUpload,
}: MsflHeaderUploadBannerProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl">
      <div>
        <h2 className="text-sm font-bold text-slate-200">
          MSFL Connect Portfolio
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Static stock investment portfolio snapshots
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-black transition shadow-lg shadow-teal-500/10 cursor-pointer">
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          Upload Report (.xlsx)
          <input
            type="file"
            accept=".xlsx"
            onChange={onUpload}
            disabled={isPending}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
