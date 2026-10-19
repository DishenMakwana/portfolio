"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { getFundDetailsUrl } from "@/helpers/formatters";
import { isDateInRange, getPresetDateRange } from "@/helpers/dates";
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
import {
  TRANSACTION_SORT_FIELDS,
  type TransactionsClientProps,
  type TransactionSortField,
  type TaxGainFilter,
} from "@/types/transactions";
import type { SearchScoreMap } from "@/types/filters";
import TransactionUploadModal from "./TransactionUploadModal";
import TransactionsHeaderBar from "./TransactionsHeaderBar";
import TransactionsSttBanner from "./TransactionsSttBanner";
import TransactionsCashflowReconciliation from "./TransactionsCashflowReconciliation";
import TransactionsSummaryHeroCards from "./TransactionsSummaryHeroCards";
import TransactionsToolbar from "./TransactionsToolbar";
import TransactionsFilterModal from "./modal/TransactionsFilterModal";
import TransactionsTable from "./table/TransactionsTable";

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
    const scoreMap: SearchScoreMap = new Map();
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

  const activeFilterCount =
    (memberFilter !== "All" ? 1 : 0) +
    typeFilters.length +
    categoryFilters.length +
    (sttFilter !== "All" ? 1 : 0) +
    (taxFilter !== "All" ? 1 : 0);

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
        <TransactionsHeaderBar
          totalRecords={transactions.length}
          onOpenUploadModal={() => setIsUploadOpen(true)}
        />

        {/* STT Tax Banner */}
        <TransactionsSttBanner
          showSttInfo={showSttInfo}
          onToggleSttInfo={() => setShowSttInfo(!showSttInfo)}
        />

        {/* Cashflow Reconciliation (Single Row of 7 Cards) */}
        <TransactionsCashflowReconciliation reconciliation={reconciliation} />

        {/* Summary Cards */}
        <TransactionsSummaryHeroCards summary={summary} />

        {/* Filter Modal */}
        <TransactionsFilterModal
          isOpen={mounted && filterPanelOpen}
          onClose={() => setFilterPanelOpen(false)}
          memberFilter={memberFilter}
          onMemberChange={(val) => {
            setMemberFilter(val);
            updateUrl({ member: val });
          }}
          memberOptions={memberNames.map((m) => ({ id: m, label: m }))}
          typeFilters={typeFilters}
          onTypeToggle={handleTypeToggle}
          typeOptions={[
            { id: "BUY", label: "BUY", count: baseTypeCounts.buy },
            { id: "SELL", label: "SELL", count: baseTypeCounts.sell },
            ...detailedTypeOptions.map((opt) => ({
              id: opt.name,
              label: opt.name,
              count: opt.count,
            })),
          ]}
          onClearTypes={() => {
            setTypeFilters([]);
            updateUrl({ type: null });
          }}
          categoryFilters={categoryFilters}
          onCategoryToggle={handleCategoryToggle}
          categoryOptions={categoryOptions.map((c) => ({
            id: c.name,
            label: c.name,
          }))}
          onClearCategories={() => {
            setCategoryFilters([]);
            updateUrl({ category: null });
          }}
          taxFilter={taxFilter}
          onTaxChange={(val) => {
            setTaxFilter(val);
            updateUrl({ tax: val });
          }}
          taxCounts={taxCounts}
          sttFilter={sttFilter}
          onSttChange={(val) => {
            setSttFilter(val);
            updateUrl({ stt: val });
          }}
          onClearAll={handleClearAll}
          filteredCount={filtered.length}
        />

        {/* Search + Date Range + Filters card */}
        <TransactionsToolbar
          searchVal={searchVal}
          onSearchChange={setSearchVal}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(val) => {
            setStartDate(val);
            updateUrl({ start: val });
          }}
          onEndDateChange={(val) => {
            setEndDate(val);
            updateUrl({ end: val });
          }}
          onClearDate={() => {
            setStartDate("");
            setEndDate("");
            setPage(1);
            updateUrl({ start: null, end: null, page: "1" });
          }}
          onPresetRange={handlePresetRange}
          onOpenFilterModal={() => setFilterPanelOpen(true)}
          activeFilterCount={activeFilterCount}
          memberFilter={memberFilter}
          taxFilter={taxFilter}
          typeFilters={typeFilters}
          categoryFilters={categoryFilters}
          sttFilter={sttFilter}
          onRemoveMemberFilter={() => {
            setMemberFilter("All");
            setPage(1);
            updateUrl({ member: "All", page: "1" });
          }}
          onRemoveTaxFilter={() => {
            setTaxFilter("All");
            setPage(1);
            updateUrl({ tax: "All", page: "1" });
          }}
          onRemoveTypeFilter={(tf) => {
            handleTypeToggle(tf);
            setPage(1);
          }}
          onRemoveCategoryFilter={(cat) => {
            handleCategoryToggle(cat);
            setPage(1);
          }}
          onRemoveSttFilter={() => {
            setSttFilter("All");
            setPage(1);
            updateUrl({ stt: "All", page: "1" });
          }}
          onClearAllFilters={handleClearAll}
        />

        {/* Table Container */}
        <TransactionsTable
          paginated={paginated}
          totalFiltered={filtered.length}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(p) => {
            setPage(p);
            updateUrl({ page: String(p) });
          }}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
            updateUrl({ pageSize: String(s), page: "1" });
          }}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          renderSortIcon={renderSortIcon}
          onResetFilters={handleClearAll}
          onNavigateFund={(holdingId) =>
            router.push(getFundDetailsUrl(holdingId))
          }
        />
      </motion.div>
      <TransactionUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </>
  );
}
