"use client";

import { Fragment, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Scale,
  Shield,
  Coins,
  Percent,
  CheckCircle2,
  Table2,
  LayoutGrid,
  ChevronRight,
  Briefcase,
  Layers,
  ArrowRight,
  Zap,
  TrendingUp,
  ArrowLeftRight,
  HelpCircle,
  X,
  ChevronDown,
} from "lucide-react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import {
  SIF_SCHEMES_COMPARISON_DATA,
  SIF_VS_TRADITIONAL_PILLARS,
  getSifAssetClassColor,
} from "@/helpers/sifData";
import { formatIndianAmount } from "@/helpers/formatters";
import type { SifInsightsTabProps } from "@/types/insights";
import type {
  SifAssetClass,
  SifDownsideSimulatorProps,
  SifMatchupDuelProps,
  SifStrategyCardProps,
  SifStrategyExpandedPanelProps,
  SifTaxationBadgeProps,
} from "@/types/sif";

export default function SifInsightsTab({ data }: SifInsightsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL state
  const initialClass =
    (searchParams.get("class") as SifAssetClass | "All") || "All";
  const initialSearch = searchParams.get("q") || "";
  const initialView =
    (searchParams.get("view") as "table" | "cards" | "duel") || "table";
  const initialSelectedId = searchParams.get("schemeId")
    ? Number(searchParams.get("schemeId"))
    : null;
  const initialSection =
    (searchParams.get("section") as
      "matrix" | "pillars" | "simulator" | "faq") || "matrix";

  const [selectedClass, setSelectedClass] = useState<SifAssetClass | "All">(
    initialClass
  );
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<"table" | "cards" | "duel">(
    initialView
  );
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(
    initialSelectedId
  );
  const [activeTabSection, setActiveTabSection] = useState<
    "matrix" | "pillars" | "simulator" | "faq"
  >(initialSection);

  // Sync state from URL changes
  useEffect(() => {
    const c = searchParams.get("class") as SifAssetClass | "All";
    if (c) setSelectedClass(c);
    const q = searchParams.get("q");
    if (q !== null) setSearchQuery(q);
    const v = searchParams.get("view") as "table" | "cards" | "duel";
    if (v) setViewMode(v);
    const sId = searchParams.get("schemeId");
    if (sId) setSelectedSchemeId(Number(sId));
    const sec = searchParams.get("section") as
      "matrix" | "pillars" | "simulator" | "faq";
    if (sec) setActiveTabSection(sec);
  }, [searchParams]);

  // URL updater
  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "All") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }

    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  // Detect any real SIF holdings in user's portfolio
  const portfolioSifHoldings = useMemo(() => {
    return data.schemes.filter((s) => {
      const name = s.scheme.toUpperCase();
      const cat = s.category.toUpperCase();
      return (
        name.includes("SIF") ||
        cat.includes("SIF") ||
        cat.includes("LONG SHORT") ||
        cat.includes("SPECIALIZED")
      );
    });
  }, [data.schemes]);

  const portfolioSifTotals = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const s of portfolioSifHoldings) {
      invested += s.invested || 0;
      current += s.current || 0;
    }
    const gain = current - invested;
    const absReturn = invested > 0 ? (gain / invested) * 100 : 0;
    return {
      invested,
      current,
      gain,
      absReturn,
      count: portfolioSifHoldings.length,
    };
  }, [portfolioSifHoldings]);

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return SIF_SCHEMES_COMPARISON_DATA.filter((item) => {
      // 1. Asset Class filter
      if (selectedClass !== "All" && item.assetClass !== selectedClass) {
        return false;
      }
      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.schemeName.toLowerCase().includes(q);
        const matchesTrad = item.traditionalScheme.toLowerCase().includes(q);
        const matchesClass = item.assetClass.toLowerCase().includes(q);
        const matchesReq = item.minimumRequirements.toLowerCase().includes(q);
        const matchesTax = item.taxation.taxCategory.toLowerCase().includes(q);
        return (
          matchesName || matchesTrad || matchesClass || matchesReq || matchesTax
        );
      }
      return true;
    });
  }, [selectedClass, searchQuery]);

  const selectedScheme = useMemo(() => {
    return (
      SIF_SCHEMES_COMPARISON_DATA.find((s) => s.id === selectedSchemeId) || null
    );
  }, [selectedSchemeId]);

  const handleClassChange = (c: SifAssetClass | "All") => {
    setSelectedClass(c);
    updateUrl({ class: c });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    updateUrl({ q: val || null });
  };

  const handleViewChange = (v: "table" | "cards" | "duel") => {
    setViewMode(v);
    updateUrl({ view: v });
  };

  const handleSelectScheme = (id: number | null) => {
    setSelectedSchemeId(id);
    updateUrl({ schemeId: id ? String(id) : null });
  };

  const handleSectionChange = (
    sec: "matrix" | "pillars" | "simulator" | "faq"
  ) => {
    setActiveTabSection(sec);
    updateUrl({ section: sec === "matrix" ? null : sec });
  };

  return (
    <div className="space-y-6">
      {/* ── TOP BENTO HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Glow ambient background mesh */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-24 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        {/* Hero Header & Overview */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-black tracking-wide uppercase shadow-sm">
              <Sparkles size={13} className="text-teal-400" />
              <span>SEBI Regulatory Framework</span>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              Specialized Investment Funds (SIF) · Long-Short Alternative
              Strategies
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight leading-tight">
              Specialized Investment Funds (SIF) vs Traditional MF Schemes
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-5xl">
              SIFs offer retail & HNI investors institutional-grade alternative
              strategies. Unlike traditional long-only mutual funds that remain
              fully exposed during market drawdowns, SIFs deploy up to{" "}
              <strong className="text-teal-300 font-bold">
                25% active derivative short hedges
              </strong>{" "}
              to generate alpha, reduce portfolio beta, and cushion capital
              across bull, bear, and sideways regimes.
            </p>
          </div>
        </div>

        {/* 4-Card Bento KPI Strip (Full-Width Responsive 4-Column Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 flex flex-col justify-between hover:border-teal-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Strategy Universe</span>
              <Layers size={15} className="text-teal-400" />
            </div>
            <p className="text-2xl font-black text-slate-100 mt-2">7 Schemes</p>
            <span className="text-[11px] text-teal-400/90 font-semibold mt-1">
              Equity, Debt & Hybrid SIFs
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Derivatives Cap</span>
              <Percent size={15} className="text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-300 mt-2">25% Max</p>
            <span className="text-[11px] text-slate-400 font-semibold mt-1">
              Active Short Hedge Protection
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Target Return</span>
              <TrendingUp size={15} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">
              8% – 14%
            </p>
            <span className="text-[11px] text-emerald-400/80 font-semibold mt-1">
              Risk-Adjusted Alpha CAGR
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Tax Regimes</span>
              <Coins size={15} className="text-purple-400" />
            </div>
            <p className="text-2xl font-black text-purple-300 mt-2">
              Post-2024
            </p>
            <span className="text-[11px] text-slate-400 font-semibold mt-1">
              Equity / Slab / Flat 12.5%
            </span>
          </div>
        </div>

        {/* Live Portfolio SIF Exposure Section (If Any) */}
        {portfolioSifHoldings.length > 0 && (
          <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-5 backdrop-blur-md space-y-4 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-teal-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Briefcase size={18} className="text-teal-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-100">
                      Your Active SIF Holdings ({portfolioSifTotals.count}{" "}
                      Scheme{portfolioSifTotals.count > 1 ? "s" : ""})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Live Exposure
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total SIF capital actively hedged under alternative mandates
                    in your portfolio
                  </p>
                </div>
              </div>

              {/* Portfolio Aggregate Stat Pills */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium">Invested: </span>
                  <strong className="text-slate-200 font-black">
                    {formatIndianAmount(portfolioSifTotals.invested)}
                  </strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium">Current: </span>
                  <strong className="text-slate-100 font-black">
                    {formatIndianAmount(portfolioSifTotals.current)}
                  </strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium">Net P&L: </span>
                  <strong
                    className={
                      portfolioSifTotals.gain >= 0
                        ? "text-emerald-400 font-black"
                        : "text-rose-400 font-black"
                    }
                  >
                    {portfolioSifTotals.gain >= 0 ? "+" : ""}
                    {formatIndianAmount(portfolioSifTotals.gain)} (
                    {portfolioSifTotals.absReturn.toFixed(2)}%)
                  </strong>
                </div>
              </div>
            </div>

            {/* Holding Chips with Full Scheme Names */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {portfolioSifHoldings.map((h) => (
                <Link
                  key={h.scheme}
                  href={`/holdings?q=${encodeURIComponent(h.scheme)}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-teal-500/30 hover:border-teal-400 text-xs font-bold text-teal-300 transition-all flex items-center gap-2 shadow-sm hover:bg-slate-900 group cursor-pointer"
                >
                  <span className="text-slate-200 group-hover:text-teal-200 transition">
                    {h.scheme}
                  </span>
                  {h.current > 0 && (
                    <span className="text-[11px] font-black text-teal-400">
                      ({formatIndianAmount(h.current)})
                    </span>
                  )}
                  <ArrowRight
                    size={13}
                    className="text-teal-400 group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── HIGH-END SEGMENTED NAVIGATION BAR ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md">
          <button
            onClick={() => handleSectionChange("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabSection === "matrix"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Table2 size={14} />
            <span>SIF Strategy Matrix</span>
          </button>

          <button
            onClick={() => handleSectionChange("pillars")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabSection === "pillars"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Scale size={14} />
            <span>Traditional vs SIF Pillars</span>
          </button>

          <button
            onClick={() => handleSectionChange("simulator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabSection === "simulator"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Zap size={14} />
            <span>Downside Simulator</span>
          </button>

          <button
            onClick={() => handleSectionChange("faq")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabSection === "faq"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <HelpCircle size={14} />
            <span>SIF Guide & FAQ</span>
          </button>
        </div>
      </div>

      {/* ── TAB SECTION 1: COMPARATIVE MATRIX ── */}
      {activeTabSection === "matrix" && (
        <div className="space-y-5">
          {/* Controls Bar: Search on Left, Asset Class Filters & View Mode on Right */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md shadow-lg">
            {/* Instant Search Bar (Left) */}
            <div className="w-full sm:w-88">
              <SearchFilterBar
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search SIF scheme, counterpart, tax or rules…"
                className="w-full"
              />
            </div>

            {/* Filter Pills & View Mode Toggle (Right) */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
              {/* Asset Class Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["All", "Equity", "Debt", "Hybrid"] as const).map((ac) => {
                  const count =
                    ac === "All"
                      ? SIF_SCHEMES_COMPARISON_DATA.length
                      : SIF_SCHEMES_COMPARISON_DATA.filter(
                          (s) => s.assetClass === ac
                        ).length;
                  const active = selectedClass === ac;

                  return (
                    <button
                      key={ac}
                      onClick={() => handleClassChange(ac)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        active
                          ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                          : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <span>{ac}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          active
                            ? "bg-teal-500 text-slate-950"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Vertical Separation Line */}
              <div className="h-6 w-px bg-slate-800 hidden sm:block mx-1" />

              {/* View Mode Toggle (Styled identically to filter pills) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleViewChange("table")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                      : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-slate-200 hover:border-slate-700"
                  }`}
                  title="Matrix Table"
                >
                  <Table2
                    size={14}
                    className={
                      viewMode === "table" ? "text-teal-400" : "text-slate-400"
                    }
                  />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => handleViewChange("cards")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                      : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-slate-200 hover:border-slate-700"
                  }`}
                  title="Bento Cards"
                >
                  <LayoutGrid
                    size={14}
                    className={
                      viewMode === "cards" ? "text-teal-400" : "text-slate-400"
                    }
                  />
                  <span>Cards</span>
                </button>
                <button
                  onClick={() => handleViewChange("duel")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    viewMode === "duel"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                      : "bg-slate-950/60 text-slate-400 border border-slate-800/60 hover:text-slate-200 hover:border-slate-700"
                  }`}
                  title="Side-by-Side Duel"
                >
                  <ArrowLeftRight
                    size={14}
                    className={
                      viewMode === "duel" ? "text-teal-400" : "text-slate-400"
                    }
                  />
                  <span>Duel</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: TABLE VIEW */}
          {viewMode === "table" && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 font-bold uppercase tracking-wider text-xs">
                      <th className="py-3.5 px-3 w-10 text-center">#</th>
                      <th className="py-3.5 px-4 min-w-[200px]">
                        SIF Scheme Strategy
                      </th>
                      <th className="py-3.5 px-3 text-center min-w-[140px]">
                        Traditional Equivalent
                      </th>
                      <th className="py-3.5 px-3 min-w-[150px]">
                        Minimum Requirements
                      </th>
                      <th className="py-3.5 px-3 text-center w-24">
                        Derivatives
                      </th>
                      <th className="py-3.5 px-3 text-center w-28">
                        Redemption
                      </th>
                      <th className="py-3.5 px-2 text-center w-16">Risk</th>
                      <th className="py-3.5 px-3 text-center w-24">
                        Target Return
                      </th>
                      <th className="py-3.5 px-2.5 min-w-[115px]">
                        Taxation (STCG / LTCG)
                      </th>
                      <th className="py-3.5 px-3 text-center w-14">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSchemes.map((scheme) => {
                      const colors = getSifAssetClassColor(scheme.assetClass);
                      const isSelected = selectedSchemeId === scheme.id;

                      return (
                        <Fragment key={scheme.id}>
                          <tr
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-teal-500/10 border-l-4 border-l-teal-400"
                                : "hover:bg-slate-800/50"
                            }`}
                            onClick={() =>
                              handleSelectScheme(isSelected ? null : scheme.id)
                            }
                          >
                            {/* # */}
                            <td className="py-3.5 px-3 text-center text-slate-400 font-bold text-xs">
                              {scheme.srNo}
                            </td>

                            {/* SIF Strategy */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-100 text-sm hover:text-teal-300 transition leading-snug">
                                  {scheme.schemeName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black border ${colors.badge}`}
                                >
                                  {scheme.assetClass}
                                </span>
                              </div>
                            </td>

                            {/* Traditional Scheme Counterpart */}
                            <td className="py-3.5 px-3 text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs whitespace-nowrap border ${getPastelCategoryBadge(
                                  scheme.traditionalScheme
                                )}`}
                              >
                                {scheme.traditionalScheme}
                              </span>
                            </td>

                            {/* Minimum Requirements */}
                            <td className="py-3.5 px-3 text-slate-300 font-medium text-xs leading-relaxed">
                              {scheme.minimumRequirements}
                            </td>

                            {/* Derivatives (light blue, bar removed) */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 font-black text-xs">
                                {scheme.derivativesLimit}
                              </span>
                            </td>

                            {/* Redemption (clock removed) */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs whitespace-nowrap">
                                {scheme.redemptionFrequency}
                              </span>
                            </td>

                            {/* Risk */}
                            <td className="py-3.5 px-2 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                                {scheme.riskLevel}
                              </span>
                            </td>

                            {/* Return */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-black text-xs whitespace-nowrap">
                                {scheme.targetReturn}
                              </span>
                            </td>

                            {/* Taxation */}
                            <td className="py-3.5 px-2.5">
                              <TaxationBadge
                                taxation={scheme.taxation}
                                alternative={scheme.alternativeTaxation}
                              />
                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectScheme(
                                    isSelected ? null : scheme.id
                                  );
                                }}
                                className={`p-2 rounded-xl border transition cursor-pointer inline-flex items-center justify-center ${
                                  isSelected
                                    ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20"
                                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800"
                                }`}
                                title={
                                  isSelected
                                    ? "Collapse Strategy Details"
                                    : "Inspect Strategy Details"
                                }
                                aria-label={
                                  isSelected
                                    ? "Collapse Strategy Details"
                                    : "Inspect Strategy Details"
                                }
                              >
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform duration-200 ${
                                    isSelected ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Row Under Table */}
                          {isSelected && (
                            <tr
                              key={`${scheme.id}-expanded`}
                              className="bg-slate-950/60"
                            >
                              <td colSpan={10} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.2,
                                    ease: "easeInOut",
                                  }}
                                  className="overflow-hidden w-full"
                                >
                                  <div className="p-5 sm:p-6 bg-slate-950/90 border-t border-b border-slate-800/80">
                                    <SifStrategyExpandedPanel
                                      scheme={scheme}
                                      onClose={() => handleSelectScheme(null)}
                                      isTableRow={true}
                                    />
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: BENTO CARDS VIEW */}
          {viewMode === "cards" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSchemes.map((scheme) => (
                  <SifStrategyCard
                    key={scheme.id}
                    scheme={scheme}
                    isSelected={selectedSchemeId === scheme.id}
                    onSelect={() =>
                      handleSelectScheme(
                        selectedSchemeId === scheme.id ? null : scheme.id
                      )
                    }
                  />
                ))}
              </div>

              <AnimatePresence>
                {selectedScheme && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-3xl border border-teal-500/40 bg-slate-950 shadow-2xl overflow-hidden"
                  >
                    <SifStrategyExpandedPanel
                      scheme={selectedScheme}
                      onClose={() => handleSelectScheme(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* VIEW 3: HEAD-TO-HEAD MATCHUP DUEL VIEW */}
          {viewMode === "duel" && (
            <SifMatchupDuel
              schemes={filteredSchemes}
              selectedId={selectedSchemeId || filteredSchemes[0]?.id || 1}
              onSelectScheme={(id) => handleSelectScheme(id)}
            />
          )}
        </div>
      )}

      {/* ── TAB SECTION 2: COMPARATIVE PILLARS INFOGRAPHIC ── */}
      {activeTabSection === "pillars" && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-100">
              6 Core Structural Differences: Traditional Mutual Funds vs SIF
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Understanding why SEBI introduced the Specialized Investment Fund
              category to bring hedge-fund risk controls to Indian mutual funds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SIF_VS_TRADITIONAL_PILLARS.map((pillar, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 space-y-4 shadow-xl backdrop-blur-md flex flex-col justify-between hover:border-teal-500/40 transition-all duration-200"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-black text-xs shadow-sm">
                      {idx + 1}
                    </div>
                    <h3 className="text-sm font-black text-slate-100">
                      {pillar.pillar}
                    </h3>
                  </div>

                  {/* Traditional MF vs SIF Box */}
                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 block">
                        Vanilla Mutual Fund
                      </span>
                      <p className="text-slate-300 leading-relaxed font-medium">
                        {pillar.traditionalMf}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-3.5 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-400 block">
                        Specialized SIF Strategy
                      </span>
                      <p className="text-teal-200 leading-relaxed font-semibold">
                        {pillar.sifStrategy}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-800/80 flex items-center gap-2 text-xs text-emerald-400 font-bold">
                  <CheckCircle2
                    size={14}
                    className="shrink-0 text-emerald-400"
                  />
                  <span>{pillar.advantage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB SECTION 3: DOWNSIDE SIMULATOR ── */}
      {activeTabSection === "simulator" && (
        <SifDownsideSimulator schemes={SIF_SCHEMES_COMPARISON_DATA} />
      )}

      {/* ── TAB SECTION 4: SIF GUIDE & FAQ ── */}
      {activeTabSection === "faq" && <SifGuideFaq />}
    </div>
  );
}

// ── HELPER: PASTEL CATEGORY BADGE ──
function getPastelCategoryBadge(category: string) {
  switch (category) {
    case "Flexicap":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "Mid & Small Cap":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "Sector Funds":
      return "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30";
    case "Dynamic Bond Fund":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "Multi Asset Fund":
      return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
    case "Balanced Advantage":
      return "bg-teal-500/15 text-teal-300 border-teal-500/30";
    case "NA":
      return "bg-slate-800/80 text-slate-400 border-slate-700/60";
    default:
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
  }
}

// ── SUB-COMPONENT: TAXATION BADGE ──
function TaxationBadge({ taxation, alternative }: SifTaxationBadgeProps) {
  return (
    <div className="flex flex-col items-start gap-1 py-0.5">
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-black inline-block ${
          taxation.taxCategory === "Equity"
            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
            : taxation.taxCategory === "Debt"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
        }`}
      >
        {taxation.taxCategory}
      </span>
      <div className="text-xs text-slate-300 font-medium space-y-0.5 leading-tight whitespace-nowrap">
        <div>
          STCG:{" "}
          <strong className="text-amber-300 font-bold">{taxation.stcg}</strong>
        </div>
        <div>
          LTCG:{" "}
          <strong className="text-emerald-400 font-bold">
            {taxation.ltcg}
          </strong>
        </div>
      </div>
      {alternative && (
        <span className="text-[10px] text-slate-500 block leading-tight">
          Alt: {alternative.stcg} / {alternative.ltcg}
        </span>
      )}
    </div>
  );
}

// ── SUB-COMPONENT: STRATEGY EXPANDED PANEL ──
function SifStrategyExpandedPanel({
  scheme,
  onClose,
  isTableRow = false,
}: SifStrategyExpandedPanelProps) {
  return (
    <div className={`space-y-4 ${isTableRow ? "" : "p-6 sm:p-8"}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wide">
              Strategy #{scheme.srNo} · {scheme.assetClass} SIF
            </span>
            <h4 className="text-base sm:text-lg font-black text-slate-100">
              {scheme.schemeName}
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {scheme.description}
          </p>
          <p className="text-xs text-slate-400 pt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Traditional Counterpart:</span>
            <span
              className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-xs whitespace-nowrap border ${getPastelCategoryBadge(
                scheme.traditionalScheme
              )}`}
            >
              {scheme.traditionalScheme}
            </span>
            <span className="text-slate-500">·</span>
            <span>Target CAGR:</span>
            <strong className="text-emerald-400 font-bold">
              {scheme.targetReturn}
            </strong>
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1.5 rounded-lg bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition cursor-pointer"
          title="Close Inspector"
          aria-label="Close Inspector"
        >
          <X size={15} />
        </button>
      </div>

      {/* Deep Dive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Mandate & Execution */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-teal-400 uppercase tracking-wider">
            <Layers size={14} />
            <span>Mandate & Derivatives</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block font-semibold">
                Minimum Asset Requirements:
              </span>
              <p className="text-slate-200 font-bold text-xs mt-0.5">
                {scheme.minimumRequirements}
              </p>
            </div>
            <div className="pt-1.5 border-t border-slate-800/80">
              <span className="text-slate-500 text-[10px] block font-semibold">
                Derivatives Headroom Limit:
              </span>
              <p className="text-amber-300 font-black text-xs mt-0.5">
                {scheme.derivativesLimit} (Long-Short Hedge Cap)
              </p>
            </div>
            <div className="pt-1.5 border-t border-slate-800/80">
              <span className="text-slate-500 text-[10px] block font-semibold">
                Redemption Liquidity:
              </span>
              <p className="text-slate-200 font-bold text-xs mt-0.5">
                {scheme.redemptionFrequency}{" "}
                {scheme.redemptionNote ? `(${scheme.redemptionNote})` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Downside Mechanics */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-wider">
            <Shield size={14} />
            <span>Downside Cushioning</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {scheme.mechanism}
          </p>
          <div className="pt-1.5 border-t border-slate-800/80">
            <span className="text-slate-500 text-[10px] block font-semibold">
              Hedging Strategy:
            </span>
            <p className="text-xs text-cyan-300 font-semibold mt-0.5">
              {scheme.downsideProtectionMechanics}
            </p>
          </div>
        </div>

        {/* Taxation */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-wider">
            <Coins size={14} />
            <span>Post-2024 Taxation</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Tax Category:</span>
              <span className="font-black text-slate-100">
                {scheme.taxation.taxCategory} Fund
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">STCG Rate:</span>
              <span className="font-black text-amber-300">
                {scheme.taxation.stcg}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">LTCG Rate:</span>
              <span className="font-black text-emerald-400">
                {scheme.taxation.ltcg}
              </span>
            </div>
            {scheme.taxation.note && (
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                {scheme.taxation.note}
              </p>
            )}
            {scheme.alternativeTaxation && (
              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-purple-300 font-medium">
                <strong>Alternative:</strong> STCG{" "}
                {scheme.alternativeTaxation.stcg} · LTCG{" "}
                {scheme.alternativeTaxation.ltcg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Strategic Advantages */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2.5">
        <h5 className="text-xs font-black text-slate-200 flex items-center gap-2 uppercase tracking-wider">
          <CheckCircle2 size={14} className="text-teal-400" />
          <span>
            Why Choose {scheme.schemeName} Over Traditional{" "}
            {scheme.traditionalScheme}?
          </span>
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {scheme.keyAdvantages.map((adv, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800/70"
            >
              <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed text-[11px]">{adv}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: SIF STRATEGY CARD (BENTO) ──
function SifStrategyCard({
  scheme,
  isSelected,
  onSelect,
}: SifStrategyCardProps) {
  const colors = getSifAssetClassColor(scheme.assetClass);

  return (
    <div
      onClick={onSelect}
      className={`rounded-3xl border p-6 space-y-5 shadow-xl backdrop-blur-md cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
        isSelected
          ? "border-teal-400 bg-slate-900 ring-2 ring-teal-500/30 shadow-teal-950/50"
          : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90 hover:-translate-y-1"
      }`}
    >
      <div className="space-y-4">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${colors.badge}`}
          >
            {scheme.assetClass} SIF #{scheme.srNo}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black shadow-xs">
            {scheme.targetReturn} CAGR
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-black text-slate-100 group-hover:text-teal-300 transition">
            {scheme.schemeName}
          </h3>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Vs Traditional:</span>
            <span
              className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-xs whitespace-nowrap border ${getPastelCategoryBadge(
                scheme.traditionalScheme
              )}`}
            >
              {scheme.traditionalScheme}
            </span>
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {scheme.description}
        </p>

        {/* Key Metrics Pill Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-[11px] pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block font-semibold">
              Derivatives Cap
            </span>
            <span className="font-black text-amber-300">
              {scheme.derivativesLimit}
            </span>
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block font-semibold">
              Liquidity
            </span>
            <span className="font-bold text-slate-200">
              {scheme.redemptionFrequency}
            </span>
          </div>
        </div>

        {/* Taxation Bar */}
        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Tax Bracket:</span>
            <span className="font-bold text-slate-200">
              {scheme.taxation.taxCategory}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">STCG / LTCG:</span>
            <span className="font-black text-teal-300">
              {scheme.taxation.stcg} / {scheme.taxation.ltcg}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-teal-400 group-hover:text-teal-300">
        <span>{isSelected ? "Hide Details" : "Inspect Full Strategy"}</span>
        <ChevronRight
          size={15}
          className={`transition-transform duration-200 ${isSelected ? "rotate-90" : "group-hover:translate-x-1"}`}
        />
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: HEAD-TO-HEAD MATCHUP DUEL ──
function SifMatchupDuel({
  schemes,
  selectedId,
  onSelectScheme,
}: SifMatchupDuelProps) {
  const current = schemes.find((s) => s.id === selectedId) || schemes[0];

  return (
    <div className="space-y-6">
      {/* Strategy Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {schemes.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectScheme(s.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              s.id === current.id
                ? "bg-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            #{s.srNo} {s.schemeName}
          </button>
        ))}
      </div>

      {/* Side-by-Side Comparison Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Traditional Fund */}
        <div className="rounded-3xl border border-rose-500/30 bg-slate-900/80 p-6 space-y-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block">
                Traditional MF Scheme
              </span>
              <h3 className="text-lg font-black text-slate-100 mt-0.5">
                {current.traditionalScheme}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-extrabold">
              Long-Only
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 font-medium">
                Market Exposure
              </span>
              <span className="font-bold text-slate-200">
                100% Unhedged Long
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 font-medium">
                Derivative Flexibility
              </span>
              <span className="font-bold text-rose-400">
                0% (Only Arbitrage)
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 font-medium">
                Bear Market Behavior
              </span>
              <span className="font-bold text-rose-400">
                Absorbs 100% of Crash
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 font-medium">
                Redemption Window
              </span>
              <span className="font-bold text-slate-200">Daily (T+1/T+2)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 font-medium">
                Tax Classification
              </span>
              <span className="font-bold text-slate-200">
                {current.taxation.taxCategory} MF
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: SIF Strategy */}
        <div className="rounded-3xl border border-teal-500/40 bg-gradient-to-br from-slate-900/90 via-slate-900 to-teal-950/30 p-6 space-y-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest block">
                Specialized Investment Fund (SIF)
              </span>
              <h3 className="text-lg font-black text-slate-100 mt-0.5">
                {current.schemeName}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-extrabold">
              Long-Short Hedged
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-teal-500/30">
              <span className="text-slate-300 font-medium">
                Market Exposure
              </span>
              <span className="font-black text-teal-300">
                {current.minimumRequirements}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-teal-500/30">
              <span className="text-slate-300 font-medium">
                Derivative Flexibility
              </span>
              <span className="font-black text-amber-300">
                Up to 25% Short Hedges
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-teal-500/30">
              <span className="text-slate-300 font-medium">
                Bear Market Behavior
              </span>
              <span className="font-black text-emerald-400">
                40–60% Capital Protected
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-teal-500/30">
              <span className="text-slate-300 font-medium">
                Redemption Window
              </span>
              <span className="font-bold text-slate-100">
                {current.redemptionFrequency}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-teal-500/30">
              <span className="text-slate-300 font-medium">Taxation Rates</span>
              <span className="font-black text-teal-300">
                STCG {current.taxation.stcg} · LTCG {current.taxation.ltcg}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: DOWNSIDE SIMULATOR ──
function SifDownsideSimulator({ schemes }: SifDownsideSimulatorProps) {
  const [selectedSchemeId, setSelectedSchemeId] = useState<number>(1);
  const [marketFallPct, setMarketFallPct] = useState<number>(20);
  const [portfolioSize, setPortfolioSize] = useState<number>(1000000); // Default 10 Lakhs

  const selected = schemes.find((s) => s.id === selectedSchemeId) || schemes[0];

  // Simulation calculations
  const traditionalDrop = marketFallPct;
  const sifProtectedDrop = Math.round(marketFallPct * 0.45);

  const tradEndValue = portfolioSize * (1 - traditionalDrop / 100);
  const sifEndValue = portfolioSize * (1 - sifProtectedDrop / 100);
  const capitalSaved = sifEndValue - tradEndValue;

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Zap className="text-amber-400" size={20} />
            Downside Capital Protection & Bear Market Simulator
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Simulate how SIF Long-Short hedging preserves wealth compared to
            long-only mutual funds across severe market corrections.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Portfolio Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Portfolio:</span>
            <div className="relative inline-block">
              <select
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(Number(e.target.value))}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 text-xs font-black text-slate-200 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/60 shadow-sm"
              >
                <option value={500000} className="bg-slate-950 text-slate-200">
                  ₹5 Lakhs
                </option>
                <option value={1000000} className="bg-slate-950 text-slate-200">
                  ₹10 Lakhs
                </option>
                <option value={2500000} className="bg-slate-950 text-slate-200">
                  ₹25 Lakhs
                </option>
                <option value={5000000} className="bg-slate-950 text-slate-200">
                  ₹50 Lakhs
                </option>
                <option
                  value={10000000}
                  className="bg-slate-950 text-slate-200"
                >
                  ₹1 Crore
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <ChevronDown size={13} />
              </div>
            </div>
          </div>

          {/* Strategy Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Strategy:</span>
            <div className="relative inline-block">
              <select
                value={selectedSchemeId}
                onChange={(e) => setSelectedSchemeId(Number(e.target.value))}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-slate-950/90 border border-teal-500/40 hover:border-teal-500/70 text-xs font-black text-teal-300 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm max-w-[240px] truncate"
              >
                {schemes.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    className="bg-slate-950 text-slate-200"
                  >
                    {s.schemeName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-teal-400">
                <ChevronDown size={13} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Slider */}
      <div className="space-y-3 bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-bold">
            Simulated Broad Market Drawdown / Correction:
          </span>
          <span className="text-lg font-black text-rose-400">
            -{marketFallPct}% Crash
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="40"
          step="5"
          value={marketFallPct}
          onChange={(e) => setMarketFallPct(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
        <div className="flex justify-between text-[11px] text-slate-500 font-black">
          <span>-5% Dip</span>
          <span>-15% Correction</span>
          <span>-25% Bear Market</span>
          <span>-40% Severe Crash</span>
        </div>
      </div>

      {/* Comparative Results Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Traditional Fund */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-5 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">
              Traditional {selected.traditionalScheme}
            </span>
            <p className="text-3xl font-black text-rose-400 mt-1">
              -{traditionalDrop}%
            </p>
            <p className="text-xs text-slate-300 mt-2">
              Portfolio drops to{" "}
              <strong className="text-slate-100 font-black">
                {formatIndianAmount(tradEndValue)}
              </strong>
            </p>
          </div>
          <p className="text-[11px] text-slate-500 pt-3 border-t border-slate-800/80">
            Long-only fund absorbs 100% of market fall with zero short hedge.
          </p>
        </div>

        {/* SIF Strategy */}
        <div className="rounded-2xl border border-teal-500/40 bg-teal-950/20 p-5 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-wider block">
              {selected.schemeName} (SIF)
            </span>
            <p className="text-3xl font-black text-teal-300 mt-1">
              -{sifProtectedDrop}%
            </p>
            <p className="text-xs text-slate-200 mt-2 font-semibold">
              Portfolio preserves{" "}
              <strong className="text-teal-300 font-black">
                {formatIndianAmount(sifEndValue)}
              </strong>
            </p>
          </div>
          <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800/80">
            25% short derivative positions generate positive alpha during fall.
          </p>
        </div>

        {/* Saved Capital Card */}
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
              Capital Preserved (Delta)
            </span>
            <p className="text-3xl font-black text-emerald-400 mt-1">
              +{formatIndianAmount(capitalSaved)}
            </p>
            <p className="text-xs text-slate-300 mt-2">
              <strong>
                {((capitalSaved / portfolioSize) * 100).toFixed(1)}% extra
                capital
              </strong>{" "}
              available to compound at market bottom.
            </p>
          </div>
          <div className="text-[11px] text-emerald-300 font-bold pt-3 border-t border-slate-800/80 flex items-center gap-1.5">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>Significantly faster recovery to All-Time Highs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: SIF GUIDE & FAQ ──
function SifGuideFaq() {
  const faqs = [
    {
      q: "What is a Specialized Investment Fund (SIF)?",
      a: "SIF is a specialized category regulated under SEBI Mutual Fund Regulations that allows asset management companies to run Long-Short equity, debt, and multi-asset strategies with up to 25% derivative exposure. Unlike vanilla MFs, SIFs can profit from falling stocks or hedge macro market risk.",
    },
    {
      q: "How does SIF taxation work after the Finance Bill 2024?",
      a: "Equity SIFs (maintaining >= 65% gross domestic equity) are taxed at 20% for STCG and 12.50% for LTCG (after 12 months). Debt SIFs are taxed at applicable income tax slab rates. Multi-asset and hybrid SIFs qualify for 12.50% LTCG after 24 months if equity is between 35% and 65%.",
    },
    {
      q: "Why do some Debt and Hybrid SIFs have weekly or twice-weekly redemption?",
      a: "To execute sophisticated long-short fixed income and multi-asset derivative hedges without being disrupted by sudden retail liquidity panics, SEBI permits structured weekly or bi-weekly settlement cycles for specialized debt and hybrid SIFs.",
    },
    {
      q: "Who should invest in SIF strategies?",
      a: "Investors seeking superior risk-adjusted Sharpe ratios, lower drawdowns during market corrections, and alternative wealth preservation without committing to the ₹1 Crore minimum ticket size of Category III AIFs.",
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
          <HelpCircle size={18} className="text-teal-400" />
          Specialized Investment Funds (SIF) Master Guide & FAQ
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Everything you need to know about SEBI regulations, risk mechanics,
          and tax rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {faqs.map((f, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-2"
          >
            <h4 className="text-xs font-black text-teal-300 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-black">
                {i + 1}
              </span>
              <span>{f.q}</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed pl-7">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
