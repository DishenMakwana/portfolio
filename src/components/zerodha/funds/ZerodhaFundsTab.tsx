"use client";

import { useState, useMemo, useEffect, useDeferredValue } from "react";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import {
  matchesSearchTokens,
  getSearchTokens,
  scoreItem,
  PORTFOLIO_SEARCH_WEIGHTS,
} from "@/helpers/search";
import FolioBadge from "@/components/shared/FolioBadge";
import {
  formatCurrency,
  formatPercent,
  formatHoldingYearsAndDays,
  formatZerodhaMemberShortName,
  getZerodhaClientBadgeStyle,
} from "@/helpers/formatters";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ZerodhaFundsTabProps } from "@/types/zerodha";
import ZerodhaBenchmarkCards from "@/components/zerodha/overview/ZerodhaBenchmarkCards";
import TablePagination from "@/components/shared/TablePagination";

export default function ZerodhaFundsTab({
  funds,
  renderFundSortIcon,
  toggleFundSort,
  fundSortField,
  fundSortOrder,
  totals,
  metricDeltas,
  selectedAccount,
  categoryRankingsMap,
}: ZerodhaFundsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("q") || "";
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

  const [fundSearch, setFundSearch] = useState(initialSearch);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(initialPage);

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
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    setFundSearch(searchParams.get("q") || "");
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
      const currentQ = searchParams.get("q") || "";
      if (currentQ !== fundSearch) {
        setPage(1);
        updateUrl({ q: fundSearch, page: "1" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [fundSearch]);

  const deferredSearch = useDeferredValue(fundSearch);

  const filteredBase = useMemo(() => {
    const tokens = getSearchTokens(deferredSearch);
    return funds.filter(
      (f) =>
        tokens.length === 0 ||
        matchesSearchTokens(
          tokens,
          [f.symbol, f.folioNo, f.memberName, f.sector, f.instrumentType],
          f.folioNo
        )
    );
  }, [funds, deferredSearch]);

  const rankMap = useMemo(() => {
    const descSorted = [...filteredBase].sort((a, b) => {
      const valA = a[fundSortField] ?? -999999;
      const valB = b[fundSortField] ?? -999999;
      if (typeof valA === "string" && typeof valB === "string") {
        return valB.localeCompare(valA);
      }
      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return numB - numA;
    });

    const map = new Map<number, number>();
    descSorted.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [filteredBase, fundSortField]);

  const filteredFunds = useMemo(() => {
    const tokens = getSearchTokens(deferredSearch);
    const isSearching = tokens.length > 0;

    const scoreMap = new Map<
      number,
      { matchedTermsCount: number; totalScore: number }
    >();
    if (isSearching) {
      for (const f of filteredBase) {
        const res = scoreItem(
          tokens,
          [
            { text: f.symbol, weight: PORTFOLIO_SEARCH_WEIGHTS.SCHEME_NAME },
            {
              text: f.memberName,
              weight: PORTFOLIO_SEARCH_WEIGHTS.MEMBER_NAME,
            },
            { text: f.folioNo, weight: PORTFOLIO_SEARCH_WEIGHTS.FOLIO_NO },
            { text: f.sector, weight: PORTFOLIO_SEARCH_WEIGHTS.CATEGORY },
            { text: f.instrumentType, weight: PORTFOLIO_SEARCH_WEIGHTS.OTHER },
          ],
          f.folioNo
        );
        scoreMap.set(f.id, res);
      }
    }

    return [...filteredBase].sort((a, b) => {
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

      const valA =
        a[fundSortField] ?? (fundSortOrder === "asc" ? 999999 : -999999);
      const valB =
        b[fundSortField] ?? (fundSortOrder === "asc" ? 999999 : -999999);
      if (typeof valA === "string" && typeof valB === "string") {
        return fundSortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return fundSortOrder === "asc" ? numA - numB : numB - numA;
    });
  }, [filteredBase, fundSortField, fundSortOrder, deferredSearch]);

  const totalPages = Math.ceil(filteredFunds.length / pageSize);
  const paginatedFunds = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFunds.slice(start, start + pageSize);
  }, [filteredFunds, page, pageSize]);

  const fundTotals = useMemo(() => {
    if (filteredFunds.length === 0) return null;
    const totalValueSum = filteredFunds.reduce(
      (sum, f) => sum + f.currentValue,
      0
    );
    const totalInvestedSum = filteredFunds.reduce(
      (sum, f) => sum + f.investedValue,
      0
    );
    const totalPnlSum = totalValueSum - totalInvestedSum;
    const totalPnlPct =
      totalInvestedSum > 0 ? (totalPnlSum / totalInvestedSum) * 100 : 0;
    const avgHoldingDays =
      totalValueSum > 0
        ? filteredFunds.reduce(
            (sum, f) => sum + (f.holdingDays || 0) * f.currentValue,
            0
          ) / totalValueSum
        : 0;
    const avgCagr =
      totalValueSum > 0
        ? filteredFunds.reduce(
            (sum, f) => sum + (f.cagr || 0) * f.currentValue,
            0
          ) / totalValueSum
        : 0;
    const avgXirr =
      totalValueSum > 0
        ? filteredFunds.reduce(
            (sum, f) => sum + (f.xirr || 0) * f.currentValue,
            0
          ) / totalValueSum
        : 0;
    const avgAlpha =
      totalValueSum > 0
        ? filteredFunds.reduce(
            (sum, f) => sum + (f.alpha || 0) * f.currentValue,
            0
          ) / totalValueSum
        : 0;

    return {
      totalValueSum,
      totalInvestedSum,
      totalPnlSum,
      totalPnlPct,
      avgHoldingDays,
      avgCagr,
      avgXirr,
      avgAlpha,
    };
  }, [filteredFunds]);

  const fundBenchmarkTotals = useMemo(() => {
    return {
      benchmarkXirr: totals?.fundsBenchmarkXirr ?? 0,
      alpha: totals?.fundsAlpha ?? fundTotals?.avgAlpha ?? 0,
      portfolioXirr: totals?.fundsXirr ?? fundTotals?.avgXirr ?? 0,
    };
  }, [totals, fundTotals]);

  const fundBenchmarkDeltas = useMemo(() => {
    return {
      benchmarkXirr: metricDeltas?.fundsBenchmarkXirr ?? null,
      alpha: metricDeltas?.fundsAlpha ?? null,
      portfolioXirr: metricDeltas?.fundsXirr ?? null,
    };
  }, [metricDeltas]);

  return (
    <div className="space-y-6">
      <ZerodhaBenchmarkCards
        totals={fundBenchmarkTotals}
        metricDeltas={fundBenchmarkDeltas}
        title="Mutual Fund XIRR"
      />

      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
        {/* Search controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800/60">
          <SearchFilterBar
            value={fundSearch}
            onChange={setFundSearch}
            placeholder="Search scheme name..."
            className="max-w-sm w-full"
          />
        </div>

        {/* Table Top Bar with Page & Counter */}
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
              {paginatedFunds.length}
            </span>{" "}
            of{" "}
            <span className="text-slate-200 font-bold">
              {filteredFunds.length}
            </span>{" "}
            funds
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700/80">
                <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-12 select-none">
                  #
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none min-w-[320px]"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("symbol");
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="leading-tight">
                      <div>Scheme</div>
                      <div>Details</div>
                    </div>
                    {renderFundSortIcon("symbol")}
                  </div>
                </th>
                <th className="p-4 min-w-[90px] w-24 select-none">Holder</th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("currentValue");
                  }}
                >
                  <div className="flex items-center gap-1">
                    Valuation {renderFundSortIcon("currentValue")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("unrealizedPnl");
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="leading-tight">
                      <div>Profit /</div>
                      <div>Loss</div>
                    </div>
                    {renderFundSortIcon("unrealizedPnl")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("holdingDays");
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="leading-tight">
                      <div>Holding</div>
                      <div>Days</div>
                    </div>
                    {renderFundSortIcon("holdingDays")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("cagr");
                  }}
                >
                  <div className="flex items-center gap-1">
                    CAGR {renderFundSortIcon("cagr")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("xirr");
                  }}
                >
                  <div className="flex items-center gap-1">
                    XIRR {renderFundSortIcon("xirr")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("alpha");
                  }}
                >
                  <div className="flex items-center gap-1">
                    Alpha {renderFundSortIcon("alpha")}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                  onClick={() => {
                    setPage(1);
                    toggleFundSort("athCorrectionPct");
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="leading-tight">
                      <div>ATH &</div>
                      <div>Dip</div>
                    </div>
                    {renderFundSortIcon("athCorrectionPct")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
              {paginatedFunds.length > 0 ? (
                paginatedFunds.map((f, idx) => (
                  <tr
                    key={idx}
                    onClick={() => router.push(`/fund/z_${f.id}`)}
                    className="hover:bg-slate-950/45 transition cursor-pointer select-none"
                  >
                    <td className="p-4 text-center  text-xs font-bold text-slate-500">
                      {rankMap.get(f.id) ?? "-"}
                    </td>
                    <td className="p-4">
                      <div
                        className="font-bold text-slate-100 hover:text-emerald-400 transition cursor-pointer"
                        title={f.symbol}
                      >
                        {f.symbol}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          {f.instrumentType || "Mutual Fund"}
                        </span>
                        {(() => {
                          const rankInfo = f.schemeCodeApi
                            ? categoryRankingsMap?.[f.schemeCodeApi]
                            : null;
                          if (!rankInfo?.primaryRank) return null;

                          const { rank, horizon } = rankInfo.primaryRank;
                          const rankPillClass =
                            rank === 1
                              ? "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10"
                              : rank <= 5
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                                : rank <= 15
                                  ? "bg-sky-950/70 text-sky-300 border-sky-500/30"
                                  : "bg-slate-850/90 text-slate-300 border-slate-700/60";

                          const rankText =
                            rank === 1
                              ? `🏆 #1 in Cat (${horizon})`
                              : rank <= 5
                                ? `⭐ #${rank} (${horizon})`
                                : `Rank #${rank} (${horizon})`;

                          const titleText = `Category: ${rankInfo.categoryName || f.instrumentType || "Mutual Fund"}\n${Object.entries(
                            rankInfo.allRanks
                          )
                            .filter(([, r]) => r && r !== "--")
                            .map(([hz, r]) => `${hz}: #${r}`)
                            .join(" • ")}`;

                          return (
                            <span
                              title={titleText}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${rankPillClass}`}
                            >
                              {rankText}
                            </span>
                          );
                        })()}
                        {f.folioNo && <FolioBadge folioNo={f.folioNo} />}
                        {f.quantity <= 0.0001 && (
                          <span className="bg-amber-950/80 text-amber-400 border border-amber-800/40 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                            Inactive / Sold
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>Units: {f.quantity.toFixed(3)}</span>
                        <span>• NAV: ₹{f.currentPrice.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-200">
                      <div className="flex flex-col items-start gap-1">
                        <span className="uppercase tracking-wide text-xs font-semibold text-slate-200">
                          {formatZerodhaMemberShortName(
                            f.clientId || f.memberName
                          )}
                        </span>
                        {f.clientId && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px]  font-bold ${getZerodhaClientBadgeStyle(
                              f.clientId
                            )}`}
                          >
                            {f.clientId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-100">
                      <div>{formatCurrency(f.currentValue)}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Cost: {formatCurrency(f.investedValue)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className={`font-semibold ${f.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {formatCurrency(f.unrealizedPnl)}
                      </div>
                      <div
                        className={`text-[11px] ${f.unrealizedPnl >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}
                      >
                        {f.unrealizedPnlPct.toFixed(1)}% Abs
                      </div>
                    </td>
                    <td className="p-4 text-slate-200 whitespace-nowrap">
                      {f.holdingDays !== null && f.holdingDays !== undefined ? (
                        <>
                          <div className="font-bold">{f.holdingDays}</div>
                          {f.holdingDays >= 30 && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              {formatHoldingYearsAndDays(f.holdingDays)}
                            </div>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4">
                      <div
                        className={`font-bold ${
                          f.cagr !== null && f.cagr !== undefined && f.cagr >= 0
                            ? "text-teal-400"
                            : f.cagr !== null && f.cagr !== undefined
                              ? "text-red-400"
                              : "text-slate-400"
                        }`}
                      >
                        {f.cagr !== null && f.cagr !== undefined
                          ? formatPercent(f.cagr)
                          : "-"}
                      </div>
                      {f.benchmarkCagr !== null &&
                        f.benchmarkCagr !== undefined && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            CAVG: {formatPercent(f.benchmarkCagr)}
                          </div>
                        )}
                    </td>
                    <td className="p-4">
                      <div
                        className={`font-bold ${
                          f.xirr !== null && f.xirr !== undefined && f.xirr >= 0
                            ? "text-teal-400"
                            : f.xirr !== null && f.xirr !== undefined
                              ? "text-red-400"
                              : "text-teal-400"
                        }`}
                      >
                        {f.xirr !== null && f.xirr !== undefined
                          ? formatPercent(f.xirr)
                          : "-"}
                      </div>
                      {(() => {
                        const benchXirr =
                          f.benchmarkXirr !== null &&
                          f.benchmarkXirr !== undefined
                            ? f.benchmarkXirr
                            : typeof f.alpha === "number" &&
                                typeof f.xirr === "number" &&
                                (f.alpha !== 0 || f.xirr !== 0)
                              ? f.xirr - f.alpha
                              : null;
                        if (benchXirr === null || benchXirr === undefined)
                          return null;
                        return (
                          <div className="text-[11px] text-slate-500 font-medium">
                            CAVG: {formatPercent(benchXirr)}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      {f.alpha !== null && f.alpha !== undefined ? (
                        <span
                          className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${
                            f.alpha >= 0
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                              : "bg-red-950/80 text-red-400 border border-red-800/40"
                          }`}
                        >
                          {f.alpha >= 0 ? "+" : ""}
                          {f.alpha.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {f.athNav && f.athNav > 0 ? (
                        <div className="flex flex-col items-start gap-1">
                          {/* Buy Dip Tag if opportunity */}
                          {f.isLumpsumOpportunity && (
                            <span
                              title="Down ≥5% from All-Time High — Prime Lumpsum Opportunity"
                              className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50 inline-flex items-center gap-0.5 shadow-sm shadow-amber-500/10"
                            >
                              🔥 Buy Dip
                            </span>
                          )}
                          {/* Pct Correction */}
                          <span
                            className={`font-bold text-xs px-1.5 py-0.5 rounded border ${
                              f.isLumpsumOpportunity
                                ? "bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/10"
                                : (f.athCorrectionPct ?? 0) >= 0
                                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                                  : "bg-amber-950/80 text-amber-300 border-amber-500/40"
                            }`}
                          >
                            {f.athCorrectionPct !== null &&
                            f.athCorrectionPct !== undefined
                              ? f.athCorrectionPct >= 0
                                ? "At Peak"
                                : `${f.athCorrectionPct.toFixed(2)}%`
                              : "-"}
                          </span>
                          {/* CUR & ATH & days */}
                          <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 mt-0.5 font-medium">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-[10px]">
                                CUR:
                              </span>
                              <span className="text-slate-300">
                                ₹{f.currentPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-[10px]">
                                ATH:
                              </span>
                              <span className="text-slate-300">
                                ₹{f.athNav.toFixed(2)}
                              </span>
                            </div>
                            {f.athDaysDiff !== null &&
                              f.athDaysDiff !== undefined &&
                              f.athDaysDiff > 0 && (
                                <div className="text-[10px] text-slate-500">
                                  {f.athDaysDiff}d ago
                                </div>
                              )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm">
                        No mutual funds found matching search.
                      </p>
                      {fundSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setFundSearch("");
                            setPage(1);
                            updateUrl({ q: null, page: "1" });
                          }}
                          className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {fundTotals && (
                <tr className="bg-slate-950/80 border-t border-slate-700 font-bold text-slate-200">
                  <td className="p-4 text-center text-slate-500">-</td>
                  <td className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total / Weighted Avg
                    <div className="text-[10px] text-slate-500 font-semibold normal-case mt-0.5">
                      {filteredFunds.length}{" "}
                      {filteredFunds.length === 1 ? "Fund" : "Funds"}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    {selectedAccount === "all" || !selectedAccount
                      ? "All"
                      : formatZerodhaMemberShortName(selectedAccount)}
                  </td>
                  <td className="p-4 text-teal-400 text-base font-black">
                    <div>{formatCurrency(fundTotals.totalValueSum)}</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Cost: {formatCurrency(fundTotals.totalInvestedSum)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div
                      className={
                        fundTotals.totalPnlSum >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {formatCurrency(fundTotals.totalPnlSum)}
                    </div>
                    <div
                      className={`text-[11px] ${
                        fundTotals.totalPnlSum >= 0
                          ? "text-emerald-500/80"
                          : "text-red-500/80"
                      }`}
                    >
                      {fundTotals.totalPnlPct.toFixed(1)}% Abs
                    </div>
                  </td>
                  <td className="p-4 text-slate-300 text-xs whitespace-nowrap">
                    <div>
                      {Math.round(fundTotals.avgHoldingDays).toLocaleString(
                        "en-IN"
                      )}{" "}
                      days
                    </div>
                    {fundTotals.avgHoldingDays >= 30 && (
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {formatHoldingYearsAndDays(fundTotals.avgHoldingDays)}
                      </div>
                    )}
                  </td>
                  <td
                    className={`p-4 ${fundTotals.avgCagr >= 0 ? "text-slate-200" : "text-red-400"}`}
                  >
                    {formatPercent(fundTotals.avgCagr)}
                  </td>
                  <td
                    className={`p-4 ${fundTotals.avgXirr >= 0 ? "text-teal-400" : "text-red-400"}`}
                  >
                    {formatPercent(fundTotals.avgXirr)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        fundTotals.avgAlpha >= 0
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                          : "bg-red-950/80 text-red-400 border border-red-800/40"
                      }`}
                    >
                      {fundTotals.avgAlpha >= 0 ? "+" : ""}
                      {fundTotals.avgAlpha.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">-</td>
                </tr>
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
          totalItems={filteredFunds.length}
          showingStart={(page - 1) * pageSize + 1}
          showingEnd={Math.min(page * pageSize, filteredFunds.length)}
          itemName="funds"
        />
      </div>
    </div>
  );
}
