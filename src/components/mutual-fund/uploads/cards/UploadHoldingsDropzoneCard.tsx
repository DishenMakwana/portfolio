import { Upload, FileSpreadsheet } from "lucide-react";
import type { UploadHoldingsDropzoneCardProps } from "@/types/upload-tracker";

export default function UploadHoldingsDropzoneCard({
  onFileUpload,
}: UploadHoldingsDropzoneCardProps) {
  return (
    <section className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
        <Upload size={16} className="text-teal-400" /> Upload Holdings Statement
      </h3>
      <p className="text-slate-400 text-xs mb-5 leading-relaxed">
        Add historical or updated holdings statements here. Uploading a file for
        a date that already exists will overwrite it.
      </p>

      <label className="flex items-center justify-center flex-col border border-dashed border-slate-850 hover:border-teal-500/50 bg-slate-950/20 hover:bg-slate-950/40 p-6 rounded-xl cursor-pointer transition text-center group">
        <FileSpreadsheet className="text-slate-500 group-hover:text-teal-400 w-9 h-9 mb-2.5 transition" />
        <span className="text-xs font-bold text-slate-300 group-hover:text-slate-200">
          Select Excel File (.xlsx)
        </span>
        <span className="text-[10px] text-slate-500 mt-1">
          Mutual Fund Valuation export
        </span>
        <input
          type="file"
          accept=".xlsx"
          onChange={onFileUpload}
          className="hidden"
        />
      </label>
    </section>
  );
}
