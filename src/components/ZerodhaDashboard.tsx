"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

import {
  Upload,
  Briefcase,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  IndianRupee,
  Activity,
  Target,
  ChevronUp,
  X as XIcon,
} from "lucide-react";
import {
  uploadZerodhaHoldingsAction,
  deleteZerodhaHoldingsAction,
} from "@/app/zerodha/actions";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import ZerodhaMappingTab from "./ZerodhaMappingTab";
import ZerodhaOverviewTab from "./ZerodhaOverviewTab";
import ZerodhaStocksTab from "./ZerodhaStocksTab";
import ZerodhaFundsTab from "./ZerodhaFundsTab";
import ZerodhaSnapshotsTab from "./ZerodhaSnapshotsTab";
import ZerodhaInsightsTab from "./ZerodhaInsightsTab";

export interface ZerodhaHolding {
  id: number;
  reportId: number | null;
  holdingType: string;
  symbol: string;
  isin: string;
  sector: string | null;
  instrumentType: string | null;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  xirr?: number | null;
  cagr?: number | null;
  holdingDays?: number | null;
  benchmarkXirr?: number | null;
  alpha?: number | null;
  benchmarkCode?: string | null;
  benchmarkName?: string | null;
}

export interface ZerodhaScheme {
  id: number;
  name: string;
  category: string;
  schemeCodeApi: string | null;
}

interface ZerodhaDashboardProps {
  data: {
    firstCasReportDate: string | null;
    reportsList: {
      id: number;
      asOfDate: string;
      filename: string;
      uploadedAt: string;
    }[];
    selectedReport: {
      id: number;
      asOfDate: string;
      filename: string;
      uploadedAt: string;
    } | null;
    holdings: ZerodhaHolding[];
    totals: {
      invested: number;
      currentValue: number;
      gain: number;
      absoluteReturn: number;
      stocksInvested: number;
      stocksCurrentValue: number;
      stocksGain: number;
      fundsInvested: number;
      fundsCurrentValue: number;
      fundsGain: number;
      portfolioXirr: number;
      benchmarkXirr: number;
      alpha: number;
    };
    metricDeltas: {
      previousDate: string | null;
      portfolioXirr: number | null;
      benchmarkXirr: number | null;
      alpha: number | null;
    };
    sectorAllocation: { name: string; value: number }[];
    categoryAllocation: { name: string; value: number }[];
    assetSplit: { name: string; value: number }[];
    timelineData: {
      date: string;
      equity: number;
      mutualFunds: number;
      nifty50: number;
      equityReturn: number;
      fundsReturn: number;
      niftyReturn: number;
    }[];
    insights: {
      reportDate: string | null;
      benchmarkReturns: {
        benchmarkCode: string;
        benchmarkName: string;
        endDate: string;
        endNav: number;
        return1Y: number | null;
        cagr3Y: number | null;
        cagr5Y: number | null;
      };
      weightedCagr: number | null;
      stockWeight: number;
      fundWeight: number;
      concentration: {
        topHoldingPct: number;
        top3Pct: number;
        top5Pct: number;
      };
      movers: {
        topGainers: Array<{ symbol: string; returnPct: number; gain: number }>;
        laggards: Array<{ symbol: string; returnPct: number; gain: number }>;
      };
      previousSnapshot: {
        date: string | null;
        investedChange: number;
        currentValueChange: number;
        gainChange: number;
        returnPctChange: number;
      };
    };
  };
  allSchemes: ZerodhaScheme[];
}

