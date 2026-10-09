"use client";

import { useState } from "react";
import { Clock3, FileSpreadsheet, ExternalLink, Trash2 } from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import Link from "next/link";
import type { MsflUploadedFilesCardProps } from "@/types/msfl";
import {
  formatLocalDateStr as formatDate,
  formatUploadedAt,
} from "@/helpers/formatters";

export default function MsflUploadedFilesCard({
  reportsList,
  selectedReportId,
  onDeleteReport,
}: MsflUploadedFilesCardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = reportsList.filter((report) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const formattedDate = formatDate(report.asOfDate).toLowerCase();
    const filename = report.filename.toLowerCase();
    const reportIdStr = report.id.toString();
    return (
      formattedDate.includes(query) ||
      filename.includes(query) ||
      reportIdStr.includes(query) ||
      `#${reportIdStr}`.includes(query)
    );
  });

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-xl overflow-hidden flex flex-col">
      {/* Card Header */}
      <div className="flex items-center gap-2 border-b border-slate-800/70 px-5 py-4 bg-slate-900/50">
        <FileSpreadsheet size={16} className="text-teal-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">
          Uploaded XLSX Files
        </h2>
      </div>

      <div className="flex flex-col h-full">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
          <SearchFilterBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search uploaded files by date, name, or ID..."
          />
        </div>

        {/* List Container */}
        <div className="flex-1 overflow-y-auto max-h-[320px] custom-scrollbar">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 min-h-40">
              <FileSpreadsheet
                size={24}
                className="opacity-20 text-slate-400"
              />
              <span>
                {searchQuery ? "No matching files found." : "No uploads yet."}
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer mt-1"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {filteredReports.map((report) => {
                const isActive = selectedReportId === report.id;
                return (
                  <div
                    key={report.id}
                    className={`px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-950/40 transition group ${
                      isActive
                        ? "bg-teal-500/5 border-l-2 border-l-teal-500"
                        : ""
                    }`}
                  >
                    {/* File Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-100 whitespace-nowrap">
                          <span className="text-teal-400 font-extrabold mr-1.5">
                            #{report.id}
                          </span>
                          {formatDate(report.asOfDate)}
                        </span>
                        <span
                          title={report.filename}
                          className="text-[11px] font-medium text-slate-400 truncate max-w-[180px] sm:max-w-[320px] md:max-w-[440px] block"
                        >
                          {report.filename}
                        </span>
                        {isActive && (
                          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <Clock3 size={10} />
                        <span>
                          Uploaded {formatUploadedAt(report.uploadedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <Link
                        href={`/msfl?msflReportId=${report.id}`}
                        title="View snapshot"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                          isActive
                            ? "bg-teal-500/20 border-teal-500/40 text-teal-300 shadow-sm shadow-teal-500/20"
                            : "bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20 hover:text-teal-300"
                        }`}
                      >
                        <ExternalLink size={13} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDeleteReport(report)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer"
                        title="Delete snapshot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
