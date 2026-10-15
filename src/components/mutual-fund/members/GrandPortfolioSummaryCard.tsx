import DeltaBadge from "@/components/shared/DeltaBadge";
import {
  formatCurrency,
  formatPercent,
  formatHoldingYearsAndDays,
  formatMetricDiff,
} from "@/helpers/formatters";
import type { GrandPortfolioSummaryCardProps } from "@/types/members";

export default function GrandPortfolioSummaryCard({
  totals,
  metricDeltas,
  overallCagr,
  avgHoldingDays,
  selectedReport,
}: GrandPortfolioSummaryCardProps) {
  const isProfit = totals.gain >= 0;

  const cvDiff = formatMetricDiff(
    metricDeltas.currentValueDiff,
    isProfit ? "In Profit ↑" : "In Loss ↓",
    isProfit ? "text-emerald-400" : "text-red-400"
  );

  const ivDiffRes = formatMetricDiff(
    metricDeltas.investedDiff,
    "Principal Cost",
    "text-slate-500"
  );

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-6 shadow-xl relative overflow-hidden hover:border-slate-700/80 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-full bg-teal-400 inline-block" />
            Grand Portfolio Summary
            {metricDeltas.previousDate && (
              <span className="normal-case tracking-normal font-semibold text-slate-600">
                vs previous snapshot
              </span>
            )}
          </div>
          {selectedReport?.casId && (
            <span className="text-[10px] text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded font-bold border border-teal-500/25 tracking-normal normal-case">
              CAS ID: {selectedReport.casId}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-x-5 gap-y-4 font-semibold">
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Invested Value
            </div>
            <div
              className="text-xs sm:text-sm lg:text-base font-extrabold text-slate-100 mt-1 tracking-tight whitespace-nowrap"
              title={formatCurrency(totals.invested)}
            >
              {formatCurrency(totals.invested)}
            </div>
            <div
              className={`text-[10px] ${ivDiffRes.subColor} mt-0.5 whitespace-nowrap`}
            >
              {ivDiffRes.sub}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Current Value
            </div>
            <div
              className="text-xs sm:text-sm lg:text-base font-extrabold text-slate-100 mt-1 tracking-tight whitespace-nowrap"
              title={formatCurrency(totals.currentValue)}
            >
              {formatCurrency(totals.currentValue)}
            </div>
            <div
              className={`text-[10px] ${cvDiff.subColor} mt-0.5 whitespace-nowrap`}
            >
              {cvDiff.sub}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Unrealised Gain
            </div>
            <div
              className={`text-xs sm:text-sm lg:text-base font-extrabold mt-1 tracking-tight whitespace-nowrap ${
                totals.gain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
              title={formatCurrency(totals.gain)}
            >
              {formatCurrency(totals.gain)}
            </div>
            <div
              className={`text-[10px] mt-0.5 font-bold whitespace-nowrap ${
                totals.gain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {totals.absoluteReturn.toFixed(2)}% Absolute
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
              XIRR
            </div>
            <div className="text-xs sm:text-sm lg:text-base font-extrabold text-teal-400 mt-1 tracking-tight whitespace-nowrap">
              {formatPercent(totals.portfolioXirr)}
            </div>
            <div className="mt-1">
              <DeltaBadge delta={metricDeltas.portfolioXirr} />
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
              Annualised XIRR
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
              CAGR
            </div>
            <div className="text-xs sm:text-sm lg:text-base font-extrabold text-teal-400 mt-1 tracking-tight whitespace-nowrap">
              {formatPercent(overallCagr)}
            </div>
            <div className="mt-1">
              <DeltaBadge delta={metricDeltas.cagr} />
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
              {totals.cagr !== undefined && totals.cagr !== null
                ? "Excel Reported CAGR"
                : "Weighted CAGR"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Alpha
            </div>
            <div
              className={`text-xs sm:text-sm lg:text-base font-extrabold mt-1 tracking-tight whitespace-nowrap ${
                totals.alpha >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatPercent(totals.alpha)}
            </div>
            <div className="mt-1">
              <DeltaBadge delta={metricDeltas.alpha} />
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
              Vs Benchmark
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Holding Days
            </div>
            <div className="text-xs sm:text-sm lg:text-base font-extrabold text-slate-200 mt-1 tracking-tight whitespace-nowrap">
              {avgHoldingDays} Days
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
              {avgHoldingDays >= 30
                ? `${formatHoldingYearsAndDays(avgHoldingDays)} • Weighted Avg`
                : "Weighted Avg"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
