"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { formatDisplayDate } from "@/helpers/dates";
import { JOURNEY_TIMEFRAME_OPTIONS } from "@/types/journey";
import type {
  JourneyFilterToolbarProps,
  JourneyTimeframeFilter,
} from "@/types/journey";
import JourneyCustomDateModal from "./JourneyCustomDateModal";

export default function JourneyFilterToolbar({
  activeFilter,
  onFilterChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  minDate,
  maxDate,
}: JourneyFilterToolbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (key: JourneyTimeframeFilter) => {
    if (key === "custom") {
      setIsModalOpen(true);
    } else {
      onFilterChange(key);
    }
  };

  const handleApplyCustom = (start: string, end: string) => {
    onCustomDateChange(start, end);
  };

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap ml-auto">
      {JOURNEY_TIMEFRAME_OPTIONS.map((opt) => {
        const isActive = activeFilter === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => handleSelect(opt.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${
              isActive
                ? "bg-teal-500/15 border border-teal-500/40 text-teal-300 shadow-sm shadow-teal-500/10"
                : "bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 hover:border-slate-700/80"
            }`}
          >
            {opt.key === "custom" && <Calendar className="w-3.5 h-3.5" />}
            <span>{opt.label}</span>
            {opt.key === "custom" && activeFilter === "custom" && (
              <span className="text-[10px] text-teal-400 font-mono ml-0.5">
                ({formatDisplayDate(customStartDate)} to{" "}
                {formatDisplayDate(customEndDate)})
              </span>
            )}
          </button>
        );
      })}

      <JourneyCustomDateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApply={handleApplyCustom}
        currentStart={customStartDate}
        currentEnd={customEndDate}
        minDate={minDate}
        maxDate={maxDate}
      />
    </div>
  );
}
