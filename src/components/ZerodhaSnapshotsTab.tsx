"use client";

import { Upload, FileSpreadsheet, CheckCircle, Trash2 } from "lucide-react";

interface SnapshotReport {
  id: number;
  asOfDate: string;
  filename: string;
  uploadedAt: string;
}

interface ZerodhaSnapshotsTabProps {
  reportsList: SnapshotReport[];
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteReport: (id: number) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ZerodhaSnapshotsTab({
  reportsList,
  handleFileUpload,
  handleDeleteReport,
}: ZerodhaSnapshotsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Upload form */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl h-fit">
        <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Upload size={16} className="text-teal-400" /> Upload Holdings
          Statement
        </h3>
        <p className="text-slate-400 text-xs mb-5 leading-relaxed">
          Add historical or updated holdings statements here. Uploading a file
          for a date that already exists will overwrite it.
        </p>

        <label className="flex items-center justify-center flex-col border border-dashed border-slate-850 hover:border-teal-500/50 bg-slate-950/20 hover:bg-slate-950/40 p-8 rounded-xl cursor-pointer transition text-center group">
          <FileSpreadsheet className="text-slate-500 group-hover:text-teal-400 w-10 h-10 mb-3 transition" />
          <span className="text-xs font-bold text-slate-300 group-hover:text-slate-200">
            Select Excel File (.xlsx)
          </span>
          <span className="text-[10px] text-slate-500 mt-1">
            Zerodha Console export
          </span>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Uploaded snapshots list */}
      <div className="lg:col-span-2 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-teal-400" /> Holdings History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5">Snapshot Date</th>
                <th className="py-2.5">Filename</th>
                <th className="py-2.5">Uploaded At</th>
                <th className="py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
              {reportsList.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-800/10 transition">
                  <td className="py-3.5 text-slate-100 font-bold">
                    {formatDate(rep.asOfDate)}
                  </td>
                  <td className="py-3.5 text-slate-400 font-mono text-[10px]">
                    {rep.filename}
                  </td>
                  <td className="py-3.5 text-slate-500">
                    {new Date(rep.uploadedAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3.5 text-center">
                    <button
                      onClick={() => handleDeleteReport(rep.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded bg-red-950/20 border border-red-900/30 hover:bg-red-950/50 hover:border-red-900/60 cursor-pointer transition"
                      title="Delete upload"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