function formatPrice(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export const COLORS = [
  "#10b981",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#ef4444",
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ZerodhaDashboard({
  data,
  allSchemes = [],
}: ZerodhaDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const rawTab = searchParams.get("tab");
  const activeTab =
    rawTab &&
    ["overview", "insights", "stocks", "funds", "mapping", "files"].includes(
      rawTab
    )
      ? (rawTab as
          "overview" | "insights" | "stocks" | "funds" | "mapping" | "files")
      : "overview";

  const setActiveTab = (
    tab: "overview" | "insights" | "stocks" | "funds" | "mapping" | "files"
  ) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/zerodha?${params.toString()}`, { scroll: false });
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Search & Filter state for Stocks Table
  const [stockSortField, setStockSortField] = useState<
    | "symbol"
    | "quantity"
    | "averagePrice"
    | "currentPrice"
    | "investedValue"
    | "currentValue"
    | "unrealizedPnl"
    | "unrealizedPnlPct"
    | "xirr"
    | "cagr"
    | "alpha"
  >("currentValue");
  const [stockSortOrder, setStockSortOrder] = useState<"asc" | "desc">("desc");

  const toggleStockSort = (field: typeof stockSortField) => {
    if (stockSortField === field) {
      setStockSortOrder(stockSortOrder === "asc" ? "desc" : "asc");
    } else {
      setStockSortField(field);
      setStockSortOrder("desc");
    }
  };

  const renderStockSortIcon = (field: typeof stockSortField) => {
    const isActive = stockSortField === field;
    if (isActive) {
      return stockSortOrder === "asc" ? (
        <ChevronUp size={12} className="inline ml-1 text-teal-400" />
      ) : (
        <ChevronDown size={12} className="inline ml-1 text-teal-400" />
      );
    }
    return <ChevronDown size={12} className="inline ml-1 opacity-20" />;
  };

  // Search & Filter state for Funds Table
  const [fundSortField, setFundSortField] = useState<
    | "symbol"
    | "quantity"
    | "averagePrice"
    | "currentPrice"
    | "investedValue"
    | "currentValue"
    | "unrealizedPnl"
    | "unrealizedPnlPct"
    | "xirr"
    | "cagr"
    | "holdingDays"
    | "alpha"
  >("currentValue");
  const [fundSortOrder, setFundSortOrder] = useState<"asc" | "desc">("desc");

  const toggleFundSort = (field: typeof fundSortField) => {
    if (fundSortField === field) {
      setFundSortOrder(fundSortOrder === "asc" ? "desc" : "asc");
    } else {
      setFundSortField(field);
      setFundSortOrder("desc");
    }
  };

  const renderFundSortIcon = (field: typeof fundSortField) => {
    const isActive = fundSortField === field;
    if (isActive) {
      return fundSortOrder === "asc" ? (
        <ChevronUp size={12} className="inline ml-1 text-teal-400" />
      ) : (
        <ChevronDown size={12} className="inline ml-1 text-teal-400" />
      );
    }
    return <ChevronDown size={12} className="inline ml-1 opacity-20" />;
  };

  const reportsList = data.reportsList || [];
  const selectedReport = data.selectedReport;
  const holdings = data.holdings || [];
  const totals = data.totals;

  const handleReportChange = (reportId: string) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("zerodhaReportId", reportId);
      router.push(`/zerodha?${params.toString()}`);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadZerodhaHoldingsAction(formData);
    setIsUploading(false);
    if (res.success) {
      router.refresh();
      router.push(`/zerodha?zerodhaReportId=${res.reportId}`);
      setActiveTab("overview");
    } else {
      setUploadError(res.error || "Upload failed");
    }
    e.target.value = "";
  };

  const handleDeleteReport = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this snapshot? All holdings will be permanently removed."
      )
    ) {
      return;
    }
    const res = await deleteZerodhaHoldingsAction(id);
    if (res.success) {
      router.refresh();
      router.push("/zerodha");
    } else {
      alert(res.error || "Delete failed");
    }
  };

  // Filter and sort stocks
  const stocks = holdings.filter((h) => h.holdingType === "equity");
  // Filter and sort mutual funds
  const funds = holdings.filter((h) => h.holdingType === "mutual_fund");

  if (reportsList.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-16 shadow-xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
          <Upload className="mx-auto text-teal-400 w-16 h-16 mb-6 opacity-80" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            No Zerodha Holdings Snapshot Uploaded
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Upload your Zerodha Console Holdings Excel file (which contains
            Equity, Mutual Funds, and Combined sheets) to track and analyze your
            investments.
          </p>

          <label className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg cursor-pointer transition text-sm w-fit mx-auto">
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            <span>Select Excel Statement (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {uploadError && (
            <div className="mt-6 bg-red-950/80 border border-red-800/80 rounded-xl p-3 flex items-center gap-3 text-red-350 text-sm shadow-2xl text-left max-w-md mx-auto">
              <AlertTriangle size={16} className="shrink-0" />
              <span className="flex-1">{uploadError}</span>
              <button
                onClick={() => setUploadError(null)}
                className="text-red-400 hover:text-red-200"
              >
                <XIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Briefcase className="text-teal-400" size={24} /> Zerodha Portfolio
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Personal stock and mutual fund holdings separate from family
            investments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Dropdown snapshot selector */}
          <div className="relative">
            <select
              value={selectedReport?.id || ""}
              onChange={(e) => handleReportChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none pr-9 h-[38px] transition"
            >
              {reportsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatDate(r.asOfDate)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
              <ChevronDown size={14} />
            </div>
          </div>

          <label className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold px-4 py-1.5 rounded-xl shadow-lg cursor-pointer transition text-sm h-[38px]">
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            <span>Upload</span>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-950/80 border border-red-800/80 rounded-xl p-3 flex items-center gap-3 text-red-300 text-sm shadow-2xl">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-200"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* ── ROW 1: 4 KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Value */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          onClick={() => setActiveTab("overview")}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl hover:border-teal-500/40 hover:bg-slate-900 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Current Value
              </span>
              <div className="p-2 rounded-xl bg-teal-500/10">
                <IndianRupee size={17} className="text-teal-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight">
              {formatCurrency(totals.currentValue)}
            </div>
            <div className="text-xs font-semibold mt-2 text-slate-400">
              Invested: {formatCurrency(totals.invested)}
            </div>
          </div>
        </motion.div>

        {/* Unrealised Gain */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          onClick={() => setActiveTab("overview")}
          className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
            totals.gain >= 0
              ? "border-emerald-500/20 hover:border-emerald-500/40"
              : "border-red-500/20 hover:border-red-500/40"
          }`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none ${
              totals.gain >= 0 ? "from-emerald-500/10" : "from-red-500/10"
            }`}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Unrealised P&amp;L
              </span>
              <div
                className={`p-2 rounded-xl ${totals.gain >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}
              >
                {totals.gain >= 0 ? (
                  <TrendingUp size={17} className="text-emerald-400" />
                ) : (
                  <TrendingDown size={17} className="text-red-400" />
                )}
              </div>
            </div>
            <div
              className={`text-2xl font-extrabold leading-tight ${
                totals.gain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatCurrency(totals.gain)}
            </div>
            <div
              className={`text-xs font-semibold mt-2 ${
                totals.gain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatPercent(totals.absoluteReturn)} absolute return
            </div>
          </div>
        </motion.div>

        {/* Equity Value */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          onClick={() => setActiveTab("stocks")}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-blue-500/20 rounded-2xl p-5 shadow-xl hover:border-blue-500/40 hover:bg-slate-900 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Equity Value
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Activity size={17} className="text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight">
              {formatCurrency(totals.stocksCurrentValue)}
            </div>
            <div
              className={`text-xs font-semibold mt-2 ${
                totals.stocksGain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {totals.stocksGain >= 0 ? "+" : ""}
              {formatCurrency(totals.stocksGain)} (
              {totals.stocksInvested > 0
                ? ((totals.stocksGain / totals.stocksInvested) * 100).toFixed(1)
                : 0}
              %)
            </div>
          </div>
        </motion.div>

        {/* Mutual Fund Value */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          onClick={() => setActiveTab("funds")}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-violet-500/20 rounded-2xl p-5 shadow-xl hover:border-violet-500/40 hover:bg-slate-900 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                MF Value
              </span>
              <div className="p-2 rounded-xl bg-violet-500/10">
                <Target size={17} className="text-violet-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100 leading-tight">
              {formatCurrency(totals.fundsCurrentValue)}
            </div>
            <div
              className={`text-xs font-semibold mt-2 ${
                totals.fundsGain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {totals.fundsGain >= 0 ? "+" : ""}
              {formatCurrency(totals.fundsGain)} (
              {totals.fundsInvested > 0
                ? ((totals.fundsGain / totals.fundsInvested) * 100).toFixed(1)
                : 0}
              %)
            </div>
          </div>
        </motion.div>
      </div>

      {/* TABS SELECTOR */}
      <div className="border-b border-slate-800/60 flex items-center gap-6 text-sm font-bold text-slate-400 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-3 relative cursor-pointer hover:text-slate-200 transition ${
            activeTab === "overview" ? "text-teal-400" : ""
          }`}
        >
          Overview
          {activeTab === "overview" && (
            <motion.div
              layoutId="zerodhaActiveTab"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("stocks")}
          className={`py-3 relative cursor-pointer hover:text-slate-200 transition ${
            activeTab === "stocks" ? "text-teal-400" : ""
          }`}
        >
          Stocks ({stocks.length})
          {activeTab === "stocks" && (
            <motion.div
              layoutId="zerodhaActiveTab"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("funds")}
          className={`py-3 relative cursor-pointer hover:text-slate-200 transition ${
            activeTab === "funds" ? "text-teal-400" : ""
          }`}
        >
          Mutual Funds ({funds.length})
          {activeTab === "funds" && (
            <motion.div
              layoutId="zerodhaActiveTab"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("mapping")}
          className={`py-3 relative cursor-pointer hover:text-slate-200 transition ${
            activeTab === "mapping" ? "text-teal-400" : ""
          }`}
        >
          Fund Mapping
          {activeTab === "mapping" && (
            <motion.div
              layoutId="zerodhaActiveTab"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`py-3 relative cursor-pointer hover:text-slate-200 transition ${
            activeTab === "files" ? "text-teal-400" : ""
          }`}
        >
          Upload Tracker ({reportsList.length})
          {activeTab === "files" && (
            <motion.div
              layoutId="zerodhaActiveTab"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`py-3 relative cursor-pointer hover:text-slate-200 transition ${
            activeTab === "insights" ? "text-teal-400" : ""
          }`}
        >
          Insights
          {activeTab === "insights" && (
            <motion.div
              layoutId="zerodhaActiveTab"
              className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400"
            />
          )}
        </button>
      </div>

      {/* TAB CONTENT */}
      <div>
        {activeTab === "overview" && (
          <ZerodhaOverviewTab data={data} holdings={holdings} COLORS={COLORS} />
        )}

        {activeTab === "insights" && <ZerodhaInsightsTab data={data} />}

        {activeTab === "stocks" && (
          <ZerodhaStocksTab
            stocks={stocks}
            renderStockSortIcon={renderStockSortIcon}
            toggleStockSort={toggleStockSort}
            stockSortField={stockSortField}
            stockSortOrder={stockSortOrder}
            formatPrice={formatPrice}
          />
        )}

        {activeTab === "funds" && (
          <ZerodhaFundsTab
            funds={funds}
            renderFundSortIcon={renderFundSortIcon}
            toggleFundSort={toggleFundSort}
            fundSortField={fundSortField}
            fundSortOrder={fundSortOrder}
          />
        )}

        {activeTab === "files" && (
          <ZerodhaSnapshotsTab
            reportsList={reportsList}
            handleFileUpload={handleFileUpload}
            handleDeleteReport={handleDeleteReport}
            firstCasReportDate={data.firstCasReportDate}
          />
        )}

        {activeTab === "mapping" && (
          <ZerodhaMappingTab allSchemes={allSchemes} />
        )}
      </div>
    </div>
  );
}
