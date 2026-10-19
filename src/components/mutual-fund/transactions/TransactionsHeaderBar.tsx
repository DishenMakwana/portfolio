import { Upload } from "lucide-react";
import type { TransactionsHeaderBarProps } from "@/types/transactions";

export default function TransactionsHeaderBar({
  totalRecords,
  onOpenUploadModal,
}: TransactionsHeaderBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="text-xs font-semibold text-slate-400">
        Total {totalRecords.toLocaleString("en-IN")} transaction records in
        database
      </div>
      <button
        type="button"
        onClick={onOpenUploadModal}
        className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
      >
        <Upload size={16} />
        <span>Upload Statement (.xlsx)</span>
      </button>
    </div>
  );
}
