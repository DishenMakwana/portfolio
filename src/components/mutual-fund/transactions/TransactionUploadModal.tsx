"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { uploadTransactionsAction } from "@/actions/transactionUpload";
import type { TransactionUploadResult } from "@/types/transactionUpload";

interface TransactionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionUploadModal({
  isOpen,
  onClose,
}: TransactionUploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<TransactionUploadResult | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await uploadTransactionsAction(formData);
      setResult(res);

      if (res.success) {
        router.refresh();
      }
    } catch {
      setResult({
        success: false,
        message: "An unexpected error occurred during file upload.",
        totalProcessed: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-100">
                Upload Transaction Statement
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Import or sync transactions from .xlsx statement file
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        {!result && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? "border-teal-500/50 bg-teal-500/5"
                : "border-slate-800 hover:border-slate-700 bg-slate-950/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-teal-400 mx-auto" />
                <div className="text-xs font-bold text-slate-200">
                  {selectedFile.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs font-semibold text-slate-300">
                  Drag and drop your transaction .xlsx statement file
                </div>
                <div className="text-[11px] text-slate-500">
                  Click to browse from your computer
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status / Results Banner */}
        {result && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 ${
              result.success
                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                : "bg-rose-950/30 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>

            {result.success && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-lg font-black text-emerald-400">
                    +{result.insertedCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Newly Added
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-lg font-black text-amber-400">
                    ~{result.updatedCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Updated
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="text-lg font-black text-slate-300">
                    ={result.skippedCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Unchanged
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {result ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Upload Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-extrabold hover:bg-teal-400 transition-all cursor-pointer"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-extrabold hover:bg-teal-400 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-teal-500/20"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Sync Transactions</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
