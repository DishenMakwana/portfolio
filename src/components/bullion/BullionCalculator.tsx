"use client";

import { Calculator, ChevronDown } from "lucide-react";
import { formatInr } from "@/helpers/formatters";
import { getPurityOptions } from "@/helpers/bullion";
import type { BullionCalculatorProps, GstType } from "@/types/bullion";

export default function BullionCalculator({
  selectedTab,
  purity,
  weight,
  makingCharges,
  gstType,
  baseValue,
  makingChargesVal,
  gstValue,
  totalAmount,
  onPurityChange,
  onWeightChange,
  onMakingChargesChange,
  onGstTypeChange,
}: BullionCalculatorProps): React.JSX.Element {
  return (
    <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Calculator size={18} className="text-teal-400" />
          <h2 className="text-base font-bold text-slate-200">
            Precious Metals Calculator
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Purity Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Purity
            </label>
            <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
              {getPurityOptions(selectedTab).map((opt) => (
                <button
                  key={opt}
                  onClick={() => onPurityChange(opt)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    purity === opt
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/20 font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Weight (gm) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Weight (gm)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={weight}
              onChange={(e) =>
                onWeightChange(Math.max(0, parseFloat(e.target.value) || 0))
              }
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          {/* Making Charges (%) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Making (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={makingCharges}
              onChange={(e) =>
                onMakingChargesChange(
                  Math.max(0, parseFloat(e.target.value) || 0)
                )
              }
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
        </div>

        {/* GST Option selector (Incl or Excl) */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            GST
          </label>
          <div className="relative w-40">
            <select
              value={gstType}
              onChange={(e) => onGstTypeChange(e.target.value as GstType)}
              className="appearance-none w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="Incl">Incl. 3%</option>
              <option value="Excl">Excl. 3%</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-3 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Calculator Output Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-800/80 rounded-xl overflow-hidden mt-4">
        <div className="p-4 bg-slate-950/20 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Base value</span>
            <span className="font-semibold text-slate-200">
              {formatInr(baseValue)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Making charges</span>
            <span className="font-semibold text-slate-200">
              {formatInr(makingChargesVal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">GST (3%)</span>
            <span className="font-semibold text-slate-200">
              {formatInr(gstValue)}
            </span>
          </div>
        </div>

        <div className="p-6 bg-teal-950/15 border-t md:border-t-0 md:border-l border-slate-800/80 flex flex-col justify-center items-center text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Amount
          </div>
          <div className="text-3xl font-black text-teal-400 tracking-tight">
            {formatInr(totalAmount)}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            Incl. all charges
          </div>
        </div>
      </div>
    </div>
  );
}
