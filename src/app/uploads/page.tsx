import {
  CalendarDays,
  FileSpreadsheet,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import HeaderClient from "@/components/shared/HeaderClient";
import DeleteReportButton from "@/components/shared/DeleteReportButton";
import UploadTrackerControls from "@/components/shared/UploadTrackerControls";
import UploadedFilesList from "@/components/shared/UploadedFilesList";
import { getReports, getSchemes } from "@/lib/portfolioService";
import Link from "next/link";
import {
  formatLocalDateStr as formatDate,
  parseLocalDate,
} from "@/helpers/formatters";
import { UploadTrackerPageProps, WEEKDAYS } from "@/types/upload-tracker";
import { toDateKey, startOfMonth, eachMonth, eachDay } from "@/helpers/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upload Tracker" };

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
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

function getLastExpectedSnapshotDate(now: Date) {
  // Convert UTC date to IST components to match user's local schedule (GMT+5:30)
  const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istStr);

  // Start with yesterday in IST (the latest day that is strictly before today)
  const candidate = new Date(
    istDate.getFullYear(),
    istDate.getMonth(),
    istDate.getDate()
  );
  candidate.setDate(candidate.getDate() - 1);

  // Search backwards to find the latest trading day (excluding weekends)
  for (let i = 0; i < 10; i++) {
    const dayOfWeek = candidate.getDay();
    const isTradingDay = dayOfWeek !== 0 && dayOfWeek !== 6;

    if (isTradingDay) {
      return candidate;
    }
    candidate.setDate(candidate.getDate() - 1);
  }

  // Fallback
  const yesterday = new Date(istDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

export default async function UploadTrackerPage({
  searchParams,
}: UploadTrackerPageProps) {
  const params = await searchParams;
  const reportId = params.reportId ? parseInt(params.reportId, 10) : undefined;
  const monthParam = params.month;

  const [reportsList, allSchemes] = await Promise.all([
    getReports(),
    getSchemes(),
  ]);
  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;

  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0] || null;

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
  const firstReportDate = chronologicalReports[0]
    ? parseLocalDate(chronologicalReports[0].asOfDate)
    : today;
  const latestReportDate = chronologicalReports.at(-1)
    ? parseLocalDate(chronologicalReports.at(-1)!.asOfDate)
    : today;
  const lastExpectedSnapshotDate = getLastExpectedSnapshotDate(now);
  const rangeEnd =
    latestReportDate > lastExpectedSnapshotDate
      ? latestReportDate
      : lastExpectedSnapshotDate;
  const months = eachMonth(firstReportDate, rangeEnd);

  // Active month calculation
  let activeMonth = today;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const parsedMonth = new Date(`${monthParam}-01T00:00:00`);
    if (!isNaN(parsedMonth.getTime())) {
      activeMonth = parsedMonth;
    }
  } else {
    activeMonth = months.at(-1) || today;
  }
  activeMonth = startOfMonth(activeMonth);

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

  // Only expect files on business days (trading days)
  const trackedDays =
    lastExpectedSnapshotDate >= firstReportDate
      ? eachDay(firstReportDate, lastExpectedSnapshotDate).filter(isBusinessDay)
      : [];
  const missedDays = trackedDays.filter(
    (day) => !reportByDate.has(toDateKey(day))
  );
  const latestFile = reportsList[0]?.filename || "No uploads yet";

  return (
    <>
      <HeaderClient
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400 h-[38px]">
              <CalendarDays size={15} className="text-teal-400" />
              Expected through {formatDate(toDateKey(lastExpectedSnapshotDate))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              className="mt-3 min-h-10 text-sm font-bold text-slate-100 break-all"
              title={latestFile}
            >
              {latestFile}
            </div>
            <div className="mt-1 text-xs font-semibold text-violet-400">
              {reportsList[0] ? formatDate(reportsList[0].asOfDate) : "No date"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
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
                      {prevMonth ? (
                        <Link
                          href={`/uploads?month=${toDateKey(prevMonth).substring(0, 7)}${reportId ? `&reportId=${reportId}` : ""}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                          title="Previous Month"
                        >
                          <ChevronLeft size={14} />
                        </Link>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-850 bg-slate-900/20 text-slate-700 cursor-not-allowed">
                          <ChevronLeft size={14} />
                        </div>
                      )}
                      {nextMonth ? (
                        <Link
                          href={`/uploads?month=${toDateKey(nextMonth).substring(0, 7)}${reportId ? `&reportId=${reportId}` : ""}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                          title="Next Month"
                        >
                          <ChevronRight size={14} />
                        </Link>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-850 bg-slate-900/20 text-slate-700 cursor-not-allowed">
                          <ChevronRight size={14} />
                        </div>
                      )}
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
                      // Exclude weekends from the expected range in the calendar
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

        {missedDays.length > 0 && (
          <section className="mt-6 rounded-2xl border border-red-500/20 bg-slate-900/70 p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <XCircle size={17} className="text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">
                Missed Dates
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {missedDays.map((day) => (
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
