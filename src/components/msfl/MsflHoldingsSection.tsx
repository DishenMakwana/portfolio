"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import TablePagination from "@/components/shared/TablePagination";
import MsflHoldingsTable from "./holdings/MsflHoldingsTable";
import MsflPerformanceComparisonCards from "./holdings/MsflPerformanceComparisonCards";
import type { MsflHoldingsSectionProps, MsflSortField } from "@/types/msfl";

export default function MsflHoldingsSection({
  holdings,
  filteredHoldings,
  searchQuery,
  setSearchQuery,
  sortField,
  toggleSort,
  renderSortIcon,
  handleEditMapping,
  beatingFunds,
  laggingFunds,
}: MsflHoldingsSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
    const rawP = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawP) && rawP > 0) setPage(rawP);
    const rawPs = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    if (!isNaN(rawPs) && rawPs > 0) setPageSize(rawPs);
  }, [searchParams]);

  const totalPages = Math.ceil(filteredHoldings.length / pageSize);
  const paginatedHoldings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHoldings.slice(start, start + pageSize);
  }, [filteredHoldings, page, pageSize]);

  const stockTotals = useMemo(() => {
    if (filteredHoldings.length === 0) return null;
    const totalValueSum = filteredHoldings.reduce(
      (sum, s) => sum + s.currentValue,
      0
    );
    const totalInvestedSum = filteredHoldings.reduce(
      (sum, s) => sum + s.investedValue,
      0
    );
    const totalPnlSum = totalValueSum - totalInvestedSum;
    const totalPnlPct =
      totalInvestedSum > 0 ? (totalPnlSum / totalInvestedSum) * 100 : 0;
    const avgXirr =
      totalValueSum > 0
        ? filteredHoldings.reduce(
            (sum, s) => sum + (s.cagr ?? s.xirr ?? 0) * s.currentValue,
            0
          ) / totalValueSum
        : 0;
    const avgAlpha =
      totalValueSum > 0
        ? filteredHoldings.reduce(
            (sum, s) => sum + (s.alpha ?? 0) * s.currentValue,
            0
          ) / totalValueSum
        : 0;

    return {
      totalValueSum,
      totalInvestedSum,
      totalPnlSum,
      totalPnlPct,
      avgXirr,
      avgAlpha,
    };
  }, [filteredHoldings]);

  const filteredBase = useMemo(() => {
    return holdings.filter((h) =>
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [holdings, searchQuery]);

  const rankMap = useMemo(() => {
    const descSorted = [...filteredBase].sort((a, b) => {
      const valA = a[sortField] ?? -Infinity;
      const valB = b[sortField] ?? -Infinity;
      if (typeof valA === "string" && typeof valB === "string") {
        return valB.localeCompare(valA);
      }
      const numA = typeof valA === "number" ? valA : Number(valA) || 0;
      const numB = typeof valB === "number" ? valB : Number(valB) || 0;
      return numB - numA;
    });

    const map = new Map<string, number>();
    descSorted.forEach((item, index) => {
      map.set(item.symbol, index + 1);
    });
    return map;
  }, [filteredBase, sortField]);

  const handleTableSort = (field: MsflSortField) => {
    setPage(1);
    toggleSort(field);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setPage(1);
    updateUrl({ q: null, page: "1" });
  };

  return (
    <div className="space-y-6">
      {/* Holdings Table */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800/60">
          <SearchFilterBar
            value={searchQuery}
            onChange={(val) => {
              setPage(1);
              setSearchQuery(val);
            }}
            placeholder="Search stock symbol..."
            className="max-w-sm w-full"
          />
        </div>

        <MsflHoldingsTable
          paginatedHoldings={paginatedHoldings}
          filteredHoldingsCount={filteredHoldings.length}
          page={page}
          totalPages={totalPages}
          toggleSort={handleTableSort}
          renderSortIcon={renderSortIcon}
          rankMap={rankMap}
          onSelectHolding={(id) => router.push(`/fund/msfl_${id}`)}
          handleEditMapping={handleEditMapping}
          searchQuery={searchQuery}
          onClearSearch={handleClearSearch}
          stockTotals={stockTotals}
        />

        {/* ── Bottom Pagination Bar ── */}
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            updateUrl({ page: String(nextPage) });
          }}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
            updateUrl({ pageSize: String(newSize), page: "1" });
          }}
          totalItems={filteredHoldings.length}
          showingStart={Math.min(
            (page - 1) * pageSize + 1,
            filteredHoldings.length
          )}
          showingEnd={Math.min(page * pageSize, filteredHoldings.length)}
          itemName="holdings"
        />
      </div>

      {/* Outperforming vs Underperforming breakdown */}
      <MsflPerformanceComparisonCards
        beatingFunds={beatingFunds}
        laggingFunds={laggingFunds}
      />
    </div>
  );
}
