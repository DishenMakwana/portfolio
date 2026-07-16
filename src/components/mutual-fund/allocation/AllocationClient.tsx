"use client";

import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Sector, Tooltip, ResponsiveContainer } from "recharts";
import type { PieSectorDataItem } from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Info,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  formatCurrency,
  formatIndianNumber,
  formatPct,
} from "@/helpers/formatters";
import {
  ALLOCATION_BG_CLASSES,
  ALLOCATION_PALETTE,
  AllocationClientProps,
  ChartTooltipProps,
  SortableRecord,
  SortState,
  SortOrder,
} from "@/types/allocation";
import {
  getAmcName,
  getAssetRatios,
  getCapRatios,
  getSubCategory,
} from "@/helpers/allocation";

/* ─── Custom Tooltip ─── */
const ChartTooltip = ({
  active,
  payload,
}: ChartTooltipProps): React.JSX.Element | null => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl z-50">
      <div className="font-bold text-slate-100 text-sm">{d.name}</div>
      <div className="text-teal-400 font-extrabold text-base mt-1">
        {formatCurrency(d.value)}
      </div>
      <div className="text-slate-400 text-xs mt-0.5">
        {d.payload.pct?.toFixed(2)}% of total
      </div>
    </div>
  );
};

/* ─── Sortable header cell ─── */
function SortTh({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  className = "",
}: {
  label: string;
  col: string;
  sortCol: string;
  sortDir: "asc" | "desc";
  onSort: (c: string) => void;
  className?: string;
}) {
  const isActive = sortCol === col;
  return (
    <th
      className={`px-4 py-3 font-semibold text-xs cursor-pointer hover:text-slate-200 transition select-none ${className}`}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDir === "asc" ? (
            <ChevronUp size={12} className="shrink-0 text-teal-400" />
          ) : (
            <ChevronDown size={12} className="shrink-0 text-teal-400" />
          )
        ) : (
          <ChevronDown size={12} className="shrink-0 opacity-20" />
        )}
      </div>
    </th>
  );
}

/* ─── Teal total row ─── */
function TotalRow({ cells }: { cells: (string | number)[] }) {
  return (
    <tr className="bg-teal-500 text-slate-950">
      {cells.map((c, i) => (
        <td
          key={i}
          className={`px-4 py-3 font-extrabold text-sm tabular-nums ${i === cells.length - 1 ? "bg-teal-600 border-l border-teal-400/30" : i > 0 ? "text-right" : ""}`}
        >
          {c}
        </td>
      ))}
    </tr>
  );
}

