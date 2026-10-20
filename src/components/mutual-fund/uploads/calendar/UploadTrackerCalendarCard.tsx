import { FileSpreadsheet } from "lucide-react";
import UploadTrackerCalendarGrid from "./UploadTrackerCalendarGrid";
import UploadTrackerCalendarNav from "./UploadTrackerCalendarNav";
import type { UploadTrackerCalendarCardProps } from "@/types/upload-tracker";

export default function UploadTrackerCalendarCard({
  reportsCount,
  activeMonth,
  prevMonth,
  nextMonth,
  onPrevMonth,
  onNextMonth,
  reportByDate,
  firstReportDate,
  lastExpectedSnapshotDate,
}: UploadTrackerCalendarCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100">Calendar View</h2>
          <p className="text-xs text-slate-500 mt-1">
            Green = uploaded, red = missed, grey = not expected yet
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Uploaded
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500/70" /> Missed
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" /> Not tracked
          </span>
        </div>
      </div>

      {reportsCount === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-slate-500">
          <FileSpreadsheet size={44} className="opacity-30" />
          <p className="text-sm">
            Upload your first XLSX file to start tracking.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-5">
            <UploadTrackerCalendarNav
              activeMonth={activeMonth}
              prevMonth={prevMonth}
              nextMonth={nextMonth}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
            />

            <UploadTrackerCalendarGrid
              activeMonth={activeMonth}
              reportByDate={reportByDate}
              firstReportDate={firstReportDate}
              lastExpectedSnapshotDate={lastExpectedSnapshotDate}
            />
          </div>
        </div>
      )}
    </section>
  );
}
