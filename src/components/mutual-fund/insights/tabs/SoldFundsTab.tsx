"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Receipt,
  Search,
  Coins,
  History,
  CheckCircle2,
  Calendar,
  Zap,
  BarChart3,
  PieChart,
  FileText,
  Filter,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Line,
} from "recharts";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import { getOverlapSubCategory } from "@/helpers/allocation";
import type { SoldHoldingItem, SoldFundsSegment } from "@/types/insights";

interface SoldFundsTabProps {
  soldHoldings: SoldHoldingItem[];
  partiallySoldHoldings: SoldHoldingItem[];
  getCategoryDotClass: (category: string) => string;
  getCategoryBadgeClass: (category: string) => string;
}

interface CustomTooltipPayloadItem {
  payload: {
    fullName?: string;
    memberName?: string;
    folioNo?: string;
    buy?: number;
    sell?: number;
    profit: number;
    absReturn: number;
    cagr?: number;
    days?: number;
    years?: number;
    category?: string;
    invested?: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}

function CustomLeaderboardTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-bold text-slate-100">{data.fullName}</p>
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Capital Buy:</span>
          <span className="font-semibold text-slate-200">
            {formatCurrency(data.buy || 0)}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Proceeds Sell:</span>
          <span className="font-semibold text-emerald-400">
            {formatCurrency(data.sell || 0)}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-emerald-400 font-bold pt-1 border-t border-slate-800/80">
          <span>Realised Profit:</span>
          <span>
            +{formatCurrency(data.profit)} (+
            {(data.absReturn || 0).toFixed(2)}%)
          </span>
        </div>
        <div className="text-[11px] text-slate-500 pt-0.5">
          Holding Period: {data.days} Days (~
          {((data.days || 0) / 365).toFixed(1)} Yrs)
        </div>
      </div>
    );
  }
  return null;
}

function CustomCategoryTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-bold text-emerald-400">{data.category}</p>
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Total Invested:</span>
          <span className="font-semibold text-slate-200">
            {formatCurrency(data.invested || 0)}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Total Realised Profit:</span>
          <span className="font-semibold text-emerald-400">
            +{formatCurrency(data.profit)}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-amber-400 font-bold pt-1 border-t border-slate-800/80">
          <span>Category Return:</span>
          <span>+{(data.absReturn || 0).toFixed(2)}%</span>
        </div>
      </div>
    );
  }
  return null;
}

function CustomUltraShortTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 backdrop-blur-md min-w-[230px]">
        <p className="font-bold text-cyan-300 border-b border-slate-800 pb-1">
          {data.fullName}
        </p>
        <div className="space-y-0.5 text-[11px]">
          <p className="text-slate-400">
            Applicant:{" "}
            <span className="text-slate-200 font-semibold">
              {data.memberName}
            </span>
          </p>
          {data.folioNo && (
            <p className="text-slate-400">
              Folio:{" "}
              <span className="text-cyan-300 font-mono">{data.folioNo}</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px] border-t border-slate-800/80">
          <span className="text-slate-400">Capital Buy:</span>
          <span className="font-semibold text-slate-200 text-right">
            {formatCurrency(data.buy || 0)}
          </span>
          <span className="text-slate-400">Proceeds Sell:</span>
          <span className="font-semibold text-emerald-400 text-right">
            {formatCurrency(data.sell || 0)}
          </span>
          <span className="text-slate-400 font-medium">Realised Profit:</span>
          <span className="font-bold text-emerald-400 text-right">
            +{formatCurrency(data.profit || 0)}
          </span>
          <span className="text-slate-400 font-medium">Abs Return:</span>
          <span className="font-bold text-emerald-400 text-right">
            +{(data.absReturn || 0).toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center text-cyan-400 font-bold pt-1.5 border-t border-slate-800">
          <span>Annualised CAGR:</span>
          <span className="bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40 text-xs">
            +{(data.cagr || 0).toFixed(2)}% p.a.
          </span>
        </div>
        <div className="text-[10px] text-slate-500 pt-0.5 flex justify-between">
          <span>Holding Window:</span>
          <span>
            {data.days} Days (~{data.years} Yrs)
          </span>
        </div>
      </div>
    );
  }
  return null;
}

