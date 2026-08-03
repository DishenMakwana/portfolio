"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import { formatCurrency, formatInrCompact } from "@/helpers/formatters";
import type { FyTrackerData } from "@/types/insights";
import { getFyTrackerDataAction } from "@/actions/portfolio";

interface FyTrackerClientProps {
  initialData: FyTrackerData;
}

export default function FyTrackerClient({ initialData }: FyTrackerClientProps) {
  const [data, setData] = useState<FyTrackerData>(initialData);
  const [isPending, startTransition] = useTransition();

  const handleFyChange = (label: string) => {
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
