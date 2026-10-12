"use client";

import { Calendar, ChevronDown } from "lucide-react";
import type { FyTrackerHeaderProps } from "@/types/insights";

export function FyTrackerHeader({
  selectedFy,
  availableFys,
  onFyChange,
  isPending,
}: FyTrackerHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Financial Year Investment Tracker
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedFy.label} ({selectedFy.startDate} to {selectedFy.endDate}
              )
            </p>
          </div>
        </div>
      </div>

      {/* Dropdown Filter */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
          Select FY:
        </span>
        <div className="relative flex-1 sm:w-52">
          <select
            value={selectedFy.label}
            onChange={(e) => onFyChange(e.target.value)}
            disabled={isPending}
            className="w-full appearance-none rounded-xl border border-teal-500/30 bg-slate-800/90 px-4 py-2.5 pr-10 text-sm font-semibold text-teal-300 shadow-lg backdrop-blur-md transition-all focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
          >
            {availableFys.map((fy) => (
              <option
                key={fy.label}
                value={fy.label}
                className="bg-slate-900 text-slate-200"
              >
                {fy.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-400"
          />
        </div>
      </div>
    </div>
  );
}
