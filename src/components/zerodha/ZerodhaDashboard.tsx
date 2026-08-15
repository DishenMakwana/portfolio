"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Upload,
  Briefcase,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  IndianRupee,
  Activity,
  Target,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  GitMerge,
  CalendarDays,
  Lightbulb,
} from "lucide-react";
import {
  uploadZerodhaHoldingsAction,
  deleteZerodhaHoldingsAction,
} from "@/actions/zerodha";
import { toast } from "react-hot-toast";
import {
  formatCurrency,
  formatCurrencyWithDecimals as formatPrice,
  formatDate,
} from "@/helpers/formatters";
import { ZERODHA_COLORS } from "@/types/zerodha";
import type {
  ZerodhaDashboardProps,
  ZerodhaFundSortField,
  ZerodhaStockSortField,
} from "@/types/zerodha";
import ZerodhaMappingTab from "@/components/zerodha/mapping/ZerodhaMappingTab";
import ZerodhaOverviewTab from "@/components/zerodha/overview/ZerodhaOverviewTab";
import ZerodhaStocksTab from "@/components/zerodha/stocks/ZerodhaStocksTab";
import ZerodhaSectorAndCapAnalysis from "@/components/zerodha/stocks/ZerodhaSectorAndCapAnalysis";
import ZerodhaFundsTab from "@/components/zerodha/funds/ZerodhaFundsTab";
import ZerodhaSnapshotsTab from "@/components/zerodha/snapshots/ZerodhaSnapshotsTab";
import ZerodhaInsightsTab from "@/components/zerodha/insights/ZerodhaInsightsTab";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

type ZerodhaTab =
  "overview" | "insights" | "stocks" | "funds" | "mapping" | "files";

const ZERODHA_SUB_TAB_META: Record<
  ZerodhaTab,
  { label: string; icon: React.ElementType }
> = {
  overview: { label: "Overview", icon: BarChart3 },
  stocks: { label: "Stocks", icon: TrendingUp },
  funds: { label: "Mutual Funds", icon: Target },
  mapping: { label: "Fund Mapping", icon: GitMerge },
  files: { label: "Upload Tracker", icon: CalendarDays },
  insights: { label: "Insights", icon: Lightbulb },
};

