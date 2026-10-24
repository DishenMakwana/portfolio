"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Landmark,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Coins,
  Layers,
  LayoutGrid,
} from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import {
  buildJourneyLedgerCardItems,
  computeJourneyLedgerSummary,
} from "@/helpers/journey";
import type {
  JourneySnapshotLedgerProps,
  JourneyLedgerCardItem,
  JourneyLedgerSummary,
  JourneyLedgerViewMode,
} from "@/types/journey";

export default function JourneySnapshotLedger({
  ledger,
}: JourneySnapshotLedgerProps) {
  const [viewMode, setViewMode] = useState<JourneyLedgerViewMode>("flow");
  const [showFormulaProof, setShowFormulaProof] = useState(false);

  const summary: JourneyLedgerSummary = useMemo(
    () => computeJourneyLedgerSummary(ledger),
    [ledger]
  );

  const cards: JourneyLedgerCardItem[] = useMemo(
    () => buildJourneyLedgerCardItems(ledger),
    [ledger]
  );

  const isGainPositive = summary.marketGain >= 0;

  return (
    <div className="space-y-4">
      {/* 1. Header with Title, Status & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Investment Snapshot Ledger
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Reconciled</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Capital roll-forward and market performance reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Formula Proof Toggle Button */}
          <button
            onClick={() => setShowFormulaProof((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showFormulaProof
                ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Toggle Formula Details"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Formula Details</span>
          </button>

          {/* View Mode Toggle: Flow vs Grid */}
          <div className="flex items-center rounded-xl bg-slate-900/80 p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode("flow")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === "flow"
                  ? "bg-teal-500/20 text-teal-300 shadow-sm shadow-teal-500/10 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flow</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-teal-500/20 text-teal-300 shadow-sm shadow-teal-500/10 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Optional Expandable Formula Proof Banner */}
      {showFormulaProof && (
        <div className="rounded-2xl bg-slate-900/90 border border-teal-500/30 p-4 text-xs space-y-2 text-slate-300 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-teal-300 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Master Accounting Equation (OB to H Reconciliation)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              G = F − OB − H
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-[11px]">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">
                1. Net Investment (H):
              </span>
              <p className="font-mono text-slate-200 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                H = [A] Investment + [B] Switch In − [C] Switch Out − [D]
                Redemption − [E] Div Payout
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">
                2. Capital Gain (G):
              </span>
              <p className="font-mono text-emerald-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                G = [F] Current Value − [OB] Opening Balance − [H] Net
                Investment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Render Based on Selected View Mode */}
      {viewMode === "flow" ? (
        /* ================= EXECUTIVE FLOW MODE ================= */
        <div className="space-y-4">
          {/* Tier 1: 4 Connected Master Roll-Forward Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Opening Valuation (OB) */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-slate-900/85 border border-slate-800/90 hover:border-slate-700 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Landmark className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    Opening Value
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  OB
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
                  {formatCurrency(summary.openingBalance)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Start of period asset value
                </p>
              </div>
            </div>

            {/* Card 2: Net Capital Added (H) */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-slate-900/85 border border-slate-800/90 hover:border-slate-700 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <ArrowDownLeft className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    Net Capital Added
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  H
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-sky-400">
                  {summary.netInvestment >= 0 ? "+" : ""}
                  {formatCurrency(summary.netInvestment)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Inflows minus outflows
                </p>
              </div>
            </div>

            {/* Card 3: Capital Gain (G) */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-slate-900/85 border border-slate-800/90 hover:border-slate-700 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1.5 rounded-lg border ${
                      isGainPositive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {isGainPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    Capital Gain
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isGainPositive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                  }`}
                >
                  {isGainPositive ? "+" : ""}
                  {summary.marketGainPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-3">
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                    isGainPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isGainPositive ? "+" : ""}
                  {formatCurrency(summary.marketGain)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Market appreciation
                </p>
              </div>
            </div>

            {/* Card 4: Current Value (F) */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-teal-950/30 via-slate-900/90 to-slate-900 border border-teal-500/40 hover:border-teal-500/60 transition-all shadow-md shadow-teal-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/30">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold text-teal-200">
                    Current Value
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  F
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-teal-300">
                  {formatCurrency(summary.closingBalance)}
                </div>
                <p className="text-[11px] text-teal-400/80 mt-1">
                  Ending portfolio value
                </p>
              </div>
            </div>
          </div>

          {/* Tier 2: Capital Flows Breakdown (Inflows vs Outflows) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Capital Inflows */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Capital Inflows
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Purchases, transfers and interest
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">
                    Total Inflows
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    +{formatCurrency(summary.totalInflows)}
                  </span>
                </div>
              </div>

              {/* Inflow Items List */}
              <div className="space-y-3">
                {summary.inflowItems.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 text-[11px] font-mono font-bold text-sky-400 border border-slate-700">
                        {item.code}
                      </span>
                      <div>
                        <div className="text-xs font-medium text-slate-200">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-100">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Capital Outflows */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Capital Outflows
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Redemptions and switch-outs
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">
                    Total Outflows
                  </span>
                  <span className="text-base font-bold font-mono text-rose-400">
                    -{formatCurrency(summary.totalOutflows)}
                  </span>
                </div>
              </div>

              {/* Outflow Items List */}
              <div className="space-y-3">
                {summary.outflowItems.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 text-[11px] font-mono font-bold text-rose-400 border border-slate-700">
                        {item.code}
                      </span>
                      <div>
                        <div className="text-xs font-medium text-slate-200">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-100">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}

                {/* Net Position Summary Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-sky-950/20 border border-sky-500/30">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-sky-500/20 text-[11px] font-mono font-bold text-sky-400 border border-sky-500/30">
                      H
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-sky-300">
                        Net Retained Capital (Inflows − Outflows)
                      </div>
                      <div className="text-[10px] text-sky-400/80">
                        Net liquid capital deployed into portfolio
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono text-sky-300">
                    {formatCurrency(summary.netInvestment)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tier 3: Reconciliation Verification Footer */}
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-slate-200">
                  Mathematical Reconciliation:
                </strong>{" "}
                OB ({formatCurrency(summary.openingBalance)}) + Inflows (
                {formatCurrency(summary.totalInflows)}) − Outflows (
                {formatCurrency(summary.totalOutflows)}) + Market Gain (
                {formatCurrency(summary.marketGain)}) ={" "}
                <strong className="text-teal-300">
                  {formatCurrency(summary.closingBalance)}
                </strong>
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 shrink-0">
              Balanced to the paisa
            </span>
          </div>
        </div>
      ) : (
        /* ================= OVERHAULED 9-CARD GRID MODE ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {cards.map((card) => {
            const isNegative = card.value < 0;

            // Semantic Icon selection based on card tag
            const renderIcon = () => {
              switch (card.tag) {
                case "OB":
                  return <Landmark className="w-4 h-4 text-amber-400" />;
                case "A":
                  return <Coins className="w-4 h-4 text-sky-400" />;
                case "B":
                  return <ArrowDownLeft className="w-4 h-4 text-teal-400" />;
                case "C":
                  return <ArrowUpRight className="w-4 h-4 text-violet-400" />;
                case "D":
                  return <ArrowLeftRight className="w-4 h-4 text-rose-400" />;
                case "E":
                  return <Coins className="w-4 h-4 text-indigo-400" />;
                case "F":
                  return <ShieldCheck className="w-4 h-4 text-teal-400" />;
                case "G":
                  return card.value >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  );
                case "H":
                  return <Coins className="w-4 h-4 text-cyan-400" />;
                default:
                  return <Info className="w-4 h-4 text-slate-400" />;
              }
            };

            return (
              <div
                key={card.id}
                className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between min-h-[110px] ${
                  card.isHighlight
                    ? card.highlightType === "positive"
                      ? "bg-gradient-to-br from-emerald-950/35 via-slate-900/90 to-slate-900 border border-emerald-500/35 shadow-lg shadow-emerald-950/20"
                      : card.highlightType === "negative"
                        ? "bg-gradient-to-br from-rose-950/35 via-slate-900/90 to-slate-900 border border-rose-500/35 shadow-lg shadow-rose-950/20"
                        : "bg-gradient-to-br from-cyan-950/35 via-slate-900/90 to-slate-900 border border-cyan-500/35 shadow-lg shadow-cyan-950/20"
                    : "bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 shadow-md shadow-black/10"
                }`}
              >
                {/* Card Top: Icon, Tag Badge, Title, and Optional Percentage */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                      {renderIcon()}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">
                          {card.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1 py-0.2 rounded border ${card.badgeBg}`}
                        >
                          {card.badgeText}
                        </span>
                      </div>
                      {card.formula && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          [{card.formula}]
                        </div>
                      )}
                    </div>
                  </div>

                  {card.percentage !== undefined && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        card.percentage >= 0
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {card.percentage >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {card.percentage >= 0 ? "+" : ""}
                      {card.percentage}%
                    </span>
                  )}
                </div>

                {/* Card Bottom: Clean, Tabular Amount (No repetitive "Amount" label) */}
                <div className="mt-3.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Net Valuation
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${
                      card.isHighlight
                        ? card.highlightType === "positive"
                          ? "text-emerald-400"
                          : card.highlightType === "negative"
                            ? "text-rose-400"
                            : "text-cyan-400"
                        : "text-white"
                    }`}
                  >
                    {isNegative ? "-" : ""}
                    {formatCurrency(Math.abs(card.value))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
