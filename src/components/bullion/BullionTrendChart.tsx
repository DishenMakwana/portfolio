"use client";

import { useState } from "react";
import { TrendingUp, Calendar, Layers, Check, X } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { formatInr } from "@/helpers/formatters";
import { TIMEFRAMES, type BullionTrendChartProps } from "@/types/bullion";
import {
  CustomChartTooltip,
  HighLabelBadge,
  LowLabelBadge,
} from "@/components/bullion/chart/BullionTrendChartBadges";

export default function BullionTrendChart({
  selectedTab,
  timeframe,
  showHighLow,
  chartData,
  selectedPriceTrend,
  periodHighLow,
  customStartDate,
  customEndDate,
  onTimeframeChange,
  onToggleHighLow,
  onApplyCustomDateRange,
  onResetCustomDateRange,
}: BullionTrendChartProps): React.JSX.Element {
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(customStartDate);
  const [tempEndDate, setTempEndDate] = useState(customEndDate);

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-teal-400" />
          <h2 className="text-base font-bold text-slate-200">
            Price Trend ({selectedPriceTrend.label})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
          {/* Timeframe Pill Buttons */}
          <div className="flex bg-slate-950/60 p-0.5 border border-slate-800 rounded-lg text-xs font-bold">
            {(
              [
                TIMEFRAMES.TF_7D,
                TIMEFRAMES.TF_30D,
                TIMEFRAMES.TF_3M,
                TIMEFRAMES.TF_6M,
                TIMEFRAMES.TF_1Y,
              ] as const
            ).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  onTimeframeChange(tf);
                  setIsCustomDatePickerOpen(false);
                }}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  timeframe === tf
                    ? "bg-teal-500/20 text-teal-400 font-extrabold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Custom Date Picker Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsCustomDatePickerOpen(!isCustomDatePickerOpen)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                timeframe === TIMEFRAMES.TF_CUSTOM
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm"
                  : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Calendar size={13} className="text-teal-400" />
              <span>
                {timeframe === TIMEFRAMES.TF_CUSTOM &&
                customStartDate &&
                customEndDate
                  ? `${customStartDate} to ${customEndDate}`
                  : "Custom Date"}
              </span>
            </button>

            {/* Custom Date Picker Popover */}
            {isCustomDatePickerOpen && (
              <div className="absolute right-0 top-11 z-30 w-80 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-200">
                    Custom Date Range
                  </span>
                  <button
                    onClick={() => setIsCustomDatePickerOpen(false)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setTempStartDate("");
                      setTempEndDate("");
                      onResetCustomDateRange();
                      setIsCustomDatePickerOpen(false);
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      if (tempStartDate && tempEndDate) {
                        onApplyCustomDateRange(tempStartDate, tempEndDate);
                        setIsCustomDatePickerOpen(false);
                      }
                    }}
                    disabled={!tempStartDate || !tempEndDate}
                    className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Apply Range</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* High / Low Toggle Button */}
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

      {/* Chart Viewport */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            key={`bullion-chart-${selectedTab}-${timeframe}-${selectedPriceTrend.priceKey}`}
            data={chartData}
            margin={{ top: 10, right: 15, left: 8, bottom: 18 }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              height={34}
              tick={{ dy: 3 }}
            >
              <Label
                value="Date"
                position="insideBottom"
                offset={-8}
                fill="#94a3b8"
                fontSize={10}
                fontWeight={600}
              />
            </XAxis>
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              tickFormatter={(value) => Number(value).toLocaleString("en-IN")}
              width={56}
            >
              <Label
                value="Price (₹)"
                angle={-90}
                position="insideLeft"
                offset={2}
                fill="#94a3b8"
                fontSize={10}
                fontWeight={600}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip content={<CustomChartTooltip />} />
            <Area
              type="monotone"
              dataKey="Price"
              name={selectedPriceTrend.label}
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={100}
            />

            {/* Period High / Low Reference Lines & Dots */}
            {showHighLow && periodHighLow && (
              <>
                {/* High Line & Dot */}
                <ReferenceLine
                  x={periodHighLow.highPt.date}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                <ReferenceLine
                  y={periodHighLow.highPt.Price}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                <ReferenceDot
                  x={periodHighLow.highPt.date}
                  y={periodHighLow.highPt.Price}
                  r={7}
                  fill="#10b981"
                  stroke="#022c22"
                  strokeWidth={2.5}
                  label={
                    <HighLabelBadge
                      value={`High: ${formatInr(periodHighLow.highPt.Price)}`}
                    />
                  }
                />

                {/* Low Line & Dot */}
                <ReferenceLine
                  x={periodHighLow.lowPt.date}
                  stroke="#f43f5e"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                <ReferenceLine
                  y={periodHighLow.lowPt.Price}
                  stroke="#f43f5e"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                {periodHighLow.lowPt.date !== periodHighLow.highPt.date && (
                  <ReferenceDot
                    x={periodHighLow.lowPt.date}
                    y={periodHighLow.lowPt.Price}
                    r={7}
                    fill="#f43f5e"
                    stroke="#4c0519"
                    strokeWidth={2.5}
                    label={
                      <LowLabelBadge
                        value={`Low: ${formatInr(periodHighLow.lowPt.Price)}`}
                      />
                    }
                  />
                )}
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* High / Low Stat Pill Summary Bar */}
      {showHighLow && periodHighLow && (
        <div className="mt-5 p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400 font-semibold">Period High:</span>
            <strong className="text-emerald-400 font-bold">
              {formatInr(periodHighLow.highPt.Price)}
            </strong>
            <span className="text-slate-500">
              ({periodHighLow.highPt.date},{" "}
              {periodHighLow.highReturnPct >= 0 ? "+" : ""}
              {periodHighLow.highReturnPct.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-slate-400 font-semibold">Period Low:</span>
            <strong className="text-rose-400 font-bold">
              {formatInr(periodHighLow.lowPt.Price)}
            </strong>
            <span className="text-slate-500">
              ({periodHighLow.lowPt.date},{" "}
              {periodHighLow.lowReturnPct >= 0 ? "+" : ""}
              {periodHighLow.lowReturnPct.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 font-medium border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
            <span>Range:</span>
            <strong className="text-amber-400 font-bold">
              {periodHighLow.rangePct.toFixed(1)}% (
              {formatInr(periodHighLow.priceDiff)})
            </strong>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 ml-1">
              <Calendar size={12} className="text-amber-400" />
              <span>
                {periodHighLow.daysApart}{" "}
                {periodHighLow.daysApart === 1 ? "day" : "days"} apart
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
