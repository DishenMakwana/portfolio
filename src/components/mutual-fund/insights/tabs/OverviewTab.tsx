import { motion } from "framer-motion";
import DonutChart from "@/components/shared/DonutChart";
import PortfolioScoreCard from "@/components/shared/PortfolioScoreCard";
import SummaryMetricCards from "@/components/shared/SummaryMetricCards";
import { formatCurrency } from "@/helpers/formatters";
import type { OverviewTabProps } from "@/types/insights";

export default function OverviewTab({
  data,
  weightedCagr,
  benchmarkDelta,
  benchmarkLabel,
  portfolioXirr,
  benchmarkXirr,
  xirrRating,
  cagrSubMetrics,
  xirrSubMetrics,
  memberSipTotals,
  getCategoryDotClass,
  getCategoryGradientClass,
  getCategoryColor,
  getXirrGrade,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      <SummaryMetricCards
        invested={data.totals.invested}
        current={data.totals.current}
        gain={data.totals.gain}
        absReturn={data.totals.absReturn}
        weightedCagr={weightedCagr}
        benchmarkDelta={benchmarkDelta}
      />

      {/* Category Allocation + Donut */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
            Category Allocation
          </h2>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider pb-2 mb-2 border-b border-slate-800/40">
            <span className="pl-4">Category / Fund Name</span>
            <div className="flex items-center gap-3 ml-3 shrink-0">
              <span className="hidden sm:inline w-28 lg:w-32 text-right">
                Amount
              </span>
              <span className="w-24 text-right">Absolute Return</span>
              <span className="w-16 text-right">Allocation</span>
            </div>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar [scrollbar-gutter:stable]">
            {data.categoryAllocation.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDotClass(cat.category)}`}
                    />
                    <span
                      className="font-semibold text-slate-200 leading-snug"
                      title={cat.category}
                    >
                      {cat.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className="text-slate-500 hidden sm:inline w-28 lg:w-32 text-right font-medium tabular-nums">
                      {formatCurrency(cat.current)}
                    </span>
                    <span
                      className={`font-semibold text-xs w-24 text-right ${
                        cat.gain >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {cat.absReturn}%
                    </span>
                    <span className="font-bold text-slate-300 w-16 text-right tabular-nums">
                      {cat.allocation}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.allocation}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className={`h-full rounded-full ${getCategoryGradientClass(cat.category)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 flex flex-col shadow-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
            Allocation Mix
          </h2>
          <div className="flex justify-center">
            <div className="w-36 h-36">
              <DonutChart
                slices={data.categoryAllocation.map((c) => ({
                  label: c.category,
                  value: c.allocation,
                  color: getCategoryColor(c.category),
                }))}
              />
            </div>
          </div>
          <div className="mt-4 space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
            {data.categoryAllocation.map((c) => (
              <div key={c.category} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDotClass(c.category)}`}
                />
                <span
                  className="text-xs text-slate-400 leading-snug flex-1"
                  title={c.category}
                >
                  {c.category}
                </span>
                <span className="text-xs font-semibold text-slate-300 tabular-nums shrink-0">
                  {c.allocation}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Health + SIP Summary */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <PortfolioScoreCard
            title="Portfolio CAGR Score"
            grade={getXirrGrade(weightedCagr).grade}
            statusText={getXirrGrade(weightedCagr).text}
            primaryValueText={`${weightedCagr.toFixed(1)}% avg CAGR vs ${benchmarkLabel}`}
            progressValue={weightedCagr}
            subMetrics={cagrSubMetrics}
          />

          <PortfolioScoreCard
            title="Portfolio XIRR Score"
            grade={xirrRating.grade}
            statusText={xirrRating.text}
            primaryValueText={`${portfolioXirr.toFixed(1)}% portfolio XIRR vs Benchmark XIRR ${benchmarkXirr.toFixed(1)}%`}
            progressValue={portfolioXirr}
            subMetrics={xirrSubMetrics}
          />
        </div>

        {/* SIP Summary */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 space-y-3 shadow-xl h-fit">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            SIP Summary
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              {formatCurrency(data.totals.totalMonthlySip)}
            </span>
            <span className="text-slate-500 text-sm">/ month</span>
          </div>
          <p className="text-xs text-slate-400">
            Active across {new Set(data.sips.map((s) => s.member)).size} members
            · {data.sips.length} mandates
          </p>
          <div className="space-y-2 mt-2">
            {Array.from(new Set(data.sips.map((s) => s.member))).map(
              (member) => {
                const stats = memberSipTotals[member] || {
                  sipsCount: 0,
                  totalAmount: 0,
                };
                const shortName = member.split(" ")[0];
                return (
                  <div
                    key={member}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-400">{shortName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {stats.sipsCount} SIPs
                      </span>
                      <span className="font-semibold text-teal-300">
                        {formatCurrency(stats.totalAmount)}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
