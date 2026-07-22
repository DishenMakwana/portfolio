"use client";

import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CalendarDays,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import HeaderClient from "@/components/shared/HeaderClient";
import DeleteReportButton from "@/components/shared/DeleteReportButton";
import UploadTrackerControls from "@/components/shared/UploadTrackerControls";
import UploadedFilesList from "@/components/shared/UploadedFilesList";
import { uploadReportAction } from "@/actions/portfolio";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  formatLocalDateStr as formatDate,
  parseLocalDate,
} from "@/helpers/formatters";
import { toDateKey, startOfMonth, eachMonth, eachDay } from "@/helpers/dates";
import { ReportRow, ReportRef, WEEKDAYS } from "@/types/upload-tracker";

interface UploadTrackerClientProps {
  reportsList: ReportRow[];
  selectedReport: ReportRef | null;
  unmappedCount: number;
  firstCasReportDate?: string;
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();
  const leadingBlanks = firstDay.getDay();
  const days: (Date | null)[] = Array.from(
    { length: leadingBlanks },
    () => null
  );

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function getLastExpectedSnapshotDate(now: Date) {
  const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istStr);

  const candidate = new Date(
    istDate.getFullYear(),
    istDate.getMonth(),
    istDate.getDate()
  );
  candidate.setDate(candidate.getDate() - 1);

  for (let i = 0; i < 10; i++) {
    const dayOfWeek = candidate.getDay();
    const isTradingDay = dayOfWeek !== 0 && dayOfWeek !== 6;

    if (isTradingDay) {
      return candidate;
    }
    candidate.setDate(candidate.getDate() - 1);
  }

