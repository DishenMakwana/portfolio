import { XCircle } from "lucide-react";
import { toDateKey } from "@/helpers/dates";
import { formatLocalDateStr as formatDate } from "@/helpers/formatters";
import type { UploadTrackerMissedDatesCardProps } from "@/types/upload-tracker";

export default function UploadTrackerMissedDatesCard({
  missedDays,
}: UploadTrackerMissedDatesCardProps) {
  if (missedDays.length === 0) return null;

  return (
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
  );
}
