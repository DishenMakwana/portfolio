"use client";

import { PieChart, Building2 } from "lucide-react";
import type {
  WatchlistPortfolioBreakdownCardProps,
  WatchlistVroHolding,
  WatchlistVroSector,
} from "@/types/watchlist";

export default function WatchlistPortfolioBreakdownCard({
  vroPortfolio,
  growwTopHoldings,
}: WatchlistPortfolioBreakdownCardProps) {
  const hasVroSectors =
    vroPortfolio?.sectors && vroPortfolio.sectors.length > 0;
  const hasVroHoldings =
    vroPortfolio?.topHoldings && vroPortfolio.topHoldings.length > 0;
  const hasGrowwHoldings = growwTopHoldings && growwTopHoldings.length > 0;

  if (!hasVroSectors && !hasVroHoldings && !hasGrowwHoldings) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sector Allocation (Fund % vs Category %) */}
      {hasVroSectors && (
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Sector Allocation
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Fund vs Category
              </span>
            </div>

            <div className="space-y-3">
              {vroPortfolio!.sectors.map(
                (sec: WatchlistVroSector, idx: number) => {
                  return (
                    <div key={idx} className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-semibold text-slate-200">
                          {sec.sector}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-teal-300 font-bold">
                            {sec.fundPct.toFixed(1)}%
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            (Cat {sec.categoryPct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      {/* Progress bars */}
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex gap-0.5">
                        <div
                          style={{
                            width: `${Math.min(sec.fundPct * 2, 100)}%`,
                          }}
                          className="bg-teal-500 h-full rounded-full"
                          title={`Fund: ${sec.fundPct}%`}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {vroPortfolio?.asOfDate && (
            <div className="mt-4 pt-3 border-t border-slate-800/50 text-[11px] text-slate-500 text-right">
              As on {vroPortfolio.asOfDate}
            </div>
          )}
        </div>
      )}

      {/* Top Company Holdings */}
      <div
        className={`${
          hasVroSectors ? "lg:col-span-7" : "lg:col-span-12"
        } bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md`}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100">
              Top Portfolio Holdings
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {hasVroHoldings
              ? `${vroPortfolio!.topHoldings.length} Companies (VRO)`
              : `${growwTopHoldings?.length || 0} Companies (Groww)`}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                <th className="py-2.5 px-3">Company Name</th>
                <th className="py-2.5 px-3">Sector</th>
                {hasVroHoldings && (
                  <th className="py-2.5 px-3 text-right">P/E Ratio</th>
                )}
                <th className="py-2.5 px-3 text-right">% Assets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {hasVroHoldings
                ? vroPortfolio!.topHoldings.map(
                    (h: WatchlistVroHolding, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/30 transition text-slate-200"
                      >
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-100">
                          {h.companyName}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                          {h.sector || "--"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {h.peRatio !== null ? h.peRatio.toFixed(1) : "--"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-teal-300">
                          {h.assetPct.toFixed(2)}%
                        </td>
                      </tr>
                    )
                  )
                : growwTopHoldings?.map((h, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-800/30 transition text-slate-200"
                    >
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-100">
                        {h.companyName}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                        {h.sector || h.instrument || "--"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-teal-300">
                        {h.assetPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