/* ─── Card header ─── */
function CardHeader({
  accent,
  title,
  subtitle,
  collapsed,
  onToggle,
}: {
  accent: string;
  title: string;
  subtitle: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const isCollapsible = onToggle !== undefined;
  return (
    <div
      className={`px-5 py-4 border-b border-slate-800 flex items-center gap-3 ${
        isCollapsible
          ? "cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
          : ""
      }`}
      onClick={onToggle}
    >
      <div className={`w-1 h-5 rounded-full shrink-0 ${accent}`} />
      <h2 className="text-sm font-bold text-slate-200">{title}</h2>
      <span className="text-xs text-slate-500 ml-1 flex-1">{subtitle}</span>
      {isCollapsible && (
        <div className="text-slate-400 shrink-0">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function AllocationClient({
  memberSummaries,
  holdings,
  selectedReport,
}: AllocationClientProps) {
  /* ── Filter state ── */
  const [investorOpen, setInvestorOpen] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(
    () => new Set(memberSummaries.map((m) => m.name))
  );
  const [activeInvestors, setActiveInvestors] = useState<Set<string>>(
    () => new Set(memberSummaries.map((m) => m.name))
  );
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  /* ── Card collapse state (collapsed = hidden body) ── */
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [equityCapOpen, setEquityCapOpen] = useState(false);
  const [schemeScripOpen, setSchemeScripOpen] = useState(false);

  /* ── Sort state ── */
  const [investorSort, setInvestorSort] = useState<SortState>({
    col: "value",
    dir: "desc",
  });
  const [subCatSort, setSubCatSort] = useState<SortState>({
    col: "value",
    dir: "desc",
  });
  const [amcSort, setAmcSort] = useState<SortState>({
    col: "value",
    dir: "desc",
  });
  const [catSort, setCatSort] = useState<SortState>({
    col: "total",
    dir: "desc",
  });
  const [capSort, setCapSort] = useState<SortState>({
    col: "total",
    dir: "desc",
  });

  const allMembers = useMemo(
    () => memberSummaries.map((m) => m.name),
    [memberSummaries]
  );

  const isAllSelected = useMemo(() => {
    return (
      allMembers.length > 0 && allMembers.every((m) => selectedInvestors.has(m))
    );
  }, [selectedInvestors, allMembers]);

  const toggleInvestor = (name: string) => {
    const next = new Set(selectedInvestors);
    if (name === "all") {
      if (isAllSelected) {
        next.clear();
      } else {
        allMembers.forEach((m) => next.add(m));
      }
    } else {
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
    }
    setSelectedInvestors(next);
  };

  const handleApply = () => {
    setActiveInvestors(new Set(selectedInvestors));
    setInvestorOpen(false);
  };

  const investorLabel = useMemo(() => {
    if (selectedInvestors.size === 0) return "None Selected";
    if (isAllSelected) return "All Selected";
    return Array.from(selectedInvestors)
      .map((n) => n.split(" ")[0])
      .join(", ");
  }, [selectedInvestors, isAllSelected]);

  const makeSorter =
    (setter: React.Dispatch<React.SetStateAction<SortState>>) =>
    (col: string): void => {
      setter((prev: SortState) => ({
        col,
        dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc",
      }));
    };

  const sortArr = <T extends SortableRecord>(
    arr: T[],
    col: string,
    dir: SortOrder
  ) =>
    [...arr].sort((a, b) => {
      const aValue = a[col];
      const bValue = b[col];
      const v =
        typeof aValue === "string" && typeof bValue === "string"
          ? aValue.localeCompare(bValue)
          : Number(bValue) - Number(aValue);
      return dir === "asc" ? -v : v;
    });

  /* ── Filtered holdings ── */
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => activeInvestors.has(h.memberName));
  }, [holdings, activeInvestors]);

  /* ── Derived data ── */
  const {
    categoryData,
    subCatData,
    amcData,
    memberData,
    grandTotal,
    schemeRows,
    equityCapRows,
    schemeGrouped,
  } = useMemo(() => {
    const catMap = new Map<string, number>();
    const subCatMap = new Map<string, number>();
    const amcMap = new Map<string, number>();
    const memberMap = new Map<string, number>();
    const schemeMap = new Map<
      string,
      { schemeName: string; category: string; subCat: string; total: number }
    >();

    for (const h of filteredHoldings) {
      catMap.set(h.category, (catMap.get(h.category) || 0) + h.currentValue);
      const subCat = getSubCategory(h.schemeName, h.category);
      subCatMap.set(subCat, (subCatMap.get(subCat) || 0) + h.currentValue);
      const amc = getAmcName(h.schemeName);
      amcMap.set(amc, (amcMap.get(amc) || 0) + h.currentValue);
      memberMap.set(
        h.memberName,
        (memberMap.get(h.memberName) || 0) + h.currentValue
      );
      const existing = schemeMap.get(h.schemeName);
      if (existing) existing.total += h.currentValue;
      else
        schemeMap.set(h.schemeName, {
          schemeName: h.schemeName,
          category: h.category,
          subCat,
          total: h.currentValue,
        });
    }

    const total = filteredHoldings.reduce((s, h) => s + h.currentValue, 0);
    const toArr = (map: Map<string, number>) =>
      Array.from(map.entries()).map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
      }));

    const memberArr = (
      activeInvestors.has("all")
        ? memberSummaries
        : memberSummaries.filter((m) => activeInvestors.has(m.name))
    ).map((m) => ({
      name: m.name,
      value: memberMap.get(m.name) || 0,
      pct: total > 0 ? ((memberMap.get(m.name) || 0) / total) * 100 : 0,
    }));

    const schemeRowsArr = Array.from(schemeMap.values()).map((s) => {
      const r = getAssetRatios(s.subCat);
      return {
        schemeName: s.schemeName,
        subCat: s.subCat,
        debt: Math.round(s.total * r.debt),
        equity: Math.round(s.total * r.equity),
        globalEquity: Math.round(s.total * r.globalEquity),
        gold: Math.round(s.total * r.gold),
        other: Math.round(s.total * r.other),
        total: s.total,
        pct: total > 0 ? (s.total / total) * 100 : 0,
      };
    });

    const equityCapRowsArr = Array.from(schemeMap.values())
      .filter(
        (s) =>
          s.subCat.startsWith("Equity") ||
          s.subCat.includes("SIF") ||
          s.subCat.includes("Hybrid")
      )
      .map((s) => {
        const r = getCapRatios(s.subCat);
        return {
          schemeName: s.schemeName,
          subCat: s.subCat,
          large: Math.round(s.total * r.large),
          mid: Math.round(s.total * r.mid),
          small: Math.round(s.total * r.small),
          total: s.total,
          pct: total > 0 ? (s.total / total) * 100 : 0,
        };
      });

    const groupMap = new Map<
      string,
      {
        funds: { name: string; value: number; pct: number }[];
        subTotal: number;
      }
    >();
    for (const [, s] of schemeMap) {
      const fe = {
        name: s.schemeName,
        value: s.total,
        pct: total > 0 ? (s.total / total) * 100 : 0,
      };
      const existing = groupMap.get(s.subCat);
      if (existing) {
        existing.funds.push(fe);
        existing.subTotal += s.total;
      } else groupMap.set(s.subCat, { funds: [fe], subTotal: s.total });
    }
    const schemeGroupedArr = Array.from(groupMap.entries())
      .map(([subCat, data]) => ({
        subCat,
        funds: data.funds.sort((a, b) => b.value - a.value),
        subTotal: data.subTotal,
        pct: total > 0 ? (data.subTotal / total) * 100 : 0,
      }))
      .sort((a, b) => b.subTotal - a.subTotal);

    return {
      categoryData: toArr(catMap).sort((a, b) => b.value - a.value),
      subCatData: toArr(subCatMap).sort((a, b) => b.value - a.value),
      amcData: toArr(amcMap).sort((a, b) => b.value - a.value),
      memberData: memberArr,
      grandTotal: total,
      schemeRows: schemeRowsArr,
      equityCapRows: equityCapRowsArr,
      schemeGrouped: schemeGroupedArr,
    };
  }, [filteredHoldings, memberSummaries, activeInvestors]);

  const capTotals = useMemo(
    () => ({
      large: equityCapRows.reduce((s, r) => s + r.large, 0),
      mid: equityCapRows.reduce((s, r) => s + r.mid, 0),
      small: equityCapRows.reduce((s, r) => s + r.small, 0),
      total: equityCapRows.reduce((s, r) => s + r.total, 0),
    }),
    [equityCapRows]
  );

  const catTotals = useMemo(
    () => ({
      debt: schemeRows.reduce((s, r) => s + r.debt, 0),
      equity: schemeRows.reduce((s, r) => s + r.equity, 0),
      globalEquity: schemeRows.reduce((s, r) => s + r.globalEquity, 0),
      gold: schemeRows.reduce((s, r) => s + r.gold, 0),
      other: schemeRows.reduce((s, r) => s + r.other, 0),
      total: grandTotal,
    }),
    [schemeRows, grandTotal]
  );

  const sortedMembers = sortArr(memberData, investorSort.col, investorSort.dir);
  const sortedSubCat = sortArr(
    subCatData,
    subCatSort.col === "name" ? "name" : "value",
    subCatSort.dir
  );
  const sortedAmc = sortArr(
    amcData,
    amcSort.col === "name" ? "name" : "value",
    amcSort.dir
  );
  const sortedCat = sortArr(schemeRows, catSort.col, catSort.dir);
  const sortedCap = sortArr(equityCapRows, capSort.col, capSort.dir);

  const asOfDate = selectedReport
    ? new Date(selectedReport.asOfDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div
      className="space-y-6 max-w-[1400px] mx-auto relative min-h-screen pb-12 selection:bg-teal-500/30"
      onClick={() => investorOpen && setInvestorOpen(false)}
    >
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── FILTER BAR ── */}
      <div
        className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-5 shadow-xl space-y-4 relative z-30 hover:border-slate-700/80 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Info size={14} className="text-teal-400 shrink-0" />
          <span>
            View detailed allocation analysis of your current investments.
          </span>
          {asOfDate && (
            <span className="ml-1 text-teal-400 font-medium">
              As of {asOfDate}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* Investor dropdown */}
          <div className="w-full max-w-[420px] relative">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Investor :
            </label>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInvestorOpen((o) => !o);
              }}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 hover:border-slate-600 transition-all cursor-pointer"
            >
              <span className="truncate">{investorLabel}</span>
              <ChevronDown
                size={15}
                className={`shrink-0 text-slate-400 transition-transform ${investorOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {investorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute z-50 top-full left-0 mt-1 w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                >
                  <button
                    onClick={() => toggleInvestor("all")}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-800 transition cursor-pointer"
                  >
                    {isAllSelected ? (
                      <CheckSquare
                        size={15}
                        className="text-teal-400 shrink-0"
                      />
                    ) : (
                      <Square size={15} className="text-slate-500 shrink-0" />
                    )}
                    <span
                      className={
                        isAllSelected
                          ? "text-teal-300 font-semibold"
                          : "text-slate-300"
                      }
                    >
                      All Selected
                    </span>
                  </button>
                  <div className="border-t border-slate-800" />
                  {allMembers.map((name) => (
                    <button
                      key={name}
                      onClick={() => toggleInvestor(name)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-800 transition cursor-pointer border-t border-slate-800/60"
                    >
                      {selectedInvestors.has(name) ? (
                        <CheckSquare
                          size={15}
                          className="text-teal-400 shrink-0"
                        />
                      ) : (
                        <Square size={15} className="text-slate-500 shrink-0" />
                      )}
                      <span
                        className={
                          selectedInvestors.has(name)
                            ? "text-teal-300 font-semibold"
                            : "text-slate-300"
                        }
                      >
                        {name}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <button
              onClick={handleApply}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg hover:shadow-teal-500/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {grandTotal === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-20 text-center text-slate-500">
          No portfolio data available. Upload a report to get started.
        </div>
      ) : (
        <>
          {/* ── MAIN: Tables + Pie Chart ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5 items-start relative z-10">
            {/* LEFT: Investor table */}
            <div className="space-y-4">
              {/* Investor table */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <SortTh
                        label="Investor"
                        col="name"
                        sortCol={investorSort.col}
                        sortDir={investorSort.dir}
                        onSort={makeSorter(setInvestorSort)}
                        className="text-left text-slate-400"
                      />
                      <SortTh
                        label="Amount"
                        col="value"
                        sortCol={investorSort.col}
                        sortDir={investorSort.dir}
                        onSort={makeSorter(setInvestorSort)}
                        className="text-right text-slate-400"
                      />
                      <SortTh
                        label="Share(%)"
                        col="value"
                        sortCol={investorSort.col}
                        sortDir={investorSort.dir}
                        onSort={makeSorter(setInvestorSort)}
                        className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    <TotalRow
                      cells={[
                        "Total",
                        formatIndianNumber(grandTotal),
                        "100.00",
                      ]}
                    />
                    {sortedMembers.map((m, i) => (
                      <tr
                        key={m.name}
                        className={`border-t border-slate-800/60 hover:bg-slate-800/20 transition ${i % 2 === 1 ? "bg-slate-950/20" : ""}`}
                      >
                        <td className="px-5 py-3 text-slate-200 font-medium text-xs uppercase tracking-wide">
                          {m.name}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-200 tabular-nums font-medium">
                          {formatIndianNumber(m.value)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10">
                          {formatPct(m.pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Product table top + Legend + Pie underneath */}
            <div className="space-y-4">
              {/* Product table (Mutual Fund only) */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">
                        Product
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28 whitespace-nowrap">
                        Share(%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <TotalRow
                      cells={[
                        "Total",
                        formatIndianNumber(grandTotal),
                        "100.00",
                      ]}
                    />
                    <tr className="border-t border-slate-800/60 hover:bg-slate-800/20 transition">
                      <td className="px-5 py-3 text-slate-300 font-medium">
                        Mutual Fund
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300 tabular-nums">
                        {formatIndianNumber(grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-300 bg-teal-500/5 border-l border-teal-500/10 tabular-nums">
                        100.00
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend + Pie Chart */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300">
                <div className="flex flex-col lg:flex-row items-start gap-6">
                  <div className="lg:w-56 w-full h-[320px] overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] space-y-0.5 pr-1">
                    {categoryData.map((d, i) => (
                      <div
                        key={d.name}
                        className="flex items-start gap-2.5 py-2 border-b border-slate-800/30 last:border-0"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${ALLOCATION_BG_CLASSES[i % ALLOCATION_BG_CLASSES.length]}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-slate-200 text-xs font-semibold leading-tight truncate"
                            title={d.name}
                          >
                            {d.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-300 text-xs tabular-nums font-medium">
                              {formatIndianNumber(d.value)}
                            </span>
                            <span className="text-slate-600 text-xs">·</span>
                            <span className="text-slate-400 text-xs tabular-nums">
                              {formatPct(d.pct)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius="82%"
                          innerRadius={0}
                          dataKey="value"
                          stroke="none"
                          startAngle={90}
                          endAngle={-270}
                          shape={(
                            props: PieSectorDataItem & { index: number }
                          ) => {
                            const { index } = props;
                            const opacity =
                              hoveredCell === null || hoveredCell === index
                                ? 1
                                : 0.4;
                            return (
                              <Sector
                                {...props}
                                fill={
                                  ALLOCATION_PALETTE[
                                    index % ALLOCATION_PALETTE.length
                                  ]
                                }
                                opacity={opacity}
                                className="transition-opacity duration-200 cursor-pointer"
                                onMouseEnter={() => setHoveredCell(index)}
                                onMouseLeave={() => setHoveredCell(null)}
                              />
                            );
                          }}
                        />
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ CARD 1: Sub Category & Fund (side by side but separate) ══ */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Sub Category Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
            >
              <CardHeader
                accent="bg-teal-400"
                title="Sub Category"
                subtitle="— allocation by sub-category"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40">
                      <SortTh
                        label="Sub Category"
                        col="name"
                        sortCol={subCatSort.col}
                        sortDir={subCatSort.dir}
                        onSort={makeSorter(setSubCatSort)}
                        className="text-left text-slate-400"
                      />
                      <SortTh
                        label="Amount"
                        col="value"
                        sortCol={subCatSort.col}
                        sortDir={subCatSort.dir}
                        onSort={makeSorter(setSubCatSort)}
                        className="text-right text-slate-400"
                      />
                      <SortTh
                        label="Share(%)"
                        col="value"
                        sortCol={subCatSort.col}
                        sortDir={subCatSort.dir}
                        onSort={makeSorter(setSubCatSort)}
                        className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    <TotalRow
                      cells={[
                        "Total",
                        formatIndianNumber(grandTotal),
                        "100.00",
                      ]}
                    />
                    {sortedSubCat.map((s, i) => (
                      <tr
                        key={s.name}
                        className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${i % 2 === 1 ? "bg-slate-950/10" : ""}`}
                      >
                        <td className="px-4 py-3 text-slate-200 font-medium text-sm">
                          {s.name}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                          {formatIndianNumber(s.value)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10">
                          {formatPct(s.pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Fund Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 }}
              className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
            >
              <CardHeader
                accent="bg-teal-400"
                title="Fund"
                subtitle="— allocation by fund house"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40">
                      <SortTh
                        label="Fund"
                        col="name"
                        sortCol={amcSort.col}
                        sortDir={amcSort.dir}
                        onSort={makeSorter(setAmcSort)}
                        className="text-left text-slate-400"
                      />
                      <SortTh
                        label="Amount"
                        col="value"
                        sortCol={amcSort.col}
                        sortDir={amcSort.dir}
                        onSort={makeSorter(setAmcSort)}
                        className="text-right text-slate-400"
                      />
                      <SortTh
                        label="Share(%)"
                        col="value"
                        sortCol={amcSort.col}
                        sortDir={amcSort.dir}
                        onSort={makeSorter(setAmcSort)}
                        className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    <TotalRow
                      cells={[
                        "Total",
                        formatIndianNumber(grandTotal),
                        "100.00",
                      ]}
                    />
                    {sortedAmc.map((a, i) => (
                      <tr
                        key={a.name}
                        className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${i % 2 === 1 ? "bg-slate-950/10" : ""}`}
                      >
                        <td className="px-4 py-3 text-slate-200 font-medium text-sm">
                          {a.name}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                          {formatIndianNumber(a.value)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10">
                          {formatPct(a.pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* ════════════════════════════════════════
            CARD 2 — Category (asset class breakdown)
        ════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300"
          >
            <CardHeader
              accent="bg-blue-400"
              title="Category"
              subtitle="— asset class breakdown per scheme (Debt / Equity / Global Equity / Gold / Other)"
              collapsed={!categoryOpen}
              onToggle={() => setCategoryOpen((v) => !v)}
            />
            <AnimatePresence initial={false}>
              {categoryOpen && (
                <motion.div
                  key="category-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40">
                          <SortTh
                            label="Scheme Name"
                            col="schemeName"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-left text-slate-400 min-w-52"
                          />
                          <SortTh
                            label="Sub Category"
                            col="subCat"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-left text-slate-400 min-w-36"
                          />
                          <SortTh
                            label="Debt"
                            col="debt"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Equity"
                            col="equity"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Global Equity"
                            col="globalEquity"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Gold"
                            col="gold"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Other"
                            col="other"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Total"
                            col="total"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Share(%)"
                            col="total"
                            sortCol={catSort.col}
                            sortDir={catSort.dir}
                            onSort={makeSorter(setCatSort)}
                            className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-24"
                          />
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-teal-500 text-slate-950">
                          <td
                            className="px-4 py-3 font-extrabold text-sm"
                            colSpan={2}
                          >
                            Total
                          </td>
                          {[
                            catTotals.debt,
                            catTotals.equity,
                            catTotals.globalEquity,
                            catTotals.gold,
                            catTotals.other,
                            catTotals.total,
                          ].map((v, i) => (
                            <td
                              key={i}
                              className="px-4 py-3 text-right font-extrabold tabular-nums"
                            >
                              {formatIndianNumber(v)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right font-extrabold bg-teal-600 border-l border-teal-400/30 tabular-nums">
                            100.00
                          </td>
                        </tr>
                        {sortedCat.map((r, i) => (
                          <tr
                            key={r.schemeName}
                            className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${i % 2 === 1 ? "bg-slate-950/10" : ""}`}
                          >
                            <td className="px-4 py-3 text-slate-200 font-medium text-xs">
                              {r.schemeName}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {r.subCat}
                            </td>
                            {[
                              r.debt,
                              r.equity,
                              r.globalEquity,
                              r.gold,
                              r.other,
                              r.total,
                            ].map((v, j) => (
                              <td
                                key={j}
                                className="px-4 py-3 text-right tabular-nums text-slate-300 text-xs"
                              >
                                {v > 0 ? formatIndianNumber(v) : "0"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10 text-xs">
                              {formatPct(r.pct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ════════════════════════════════════════
            CARD 3 — Equity Cap
        ════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300"
          >
            <CardHeader
              accent="bg-emerald-400"
              title="Equity Cap for Mutual Fund"
              subtitle="— large cap / mid cap / small cap breakdown per scheme"
              collapsed={!equityCapOpen}
              onToggle={() => setEquityCapOpen((v) => !v)}
            />
            <AnimatePresence initial={false}>
              {equityCapOpen && (
                <motion.div
                  key="equitycap-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40">
                          <SortTh
                            label="Scheme Name"
                            col="schemeName"
                            sortCol={capSort.col}
                            sortDir={capSort.dir}
                            onSort={makeSorter(setCapSort)}
                            className="text-left text-slate-400 min-w-52"
                          />
                          <SortTh
                            label="Sub Category"
                            col="subCat"
                            sortCol={capSort.col}
                            sortDir={capSort.dir}
                            onSort={makeSorter(setCapSort)}
                            className="text-left text-slate-400 min-w-36"
                          />
                          <SortTh
                            label="Equity Large Cap"
                            col="large"
                            sortCol={capSort.col}
                            sortDir={capSort.dir}
                            onSort={makeSorter(setCapSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Equity Mid Cap"
                            col="mid"
                            sortCol={capSort.col}
                            sortDir={capSort.dir}
                            onSort={makeSorter(setCapSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Equity Small Cap"
                            col="small"
                            sortCol={capSort.col}
                            sortDir={capSort.dir}
                            onSort={makeSorter(setCapSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Total"
                            col="total"
                            sortCol={capSort.col}
                            sortDir={capSort.dir}
                            onSort={makeSorter(setCapSort)}
                            className="text-right text-slate-400"
                          />
                          <SortTh
                            label="Share(%)"
                            col="total"
                            sortCol={capSort.col}
                            sortDir={capSort.dir}
                            onSort={makeSorter(setCapSort)}
                            className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-24"
                          />
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-teal-500 text-slate-950">
                          <td
                            className="px-4 py-3 font-extrabold text-sm"
                            colSpan={2}
                          >
                            Total
                          </td>
                          {[
                            capTotals.large,
                            capTotals.mid,
                            capTotals.small,
                            capTotals.total,
                          ].map((v, i) => (
                            <td
                              key={i}
                              className="px-4 py-3 text-right font-extrabold tabular-nums"
                            >
                              <div>{formatIndianNumber(v)}</div>
                              {capTotals.total > 0 && (
                                <div className="text-[10px] font-semibold opacity-75">
                                  ({((v / capTotals.total) * 100).toFixed(2)}%)
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right font-extrabold bg-teal-600 border-l border-teal-400/30 tabular-nums">
                            100.00
                          </td>
                        </tr>
                        {sortedCap.map((r, i) => (
                          <tr
                            key={r.schemeName}
                            className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${i % 2 === 1 ? "bg-slate-950/10" : ""}`}
                          >
                            <td className="px-4 py-3 text-slate-200 font-medium text-xs">
                              {r.schemeName}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {r.subCat}
                            </td>
                            {[r.large, r.mid, r.small, r.total].map((v, j) => (
                              <td
                                key={j}
                                className="px-4 py-3 text-right tabular-nums text-slate-300 text-xs"
                              >
                                {v > 0 ? formatIndianNumber(v) : "0"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10 text-xs">
                              {formatPct(r.pct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ════════════════════════════════════════
            CARD 4 — Scheme / Scrip (grouped tree)
        ════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300"
          >
            <CardHeader
              accent="bg-violet-400"
              title="Scheme / Scrip"
              subtitle="— grouped by sub-category with sub-totals"
              collapsed={!schemeScripOpen}
              onToggle={() => setSchemeScripOpen((v) => !v)}
            />
            <AnimatePresence initial={false}>
              {schemeScripOpen && (
                <motion.div
                  key="schemescrip-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40">
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">
                            Scheme / Scrip
                          </th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28 whitespace-nowrap">
                            Share(%)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <TotalRow
                          cells={[
                            "Grand Total :",
                            formatIndianNumber(grandTotal),
                            "100.00",
                          ]}
                        />
                        {schemeGrouped.map((group) => (
                          <Fragment key={group.subCat}>
                            <tr className="border-t border-slate-700/50 bg-slate-800/40">
                              <td
                                colSpan={3}
                                className="px-5 py-2.5 text-sm font-bold text-teal-400"
                              >
                                {group.subCat}
                              </td>
                            </tr>
                            {group.funds.map((f) => (
                              <tr
                                key={f.name}
                                className="border-t border-slate-800/30 hover:bg-slate-800/20 transition"
                              >
                                <td className="px-8 py-2.5 text-slate-300 text-xs">
                                  {f.name}
                                </td>
                                <td className="px-5 py-2.5 text-right tabular-nums text-slate-300 text-xs">
                                  {formatIndianNumber(f.value)}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums text-slate-400 text-xs border-l border-teal-500/10 w-28">
                                  {formatPct(f.pct)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-slate-700/60 bg-slate-900/60 font-bold">
                              <td className="px-5 py-2.5 text-xs text-slate-400">
                                Sub Total :
                              </td>
                              <td className="px-5 py-2.5 text-right tabular-nums text-slate-300 text-xs">
                                {formatIndianNumber(group.subTotal)}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-slate-300 text-xs bg-teal-500/5 border-l border-teal-500/10 w-28">
                                {formatPct(group.pct)}
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}
