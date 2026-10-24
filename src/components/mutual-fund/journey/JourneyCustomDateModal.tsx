"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Check } from "lucide-react";
import type { JourneyCustomDateModalProps } from "@/types/journey";

export default function JourneyCustomDateModal({
  isOpen,
  onClose,
  onApply,
  currentStart,
  currentEnd,
  minDate,
  maxDate,
}: JourneyCustomDateModalProps) {
  const [start, setStart] = useState(currentStart);
  const [end, setEnd] = useState(currentEnd);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStart(currentStart);
      setEnd(currentEnd);
      setError(null);
    }
  }, [isOpen, currentStart, currentEnd]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!start || !end) {
      setError("Please select both start and end dates.");
      return;
    }
    if (start > end) {
      setError("Start date cannot be after end date.");
      return;
    }
    setError(null);
    onApply(start, end);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-white space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-lg text-white">
              Select Custom Date Range
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={start}
              min={minDate}
              max={end || maxDate}
              onChange={(e) => {
                setStart(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              To Date
            </label>
            <input
              type="date"
              value={end}
              min={start || minDate}
              max={maxDate}
              onChange={(e) => {
                setEnd(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500 transition"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20 transition"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
}
