"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  History,
  Shield,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { formatCurrency, formatInrCompact } from "@/helpers/formatters";
import type { FyTrackerData } from "@/types/insights";
import { getFyTrackerDataAction } from "@/actions/portfolio";

interface FyTrackerClientProps {
  initialData: FyTrackerData;
}

interface CustomFyTrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: {
      fyLabel: string;
      portfolio: number;
      benchmark: number;
      alpha: number;
    };
  }>;
  label?: string;
  metric: "xirr" | "cagr";
}

function CustomFyTrendTooltip({
  active,
  payload,
  label,
  metric,
}: CustomFyTrendTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const isAlphaPositive = dataPoint.alpha >= 0;

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-md min-w-[220px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
          <p className="text-xs font-extrabold text-slate-200">{label}</p>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isAlphaPositive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            Alpha: {isAlphaPositive ? "+" : ""}
            {dataPoint.alpha.toFixed(2)}%
          </span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              My Investment {metric.toUpperCase()}:
            </span>
            <span className="font-extrabold text-emerald-400">
              {dataPoint.portfolio.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              Nifty 50 Benchmark:
            </span>
            <span className="font-bold text-blue-400">
              {dataPoint.benchmark.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function FyTrackerClient({ initialData }: FyTrackerClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialMetric =
    (searchParams.get("metric") as "xirr" | "cagr") || "xirr";
  const [data, setData] = useState<FyTrackerData>(initialData);
  const [metric, setMetric] = useState<"xirr" | "cagr">(initialMetric);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const m = searchParams.get("metric") as "xirr" | "cagr";
    if (m && (m === "xirr" || m === "cagr")) {
      setMetric(m);
    }
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleMetricChange = (nextMetric: "xirr" | "cagr") => {
    setMetric(nextMetric);
    updateUrl({ metric: nextMetric === "xirr" ? null : nextMetric });
  };

  const handleFyChange = (label: string) => {
    updateUrl({ fy: label });
    startTransition(async () => {
      try {
        const freshData = await getFyTrackerDataAction(label);
        setData(freshData);
      } catch (err) {
        console.error("Failed to load FY data:", err);
      }
    });
  };

  const { selectedFy, summary, snapshot, availableFys, comparisonRows } = data;

  const snapshotRows = snapshot.rows.filter((row) => row.label !== "XIRR (%)");
  const hasDebtOthersActivity = snapshotRows.some(
    (row) => row.debtOthers !== 0
  );

  const chartData = useMemo(() => {
    // Filter from FY 2017-18 onwards (startDate >= 2017-04-01) and sort ascending by startDate
    const filteredRows = [...comparisonRows]
      .filter((r) => r.startDate >= "2017-04-01")
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    return filteredRows.map((r) => {
      const portfolioVal = metric === "xirr" ? r.xirr : r.cagr;
      const benchmarkVal =
        metric === "xirr" ? r.benchmarkXirr : r.benchmarkCagr;
      return {
        fyLabel: r.fyLabel,
        portfolio: portfolioVal,
        benchmark: benchmarkVal,
        alpha: Math.round((portfolioVal - benchmarkVal) * 100) / 100,
      };
    });
  }, [comparisonRows, metric]);

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header & FY Selector Bar ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                Financial Year Investment Tracker
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedFy.label} ({selectedFy.startDate} to{" "}
                {selectedFy.endDate})
              </p>
            </div>
          </div>
        </div>

        {/* Dropdown Filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Select FY:
          </span>
          <div className="relative flex-1 sm:w-52">
            <select
              value={selectedFy.label}
              onChange={(e) => handleFyChange(e.target.value)}
              disabled={isPending}
              className="w-full appearance-none rounded-xl border border-teal-500/30 bg-slate-800/90 px-4 py-2.5 pr-10 text-sm font-semibold text-teal-300 shadow-lg backdrop-blur-md transition-all focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
            >
              {availableFys.map((fy) => (
                <option
                  key={fy.label}
                  value={fy.label}
                  className="bg-slate-900 text-slate-200"
                >
                  {fy.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-400"
            />
          </div>
        </div>
      </div>

      {/* ─── Top Key Metrics Cards (Matching Overview UI) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Previously Invested */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Opening Valuation
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10">
                <Shield size={16} className="text-indigo-400" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatCurrency(summary.previouslyInvested)}
            </div>
          </div>
          <div className="relative z-10 text-xs font-semibold mt-2.5 text-slate-400">
            As of {selectedFy.startDate}
          </div>
        </motion.div>

        {/* Card 2: FY Invested (BUY) */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Invested in {selectedFy.label}
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <ArrowUpRight size={16} className="text-emerald-400" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatCurrency(summary.fyInvested)}
            </div>
          </div>
          <div className="relative z-10 text-xs font-semibold mt-2.5 text-emerald-400">
            Total Purchases (BUY)
          </div>
        </motion.div>

        {/* Card 3: FY Sold (SELL) */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-rose-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Sold in {selectedFy.label}
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10">
                <ArrowDownRight size={16} className="text-rose-400" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatCurrency(summary.fySold)}
            </div>
          </div>
          <div className="relative z-10 text-xs font-semibold mt-2.5 text-rose-400">
            Total Redemptions (SELL)
          </div>
        </motion.div>

        {/* Card 4: End of FY Valuation */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Closing Valuation
              </span>
              <div className="p-2 rounded-xl bg-teal-500/10">
                <IndianRupee size={16} className="text-teal-400" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {formatCurrency(summary.closingValuation)}
            </div>
          </div>
          <div className="relative z-10 text-xs font-semibold mt-2.5 text-slate-400">
            As of {selectedFy.endDate}
          </div>
        </motion.div>

        {/* Card 5: FY Return (Net Gain, Abs Return, XIRR, CAGR) */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-default flex flex-col justify-between"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              summary.netGain >= 0 ? "from-emerald-500/10" : "from-rose-500/10"
            } to-transparent pointer-events-none`}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                FY Returns
              </span>
              <div
                className={`p-2 rounded-xl ${
                  summary.netGain >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
                }`}
              >
                <Sparkles
                  size={16}
                  className={
                    summary.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
                  }
                />
              </div>
            </div>
            <div
              className={`text-xl font-extrabold leading-tight tracking-tight ${
                summary.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {summary.netGain >= 0 ? "+" : ""}
              {formatCurrency(summary.netGain)}
            </div>
          </div>
          <div className="relative z-10 text-[11px] font-semibold mt-2.5 text-teal-400 flex flex-wrap gap-1">
            <span>Abs: {summary.absReturn.toFixed(2)}%</span>
            <span>·</span>
            <span>XIRR: {summary.xirr.toFixed(2)}%</span>
            <span>·</span>
            <span>CAGR: {summary.cagr.toFixed(2)}%</span>
          </div>
        </motion.div>
      </div>

      {/* ─── FY Performance Trend Line Chart ─── */}
      <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Financial Year Return Trend ({metric.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Historical portfolio {metric.toUpperCase()} vs UTI Nifty 50
                Benchmark across financial years
              </p>
            </div>
          </div>

          {/* Metric Toggle Buttons (Matching Screenshot Reference UI) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => handleMetricChange("xirr")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all cursor-pointer ${
                metric === "xirr"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              XIRR
            </button>
            <button
              type="button"
              onClick={() => handleMetricChange("cagr")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all cursor-pointer ${
                metric === "cagr"
                  ? "bg-emerald-600/90 text-emerald-100 shadow-md border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              CAGR View
            </button>
          </div>
        </div>

        {/* Legend Summary */}
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs font-medium px-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
              <span className="text-slate-300 font-semibold">
                My Investment {metric.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1.5 rounded-full bg-blue-400 inline-block shadow-sm border border-blue-500/40" />
              <span className="text-slate-400">
                Nifty 50 Benchmark {metric.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="text-slate-400 text-[11px]">
            Data points:{" "}
            <span className="text-slate-200 font-bold">
              {comparisonRows.length} Financial Years
            </span>
          </div>
        </div>

        {/* Line Chart */}
        <div className="h-84 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 25, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="fyLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                height={45}
                tick={{ dy: 2 }}
              >
                <Label
                  value="Financial Year"
                  position="insideBottom"
                  offset={0}
                  fill="#94a3b8"
                  fontSize={11}
                  fontWeight={700}
                />
              </XAxis>
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
                width={50}
              >
                <Label
                  value={`${metric.toUpperCase()} Return Rate (%)`}
                  angle={-90}
                  position="insideLeft"
                  style={{
                    textAnchor: "middle",
                    fill: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </YAxis>
              <Tooltip content={<CustomFyTrendTooltip metric={metric} />} />
              <Line
                type="linear"
                dataKey="portfolio"
                name={`My Investment ${metric.toUpperCase()}`}
                stroke="#10b981"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: "#10b981",
                  stroke: "#0f172a",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: "#34d399",
                  stroke: "#0f172a",
                  strokeWidth: 2,
                }}
              />
              <Line
                type="linear"
                dataKey="benchmark"
                name={`Nifty 50 Benchmark ${metric.toUpperCase()}`}
                stroke="#3b82f6"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{
                  r: 4,
                  fill: "#3b82f6",
                  stroke: "#0f172a",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "#60a5fa",
                  stroke: "#0f172a",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Financial Year Movement & Asset Class Table ─── */}
      <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Movement Breakdown — {selectedFy.label}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Asset class breakdown of opening balance, buys, sells, closing
                balance, Abs Return, XIRR &amp; CAGR
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1.5">
            {selectedFy.startDate} to {selectedFy.endDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-teal-500/20 text-teal-200">
                <th className="px-4 py-3 text-left font-bold whitespace-nowrap">
                  Movement
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Equity
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Hybrid
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Debt &amp; Others
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshot.rows.map((row) => {
                const isPercentRow =
                  row.label === "XIRR (%)" || row.label === "Abs Return (%)";
                const isEmphasis =
                  row.label === "Opening Balance" ||
                  row.label === "Closing Balance" ||
                  row.label === "Net Gain";

                const formatValue = (value: number): string =>
                  Number.isNaN(value)
                    ? "-"
                    : isPercentRow
                      ? value.toFixed(2) + "%"
                      : formatCurrency(value);

                const values = isPercentRow
                  ? [
                      row.equityXirr || 0,
                      row.hybridXirr || 0,
                      hasDebtOthersActivity
                        ? row.debtOthersXirr || 0
                        : Number.NaN,
                      row.totalXirr || 0,
                    ]
                  : [row.equity, row.hybrid, row.debtOthers, row.total];

                return (
                  <tr
                    key={row.label}
                    className={
                      isPercentRow
                        ? "border-b border-slate-800/70 last:border-b-0 bg-teal-500/15 text-teal-200 font-semibold"
                        : isEmphasis
                          ? "border-b border-slate-800/70 last:border-b-0 text-slate-100 font-bold"
                          : "border-b border-slate-800/70 last:border-b-0 text-slate-300"
                    }
                  >
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {row.label}
                    </td>
                    {values.map((value, index) => (
                      <td
                        key={row.label + "-" + index}
                        className={
                          !isPercentRow && value < 0
                            ? "px-4 py-3 text-right tabular-nums whitespace-nowrap text-rose-400"
                            : "px-4 py-3 text-right tabular-nums whitespace-nowrap"
                        }
                      >
                        {formatValue(value)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Multi-Year Historical Comparison Table ─── */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-teal-400">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Multi-Year Financial Year Comparison
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side historical performance across all financial years
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                <th className="px-4 py-3 text-left font-bold whitespace-nowrap">
                  Financial Year
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Opening Valuation
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Invested (BUY)
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Sold (SELL)
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Closing Valuation
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Net Gain
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  Abs Return
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  XIRR
                </th>
                <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                  CAGR
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => {
                const isSelected = row.fyLabel === selectedFy.label;
                return (
                  <tr
                    key={row.fyLabel}
                    onClick={() => handleFyChange(row.fyLabel)}
                    className={`cursor-pointer transition-colors border-b border-slate-800/70 last:border-b-0 ${
                      isSelected
                        ? "bg-teal-500/10 text-teal-200 font-semibold"
                        : "hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <td className="px-4 py-3 flex items-center gap-2 whitespace-nowrap">
                      <span className="font-bold">{row.fyLabel}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-teal-500/20 border border-teal-500/30 text-teal-300 px-2 py-0.5 rounded-full font-semibold">
                          Selected
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold">
                      {formatInrCompact(row.openingInvested)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-emerald-400">
                      {formatInrCompact(row.fyInvested)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-rose-400">
                      {formatInrCompact(row.fySold)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-bold">
                      {formatInrCompact(row.closingValuation)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums whitespace-nowrap font-bold ${
                        row.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatInrCompact(row.netGain, true)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-teal-300">
                      {row.absReturn.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-teal-300">
                      {row.xirr.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-teal-300">
                      {row.cagr.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
