"use client";

import {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronDown,
  SlidersHorizontal,
  Info,
  ShieldAlert,
  Calendar,
  RotateCcw,
  Upload,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatIndianAmount,
  getFundDetailsUrl,
} from "@/helpers/formatters";
import {
  SingleSelectFilter,
  MultiSelectFilter,
  FilterSectionDivider,
} from "@/components/shared/filters/CommonFilterComponents";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import FolioBadge from "@/components/shared/FolioBadge";
import TaxStatusCell from "@/components/shared/TaxStatusCell";
import TablePagination from "@/components/shared/TablePagination";
import {
  isDateInRange,
  getPresetDateRange,
  calculateTransactionHoldingDays,
} from "@/helpers/dates";
import {
  parseCategoryFilters,
  serializeCategoryFilters,
  matchCategoryFilter,
} from "@/helpers/holdingsCategory";
import {
  calculateTransactionSummary,
  calculateCashflowReconciliation,
} from "@/helpers/transactions";
import { getTaxHorizon } from "@/helpers/taxHarvesting";
import { useTableSort } from "@/helpers/useTableSort";
import {
  matchesSearchTokens,
  getSearchTokens,
  scoreItem,
  PORTFOLIO_SEARCH_WEIGHTS,
} from "@/helpers/search";
import type {
  TransactionsClientProps,
  TransactionSortField,
  TaxGainFilter,
} from "@/types/transactions";
import { TRANSACTION_SORT_FIELDS } from "@/types/transactions";
import TransactionUploadModal from "./TransactionUploadModal";

