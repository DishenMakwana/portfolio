"use client";

import { Calendar, ChevronDown, Layers } from "lucide-react";
import type {
  NiftyChartControlsProps,
  NiftyTimeframe,
} from "@/types/nifty-analysis";

const TIMEFRAMES: NiftyTimeframe[] = ["1Y", "3Y", "5Y", "10Y", "ALL"];

export function NiftyChartControls({
  timeframe,
  onTimeframeChange,
  txFilter,
  onTxFilterChange,
  showValuationZones,
  onToggleValuationZones,
  availableYears,
  tradeMode,
  transactionsCount,
  higherCount,
  sipCount,
  lumpCount,
  redemptionCount,
  switchOutCount,
}: NiftyChartControlsProps) {
  const isYearSelected = timeframe.startsWith("year_");

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
      <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 overflow-x-auto">
        {/* All Transactions (Buys or Sells) */}
        <button
          type="button"
          onClick={() => onTxFilterChange("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            txFilter === "all"
              ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <span>{tradeMode === "BUY" ? "All Buys" : "All Sells"}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
              txFilter === "all"
                ? "bg-slate-950/30 text-slate-950"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {transactionsCount}
          </span>
        </button>

        {/* Above Spot */}
        <button
          type="button"
          onClick={() => onTxFilterChange("higher_only")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            txFilter === "higher_only"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Above Spot</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
              txFilter === "higher_only"
                ? "bg-amber-500/30 text-amber-200"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {higherCount}
          </span>
        </button>

        {/* Type-Specific Filter Tabs */}
        {tradeMode === "BUY" ? (
          <>
            {/* SIPs Only */}
            <button
              type="button"
              onClick={() => onTxFilterChange("sip_only")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                txFilter === "sip_only"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span>SIPs</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  txFilter === "sip_only"
                    ? "bg-slate-950/30 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {sipCount}
              </span>
            </button>

            {/* Lumpsum Only */}
            <button
              type="button"
              onClick={() => onTxFilterChange("lumpsum_only")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                txFilter === "lumpsum_only"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span>Lumpsum</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  txFilter === "lumpsum_only"
                    ? "bg-slate-950/30 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {lumpCount}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Redemptions Only */}
            <button
              type="button"
              onClick={() => onTxFilterChange("redemption_only")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                txFilter === "redemption_only"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span>Redemptions</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  txFilter === "redemption_only"
                    ? "bg-slate-950/30 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {redemptionCount}
              </span>
            </button>

            {/* Switch Out Only */}
            <button
              type="button"
              onClick={() => onTxFilterChange("switch_out_only")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                txFilter === "switch_out_only"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span>Switch Out</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  txFilter === "switch_out_only"
                    ? "bg-slate-950/30 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {switchOutCount}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Right: Timeframe & Valuation Zones Controls Capsule */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Horizon Relative Ranges Segmented Bar */}
        <div className="flex items-center h-9 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner box-border">
          {TIMEFRAMES.map((tf) => (
            <button
              type="button"
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`h-full px-3 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === tf
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Clean Dropdown for Specific Calendar Year */}
        {availableYears.length > 0 && (
          <div
            className={`relative flex items-center h-9 bg-slate-950/80 border rounded-xl px-3 transition text-xs font-semibold shadow-inner box-border ${
              isYearSelected
                ? "border-indigo-500/60 text-indigo-300 bg-indigo-500/10"
                : "border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <Calendar
              size={13}
              className={
                isYearSelected
                  ? "text-indigo-400 mr-2 shrink-0"
                  : "text-slate-500 mr-2 shrink-0"
              }
            />
            <select
              value={isYearSelected ? timeframe : ""}
              onChange={(e) => {
                if (e.target.value) {
                  onTimeframeChange(e.target.value as NiftyTimeframe);
                } else {
                  onTimeframeChange("3Y");
                }
              }}
              className="h-full bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1 appearance-none"
            >
              <option value="" className="bg-slate-900 text-slate-400">
                {isYearSelected
                  ? `Year: ${timeframe.replace("year_", "")}`
                  : "Select Year..."}
              </option>
              {availableYears.map((yr) => (
                <option
                  key={yr}
                  value={`year_${yr}`}
                  className="bg-slate-900 text-slate-100 font-semibold"
                >
                  Year {yr}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="text-slate-500 pointer-events-none ml-1 shrink-0"
            />
          </div>
        )}

        {/* Valuation Zones Toggle Chip */}
        <button
          type="button"
          onClick={onToggleValuationZones}
          className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shadow-inner box-border ${
            showValuationZones
              ? "bg-teal-500/15 text-teal-300 border-teal-500/40"
              : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200"
          }`}
          title="Toggle Valuation Zone shading (Deep Value, Fair, Peak)"
        >
          <Layers
            size={13}
            className={
              showValuationZones
                ? "text-teal-400 shrink-0"
                : "text-slate-500 shrink-0"
            }
          />
          <span>Valuation Zones</span>
        </button>
      </div>
    </div>
  );
}
