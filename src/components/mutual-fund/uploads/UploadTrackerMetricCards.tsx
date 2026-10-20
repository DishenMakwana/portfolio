import { formatLocalDateStr as formatDate } from "@/helpers/formatters";
import type { UploadTrackerMetricCardsProps } from "@/types/upload-tracker";

export default function UploadTrackerMetricCards({
  totalSnapshots,
  uploadedDaysCount,
  missedDaysCount,
  latestReport,
}: UploadTrackerMetricCardsProps) {
  const latestFile = latestReport?.filename || "No uploads yet";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Snapshots */}
      <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 p-5 shadow-xl">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Total Snapshots
        </div>
        <div className="mt-3 text-3xl font-black text-slate-100">
          {totalSnapshots}
        </div>
        <div className="mt-1 text-xs font-semibold text-teal-400">
          Stored in database
        </div>
      </div>

      {/* Uploaded Days */}
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-5 shadow-xl">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Uploaded Days
        </div>
        <div className="mt-3 text-3xl font-black text-emerald-400">
          {uploadedDaysCount}
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-400">
          Calendar days with XLSX
        </div>
      </div>

      {/* Missed Days */}
      <div className="rounded-2xl border border-red-500/20 bg-slate-900/70 p-5 shadow-xl">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Missed Days
        </div>
        <div className="mt-3 text-3xl font-black text-red-400">
          {missedDaysCount}
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-400">
          Trading days without uploads
        </div>
      </div>

      {/* Latest File */}
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
          {latestReport
            ? `#${latestReport.id} • ${formatDate(latestReport.asOfDate)}`
            : "No date"}
        </div>
      </div>
    </div>
  );
}
