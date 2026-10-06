"use client";

import { Sliders } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import { formatCroreOrLakh } from "@/helpers/futureProjection";
import type { FutureProjectionParametersProps } from "@/types/futureProjection";

export function FutureProjectionParameters({
  targetAmount,
  onTargetAmountChange,
  currentPortfolioValue,
  onCurrentPortfolioChange,
  investedCapital,
  onInvestedCapitalChange,
  monthlySip,
  onMonthlySipChange,
  annualLumpSum,
  onAnnualLumpSumChange,
  expectedXirrPct,
  onExpectedXirrChange,
  defaultXirr,
  annualStepUpPct,
  onAnnualStepUpChange,
  inflationPct,
  onInflationChange,
}: FutureProjectionParametersProps) {
  return (
    <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
            Investment & Return Parameters
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Adjust parameters to model scenarios
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Target Amount Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Target Portfolio Goal (₹)</span>
            <span className="text-amber-400 font-bold">
              {formatCroreOrLakh(targetAmount)}
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={1000000}
              step={1000000}
              value={targetAmount}
              onChange={(e) =>
                onTargetAmountChange(Math.max(0, Number(e.target.value)))
              }
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
            />
          </div>
        </div>

        {/* Current Portfolio Value Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Current Portfolio Value (₹)</span>
            <span className="text-teal-400 font-bold">
              {formatCroreOrLakh(currentPortfolioValue)}
            </span>
          </label>
          <input
            type="number"
            min={0}
            step={50000}
            value={currentPortfolioValue}
            onChange={(e) => onCurrentPortfolioChange(Number(e.target.value))}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
          />
        </div>

        {/* Total Invested Capital (Cost Basis) Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Total Invested Capital (Cost) (₹)</span>
            <span className="text-teal-300 font-bold">
              {formatCroreOrLakh(investedCapital)}
            </span>
          </label>
          <input
            type="number"
            min={0}
            step={50000}
            value={investedCapital}
            onChange={(e) =>
              onInvestedCapitalChange(Math.max(0, Number(e.target.value)))
            }
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
          />
        </div>

        {/* Monthly SIP Contribution Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Monthly SIP Contribution (₹)</span>
            <span className="text-emerald-400 font-bold">
              {formatCurrency(monthlySip, 0)}/mo
            </span>
          </label>
          <input
            type="number"
            min={0}
            step={5000}
            value={monthlySip}
            onChange={(e) =>
              onMonthlySipChange(Math.max(0, Number(e.target.value)))
            }
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
          />
        </div>

        {/* Future Lump-Sum Addition Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Annual Lump-Sum Top-Up (₹/yr)</span>
            <span className="text-blue-400 font-bold">
              {annualLumpSum > 0
                ? `+${formatCurrency(annualLumpSum, 0)}/yr`
                : "None"}
            </span>
          </label>
          <input
            type="number"
            min={0}
            step={50000}
            value={annualLumpSum}
            onChange={(e) =>
              onAnnualLumpSumChange(Math.max(0, Number(e.target.value)))
            }
            placeholder="e.g. 100000"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shadow-inner"
          />
        </div>

        {/* Expected XIRR Return Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span>Expected Return (XIRR % p.a.)</span>
            <span className="text-teal-400 font-extrabold">
              {expectedXirrPct}%
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={25}
            step={0.5}
            value={expectedXirrPct}
            onChange={(e) => onExpectedXirrChange(Number(e.target.value))}
            className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>4% (Debt)</span>
            <span>{defaultXirr}% (Portfolio XIRR)</span>
            <span>25% (High Growth)</span>
          </div>
        </div>

        {/* Annual Step-up SIP Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span>Annual SIP Step-Up (%)</span>
            <span className="text-emerald-400 font-extrabold">
              {annualStepUpPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={25}
            step={1}
            value={annualStepUpPct}
            onChange={(e) => onAnnualStepUpChange(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>0% (Fixed)</span>
            <span>10% (Std Step-Up)</span>
            <span>25% (Salary Growth)</span>
          </div>
        </div>

        {/* Expected Inflation Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span>Expected Inflation (%)</span>
            <span className="text-amber-400 font-extrabold">
              {inflationPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={inflationPct}
            onChange={(e) => onInflationChange(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>0% (Nominal)</span>
            <span>6% (India Avg)</span>
            <span>12% (High)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