  const yesterday = new Date(istDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

export default function UploadTrackerClient({
  reportsList,
  selectedReport,
  unmappedCount,
  firstCasReportDate,
}: UploadTrackerClientProps) {
  const router = useRouter();

  const chronologicalReports = [...reportsList].sort(
    (a, b) =>
      parseLocalDate(a.asOfDate).getTime() -
      parseLocalDate(b.asOfDate).getTime()
  );

  const reportByDate = new Map(
    chronologicalReports.map((report) => [report.asOfDate, report])
  );

  const now = new Date();
  const today = parseLocalDate(toDateKey(now));

  let firstReportDate = today;
  if (chronologicalReports[0]) {
    firstReportDate = parseLocalDate(chronologicalReports[0].asOfDate);
  }
  if (firstCasReportDate) {
    const casDate = parseLocalDate(firstCasReportDate);
    if (casDate < firstReportDate) {
      firstReportDate = casDate;
    }
  }
  const latestReportDate = chronologicalReports.at(-1)
    ? parseLocalDate(chronologicalReports.at(-1)!.asOfDate)
    : today;

  const lastExpectedSnapshotDate = getLastExpectedSnapshotDate(now);
  const rangeEnd =
    latestReportDate > lastExpectedSnapshotDate
      ? latestReportDate
      : lastExpectedSnapshotDate;

  const months = eachMonth(firstReportDate, rangeEnd);

  const [activeMonth, setActiveMonth] = useState(() => {
    return startOfMonth(months.at(-1) || today);
  });

  const activeMonthIndex = months.findIndex(
    (m) =>
      m.getFullYear() === activeMonth.getFullYear() &&
      m.getMonth() === activeMonth.getMonth()
  );
  const prevMonth = activeMonthIndex > 0 ? months[activeMonthIndex - 1] : null;
  const nextMonth =
    activeMonthIndex !== -1 && activeMonthIndex < months.length - 1
      ? months[activeMonthIndex + 1]
      : null;

  const trackedDays =
    lastExpectedSnapshotDate >= firstReportDate
      ? eachDay(firstReportDate, lastExpectedSnapshotDate).filter(isBusinessDay)
      : [];
  const missedDays = trackedDays.filter(
    (day) => !reportByDate.has(toDateKey(day))
  );
  const latestFile = reportsList[0]?.filename || "No uploads yet";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Uploading valuation statement...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadReportAction(formData);
      if (res.success && res.data?.reportId) {
        toast.success("Mutual Fund Valuation sheet uploaded successfully!", {
          id: toastId,
        });
        router.refresh();
        router.push(`/uploads?reportId=${res.data.reportId}`);
      } else {
        toast.error(res.error || "Failed to parse upload file", {
          id: toastId,
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload error occurred",
        { id: toastId }
      );
    }
    e.target.value = "";
  };

  return (
    <>
      <HeaderClient
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200 space-y-6">
        {/* Page Title & Controls Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Upload Tracker</h1>
            <p className="text-sm text-slate-400 mt-1">
              Snapshot dates, source files, and missed uploads based on your
              upload schedule
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <UploadTrackerControls
              reportsList={reportsList}
              selectedReport={selectedReport}
            />
          </div>
        </div>

        {/* ── METRIC CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Total Snapshots
            </div>
            <div className="mt-3 text-3xl font-black text-slate-100">
              {reportsList.length}
            </div>
            <div className="mt-1 text-xs font-semibold text-teal-400">
              Stored in database
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Uploaded Days
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-400">
              {reportByDate.size}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              Calendar days with XLSX
            </div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-slate-900/70 p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Missed Days
            </div>
            <div className="mt-3 text-3xl font-black text-red-400">
              {missedDays.length}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              Trading days without uploads
            </div>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-slate-900/70 p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Latest File
            </div>
            <div
              className="mt-3 min-h-10 text-sm font-bold text-slate-100 break-all line-clamp-2"
              title={latestFile}
            >
              {latestFile}
            </div>
            <div className="mt-1 text-xs font-semibold text-violet-400">
              {reportsList[0] ? formatDate(reportsList[0].asOfDate) : "No date"}
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          {/* Calendar Card */}
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Calendar View
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Green = uploaded, red = missed, grey = not expected yet
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />{" "}
                  Uploaded
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-500/70" />{" "}
                  Missed
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" /> Not
                  tracked
                </span>
              </div>
            </div>

            {reportsList.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-slate-500">
                <FileSpreadsheet size={44} className="opacity-30" />
                <p className="text-sm">
                  Upload your first XLSX file to start tracking.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-5">
                  {/* Calendar Navigation Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100">
                      {activeMonth.toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={!prevMonth}
                        onClick={() =>
                          prevMonth && setActiveMonth(startOfMonth(prevMonth))
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                          prevMonth
                            ? "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                            : "border-slate-850 bg-slate-900/20 text-slate-700 cursor-not-allowed"
                        }`}
                        title="Previous Month"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        disabled={!nextMonth}
                        onClick={() =>
                          nextMonth && setActiveMonth(startOfMonth(nextMonth))
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                          nextMonth
                            ? "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                            : "border-slate-850 bg-slate-900/20 text-slate-700 cursor-not-allowed"
                        }`}
                        title="Next Month"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                      >
                        {day}
                      </div>
                    ))}
                    {getCalendarDays(activeMonth).map((day, index) => {
                      if (!day) {
                        return (
                          <div
                            key={`blank-${index}`}
                            className="aspect-square rounded-lg bg-transparent"
                          />
                        );
                      }

                      const key = toDateKey(day);
                      const report = reportByDate.get(key);
                      const inExpectedRange =
                        day >= firstReportDate &&
                        day <= lastExpectedSnapshotDate &&
                        isBusinessDay(day);
                      const isUploaded = Boolean(report);
                      const isMissed = inExpectedRange && !isUploaded;
                      const title = report
                        ? `${formatDate(report.asOfDate)} - ${report.filename}`
                        : key;

                      return (
                        <div
                          key={key}
                          title={title}
                          className={`group relative flex aspect-square min-h-10 items-center justify-center rounded-lg border text-xs font-black transition ${
                            isUploaded
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                              : isMissed
                                ? "border-red-500/25 bg-red-500/10 text-red-300"
                                : "border-slate-800/60 bg-slate-900/60 text-slate-700"
                          }`}
                        >
                          {day.getDate()}
                          {report && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 rounded-lg">
                              <DeleteReportButton
                                reportId={report.id}
                                dateLabel={formatDate(report.asOfDate)}
                                variant="icon"
                              />
                            </div>
                          )}
                          {isUploaded && (
                            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-300 group-hover:hidden" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Upload Card + Uploaded Files List */}
          <div className="space-y-6">
            {/* Upload Zone Card */}
            <section className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                <Upload size={16} className="text-teal-400" /> Upload Holdings
                Statement
              </h3>
              <p className="text-slate-400 text-xs mb-5 leading-relaxed">
                Add historical or updated holdings statements here. Uploading a
                file for a date that already exists will overwrite it.
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
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </section>

            {/* Files List Card */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 border-b border-slate-800/70 px-5 py-4 bg-slate-900/50">
                <FileSpreadsheet size={16} className="text-teal-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">
                  Uploaded XLSX Files
                </h2>
              </div>
              <UploadedFilesList reportsList={reportsList} />
            </section>
          </div>
        </div>

        {/* ── MISSED DATES CARD (FULL WIDTH) ── */}
        {missedDays.length > 0 && (
          <section className="rounded-2xl border border-red-500/20 bg-slate-900/70 p-6 shadow-xl w-full">
            <div className="mb-4 flex items-center gap-2">
              <XCircle size={17} className="text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">
                Missed Dates ({missedDays.length})
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...missedDays].reverse().map((day) => (
                <span
                  key={toDateKey(day)}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300"
                >
                  {formatDate(toDateKey(day))}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
