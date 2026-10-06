"use client";

import { Target } from "lucide-react";
import { formatCroreOrLakh, PRESET_GOALS } from "@/helpers/futureProjection";
import type { FutureProjectionGoalSliderProps } from "@/types/futureProjection";

export function FutureProjectionGoalSlider({
  targetAmount,
  onTargetAmountChange,
  currentPortfolioValue,
  minTargetGoal,
  maxTargetGoal,
}: FutureProjectionGoalSliderProps) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-4">
      {/* Header & Main Target Goal Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-4.5 h-4.5 text-emerald-400" />
            <span>Target Portfolio Goal (₹)</span>
          </label>
          <span className="text-lg font-black text-emerald-400 tracking-tight">
            {formatCroreOrLakh(targetAmount)}
          </span>
        </div>

        <input
          type="range"
          min={minTargetGoal}
          max={maxTargetGoal}
          step={25_00_000}
          value={Math.max(targetAmount, minTargetGoal)}
          onChange={(e) => onTargetAmountChange(Number(e.target.value))}
          className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-950 border border-slate-800 rounded-lg"
        />

        <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-0.5">
          <span>Min ({formatCroreOrLakh(minTargetGoal)})</span>
          <span>₹10 Cr (Target)</span>
          <span>Max (₹50 Cr)</span>
        </div>
      </div>

      {/* Quick Goal Preset Buttons (Strictly > Current Portfolio Value) */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
          QUICK PRESETS:
        </span>
        {PRESET_GOALS.filter((p) => p.value > currentPortfolioValue).map(
          (preset) => {
            const isActive = targetAmount === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onTargetAmountChange(preset.value)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20 scale-105"
                    : "bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {preset.label}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