export default function ZerodhaDashboard({
  data,
  allSchemes = [],
}: ZerodhaDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const rawTab = searchParams.get("tab");
  const activeTab: ZerodhaTab =
    rawTab &&
    ["overview", "insights", "stocks", "funds", "mapping", "files"].includes(
      rawTab
    )
      ? (rawTab as ZerodhaTab)
      : "overview";

  const setActiveTab = (tab: ZerodhaTab) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/zerodha?${params.toString()}`, { scroll: false });
  };

  const [isUploading, setIsUploading] = useState(false);

  // Search & Filter state for Stocks Table
  const [stockSortField, setStockSortField] =
    useState<ZerodhaStockSortField>("currentValue");
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
  const [fundSortField, setFundSortField] =
    useState<ZerodhaFundSortField>("currentValue");
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
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadZerodhaHoldingsAction(formData);
    setIsUploading(false);
    if (res.success && res.data?.reportId) {
      toast.success("Zerodha Holdings sheet uploaded successfully!");
      router.refresh();
      router.push(`/zerodha?zerodhaReportId=${res.data.reportId}`);
      setActiveTab("overview");
    } else {
      toast.error(res.error || "Upload failed");
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
        </div>
      </div>
    );
  }

  const previousSnapshot = data.insights.previousSnapshot;
  const hasPreviousReport = !!previousSnapshot?.date;

  const renderVsLast = (diff: number | undefined | null) => {
    if (!hasPreviousReport || diff === undefined || diff === null) return null;
    const rounded = Math.round(diff);

    if (rounded === 0) {
      return (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-400">
            No change vs last
          </span>
        </div>
      );
    }

    const isUp = rounded > 0;
    return (
      <div className="mt-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
            isUp
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {isUp ? "" : "-"}
          {formatCurrency(Math.abs(rounded))} vs last
        </span>
      </div>
    );
  };

  const currentMeta =
    ZERODHA_SUB_TAB_META[activeTab] || ZERODHA_SUB_TAB_META.overview;
  const MetaIcon = currentMeta.icon;

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Dynamic Top Header Bar */}
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2.5">
          <Briefcase size={16} className="text-teal-400" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Zerodha Portfolio
          </span>
          <span className="text-slate-600 font-bold text-xs">/</span>
          <div className="flex items-center gap-1.5 text-xs text-teal-300 font-extrabold tracking-wider uppercase bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-md shadow-sm">
            <MetaIcon size={13} className="text-teal-400" />
            <span>{currentMeta.label}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
              <MetaIcon className="text-teal-400" size={24} /> Zerodha Portfolio
              — {currentMeta.label}
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
                    #{r.id} - {formatDate(r.asOfDate)}
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

        {/* Tab Content Panels (Full Width - Navigated via AppSidebar Tree) */}
        <div>
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* ── ROW 1: 4 KPI Cards (Overview Tab Only) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Current Value */}
                <motion.div
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl hover:border-teal-500/40 transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Current Value
                      </span>
                      <div className="p-2 rounded-xl bg-teal-500/10">
                        <IndianRupee size={17} className="text-teal-400" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
                      {formatCurrency(totals.currentValue)}
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-2">
                      Invested: {formatCurrency(totals.invested)}
                    </div>
                    {renderVsLast(previousSnapshot?.currentValueChange)}
                  </div>
                </motion.div>

                {/* Unrealised P&L */}
                <motion.div
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 shadow-xl hover:border-emerald-500/40 transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Unrealised P&L
                      </span>
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        {totals.gain >= 0 ? (
                          <TrendingUp size={17} className="text-emerald-400" />
                        ) : (
                          <TrendingDown size={17} className="text-red-400" />
                        )}
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
                      {totals.gain >= 0 ? "+" : ""}
                      {formatCurrency(totals.gain)}
                    </div>
                    <div className="text-xs font-semibold text-emerald-400/90 mt-2">
                      {totals.gain >= 0 ? "+" : ""}
                      {totals.absoluteReturn.toFixed(2)}% absolute return
                    </div>
                    {renderVsLast(previousSnapshot?.gainChange)}
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
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Equity Value
                      </span>
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Activity size={17} className="text-blue-400" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
                      {formatCurrency(totals.stocksCurrentValue)}
                    </div>
                    <div
                      className={`text-xs font-semibold mt-2 ${
                        totals.stocksGain >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {totals.stocksGain >= 0 ? "+" : ""}
                      {formatCurrency(totals.stocksGain)} (
                      {totals.stocksInvested > 0
                        ? (
                            (totals.stocksGain / totals.stocksInvested) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </div>
                    {renderVsLast(previousSnapshot?.stocksCurrentValueChange)}
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
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        MF Value
                      </span>
                      <div className="p-2 rounded-xl bg-violet-500/10">
                        <Target size={17} className="text-violet-400" />
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-slate-100 leading-tight tracking-tight">
                      {formatCurrency(totals.fundsCurrentValue)}
                    </div>
                    <div
                      className={`text-xs font-semibold mt-2 ${
                        totals.fundsGain >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {totals.fundsGain >= 0 ? "+" : ""}
                      {formatCurrency(totals.fundsGain)} (
                      {totals.fundsInvested > 0
                        ? (
                            (totals.fundsGain / totals.fundsInvested) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </div>
                    {renderVsLast(previousSnapshot?.fundsCurrentValueChange)}
                  </div>
                </motion.div>
              </div>

              <ZerodhaOverviewTab
                data={data}
                holdings={holdings}
                COLORS={ZERODHA_COLORS}
              />
            </div>
          )}

          {activeTab === "insights" && <ZerodhaInsightsTab data={data} />}

          {activeTab === "stocks" && (
            <div className="space-y-6">
              <ZerodhaStocksTab
                stocks={stocks}
                totals={totals}
                metricDeltas={data.metricDeltas}
                renderStockSortIcon={renderStockSortIcon}
                toggleStockSort={toggleStockSort}
                stockSortField={stockSortField}
                stockSortOrder={stockSortOrder}
                formatPrice={formatPrice}
              />
              <ZerodhaSectorAndCapAnalysis
                sectorBreakdown={data.sectorBreakdown}
                marketCapBreakdown={data.marketCapBreakdown}
              />
            </div>
          )}

          {activeTab === "funds" && (
            <ZerodhaFundsTab
              funds={funds}
              totals={totals}
              metricDeltas={data.metricDeltas}
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
    </div>
  );
}
