"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import FolioBadge from "@/components/shared/FolioBadge";
import { formatCurrency, getFundDetailsUrl } from "@/helpers/formatters";
import type { AllocationAnalysisHoldingsBreakdownProps } from "@/types/insights";

export default function AllocationAnalysisHoldingsBreakdown({
  holdings,
  entityName,
  niftyBenchmark,
}: AllocationAnalysisHoldingsBreakdownProps) {
  return (
    <div className="px-6 py-5 flex flex-col gap-4 border-t border-slate-800/60 bg-slate-950/40 w-full">
      <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest">
        <Layers size={13} className="text-teal-400 animate-pulse" />
        <span>Funds & Holdings in {entityName} (Click card for details)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {holdings.map((hold, holdIdx) => {
          const isHoldZero = (hold.current ?? 0) <= 0.0001;
          return (
            <Link
              key={`${hold.holdingId}-${hold.schemeName}-${hold.memberName}-${hold.folioNo || holdIdx}`}
              href={getFundDetailsUrl(
                hold.holdingId,
                hold.isZeroBalance || hold.isSold || isHoldZero
              )}
              className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200 ease-out group shadow-lg h-full min-h-[160px] ${
                isHoldZero
                  ? "border-slate-800/80 bg-slate-950/40 opacity-70 hover:opacity-100 hover:border-slate-700 hover:bg-slate-900/60 hover:shadow-md hover:-translate-y-0.5"
                  : "border-slate-750 bg-slate-950/60 hover:border-teal-500/60 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-0.5"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 min-h-[2.85rem]">
                  <div
                    className={`font-bold transition-colors duration-200 break-words text-sm sm:text-base leading-snug line-clamp-2 ${
                      isHoldZero
                        ? "text-slate-400 group-hover:text-slate-200"
                        : "text-slate-100 group-hover:text-teal-300"
                    }`}
                  >
                    {hold.schemeName}
                  </div>
                  {isHoldZero && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0 whitespace-nowrap mt-0.5">
                      Zero Balance
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-400">
                  {hold.memberName}
                </div>
                <div className="mt-3 flex items-center flex-wrap gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-black shrink-0 ${
                      isHoldZero
                        ? "bg-slate-800 text-slate-400 border border-slate-700/60"
                        : (hold.cagr ?? 0) < 0
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : (hold.cagr ?? 0) >= niftyBenchmark
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {(hold.cagr ?? 0).toFixed(2)}% CAGR
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-black shrink-0 ${
                      isHoldZero
                        ? "bg-slate-800 text-slate-400 border border-slate-700/60"
                        : (hold.xirr ?? 0) >= niftyBenchmark
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {(hold.xirr ?? 0).toFixed(2)}% XIRR
                  </span>
                  <FolioBadge folioNo={hold.folioNo} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3.5 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                <div className="text-left">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    Invested
                  </span>
                  <span
                    className={`font-semibold block truncate mt-0.5 ${
                      isHoldZero ? "text-slate-500" : "text-slate-300"
                    }`}
                  >
                    {formatCurrency(hold.invested)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    Current
                  </span>
                  <span
                    className={`font-semibold block truncate mt-0.5 ${
                      isHoldZero ? "text-slate-500" : "text-slate-300"
                    }`}
                  >
                    {formatCurrency(hold.current)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    Gain
                  </span>
                  <span
                    className={`font-bold block truncate mt-0.5 ${
                      isHoldZero
                        ? "text-slate-500"
                        : hold.gain >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(hold.gain)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
