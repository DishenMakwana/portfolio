"use client";

import { useState } from 'react';
import { Search, Clock3, FileSpreadsheet, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import DeleteReportButton from './DeleteReportButton';

interface ReportRow {
  id: number;
  asOfDate: string;
  uploadedAt: string;
  filename: string;
  cagr: number | null;
}

interface UploadedFilesListProps {
  reportsList: ReportRow[];
}

function parseLocalDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function formatDate(date: string) {
  return parseLocalDate(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatUploadedAt(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function UploadedFilesList({ reportsList }: UploadedFilesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reportsList.filter((report) => {
    const query = searchQuery.toLowerCase();
    const formattedDate = formatDate(report.asOfDate).toLowerCase();
    const filename = report.filename.toLowerCase();
    return formattedDate.includes(query) || filename.includes(query);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search uploaded files by date or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition font-medium"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto max-h-[580px] custom-scrollbar">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 min-h-40">
            <FileSpreadsheet size={24} className="opacity-20 text-slate-400" />
            <span>{searchQuery ? 'No matching files found.' : 'No uploads yet.'}</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-950/40 transition group"
              >
                {/* File Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-100 whitespace-nowrap">
                      {formatDate(report.asOfDate)}
                    </span>
                    <span
                      title={report.filename}
                      className="text-[11px] font-medium text-slate-400 truncate max-w-[180px] md:max-w-[240px] block"
                    >
                      {report.filename}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                    <Clock3 size={10} />
                    <span>Uploaded {formatUploadedAt(report.uploadedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition">
                  <Link
                    href={`/?reportId=${report.id}`}
                    title="View report"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 hover:text-teal-300 transition"
                  >
                    <ExternalLink size={12} />
                  </Link>
                  <DeleteReportButton
                    reportId={report.id}
                    dateLabel={formatDate(report.asOfDate)}
                    variant="icon"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