export default function TransactionsClient({
  transactions,
  currentPortfolioValue = 0,
}: TransactionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { sortField, sortOrder, handleSort, renderSortIcon } =
    useTableSort<TransactionSortField>({
      defaultField: "date",
      defaultOrder: "desc",
      allowedFields: TRANSACTION_SORT_FIELDS,
      onSortChange: () => setPage(1),
    });

  const initialPageSize = (() => {
    const ps = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    return !isNaN(ps) && ps > 0 ? ps : 25;
  })();
  const initialPage = (() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return !isNaN(p) && p > 0 ? p : 1;
  })();

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [showSttInfo, setShowSttInfo] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const initialSearch = searchParams.get("q") || "";
  const initialMember = searchParams.get("member") || "All";
  const initialType = searchParams.get("type");
  const initialTypeFilters = parseCategoryFilters(initialType);
  const initialCategory = searchParams.get("category");
  const initialCategoryFilters = parseCategoryFilters(initialCategory);
  const initialStt = searchParams.get("stt") || "All";
  const initialTax = (searchParams.get("tax") || "All") as TaxGainFilter;
  const initialStartDate = searchParams.get("start") || "";
  const initialEndDate = searchParams.get("end") || "";

  const [searchVal, setSearchVal] = useState(initialSearch);
  const [memberFilter, setMemberFilter] = useState(initialMember);
  const [typeFilters, setTypeFilters] = useState<string[]>(initialTypeFilters);
  const [categoryFilters, setCategoryFilters] = useState<string[]>(
    initialCategoryFilters
  );
  const [sttFilter, setSttFilter] = useState(initialStt);
  const [taxFilter, setTaxFilter] = useState<TaxGainFilter>(initialTax);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [page, setPage] = useState(initialPage);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (
        value === null ||
        value === "" ||
        value === "All" ||
        (key === "page" && value === "1") ||
        (key === "pageSize" && value === "25") ||
        (key === "perPage" && value === "25")
      ) {
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
    router.replace(url, {
      scroll: false,
    });
  };

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchVal(q);
    setMemberFilter(searchParams.get("member") || "All");
    setTypeFilters(parseCategoryFilters(searchParams.get("type")));
    setCategoryFilters(parseCategoryFilters(searchParams.get("category")));
    setSttFilter(searchParams.get("stt") || "All");
    setTaxFilter((searchParams.get("tax") || "All") as TaxGainFilter);
    setStartDate(searchParams.get("start") || "");
    setEndDate(searchParams.get("end") || "");
    const rawP = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawP) && rawP > 0) setPage(rawP);
    const rawPs = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    if (!isNaN(rawPs) && rawPs > 0) setPageSize(rawPs);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUrlQ = searchParams.get("q") || "";
      if (currentUrlQ !== searchVal) {
        updateUrl({ q: searchVal, page: "1" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const memberNames = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.memberName))).sort(),
    [transactions]
  );

  const baseTypeCounts = useMemo(() => {
    let buy = 0;
    let sell = 0;
    for (const t of transactions) {
      if (t.type === "BUY") buy++;
      else if (t.type === "SELL") sell++;
    }
    return { buy, sell };
  }, [transactions]);

  const detailedTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      if (t.transactionType && t.transactionType.trim()) {
        const tt = t.transactionType.trim();
        counts.set(tt, (counts.get(tt) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      const cat = t.category?.trim();
      if (cat) {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const handleTypeToggle = (type: string) => {
    const next = typeFilters.includes(type)
      ? typeFilters.filter((t) => t !== type)
      : [...typeFilters, type];
    setTypeFilters(next);
    updateUrl({ type: serializeCategoryFilters(next) || null });
  };

  const handleCategoryToggle = (category: string) => {
    const next = categoryFilters.includes(category)
      ? categoryFilters.filter((c) => c !== category)
      : [...categoryFilters, category];
    setCategoryFilters(next);
    updateUrl({ category: serializeCategoryFilters(next) || null });
  };

  const handlePresetRange = (preset: string) => {
    const { start, end } = getPresetDateRange(preset);
    setStartDate(start);
    setEndDate(end);
    setPage(1);
    updateUrl({ start: start || null, end: end || null, page: "1" });
  };

  const handleClearAll = () => {
    setMemberFilter("All");
    setTypeFilters([]);
    setCategoryFilters([]);
    setSttFilter("All");
    setTaxFilter("All");
    setSearchVal("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    updateUrl({
      member: null,
      type: null,
      category: null,
      stt: null,
      tax: null,
      q: null,
      start: null,
      end: null,
      page: "1",
    });
  };

  const taxCounts = useMemo(() => {
    let ltcg = 0;
    let stcg = 0;
    for (const t of transactions) {
      if (t.type === "BUY") {
        const horizon = getTaxHorizon(t.date, t.category, t.schemeName);
        if (horizon.taxType === "LTCG") ltcg++;
        else stcg++;
      }
    }
    return { ltcg, stcg };
  }, [transactions]);

  const deferredSearchVal = useDeferredValue(searchVal);

  const filtered = useMemo(() => {
    const tokens = getSearchTokens(deferredSearchVal);
    const matchedRows = transactions.filter((t) => {
      const matchSearch =
        tokens.length === 0 ||
        matchesSearchTokens(
          tokens,
          [
            t.schemeName,
            t.category,
            t.folioNo,
            t.memberName,
            t.transactionType,
          ],
          t.folioNo
        );
      const matchMember =
        memberFilter === "All" || t.memberName === memberFilter;
      const matchType =
        typeFilters.length === 0 ||
        typeFilters.some(
          (tf) =>
            tf === t.type || (t.transactionType && tf === t.transactionType)
        );
      const matchCategory = matchCategoryFilter(
        t.category || "",
        categoryFilters
      );
      const matchStt =
        sttFilter === "All" ||
        (sttFilter === "Charged" && (t.stt || 0) > 0) ||
        (sttFilter === "Zero" && (t.stt || 0) === 0);
      const matchTax =
        taxFilter === "All" ||
        (t.type === "BUY" &&
          getTaxHorizon(t.date, t.category, t.schemeName).taxType ===
            taxFilter);
      const matchDate = isDateInRange(t.date, startDate, endDate);
      return (
        matchSearch &&
        matchMember &&
        matchType &&
        matchCategory &&
        matchStt &&
        matchTax &&
        matchDate
      );
    });

    const isSearching = tokens.length > 0;
    const scoreMap = new Map<
      number,
      { matchedTermsCount: number; totalScore: number }
    >();
    if (isSearching) {
      for (const t of matchedRows) {
        const res = scoreItem(
          tokens,
          [
            {
              text: t.schemeName,
              weight: PORTFOLIO_SEARCH_WEIGHTS.SCHEME_NAME,
            },
            { text: t.category, weight: PORTFOLIO_SEARCH_WEIGHTS.CATEGORY },
            { text: t.folioNo, weight: PORTFOLIO_SEARCH_WEIGHTS.FOLIO_NO },
            {
              text: t.memberName,
              weight: PORTFOLIO_SEARCH_WEIGHTS.MEMBER_NAME,
            },
            {
              text: t.transactionType,
              weight: PORTFOLIO_SEARCH_WEIGHTS.TRANSACTION_TYPE,
            },
          ],
          t.folioNo
        );
        scoreMap.set(t.id, res);
      }
    }

    return matchedRows.sort((a, b) => {
      // 1. If actively searching, rank by matchedTermsCount descending, then totalScore descending
      if (isSearching) {
        const scoreA = scoreMap.get(a.id);
        const scoreB = scoreMap.get(b.id);
        const termsA = scoreA?.matchedTermsCount ?? 0;
        const termsB = scoreB?.matchedTermsCount ?? 0;
        if (termsB !== termsA) {
          return termsB - termsA;
        }
        const totalA = scoreA?.totalScore ?? 0;
        const totalB = scoreB?.totalScore ?? 0;
        if (Math.abs(totalB - totalA) > 0.05) {
          return totalB - totalA;
        }
      }

      // 2. User's explicit table sort
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      if (valA === null || valA === undefined)
        return sortOrder === "asc" ? -1 : 1;
      if (valB === null || valB === undefined)
        return sortOrder === "asc" ? 1 : -1;
      if (sortOrder === "asc") {
        return (valA as number) > (valB as number) ? 1 : -1;
      }
      return (valA as number) < (valB as number) ? 1 : -1;
    });
  }, [
    transactions,
    deferredSearchVal,
    memberFilter,
    typeFilters,
    categoryFilters,
    sttFilter,
    startDate,
    endDate,
    sortField,
    sortOrder,
  ]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Summary stats using calculateTransactionSummary helper
  const summary = useMemo(
    () => calculateTransactionSummary(filtered),
    [filtered]
  );

  // Cashflow reconciliation matching broker statement
  const reconciliation = useMemo(
    () => calculateCashflowReconciliation(filtered, currentPortfolioValue),
    [filtered, currentPortfolioValue]
  );

  return (
    <>
      <motion.div
        key="transactions"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-xs font-semibold text-slate-400">
            Total {transactions.length.toLocaleString("en-IN")} transaction
            records in database
          </div>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <Upload size={16} />
            <span>Upload Statement (.xlsx)</span>
          </button>
        </div>
        {/* STT Tax Banner */}
        <div className="rounded-xl border border-indigo-500/30 bg-slate-900/60 backdrop-blur-md p-4 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                <Info className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    Securities Transaction Tax (STT) & Tax Applicability
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Tax Regulation
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  <strong className="text-slate-200">What is STT?</strong>{" "}
                  Securities Transaction Tax (STT) is a direct tax levied by the
                  Central Government of India on mutual fund transactions.
                </p>
                {showSttInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Redemptions / Sells (Equity Funds)
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Levied at{" "}
                          <strong className="text-slate-200">0.001%</strong> on
                          the redemption proceeds when selling or switching out
                          of{" "}
                          <strong className="text-slate-200">
                            Equity-oriented mutual funds
                          </strong>{" "}
                          (≥ 65% equity allocation). Automatically deducted
                          upfront by AMC.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          Purchases & Non-Equity Schemes
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          <strong className="text-slate-200">
                            Purchases/SIPs:
                          </strong>{" "}
                          Exempt from STT (attracts 0.005% Stamp Duty instead).{" "}
                          <br />
                          <strong className="text-slate-200">
                            Debt & Liquid Funds:
                          </strong>{" "}
                          Completely exempt from STT.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSttInfo(!showSttInfo)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap cursor-pointer"
            >
              {showSttInfo ? "Hide Details" : "Learn More"}
            </button>
          </div>
        </div>

        {/* ── Cashflow Reconciliation (Single Row of 7 Cards) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
          {/* 1. Investment (A) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
              Investment (A)
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight">
              {formatIndianAmount(reconciliation.investmentA)}
            </div>
          </div>

          {/* 2. Switch In (B) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
              Switch In (B)
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-200 tracking-tight">
              {formatIndianAmount(reconciliation.switchInB)}
            </div>
          </div>

          {/* 3. Switch Out (C) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
              Switch Out (C)
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-200 tracking-tight">
              {formatIndianAmount(reconciliation.switchOutC)}
            </div>
          </div>

          {/* 4. Redemption (D) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
              Redemption (D)
            </div>
            <div className="text-sm sm:text-base font-extrabold text-rose-400 tracking-tight">
              {formatIndianAmount(reconciliation.redemptionD)}
            </div>
          </div>

          {/* 5. Current Value (F) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-teal-500/30 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1 leading-tight">
              Current Value (F)
            </div>
            <div className="text-sm sm:text-base font-extrabold text-teal-300 tracking-tight">
              {formatIndianAmount(reconciliation.currentValueF)}
            </div>
          </div>

          {/* 6. Net Gain (F-A-B+C+D) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 leading-tight">
              Net Gain (F-A-B+C+D)
            </div>
            <div
              className={`text-sm sm:text-base font-extrabold tracking-tight ${
                reconciliation.netGain >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {formatIndianAmount(reconciliation.netGain)}
            </div>
          </div>

          {/* 7. Net Investment */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 leading-tight">
              Net Investment
            </div>
            <div className="text-sm sm:text-base font-extrabold text-indigo-300 tracking-tight">
              {formatIndianAmount(reconciliation.netInvestment)}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* 1. Total Filtered Records */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold leading-tight">
                  Total
                  <br />
                  Transactions
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-100 tracking-tight">
                {summary.totalCount.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              All matching statements
            </div>
          </div>

          {/* 2. Total Inflow (Buy) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-emerald-950/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
                <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold leading-tight">
                  Total Buy
                  <br />
                  (Inflow)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-center leading-tight">
                  Buy
                  <br />
                  Volume
                </span>
              </div>
              <div className="text-xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-1.5">
                <TrendingUp size={18} className="text-emerald-400 shrink-0" />
                <span>{formatCurrency(summary.totalBuyAmount)}</span>
              </div>
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-2 font-medium">
              {summary.totalBuyCount.toLocaleString("en-IN")} entries • Total
              capital invested
            </div>
          </div>

          {/* 3. Total Outflow (Sell) */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-rose-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-rose-950/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
                <span className="text-[11px] text-rose-400 uppercase tracking-wider font-bold leading-tight">
                  Total Sell
                  <br />
                  (Outflow)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 text-center leading-tight">
                  Sell
                  <br />
                  Volume
                </span>
              </div>
              <div className="text-xl font-extrabold text-rose-400 tracking-tight flex items-center gap-1.5">
                <TrendingDown size={18} className="text-rose-400 shrink-0" />
                <span>{formatCurrency(summary.totalSellAmount)}</span>
              </div>
            </div>
            <div className="text-[11px] text-rose-400/80 mt-2 font-medium">
              {summary.totalSellCount.toLocaleString("en-IN")} entries •
              Redeemed / withdrawn
            </div>
          </div>

          {/* 4. Net Inflow */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-teal-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-teal-950/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
                <span className="text-[11px] text-teal-400 uppercase tracking-wider font-bold leading-tight">
                  Net
                  <br />
                  Inflow
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30 text-center leading-tight">
                  Buy −
                  <br />
                  Sell
                </span>
              </div>
              <div className="text-xl font-extrabold text-teal-300 tracking-tight flex items-center gap-1.5">
                <Wallet size={18} className="text-teal-400 shrink-0" />
                <span>{formatCurrency(summary.netInflowAmount)}</span>
              </div>
            </div>
            <div className="text-[11px] text-teal-400/80 mt-2 font-medium">
              Net capital flow for filtered entries
            </div>
          </div>

          {/* 5. Regulatory Taxes & Charges */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
                <span className="text-[11px] text-amber-400 uppercase tracking-wider font-bold leading-tight">
                  Stamp Duty
                  <br />& STT
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 text-center leading-tight">
                  Taxes
                  <br />
                  Paid
                </span>
              </div>
              <div className="text-xl font-extrabold text-amber-400 tracking-tight">
                {formatCurrency(summary.totalStampDuty + summary.totalStt)}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Stamp: {formatCurrency(summary.totalStampDuty)}</span>
              <span className="text-indigo-400">
                STT: {formatCurrency(summary.totalStt)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Filter Modal ── */}
        {mounted &&
          filterPanelOpen &&
          createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setFilterPanelOpen(false)}
              />

              {/* Panel */}
              <div className="relative z-10 w-full sm:max-w-xl h-[85vh] max-h-[640px] flex flex-col rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                    <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                      Transactions Tab Filters
                    </h2>
                  </div>
                  <button
                    onClick={() => setFilterPanelOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition text-xs"
                    aria-label="Close filters"
                  >
                    ✕
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
                  {/* Applicant */}
                  <SingleSelectFilter
                    label="Applicant"
                    value={memberFilter}
                    onChange={(val) => {
                      setMemberFilter(val);
                      updateUrl({ member: val });
                    }}
                    options={memberNames.map((m) => ({ id: m, label: m }))}
                    allLabel="All Applicants"
                    allId="All"
                  />

                  <FilterSectionDivider />

                  {/* Transaction Type */}
                  <MultiSelectFilter
                    label="Transaction Type"
                    values={typeFilters}
                    onChange={(types) => {
                      setTypeFilters(types);
                      updateUrl({
                        type: types.length > 0 ? types.join(",") : null,
                      });
                    }}
                    options={[
                      { id: "BUY", label: "BUY", count: baseTypeCounts.buy },
                      { id: "SELL", label: "SELL", count: baseTypeCounts.sell },
                      ...detailedTypeOptions.map((opt) => ({
                        id: opt.name,
                        label: opt.name,
                        count: opt.count,
                      })),
                    ]}
                    allLabel="All Types"
                    onClear={() => {
                      setTypeFilters([]);
                      updateUrl({ type: null });
                    }}
                  />

                  <FilterSectionDivider />

                  {/* Sub Category */}
                  <MultiSelectFilter
                    label="Fund Category"
                    values={categoryFilters}
                    onChange={(cats) => {
                      setCategoryFilters(cats);
                      updateUrl({ category: serializeCategoryFilters(cats) });
                    }}
                    options={categoryOptions.map((c) => ({
                      id: c.name,
                      label: c.name,
                    }))}
                    allLabel="All Categories"
                    onClear={() => {
                      setCategoryFilters([]);
                      updateUrl({ category: null });
                    }}
                  />

                  <FilterSectionDivider />

                  {/* Tax Horizon (LTCG / STCG) */}
                  <SingleSelectFilter
                    label="Tax Horizon (Holding Period)"
                    value={taxFilter}
                    onChange={(val) => {
                      setTaxFilter(val as TaxGainFilter);
                      updateUrl({ tax: val });
                    }}
                    options={[
                      {
                        id: "LTCG",
                        label: "LTCG (> 1 Year / 365 Days)",
                        count: taxCounts.ltcg,
                      },
                      {
                        id: "STCG",
                        label: "STCG (≤ 1 Year / 365 Days)",
                        count: taxCounts.stcg,
                      },
                    ]}
                    allLabel="All Tax Horizons"
                    allId="All"
                  />

                  <FilterSectionDivider />

                  {/* STT Status */}
                  <SingleSelectFilter
                    label="STT Status"
                    value={sttFilter}
                    onChange={(val) => {
                      setSttFilter(val as "All" | "Charged" | "Zero");
                      updateUrl({ stt: val });
                    }}
                    options={[
                      { id: "Charged", label: "STT Charged (> ₹0)" },
                      { id: "Zero", label: "No STT (₹0)" },
                    ]}
                    allLabel="All STT Status"
                    allId="All"
                  />
                </div>

                {/* Sticky footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => setFilterPanelOpen(false)}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20"
                  >
                    Show {filtered.length} result
                    {filtered.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── Search + Date Range + Filters card ── */}
        <div className="mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
          {/* Toolbar row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            <SearchFilterBar
              value={searchVal}
              onChange={setSearchVal}
              placeholder="Search scheme, sub category, folio or applicant…"
              className="flex-1"
            />

            {/* Date Range (compact inline) */}
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-800/60 bg-slate-950/60">
              <Calendar className="w-3 h-3 text-teal-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  updateUrl({ start: e.target.value });
                }}
                className="bg-transparent text-xs text-slate-300 focus:outline-none border-none [color-scheme:dark] w-[110px]"
                title="From date"
              />
              <span className="text-slate-600 text-xs">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  updateUrl({ end: e.target.value });
                }}
                className="bg-transparent text-xs text-slate-300 focus:outline-none border-none [color-scheme:dark] w-[110px]"
                title="To date"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                    updateUrl({ start: null, end: null, page: "1" });
                  }}
                  className="text-slate-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
                  title="Clear date filter"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Date presets */}
            <div className="relative h-9">
              <select
                onChange={(e) => {
                  if (e.target.value) handlePresetRange(e.target.value);
                }}
                value=""
                className="h-9 appearance-none bg-slate-950/60 border border-slate-800/60 rounded-xl px-3 pr-7 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer transition hover:border-slate-600 hover:text-slate-100"
              >
                <option value="" disabled>
                  Presets
                </option>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last-7">Last 7 Days</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="last-30">Last 30 Days</option>
                <option value="last-90">Last 90 Days</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-fy">This FY (2026-27)</option>
                <option value="last-fy">Last FY (2025-26)</option>
              </select>
              <ChevronDown className="w-3 h-3 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Filters button */}
            {(() => {
              const activeCount =
                (memberFilter !== "All" ? 1 : 0) +
                typeFilters.length +
                categoryFilters.length +
                (sttFilter !== "All" ? 1 : 0) +
                (taxFilter !== "All" ? 1 : 0);
              return (
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className={`relative flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
                    activeCount > 0
                      ? "bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20"
                      : "bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {activeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-slate-950">
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* Active filter chips row inside card */}
          {(() => {
            const chips: ReactNode[] = [];
            if (memberFilter !== "All")
              chips.push(
                <span
                  key="member"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
                >
                  👤 {memberFilter}
                  <button
                    onClick={() => {
                      setMemberFilter("All");
                      setPage(1);
                      updateUrl({ member: "All", page: "1" });
                    }}
                    className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                    aria-label="Remove member filter"
                  >
                    ✕
                  </button>
                </span>
              );
            if (taxFilter !== "All")
              chips.push(
                <span
                  key="tax"
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    taxFilter === "LTCG"
                      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  }`}
                >
                  ⏳ {taxFilter === "LTCG" ? "LTCG (>1Y)" : "STCG (≤1Y)"}
                  <button
                    onClick={() => {
                      setTaxFilter("All");
                      setPage(1);
                      updateUrl({ tax: "All", page: "1" });
                    }}
                    className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                    aria-label="Remove Tax Horizon filter"
                  >
                    ✕
                  </button>
                </span>
              );
            typeFilters.forEach((tf) => {
              chips.push(
                <span
                  key={`type-${tf}`}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    tf === "BUY"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : tf === "SELL"
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : "bg-teal-500/15 text-teal-300 border-teal-500/30"
                  }`}
                >
                  🔄 {tf}
                  <button
                    onClick={() => {
                      handleTypeToggle(tf);
                      setPage(1);
                    }}
                    className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                    aria-label={`Remove ${tf} filter`}
                  >
                    ✕
                  </button>
                </span>
              );
            });
            categoryFilters.forEach((cat) => {
              chips.push(
                <span
                  key={`cat-${cat}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
                >
                  🏷️ {cat}
                  <button
                    onClick={() => {
                      handleCategoryToggle(cat);
                      setPage(1);
                    }}
                    className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                    aria-label={`Remove ${cat} filter`}
                  >
                    ✕
                  </button>
                </span>
              );
            });
            if (sttFilter !== "All")
              chips.push(
                <span
                  key="stt"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                >
                  🏛 {sttFilter === "Charged" ? "STT Charged" : "No STT"}
                  <button
                    onClick={() => {
                      setSttFilter("All");
                      setPage(1);
                      updateUrl({ stt: "All", page: "1" });
                    }}
                    className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                    aria-label="Remove STT filter"
                  >
                    ✕
                  </button>
                </span>
              );
            if (startDate || endDate)
              chips.push(
                <span
                  key="date"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                >
                  📅{" "}
                  {startDate && endDate
                    ? `${startDate} – ${endDate}`
                    : startDate
                      ? `From ${startDate}`
                      : `Until ${endDate}`}
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                      updateUrl({ start: null, end: null, page: "1" });
                    }}
                    className="hover:opacity-70 transition ml-0.5 cursor-pointer"
                    aria-label="Remove date filter"
                  >
                    ✕
                  </button>
                </span>
              );
            if (chips.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/50">
                {chips}
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-slate-500 hover:text-rose-400 transition ml-1 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            );
          })()}
        </div>

        {/* Table Container */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
          {/* Table Top Bar with Count */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850">
            <span className="text-xs text-slate-400 font-medium">
              Page <span className="text-slate-200 font-bold">{page}</span> of{" "}
              <span className="text-slate-200 font-bold">
                {Math.max(totalPages, 1)}
              </span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Showing{" "}
              <span className="text-slate-200 font-bold">
                {paginated.length}
              </span>{" "}
              of{" "}
              <span className="text-slate-200 font-bold">
                {filtered.length}
              </span>{" "}
              transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      Date {renderSortIcon("date")}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none min-w-[180px]"
                    onClick={() => handleSort("schemeName")}
                  >
                    <div className="flex items-center gap-1 leading-tight">
                      <span>
                        Scheme
                        <br />
                        Name
                      </span>{" "}
                      {renderSortIcon("schemeName")}
                    </div>
                  </th>
                  <th className="px-3 py-3 whitespace-nowrap">Folio</th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none w-28 max-w-[120px]"
                    onClick={() => handleSort("memberName")}
                  >
                    <div className="flex items-center gap-1 leading-tight">
                      <span>
                        Applicant
                        <br />
                        Name
                      </span>{" "}
                      {renderSortIcon("memberName")}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center gap-1 leading-tight">
                      <span>
                        Transaction
                        <br />
                        Type
                      </span>{" "}
                      {renderSortIcon("type")}
                    </div>
                  </th>
                  <th className="px-3 py-3 whitespace-nowrap leading-tight">
                    <span>
                      Tax
                      <br />
                      Status
                    </span>
                  </th>
                  <th className="px-3 py-3 select-none text-right whitespace-nowrap">
                    <div className="flex flex-col items-end leading-tight gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleSort("units")}
                        className="flex items-center justify-end gap-1 hover:text-slate-200 transition cursor-pointer font-semibold"
                      >
                        <span>Units</span>
                        {renderSortIcon("units")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSort("nav")}
                        className="flex items-center justify-end gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer font-medium"
                      >
                        <span>Price (₹)</span>
                        {renderSortIcon("nav")}
                      </button>
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-1 leading-tight">
                      <span className="text-right">
                        Amount
                        <br />
                        (₹)
                      </span>{" "}
                      {renderSortIcon("amount")}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                    onClick={() => handleSort("stampDuty")}
                  >
                    <div className="flex items-center justify-end gap-1 leading-tight">
                      <span className="text-right">
                        Stamp Duty
                        <br />
                        (₹)
                      </span>{" "}
                      {renderSortIcon("stampDuty")}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 select-none text-right"
                    onClick={() => handleSort("stt")}
                  >
                    <div className="flex items-center justify-end gap-1 leading-tight">
                      <span className="text-right">
                        STT
                        <br />
                        (₹)
                      </span>{" "}
                      {renderSortIcon("stt")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-12 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-sm">
                          No transactions match the current filters.
                        </p>
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((t) => (
                    <tr key={t.id} className="transition hover:bg-slate-950/45">
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-200 font-medium text-xs sm:text-sm">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-3 py-2.5 min-w-[180px]">
                        <div
                          onClick={() => {
                            const url = getFundDetailsUrl(
                              t.holdingId ?? `sold_${t.id}`
                            );
                            router.push(url);
                          }}
                          className="font-bold text-slate-100 hover:text-teal-400 transition cursor-pointer text-xs sm:text-sm whitespace-normal leading-snug"
                          title={t.schemeName}
                        >
                          {t.schemeName}
                        </div>
                        {t.category && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                              {t.category}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <FolioBadge folioNo={t.folioNo} />
                      </td>
                      <td className="px-3 py-2.5 w-28 max-w-[120px]">
                        <div
                          className="font-medium text-slate-300 text-xs leading-snug break-words"
                          title={t.memberName}
                        >
                          {t.memberName}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                              t.type === "BUY"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                                : "bg-red-950/80 text-red-400 border border-red-800/40"
                            }`}
                          >
                            {t.type}
                          </span>
                          {t.transactionType && (
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/60">
                              {t.transactionType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {t.type === "SELL"
                          ? (() => {
                              const days = calculateTransactionHoldingDays(
                                t.date
                              );
                              return (
                                <TaxStatusCell
                                  status="Redeemed"
                                  days={days}
                                  title={`Redeemed / Sold on ${formatDate(t.date)} (${days} days ago)`}
                                />
                              );
                            })()
                          : (() => {
                              const horizon = getTaxHorizon(
                                t.date,
                                t.category,
                                t.schemeName
                              );
                              if (horizon.isElssLocked) {
                                return (
                                  <TaxStatusCell
                                    status="3Y Locked"
                                    days={horizon.lockDaysRemaining}
                                    title={`Mandatory 3-Year ELSS Lock-in: ${horizon.lockDaysRemaining} days remaining`}
                                  />
                                );
                              }
                              if (horizon.taxType === "LTCG") {
                                return (
                                  <TaxStatusCell
                                    status="LTCG"
                                    days={horizon.holdingDays}
                                    title="Long Term Capital Gains (> 1 Year holding) — Eligible for ₹1.25L annual tax-free harvesting"
                                  />
                                );
                              }
                              return (
                                <TaxStatusCell
                                  status="STCG"
                                  days={horizon.daysToLtcg}
                                  title={`Short Term Capital Gains (≤ 1 Year holding) — ${horizon.daysToLtcg} days left to LTCG`}
                                />
                              );
                            })()}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                        <div className="font-semibold text-slate-200 text-xs sm:text-sm">
                          {t.units.toFixed(4)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          ₹{t.nav.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-100 text-xs sm:text-sm tabular-nums">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-amber-400/90 text-xs sm:text-sm tabular-nums">
                        {t.stampDuty !== null && t.stampDuty !== undefined
                          ? `₹${t.stampDuty.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-indigo-400 text-xs sm:text-sm tabular-nums whitespace-nowrap">
                        {t.stt !== null && t.stt !== undefined && t.stt > 0 ? (
                          <span className="font-bold text-indigo-300">
                            ₹{t.stt.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination & Records-Per-Page Bar */}
          <TablePagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={[25, 50, 75, 100]}
            onPageChange={(p) => {
              setPage(p);
              updateUrl({ page: String(p) });
            }}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
              updateUrl({ pageSize: String(s), page: "1" });
            }}
            totalItems={filtered.length}
            showingStart={(page - 1) * pageSize + 1}
            showingEnd={Math.min(page * pageSize, filtered.length)}
            itemName="transactions"
          />
        </div>
      </motion.div>
      <TransactionUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </>
  );
}
