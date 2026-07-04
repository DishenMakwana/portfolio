import { CalendarDays, CheckCircle2, Clock3, FileSpreadsheet, XCircle } from 'lucide-react';
import HeaderClient from '@/components/HeaderClient';
import DeleteReportButton from '@/components/DeleteReportButton';
import UploadTrackerControls from '@/components/UploadTrackerControls';
import { getReports, getSchemes } from '@/lib/portfolioService';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ReportRow = Awaited<ReturnType<typeof getReports>>[number];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseLocalDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function eachMonth(start: Date, end: Date) {
  const months = [];
  let cursor = startOfMonth(start);
  const last = startOfMonth(end);

  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }

  return months;
}

function eachDay(start: Date, end: Date) {
  const days = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const days: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);

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
  const candidate = new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate());
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

interface UploadTrackerPageProps {
  searchParams: Promise<{ reportId?: string }>;
}

export default async function UploadTrackerPage({ searchParams }: UploadTrackerPageProps) {
  const params = await searchParams;
  const reportId = params.reportId ? parseInt(params.reportId, 10) : undefined;

  const [reportsList, allSchemes] = await Promise.all([getReports(), getSchemes()]);
  const unmappedCount = allSchemes.filter(s => !s.schemeCodeApi).length;

  const selectedReport = reportId 
    ? reportsList.find(r => r.id === reportId) || reportsList[0] 
    : reportsList[0] || null;

  const chronologicalReports = [...reportsList].sort((a, b) => (
    parseLocalDate(a.asOfDate).getTime() - parseLocalDate(b.asOfDate).getTime()
  ));
  const reportByDate = new Map(chronologicalReports.map(report => [report.asOfDate, report]));
  const now = new Date();
  const today = parseLocalDate(toDateKey(now));
  const firstReportDate = chronologicalReports[0] ? parseLocalDate(chronologicalReports[0].asOfDate) : today;
  const latestReportDate = chronologicalReports.at(-1) ? parseLocalDate(chronologicalReports.at(-1)!.asOfDate) : today;
  const lastExpectedSnapshotDate = getLastExpectedSnapshotDate(now);
  const rangeEnd = latestReportDate > lastExpectedSnapshotDate ? latestReportDate : lastExpectedSnapshotDate;
  const months = eachMonth(firstReportDate, rangeEnd);
  
  // Only expect files on business days (trading days)
  const trackedDays = lastExpectedSnapshotDate >= firstReportDate
    ? eachDay(firstReportDate, lastExpectedSnapshotDate).filter(isBusinessDay)
    : [];
  const missedDays = trackedDays.filter(day => !reportByDate.has(toDateKey(day)));
  const latestFile = reportsList[0]?.filename || 'No uploads yet';

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
            <p className="text-sm text-slate-400 mt-1">Snapshot dates, source files, and missed uploads based on your upload schedule</p>
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
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Snapshots</div>
            <div className="mt-3 text-3xl font-black text-slate-100">{reportsList.length}</div>
            <div className="mt-1 text-xs font-semibold text-teal-400">Stored in database</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Uploaded Days</div>
            <div className="mt-3 text-3xl font-black text-emerald-400">{reportByDate.size}</div>
            <div className="mt-1 text-xs font-semibold text-slate-400">Calendar days with XLSX</div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-slate-900/70 p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Missed Days</div>
            <div className="mt-3 text-3xl font-black text-red-400">{missedDays.length}</div>
            <div className="mt-1 text-xs font-semibold text-slate-400">Trading days without uploads</div>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-slate-900/70 p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Latest File</div>
            <div className="mt-3 min-h-10 text-sm font-bold text-slate-100 line-clamp-2">{latestFile}</div>
            <div className="mt-1 text-xs font-semibold text-violet-400">
              {reportsList[0] ? formatDate(reportsList[0].asOfDate) : 'No date'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">Calendar View</h2>
                <p className="text-xs text-slate-500 mt-1">Green = uploaded, red = missed, grey = not expected yet</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-400"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Uploaded</span>
                <span className="flex items-center gap-1.5 text-red-400"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/70" /> Missed</span>
                <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-sm bg-slate-800" /> Not tracked</span>
              </div>
            </div>

            {reportsList.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-slate-500">
                <FileSpreadsheet size={44} className="opacity-30" />
                <p className="text-sm">Upload your first XLSX file to start tracking.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {months.map(month => (
                  <div key={month.toISOString()} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-100">
                        {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                      </h3>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {WEEKDAYS.map(day => (
                        <div key={day} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{day}</div>
                      ))}
                      {getCalendarDays(month).map((day, index) => {
                        if (!day) {
                          return <div key={`blank-${index}`} className="aspect-square rounded-lg bg-transparent" />;
                        }

                        const key = toDateKey(day);
                        const report = reportByDate.get(key);
                        // Exclude weekends from the expected range in the calendar
                        const inExpectedRange = day >= firstReportDate && day <= lastExpectedSnapshotDate && isBusinessDay(day);
                        const isUploaded = Boolean(report);
                        const isMissed = inExpectedRange && !isUploaded;
                        const title = report ? `${formatDate(report.asOfDate)} - ${report.filename}` : key;

                        return (
                          <div
                            key={key}
                            title={title}
                            className={`group relative flex aspect-square min-h-10 items-center justify-center rounded-lg border text-xs font-black transition ${
                              isUploaded
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : isMissed
                                  ? 'border-red-500/25 bg-red-500/10 text-red-300'
                                  : 'border-slate-800/60 bg-slate-900/60 text-slate-700'
                            }`}
                          >
                            {day.getDate()}
                            {report && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 rounded-lg">
                                <DeleteReportButton reportId={report.id} dateLabel={formatDate(report.asOfDate)} variant="icon" />
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
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-800/70 px-5 py-4">
              <FileSpreadsheet size={16} className="text-teal-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">Uploaded XLSX Files</h2>
            </div>
            <div className="max-h-[680px] overflow-y-auto">
              {reportsList.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No uploads yet.</div>
              ) : (
                <div className="divide-y divide-slate-800/70">
                  {reportsList.map((report: ReportRow) => (
                    <div key={report.id} className="p-5 hover:bg-slate-950/30 transition">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-black text-slate-100">
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            {formatDate(report.asOfDate)}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                            <Clock3 size={12} />
                            Uploaded {formatUploadedAt(report.uploadedAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`/?reportId=${report.id}`}
                            className="inline-flex items-center gap-1 bg-teal-500/15 border border-teal-500/20 px-2.5 py-1.5 text-[11px] font-bold text-teal-400 hover:bg-teal-500/30 rounded-lg transition"
                          >
                            View
                          </Link>
                          <DeleteReportButton reportId={report.id} dateLabel={formatDate(report.asOfDate)} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs font-semibold leading-relaxed text-slate-300 break-words">
                        {report.filename}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {missedDays.length > 0 && (
          <section className="mt-6 rounded-2xl border border-red-500/20 bg-slate-900/70 p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <XCircle size={17} className="text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">Missed Dates</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {missedDays.map(day => (
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
