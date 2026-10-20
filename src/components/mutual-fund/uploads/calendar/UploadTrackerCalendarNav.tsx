import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UploadTrackerCalendarNavProps } from "@/types/upload-tracker";

export default function UploadTrackerCalendarNav({
  activeMonth,
  prevMonth,
  nextMonth,
  onPrevMonth,
  onNextMonth,
}: UploadTrackerCalendarNavProps) {
  return (
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
          onClick={onPrevMonth}
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
          onClick={onNextMonth}
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
  );
}
