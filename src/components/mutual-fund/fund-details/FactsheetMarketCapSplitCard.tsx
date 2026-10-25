import { motion } from "framer-motion";
import { PieChart, RotateCw } from "lucide-react";
import type { FactsheetMarketCapSplitCardProps } from "@/types/fund-details";

export default function FactsheetMarketCapSplitCard({
  factsheetMeta,
  rankingsData,
  vroPortfolio,
  schemeCodeApi,
  holdingSchemeCodeApi,
  isRefreshingVro,
  onRefreshMarketCap,
  isRefreshingMarketCap,
}: FactsheetMarketCapSplitCardProps) {
  const largeCapVal =
    vroPortfolio?.marketCap?.largeCap ?? rankingsData?.marketCap?.largeCap ?? 0;
  const midCapVal =
    vroPortfolio?.marketCap?.midCap ?? rankingsData?.marketCap?.midCap ?? 0;
  const smallCapVal =
    vroPortfolio?.marketCap?.smallCap ?? rankingsData?.marketCap?.smallCap ?? 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
      <div>
        <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-5">
          <h3 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
            <PieChart size={18} className="text-teal-400" />
            <span>Market Cap Split (%)</span>
          </h3>
          <button
            type="button"
            onClick={onRefreshMarketCap}
            disabled={
              isRefreshingMarketCap ||
              isRefreshingVro ||
              (!schemeCodeApi && !holdingSchemeCodeApi)
            }
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-emerald-400 hover:border-slate-700 transition disabled:opacity-50"
            title="Sync Market Cap Data from Groww and Value Research Online"
          >
            <RotateCw
              size={14}
              className={
                isRefreshingMarketCap || isRefreshingVro
                  ? "animate-spin text-emerald-400"
                  : ""
              }
            />
          </button>
        </div>

        <div className="space-y-4">
          {/* Large Cap */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300">Large Cap</span>
              <span className="text-sky-400 font-extrabold">
                {largeCapVal.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
              <motion.div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.max(0, largeCapVal))}%`,
                }}
              />
            </div>
          </div>

          {/* Mid Cap */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300">Mid Cap</span>
              <span className="text-emerald-400 font-extrabold">
                {midCapVal.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
              <motion.div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.max(0, midCapVal))}%`,
                }}
              />
            </div>
          </div>

          {/* Small Cap */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300">Small Cap</span>
              <span className="text-amber-400 font-extrabold">
                {smallCapVal.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
              <motion.div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.max(0, smallCapVal))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Exit Load */}
        {(rankingsData?.exitLoadTax?.exitLoad ||
          factsheetMeta.profile.exitLoad) && (
          <div className="border-t border-slate-850 pt-3.5 mt-4 text-left">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-1.5">
                Exit Load
              </span>
              <div className="text-xs text-slate-200 bg-slate-950/50 p-3 border border-slate-800/80 rounded-xl leading-relaxed font-medium">
                {rankingsData?.exitLoadTax?.exitLoad ||
                  factsheetMeta.profile.exitLoad}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed">
        Note: Market capitalization split reflects underlying portfolio
        companies categorized into Large, Mid, and Small Cap.
      </div>
    </div>
  );
}
