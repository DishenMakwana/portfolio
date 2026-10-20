import { FileSpreadsheet } from "lucide-react";
import UploadedFilesList from "@/components/shared/UploadedFilesList";
import type { UploadedXlsxFilesCardProps } from "@/types/upload-tracker";

export default function UploadedXlsxFilesCard({
  reportsList,
}: UploadedXlsxFilesCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800/70 px-5 py-4 bg-slate-900/50">
        <FileSpreadsheet size={16} className="text-teal-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">
          Uploaded XLSX Files
        </h2>
      </div>
      <UploadedFilesList reportsList={reportsList} />
    </section>
  );
}
