import DeleteReportButton from "@/components/shared/DeleteReportButton";
import { toDateKey } from "@/helpers/dates";
import { formatLocalDateStr as formatDate } from "@/helpers/formatters";
import { getCalendarDays, isBusinessDay } from "@/helpers/uploadTracker";
import {
  WEEKDAYS,
  type UploadTrackerCalendarGridProps,
} from "@/types/upload-tracker";

export default function UploadTrackerCalendarGrid({
  activeMonth,
  reportByDate,
  firstReportDate,
  lastExpectedSnapshotDate,
}: UploadTrackerCalendarGridProps) {
  return (
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
          ? `#${report.id} - ${formatDate(report.asOfDate)} - ${report.filename}`
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
  );
}
