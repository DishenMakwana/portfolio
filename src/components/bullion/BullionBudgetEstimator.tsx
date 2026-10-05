"use client";

import { HelpCircle } from "lucide-react";
import type { BullionBudgetEstimatorProps } from "@/types/bullion";

export default function BullionBudgetEstimator({
  selectedTab,
  purity,
  budget,
  calculatedWeight,
  onBudgetChange,
  onCalculate,
}: BullionBudgetEstimatorProps): React.JSX.Element {
  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle size={18} className="text-teal-400" />
          <h2 className="text-base font-bold text-slate-200">
            Know your money's worth!
          </h2>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Enter any budget amount to find out the approximate physical metal
          weight you can obtain under current rates and charges.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Budget (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-slate-400 text-sm font-semibold">
                ₹
              </span>
              <input
                type="number"
                min="1"
                value={budget}
                onChange={(e) =>
                  onBudgetChange(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 transition"
              />
            </div>
          </div>

          <button
            onClick={onCalculate}
            className="w-full py-2 bg-teal-500 hover:bg-teal-600 active:scale-[0.98] text-slate-950 font-bold rounded-xl transition shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            Try now
          </button>
        </div>
      </div>

      {calculatedWeight !== null && (
        <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-4 text-center mt-6">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Purchasable weight
          </div>
          <div className="text-2xl font-black text-slate-200 tracking-tight">
            {calculatedWeight.toFixed(3)} gm
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1">
            of {purity} {selectedTab}
          </div>
        </div>
      )}
    </div>
  );
}