function getPastelCategoryBadgeClass(category: string): string {
  const cat = (category || "").toLowerCase();

  if (cat.includes("ultra short")) {
    return "bg-cyan-500/20 text-cyan-300 border border-cyan-500/35";
  }
  if (cat.includes("debt") || cat.includes("liquid")) {
    return "bg-blue-500/20 text-blue-300 border border-blue-500/35";
  }
  if (cat.includes("large & mid") || cat.includes("large and mid")) {
    return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/35";
  }
  if (cat.includes("large")) {
    return "bg-teal-500/20 text-teal-300 border border-teal-500/35";
  }
  if (cat.includes("mid")) {
    return "bg-amber-500/20 text-amber-300 border border-amber-500/35";
  }
  if (cat.includes("small")) {
    return "bg-rose-500/20 text-rose-300 border border-rose-500/35";
  }
  if (cat.includes("flexi")) {
    return "bg-purple-500/20 text-purple-300 border border-purple-500/35";
  }
  if (cat.includes("focused")) {
    return "bg-violet-500/20 text-violet-300 border border-violet-500/35";
  }
  if (cat.includes("value") || cat.includes("contra")) {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35";
  }
  if (cat.includes("thematic") || cat.includes("opportunity")) {
    return "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/35";
  }
  if (cat.includes("multi asset")) {
    return "bg-orange-500/20 text-orange-300 border border-orange-500/35";
  }
  if (cat.includes("sif") || cat.includes("specialized")) {
    return "bg-pink-500/20 text-pink-300 border border-pink-500/35";
  }
  if (cat.includes("ulip") || cat.includes("insurance")) {
    return "bg-sky-500/20 text-sky-300 border border-sky-500/35";
  }

  const pastelColors = [
    "bg-teal-500/20 text-teal-300 border border-teal-500/35",
    "bg-indigo-500/20 text-indigo-300 border border-indigo-500/35",
    "bg-amber-500/20 text-amber-300 border border-amber-500/35",
    "bg-pink-500/20 text-pink-300 border border-pink-500/35",
    "bg-cyan-500/20 text-cyan-300 border border-cyan-500/35",
    "bg-violet-500/20 text-violet-300 border border-violet-500/35",
    "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35",
    "bg-orange-500/20 text-orange-300 border border-orange-500/35",
    "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/35",
    "bg-rose-500/20 text-rose-300 border border-rose-500/35",
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % pastelColors.length;
  return pastelColors[idx];
}

const SEGMENT_OPTIONS: {
  key: SoldFundsSegment;
  label: string;
  icon: typeof History;
}[] = [
  { key: "all", label: "All Sold Activity", icon: History },
  { key: "fully-sold", label: "Fully Sold", icon: CheckCircle2 },
  { key: "partially-sold", label: "Partially Sold", icon: ArrowLeftRight },
];

export default function SoldFundsTab({
  soldHoldings,
  partiallySoldHoldings,
  getCategoryBadgeClass: _getCategoryBadgeClass,
}: SoldFundsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [ultraSortBy, setUltraSortBy] = useState<"cagr" | "profit" | "days">(
    "cagr"
  );
  const [activeSegment, setActiveSegment] = useState<SoldFundsSegment>("all");

  // Merge data based on active segment
  const activeHoldings = useMemo(() => {
    if (activeSegment === "fully-sold") return soldHoldings;
    if (activeSegment === "partially-sold") return partiallySoldHoldings;
    return [...soldHoldings, ...partiallySoldHoldings];
  }, [activeSegment, soldHoldings, partiallySoldHoldings]);

  const isPartialView = activeSegment === "partially-sold";

  // Ultra Short Duration Special Analytics Data
  const ultraShortHoldings = useMemo(() => {
    return activeHoldings.filter(
      (item) =>
        getOverlapSubCategory(item.schemeName, item.schemeCategory) ===
        "Ultra Short Duration"
    );
  }, [activeHoldings]);

  const ultraShortMetrics = useMemo(() => {
    const totalBuy = ultraShortHoldings.reduce(
      (acc, i) => acc + i.buyAmount,
      0
    );
    const totalSell = ultraShortHoldings.reduce(
      (acc, i) => acc + i.sellAmount,
      0
    );
    const netProfit = totalSell - totalBuy;
    const absReturn = totalBuy > 0 ? (netProfit / totalBuy) * 100 : 0;
    const avgDays =
      ultraShortHoldings.length > 0
        ? Math.round(
            ultraShortHoldings.reduce((acc, i) => acc + i.holdingDays, 0) /
              ultraShortHoldings.length
          )
        : 0;

    const itemsWithCagr = ultraShortHoldings.map((item) => {
      const cagr =
        item.holdingDays > 0
          ? (Math.pow(1 + item.absReturn / 100, 365 / item.holdingDays) - 1) *
            100
          : item.absReturn;
      return { ...item, cagr };
    });

    const topCagrItem = [...itemsWithCagr].sort((a, b) => b.cagr - a.cagr)[0];
    const avgCagr =
      itemsWithCagr.length > 0
        ? itemsWithCagr.reduce((acc, i) => acc + i.cagr, 0) /
          itemsWithCagr.length
        : 0;

    return {
      count: ultraShortHoldings.length,
      totalBuy,
      totalSell,
      netProfit,
      absReturn,
      avgDays,
      avgCagr,
      topCagrItem,
    };
  }, [ultraShortHoldings]);

  const ultraShortChartData = useMemo(() => {
    const counts: Record<string, number> = {};

    const list = ultraShortHoldings.map((item, idx) => {
      const years = Math.max(0.1, item.holdingDays / 365);
      const cagr =
        item.holdingDays > 0
          ? (Math.pow(1 + item.absReturn / 100, 365 / item.holdingDays) - 1) *
            100
          : item.absReturn;

      const baseName = item.schemeName
        .replace(/Ultra Short Duration/gi, "USD")
        .replace(/Ultra Short Term/gi, "UST")
        .replace(/Fund/gi, "")
        .replace(/Reg/gi, "")
        .replace(/Plan/gi, "")
        .replace(/\(G\)/gi, "")
        .trim();

      const memberFirstName = item.memberName
        ? item.memberName.trim().split(" ")[0]
        : "";
      const formattedMember = memberFirstName
        ? memberFirstName.charAt(0).toUpperCase() +
          memberFirstName.slice(1).toLowerCase()
        : "";

      const rawLabel = formattedMember
        ? `${baseName} (${formattedMember})`
        : baseName;

      counts[rawLabel] = (counts[rawLabel] || 0) + 1;
      const occurrence = counts[rawLabel];

      const uniqueShortName =
        occurrence > 1 ? `${rawLabel} #${occurrence}` : rawLabel;

      return {
        id: `ush-${item.holdingId}-${idx}`,
        fullName: item.schemeName,
        memberName: item.memberName,
        folioNo: item.folioNo,
        shortName: uniqueShortName,
        profit: Math.round(item.netProfit),
        buy: Math.round(item.buyAmount),
        sell: Math.round(item.sellAmount),
        absReturn: Number(item.absReturn.toFixed(2)),
        cagr: Number(cagr.toFixed(2)),
        days: item.holdingDays,
        years: Number(years.toFixed(1)),
      };
    });

    if (ultraSortBy === "cagr") list.sort((a, b) => b.cagr - a.cagr);
    else if (ultraSortBy === "profit") list.sort((a, b) => b.profit - a.profit);
    else list.sort((a, b) => b.days - a.days);

    return list;
  }, [ultraShortHoldings, ultraSortBy]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCount = activeHoldings.length;
    const totalBuy = activeHoldings.reduce(
      (acc, item) => acc + item.buyAmount,
      0
    );
    const totalSell = activeHoldings.reduce(
      (acc, item) => acc + item.sellAmount,
      0
    );
    const totalCurrentValue = activeHoldings.reduce(
      (acc, item) => acc + (item.currentValue || 0),
      0
    );
    const netProfit = isPartialView
      ? totalSell - totalBuy + totalCurrentValue
      : totalSell - totalBuy;
    const overallAbsReturn = totalBuy > 0 ? (netProfit / totalBuy) * 100 : 0;

    const totalDays = activeHoldings.reduce(
      (acc, item) => acc + item.holdingDays,
      0
    );
    const avgHoldingDays =
      totalCount > 0 ? Math.round(totalDays / totalCount) : 0;

    // Top past performer by absReturn
    const topPerformer = [...activeHoldings].sort(
      (a, b) => b.absReturn - a.absReturn
    )[0];

    return {
      totalCount,
      totalBuy,
      totalSell,
      totalCurrentValue,
      netProfit,
      overallAbsReturn,
      avgHoldingDays,
      topPerformer,
    };
  }, [activeHoldings, isPartialView]);

  // Category breakdown for sold holdings
  const categoryBreakdown = useMemo(() => {
    const groups = new Map<
      string,
      {
        category: string;
        holdings: SoldHoldingItem[];
        totalBuy: number;
        totalSell: number;
        netProfit: number;
        avgDays: number;
        topPerformer: SoldHoldingItem | null;
      }
    >();

    for (const h of activeHoldings) {
      const cat = getOverlapSubCategory(h.schemeName, h.schemeCategory);
      const existing = groups.get(cat);
      if (!existing) {
        groups.set(cat, {
          category: cat,
          holdings: [h],
          totalBuy: h.buyAmount,
          totalSell: h.sellAmount,
          netProfit: h.netProfit,
          avgDays: h.holdingDays,
          topPerformer: h,
        });
      } else {
        existing.holdings.push(h);
        existing.totalBuy += h.buyAmount;
        existing.totalSell += h.sellAmount;
        existing.netProfit += h.netProfit;
        existing.avgDays += h.holdingDays;
        if (
          !existing.topPerformer ||
          h.absReturn > existing.topPerformer.absReturn
        ) {
          existing.topPerformer = h;
        }
      }
    }

    return Array.from(groups.values()).map((g) => ({
      ...g,
      avgDays: Math.round(g.avgDays / g.holdings.length),
      absReturn: g.totalBuy > 0 ? (g.netProfit / g.totalBuy) * 100 : 0,
    }));
  }, [activeHoldings]);

  // Chart Data 1: Top 6 Realised Profit Schemes Leaderboard
  const leaderboardChartData = useMemo(() => {
    return [...activeHoldings]
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 6)
      .map((item) => ({
        name:
          item.schemeName.length > 22
            ? item.schemeName.substring(0, 20) + "..."
            : item.schemeName,
        fullName: item.schemeName,
        buy: item.buyAmount,
        sell: item.sellAmount,
        profit: item.netProfit,
        absReturn: item.absReturn,
        days: item.holdingDays,
      }));
  }, [activeHoldings]);

  // Chart Data 2: Category Profit & Return % Distribution
  const categoryChartData = useMemo(() => {
    return categoryBreakdown.map((cat) => ({
      category:
        cat.category.length > 15
          ? cat.category.substring(0, 13) + "..."
          : cat.category,
      fullCategory: cat.category,
      profit: Math.round(cat.netProfit),
      invested: Math.round(cat.totalBuy),
      absReturn: Math.round(cat.absReturn * 100) / 100,
    }));
  }, [categoryBreakdown]);

  // Unique categories for filter dropdown
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    cats.add("All");
    for (const h of activeHoldings) {
      cats.add(getOverlapSubCategory(h.schemeName, h.schemeCategory));
    }
    return Array.from(cats);
  }, [activeHoldings]);

  // Filtered & Sorted Sold Holdings Table Data
  const filteredHoldings = useMemo(() => {
    return activeHoldings.filter((h) => {
      const matchesSearch =
        h.schemeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.memberName.toLowerCase().includes(searchTerm.toLowerCase());
      const cat = getOverlapSubCategory(h.schemeName, h.schemeCategory);
      const matchesCategory =
        selectedCategory === "All" || cat === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeHoldings, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <History className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Sold Funds Analysis & Realised Performance
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              {isPartialView
                ? "Analysis of partially redeemed mutual fund holdings — funds where some units were sold but a position is still active. Tracks realised proceeds + remaining value."
                : activeSegment === "fully-sold"
                  ? "In-depth analysis of fully redeemed mutual fund holdings. Evaluates historical holding period efficiency, realised capital gains, and category dynamics."
                  : "Combined analysis of all sold activity — fully redeemed and partially sold holdings. Evaluates realised capital gains, holding period efficiency, and category dynamics."}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-950/60 border border-slate-800/80 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {summaryMetrics.totalCount}{" "}
              {isPartialView
                ? "Partially Sold"
                : activeSegment === "fully-sold"
                  ? "Fully Sold"
                  : "Total Sold"}{" "}
              Funds
            </span>
          </div>
        </div>

        {/* Segment Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 self-start">
          {SEGMENT_OPTIONS.map((seg) => {
            const Icon = seg.icon;
            const isActive = activeSegment === seg.key;
            const count =
              seg.key === "all"
                ? soldHoldings.length + partiallySoldHoldings.length
                : seg.key === "fully-sold"
                  ? soldHoldings.length
                  : partiallySoldHoldings.length;
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => {
                  setActiveSegment(seg.key);
                  setSelectedCategory("All");
                  setSearchTerm("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{seg.label}</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                      : "bg-slate-800/80 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Capital Invested */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-5 text-slate-100 group-hover:scale-110 transition">
            <Coins className="w-20 h-20" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Capital Invested (Buy)
          </p>
          <p className="text-xl font-black text-slate-100 mt-1 tabular-nums">
            {formatCurrency(summaryMetrics.totalBuy)}
          </p>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            Across {summaryMetrics.totalCount}{" "}
            {isPartialView ? "partially sold" : "redeemed"} holdings
          </div>
        </div>

        {/* Total Proceeds Received / Sell + Current Value */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-400 group-hover:scale-110 transition">
            <Receipt className="w-20 h-20" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isPartialView
              ? "Proceeds + Current Value"
              : "Total Proceeds Redeemed (Sell)"}
          </p>
          <p className="text-xl font-black text-emerald-400 mt-1 tabular-nums">
            {isPartialView
              ? formatCurrency(
                  summaryMetrics.totalSell + summaryMetrics.totalCurrentValue
                )
              : formatCurrency(summaryMetrics.totalSell)}
          </p>
          <div className="mt-2 flex items-center text-[11px] text-emerald-400/90 font-medium">
            {isPartialView ? (
              <span>
                Sold: {formatCurrency(summaryMetrics.totalSell)} + Remaining:{" "}
                {formatCurrency(summaryMetrics.totalCurrentValue)}
              </span>
            ) : (
              "+100% Capital Liquidation Realised"
            )}
          </div>
        </div>

        {/* Net Realised Profit */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-400 group-hover:scale-110 transition">
            <TrendingUp className="w-20 h-20" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isPartialView
              ? "Net Gain (Realised + Unrealised)"
              : "Net Realised Profit"}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-xl font-black text-emerald-400 tabular-nums">
              {summaryMetrics.netProfit >= 0 ? "+" : ""}
              {formatCurrency(summaryMetrics.netProfit)}
            </p>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
              {summaryMetrics.overallAbsReturn >= 0 ? "+" : ""}
              {summaryMetrics.overallAbsReturn.toFixed(2)}%
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            Weighted Avg Holding: {summaryMetrics.avgHoldingDays} Days (~
            {(summaryMetrics.avgHoldingDays / 365).toFixed(1)} Yrs)
          </div>
        </div>

        {/* Best Past Performer */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-400 group-hover:scale-110 transition">
            <Zap className="w-20 h-20" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isPartialView ? "Top Performing Fund" : "Top Past Performer"}
          </p>
          {summaryMetrics.topPerformer ? (
            <>
              <p className="text-sm font-bold text-slate-100 truncate mt-1">
                {summaryMetrics.topPerformer.schemeName}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xs font-black text-emerald-400">
                  {summaryMetrics.topPerformer.absReturn >= 0 ? "+" : ""}
                  {summaryMetrics.topPerformer.absReturn.toFixed(2)}% Abs
                </span>
                <span className="text-[11px] text-slate-400">
                  ({summaryMetrics.topPerformer.holdingDays} Days)
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 mt-1">No data</p>
          )}
        </div>
      </div>

      {/* Visual Analytics Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Realised Profit Leaderboard Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Top Realised Profit Schemes Leaderboard
                </h3>
                <p className="text-[11px] text-slate-400">
                  Highest net profit generating funds in past sales (₹)
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leaderboardChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              >
                <defs>
                  <linearGradient
                    id="profitBarGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={<CustomLeaderboardTooltip />}
                  cursor={{ fill: "rgba(30, 41, 59, 0.4)", rx: 6, ry: 6 }}
                />
                <Bar
                  dataKey="profit"
                  name="Net Realised Profit"
                  fill="url(#profitBarGrad)"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Category Profit & Return % Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <PieChart className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Category Realised Profit & Return %
                </h3>
                <p className="text-[11px] text-slate-400">
                  Profit (Bars, left axis) vs Absolute Return % (Line, right
                  axis)
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={categoryChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="catBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="category"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f59e0b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={<CustomCategoryTooltip />}
                  cursor={{ fill: "rgba(30, 41, 59, 0.4)", rx: 6, ry: 6 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="profit"
                  name="Net Profit"
                  fill="url(#catBarGrad)"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="absReturn"
                  name="Return %"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: "#f59e0b", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Special Category Deep-Dive: Ultra Short Duration Category */}
      {ultraShortHoldings.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/80 border border-cyan-500/30 backdrop-blur-md shadow-2xl space-y-5 relative overflow-hidden">
          {/* Cyan Glow Accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Section Title & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100">
                    Ultra Short Duration Special Category Deep-Dive
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {ultraShortMetrics.count} Funds Compared
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed comparative analytics for all redeemed Ultra Short
                  Duration funds: Realised profit (₹), Abs Return %, and
                  Annualised CAGR (% p.a.).
                </p>
              </div>
            </div>

            {/* Sort Switcher Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 text-xs self-start md:self-auto">
              <span className="text-[11px] text-slate-400 px-2 font-medium">
                Sort By:
              </span>
              <button
                type="button"
                onClick={() => setUltraSortBy("cagr")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  ultraSortBy === "cagr"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                CAGR % p.a.
              </button>
              <button
                type="button"
                onClick={() => setUltraSortBy("profit")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  ultraSortBy === "profit"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Profit (₹)
              </button>
              <button
                type="button"
                onClick={() => setUltraSortBy("days")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  ultraSortBy === "days"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Duration
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar - Matching top summary cards design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Capital Liquidated */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-5 text-slate-100 group-hover:scale-110 transition">
                <Coins className="w-20 h-20" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Capital Invested (Buy)
              </p>
              <p className="text-xl font-black text-slate-100 mt-1 tabular-nums">
                {formatCurrency(ultraShortMetrics.totalBuy)}
              </p>
              <div className="mt-2 flex items-center text-[11px] text-slate-400">
                Across {ultraShortMetrics.count} Ultra Short holdings
              </div>
            </div>

            {/* Card 2: Total Proceeds Redeemed */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-400 group-hover:scale-110 transition">
                <Receipt className="w-20 h-20" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Proceeds Redeemed (Sell)
              </p>
              <p className="text-xl font-black text-emerald-400 mt-1 tabular-nums">
                {formatCurrency(ultraShortMetrics.totalSell)}
              </p>
              <div className="mt-2 flex items-center text-[11px] text-emerald-400/90 font-medium">
                +100% Capital Liquidation Realised
              </div>
            </div>

            {/* Card 3: Net Realised Profit */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-400 group-hover:scale-110 transition">
                <TrendingUp className="w-20 h-20" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Net Realised Profit
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-xl font-black text-emerald-400 tabular-nums">
                  +{formatCurrency(ultraShortMetrics.netProfit)}
                </p>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                  +{ultraShortMetrics.absReturn.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 flex items-center text-[11px] text-slate-400">
                Weighted Avg Holding: {ultraShortMetrics.avgDays} Days (~
                {(ultraShortMetrics.avgDays / 365).toFixed(1)} Yrs)
              </div>
            </div>

            {/* Card 4: Top CAGR Fund */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-400 group-hover:scale-110 transition">
                <Zap className="w-20 h-20" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Top CAGR Ultra Short Fund
              </p>
              {ultraShortMetrics.topCagrItem ? (
                <>
                  <p className="text-sm font-bold text-slate-100 truncate mt-1">
                    {ultraShortMetrics.topCagrItem.schemeName}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs font-black text-emerald-400">
                      +{ultraShortMetrics.topCagrItem.cagr.toFixed(2)}% p.a.
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({ultraShortMetrics.topCagrItem.holdingDays} Days)
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-1">—</p>
              )}
            </div>
          </div>

          {/* Deep-Dive Chart */}
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={ultraShortChartData}
                margin={{ top: 15, right: 15, left: 15, bottom: 40 }}
              >
                <defs>
                  <linearGradient
                    id="ultraCagrGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortName"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  yAxisId="cagrAxis"
                  stroke="#06b6d4"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  yAxisId="profitAxis"
                  orientation="right"
                  stroke="#f59e0b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={<CustomUltraShortTooltip />}
                  cursor={{ fill: "rgba(6, 182, 212, 0.15)", rx: 6, ry: 6 }}
                />
                <Bar
                  yAxisId="cagrAxis"
                  dataKey="cagr"
                  name="Annualised CAGR %"
                  fill="url(#ultraCagrGrad)"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                />
                <Line
                  yAxisId="profitAxis"
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit (₹)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ fill: "#f59e0b", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Performance & Re-Investment Recommendations */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Category Performance & Future Re-Investment Insights
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyzing realized returns by asset category to identify
              high-performing strategies for future portfolio allocation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryBreakdown.map((catGroup) => {
            return (
              <div
                key={catGroup.category}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700/80 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${getPastelCategoryBadgeClass(
                      catGroup.category
                    )}`}
                  >
                    {catGroup.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    {catGroup.holdings.length} Fund
                    {catGroup.holdings.length > 1 ? "s" : ""} Sold
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Capital Invested
                    </span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {formatCurrency(catGroup.totalBuy)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Net Realised Profit
                    </span>
                    <span className="font-bold text-emerald-400 tabular-nums">
                      +{formatCurrency(catGroup.netProfit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Abs Return (Total)
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-emerald-400 tabular-nums">
                        +{catGroup.absReturn.toFixed(2)}%
                      </span>
                      {catGroup.avgDays > 0 && (
                        <span className="text-[10px] text-slate-400">
                          (~
                          {(
                            (Math.pow(
                              1 + catGroup.absReturn / 100,
                              365 / catGroup.avgDays
                            ) -
                              1) *
                            100
                          ).toFixed(1)}
                          % p.a.)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Avg Holding Period
                    </span>
                    <span className="font-semibold text-slate-300 tabular-nums">
                      {catGroup.avgDays} Days (~
                      {(catGroup.avgDays / 365).toFixed(1)} Yrs)
                    </span>
                  </div>
                </div>

                {catGroup.topPerformer && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <span className="text-amber-400">🏆</span> Best Sold
                        Fund
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/60">
                        {catGroup.topPerformer.holdingDays} Days
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100 truncate">
                        {catGroup.topPerformer.schemeName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-xs">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Realised Return
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-emerald-400 text-xs">
                          +{catGroup.topPerformer.absReturn.toFixed(2)}% Abs
                        </span>
                        {catGroup.topPerformer.holdingDays > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            (
                            {(
                              (Math.pow(
                                1 + catGroup.topPerformer.absReturn / 100,
                                365 / catGroup.topPerformer.holdingDays
                              ) -
                                1) *
                              100
                            ).toFixed(1)}
                            % CAGR)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Filters & Detailed Sold Funds Table */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-100">
                  Detailed Realised Transaction Log
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                  {filteredHoldings.length} Funds
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete breakdown of every fully sold scheme, holding duration,
                invested capital, and net profit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative min-w-[220px] sm:min-w-[260px] flex-1 sm:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search scheme or member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 bg-slate-950/80 border border-slate-800/80 rounded-xl pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition shadow-inner"
              />
            </div>

            {/* Category Dropdown */}
            <div className="relative min-w-[160px] flex-1 sm:flex-none">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-9 bg-slate-950/80 border border-slate-800/80 text-slate-200 text-xs rounded-xl pl-8 pr-8 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition appearance-none shadow-inner cursor-pointer"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-[9px]">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800/80">
                <th className="px-3 py-3">
                  Scheme <br /> & Applicant Name
                </th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">
                  Holding Window <br /> & Duration
                </th>
                <th className="px-3 py-3 text-right">
                  Total Buy <br /> (₹)
                </th>
                <th className="px-3 py-3 text-right">
                  Total Sell <br /> (₹)
                </th>
                <th className="px-3 py-3 text-right">
                  {isPartialView ? "Net Gain" : "Realised Profit"} <br /> (₹ &
                  Abs %)
                </th>
                <th className="px-3 py-3 text-right">
                  Annualised <br /> CAGR (% p.a.)
                </th>
                <th className="px-3 py-3 text-right">
                  {isPartialView ? (
                    <>
                      Current Value <br /> & Remaining Units
                    </>
                  ) : (
                    <>
                      Annual Velocity <br /> (Profit / Yr)
                    </>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 text-xs">
              {filteredHoldings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No {isPartialView ? "partially sold" : "sold"} funds match
                    the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredHoldings.map((item) => {
                  const cat = getOverlapSubCategory(
                    item.schemeName,
                    item.schemeCategory
                  );
                  const yearsHeld = Math.max(0.1, item.holdingDays / 365);
                  const annualVelocity = Math.round(item.netProfit / yearsHeld);
                  const cagr =
                    item.holdingDays > 0
                      ? (Math.pow(
                          1 + item.absReturn / 100,
                          365 / item.holdingDays
                        ) -
                          1) *
                        100
                      : item.absReturn;

                  return (
                    <motion.tr
                      key={item.holdingId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="transition-colors hover:bg-slate-800/30"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-100 text-xs sm:text-sm leading-snug whitespace-normal">
                          {item.schemeName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                          {item.memberName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 leading-tight">
                          Folio: {item.folioNo || "—"}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${getPastelCategoryBadgeClass(
                            cat
                          )}`}
                        >
                          {cat}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.holdingDays} Days</span>
                          <span className="text-slate-400 text-[11px]">
                            ({yearsHeld.toFixed(1)} Yrs)
                          </span>
                        </div>
                        {item.firstBuyDate && item.lastSellDate && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {formatDate(item.firstBuyDate)} →{" "}
                            {formatDate(item.lastSellDate)}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-right font-semibold text-slate-200 tabular-nums">
                        {formatCurrency(item.buyAmount)}
                      </td>

                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-400 tabular-nums">
                        {formatCurrency(item.sellAmount)}
                      </td>

                      <td className="px-3 py-2.5 text-right font-bold text-emerald-400 tabular-nums">
                        <div>
                          {item.netProfit >= 0 ? "+" : ""}
                          {formatCurrency(item.netProfit)}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-400">
                          {item.absReturn >= 0 ? "+" : ""}
                          {item.absReturn.toFixed(2)}% Abs
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-right font-bold text-amber-400 tabular-nums whitespace-nowrap">
                        <span className="bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          {cagr >= 0 ? "+" : ""}
                          {cagr.toFixed(2)}% p.a.
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {isPartialView ? (
                          <div>
                            <div className="font-bold text-cyan-400">
                              {formatCurrency(item.currentValue || 0)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {(item.remainingUnits || 0).toFixed(3)} units
                            </div>
                          </div>
                        ) : (
                          <span className="font-semibold text-amber-400/90">
                            {annualVelocity >= 0 ? "+" : ""}
                            {formatCurrency(annualVelocity)}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
