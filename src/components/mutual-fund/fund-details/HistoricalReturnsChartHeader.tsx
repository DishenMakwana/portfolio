import { TrendingUp, Calendar, Layers, Sparkles, X, Check } from "lucide-react";
import { formatNullableDate } from "@/helpers/formatters";
import type {
  FundTimeframe,
  HistoricalReturnsChartHeaderProps,
} from "@/types/fund-details";

export default function HistoricalReturnsChartHeader({
  timeframe,
  onTimeframeChange,
  earliestTxDateStr,
  onInvDateClick,
  customFromDate,
  customToDate,
  onCustomFromDateChange,
  onCustomToDateChange,
  isCustomDatePickerOpen,
  onToggleCustomDatePicker,
  onCloseCustomDatePicker,
  onApplyCustomRange,
  showHighLow,
  onToggleHighLow,
  schemeName,
  benchmarkName,
  earliestFundDateStr,
  earliestBenchDateStr,
  asOfDate,
}: HistoricalReturnsChartHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Row 1: Section Title + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-black text-slate-100 flex items-center gap-2.5">
          <TrendingUp size={20} className="text-teal-400" />
          <span>Historical Returns Analysis (%)</span>
        </h3>

        {/* Timeframe Filter Buttons, Inv Date & Custom Date Range Filter */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap relative">
          <div className="flex items-center bg-slate-950/80 border border-slate-800/80 p-1 rounded-xl shadow-inner gap-1">
            {(["3m", "6m", "1y", "3y", "5y", "all"] as FundTimeframe[]).map(
              (tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    onCloseCustomDatePicker();
                    onTimeframeChange(tf);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition duration-200 cursor-pointer ${
                    timeframe === tf
                      ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50 scale-105"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  {tf}
                </button>
              )
            )}

            {/* Inv Date Button (Starts graph from 1st Tx to Current Date!) */}
            {earliestTxDateStr && (
              <button
                onClick={onInvDateClick}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-200 cursor-pointer flex items-center gap-1.5 ${
                  timeframe === "invDate"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50 scale-105 font-black"
                    : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                }`}
                title={`Start graph from first transaction date (${earliestTxDateStr})`}
              >
                <Sparkles size={12} className="animate-pulse" />
                <span>Since 1st Tx</span>
              </button>
            )}
          </div>

          {/* Custom Date Range Filter Popover */}
          <div className="relative">
            <button
              onClick={onToggleCustomDatePicker}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition duration-200 cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                timeframe === "custom" || timeframe === "invDate"
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-teal-950/40"
                  : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Calendar
                size={13}
                className={
                  timeframe === "custom" || timeframe === "invDate"
                    ? "text-teal-400"
                    : ""
                }
              />
              <span>
                {timeframe === "custom" && customFromDate && customToDate
                  ? `${customFromDate} - ${customToDate}`
                  : timeframe === "invDate" && customFromDate
                    ? `1st Tx (${customFromDate})`
                    : "Custom Date"}
              </span>
            </button>

            {isCustomDatePickerOpen && (
              <div className="absolute right-0 top-full mt-2.5 z-50 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl w-72 flex flex-col gap-3.5 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-extrabold text-slate-100 flex items-center gap-1.5">
                    <Calendar size={14} className="text-teal-400" />
                    Custom Date Filter
                  </span>
                  <button
                    onClick={onCloseCustomDatePicker}
                    className="text-slate-500 hover:text-slate-300 p-0.5 rounded-md hover:bg-slate-800/60 transition"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => onCustomFromDateChange(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => onCustomToDateChange(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                    Quick Presets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {earliestTxDateStr && (
                      <button
                        onClick={() => {
                          const todayStr =
                            asOfDate || new Date().toISOString().split("T")[0];
                          onCustomFromDateChange(earliestTxDateStr);
                          onCustomToDateChange(todayStr);
                          onApplyCustomRange(earliestTxDateStr, todayStr);
                        }}
                        className="px-2.5 py-1 bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 rounded-lg text-[11px] font-bold hover:bg-emerald-900/60 transition"
                      >
                        Since 1st Tx ({earliestTxDateStr})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const todayStr =
                          asOfDate || new Date().toISOString().split("T")[0];
                        const ytdStr = `${new Date().getFullYear()}-01-01`;
                        onCustomFromDateChange(ytdStr);
                        onCustomToDateChange(todayStr);
                        onApplyCustomRange(ytdStr, todayStr);
                      }}
                      className="px-2.5 py-1 bg-slate-800/60 text-slate-300 border border-slate-700/50 rounded-lg text-[11px] font-bold hover:bg-slate-700/60 transition"
                    >
                      YTD (Jan 1)
                    </button>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => onApplyCustomRange()}
                    disabled={!customFromDate || !customToDate}
                    className="flex-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black py-1.5 px-3 rounded-xl transition duration-200 text-xs shadow-md shadow-teal-950/40 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Apply Range</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleHighLow}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition duration-200 cursor-pointer border flex items-center gap-1.5 shadow-sm ${
              showHighLow
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-950/40"
                : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
            title="Toggle High and Low points on graph"
          >
            <Layers size={13} />
            <span>High / Low</span>
          </button>
        </div>
      </div>

      {/* Row 2: Legend Cards (Fund & Benchmark Side-by-Side) */}
      <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-800/60">
        <div className="inline-flex items-center gap-2 text-xs font-medium bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-slate-300 shadow-sm">
          <span className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white"></span>
          </span>
          <span className="font-bold text-slate-200">
            {schemeName || "Fund"}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            Available Since:{" "}
            <strong className="text-slate-200">
              {formatNullableDate(earliestFundDateStr || null)}
            </strong>
          </span>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-medium bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-slate-300 shadow-sm">
          <span className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-indigo-500/20"></span>
            <span className="w-2 h-2 rotate-45 rounded-[0.5px] bg-indigo-400 border border-white"></span>
          </span>
          <span className="font-bold text-slate-200">
            {benchmarkName || "Benchmark"}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            Available Since:{" "}
            <strong className="text-slate-200">
              {formatNullableDate(earliestBenchDateStr || null)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
