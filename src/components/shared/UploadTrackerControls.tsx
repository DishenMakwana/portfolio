"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, RefreshCw } from "lucide-react";
import { uploadReportAction } from "@/actions/portfolio";
import type { UploadTrackerControlsProps } from "@/types/upload-tracker";
import { toast } from "react-hot-toast";

export default function UploadTrackerControls({
  reportsList,
  selectedReport,
}: UploadTrackerControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const handleReportChange = (reportId: string) => {
    startTransition(() => {
      router.push(`/uploads?reportId=${reportId}`);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadReportAction(formData);
    setIsUploading(false);
    if (res.success && res.data?.reportId) {
      toast.success("Mutual Fund Valuation sheet uploaded successfully!");
      router.refresh();
      router.push(`/uploads?reportId=${res.data.reportId}`);
    } else {
      toast.error(res.error || "Upload failed");
    }
    // Reset file input
    e.target.value = "";
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Report Selector */}
        {reportsList.length > 0 && (
          <div className="relative">
            <select
              value={selectedReport?.id || ""}
              onChange={(e) => handleReportChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none pr-8"
            >
              {reportsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.asOfDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-500">
              <RefreshCw
                size={13}
                className={isPending ? "animate-spin" : ""}
              />
            </div>
          </div>
        )}

        {/* Upload */}
        <label className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold px-4 py-1.5 rounded-lg shadow-lg cursor-pointer transition text-sm">
          <Upload size={14} />
          <span>Upload</span>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Full-screen upload loader */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-100">
              Parsing valuation sheet…
            </h3>
            <p className="text-slate-400 mt-2 text-sm">
              Extracting data and generating transaction history.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
