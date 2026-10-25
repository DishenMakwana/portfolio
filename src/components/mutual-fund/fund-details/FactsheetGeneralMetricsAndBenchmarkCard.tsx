import { Layers, AlertTriangle } from "lucide-react";
import { formatHoldingYearsAndDays } from "@/helpers/formatters";
import type { FactsheetGeneralMetricsAndBenchmarkCardProps } from "@/types/fund-details";

export default function FactsheetGeneralMetricsAndBenchmarkCard({
  holding,
  isStock,
  factsheetMeta,
}: FactsheetGeneralMetricsAndBenchmarkCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* SNAPSHOT FIELDS DETAIL */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl md:col-span-2 backdrop-blur-sm">
        <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-850 pb-2">
          <Layers size={18} className="text-teal-400" />
          <span>Excel Sheet Data Fields</span>
        </h3>

        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
          <div className="border-b border-slate-850/60 pb-2">
            <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
              {isStock ? "Quantity" : "Balance Units"}
            </div>
            <div className="text-slate-200 mt-0.5 font-bold">
              {isStock
                ? holding.balanceUnits.toLocaleString("en-IN")
                : holding.balanceUnits.toFixed(4)}
            </div>
          </div>
          <div className="border-b border-slate-850/60 pb-2">
            <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
              Holding Period
            </div>
            <div className="text-slate-200 mt-0.5 font-bold">
              {holding.holdingDays} Days
              {holding.holdingDays >= 30
                ? ` (${formatHoldingYearsAndDays(holding.holdingDays)})`
                : ""}
            </div>
          </div>
          <div className="border-b border-slate-850/60 pb-2">
            <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
              {isStock ? "Avg Purchase Price" : "Purchase NAV"}
            </div>
            <div className="text-slate-200 mt-0.5 font-bold">
              ₹{holding.purchaseNav.toFixed(4)}
            </div>
          </div>
          <div className="border-b border-slate-850/60 pb-2">
            <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
              {isStock ? "Current Price" : "Current NAV"}
            </div>
            <div className="text-slate-200 mt-0.5 font-bold">
              ₹{holding.currentNav.toFixed(4)}
            </div>
          </div>
          {!isStock && (
            <>
              <div className="border-b border-slate-850/60 pb-2">
                <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                  Dividend Paid
                </div>
                <div className="text-slate-200 mt-0.5 font-bold">
                  ₹{(holding.dividend ?? 0).toFixed(2)}
                </div>
              </div>
              <div className="border-b border-slate-850/60 pb-2">
                <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                  Report CAGR
                </div>
                <div className="text-slate-200 mt-0.5 font-black">
                  {holding.cagr !== null && holding.cagr !== undefined
                    ? `${holding.cagr.toFixed(2)}%`
                    : "-"}
                </div>
              </div>
            </>
          )}
          {holding.freeQuantity !== undefined &&
            holding.freeQuantity !== null && (
              <div className="border-b border-slate-850/60 pb-2">
                <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                  Free Quantity
                </div>
                <div className="text-slate-200 mt-0.5 font-bold">
                  {holding.freeQuantity.toFixed(3)}
                </div>
              </div>
            )}
          {holding.frozenQuantity !== undefined &&
            holding.frozenQuantity !== null &&
            holding.frozenQuantity > 0 && (
              <div className="border-b border-slate-850/60 pb-2">
                <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                  Frozen Quantity
                </div>
                <div className="text-slate-200 mt-0.5 font-bold text-red-400">
                  {holding.frozenQuantity.toFixed(3)}
                </div>
              </div>
            )}
          {holding.pledgedQuantity !== undefined &&
            holding.pledgedQuantity !== null &&
            holding.pledgedQuantity > 0 && (
              <div className="border-b border-slate-850/60 pb-2">
                <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                  Pledged Quantity
                </div>
                <div className="text-slate-200 mt-0.5 font-bold text-amber-400">
                  {holding.pledgedQuantity.toFixed(3)}
                </div>
              </div>
            )}
          {holding.lockinQuantity !== undefined &&
            holding.lockinQuantity !== null &&
            holding.lockinQuantity > 0 && (
              <>
                <div className="border-b border-slate-850/60 pb-2">
                  <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    Lock-in Quantity
                  </div>
                  <div className="text-slate-200 mt-0.5 font-bold text-teal-400">
                    {holding.lockinQuantity.toFixed(3)}
                  </div>
                </div>
                {holding.lockinDate && (
                  <div className="border-b border-slate-850/60 pb-2">
                    <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                      Lock-in Release Date
                    </div>
                    <div className="text-slate-200 mt-0.5 font-bold">
                      {new Date(holding.lockinDate).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                      {holding.balanceDescription &&
                        ` (${holding.balanceDescription})`}
                    </div>
                  </div>
                )}
              </>
            )}
          <div className="col-span-2">
            <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
              Comments
            </div>
            <div className="text-slate-300 mt-1 italic text-xs bg-slate-950/40 p-3.5 border border-slate-850 rounded-xl leading-relaxed">
              {holding.comments || "No comments found in Excel file."}
            </div>
          </div>
        </div>
      </div>

      {/* BENCHMARK STATUS CARD */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-850 pb-2">
            <span>Benchmark Integration</span>
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-start gap-x-4 text-sm">
              <span className="text-slate-400 font-medium shrink-0">
                Benchmark Fund:
              </span>
              <span className="font-semibold text-slate-200 text-right text-xs">
                {factsheetMeta.profile.benchmarkFundName ||
                  factsheetMeta.profile.benchmarkName}
                {factsheetMeta.profile.benchmarkCode
                  ? ` (${factsheetMeta.profile.benchmarkCode})`
                  : ""}
              </span>
            </div>
            <div className="flex justify-between items-start gap-x-4 text-sm">
              <span className="text-slate-400 font-medium shrink-0">
                Benchmark Index:
              </span>
              <span className="font-semibold text-slate-200 text-right text-xs">
                {factsheetMeta.profile.benchmarkName || "Nifty 50 TRI"}
              </span>
            </div>
            <div className="flex justify-between items-center gap-x-4 text-sm">
              <span className="text-slate-400 font-medium shrink-0">
                {isStock ? "Stock Symbol:" : "Scheme Code:"}
              </span>
              {holding.schemeCodeApi ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/20 px-2.5 py-0.5 border border-emerald-900/40 rounded text-xs">
                  {holding.schemeCodeApi}
                </span>
              ) : (
                <span className="text-amber-500 bg-amber-950/20 px-2.5 py-0.5 border border-amber-900/40 rounded text-xs flex items-center gap-1 font-bold">
                  <AlertTriangle size={12} />
                  <span>Unmapped</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
              {isStock
                ? `For stock holdings, we query historical daily price charts and metrics directly from Yahoo Finance API. Outperformance metrics are calculated against the ${factsheetMeta.profile.benchmarkName || "Nifty 50 TRI"}.`
                : `When mapped, we download historical NAV details from \`api.mfapi.in\` dynamically. Transactions are mirrored into ${factsheetMeta.profile.benchmarkFundName || factsheetMeta.profile.benchmarkName} to compute true portfolio outperformance.`}
            </p>
          </div>
        </div>

        {!holding.schemeCodeApi && (
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300 mt-4 leading-relaxed font-semibold">
            {isStock
              ? "Ensure symbol is mapped correctly in the mapping tab to unlock stock metrics."
              : "Assign a Scheme Code in the mapping tab to unlock dynamic Alpha calculations."}
          </div>
        )}
      </div>
    </div>
  );
}
