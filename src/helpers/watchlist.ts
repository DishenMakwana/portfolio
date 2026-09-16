import * as XLSX from "xlsx";
import type {
  WatchlistItem,
  WatchlistSortField,
  WatchlistSortOrder,
  WatchlistLumpsumSignal,
} from "@/types/watchlist";

/**
 * Normalizes mutual fund categories to clean presentation names.
 * Strips high-level asset prefixes (e.g. "Equity Schemes - Thematic Fund" -> "Thematic Fund").
 */
export function normalizeWatchlistCategory(
  category: string | null | undefined
): string {
  if (!category) return "";
  let cat = category.trim();

  // Strip "Equity Schemes - ", "Equity Scheme - ", "Debt Schemes - ", "Hybrid Schemes - ", etc.
  cat = cat.replace(
    /^(Equity|Debt|Hybrid|Other|Solution Oriented)\s*Schemes?\s*[-–—]\s*/i,
    ""
  );

  return cat.trim();
}

/**
 * Filter watchlist items based on search query, category, and opportunity signal
 */
export function filterWatchlistItems(
  items: WatchlistItem[],
  searchTerm: string,
  categoryFilters: string[],
  opportunityFilter: string,
  fundHouseFilter = "All"
): WatchlistItem[] {
  const query = searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    // 1. Search term match
    if (query) {
      const matchName = item.schemeName.toLowerCase().includes(query);
      const matchCode = item.schemeCode.includes(query);
      const matchFundHouse = (item.fundHouse || "")
        .toLowerCase()
        .includes(query);
      const matchCategory = (item.category || "").toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchFundHouse && !matchCategory) {
        return false;
      }
    }

    // 2. Multi-category filter
    if (categoryFilters.length > 0) {
      const itemCat = (item.category || "").trim().toLowerCase();
      const match = categoryFilters.some(
        (cat) => cat.trim().toLowerCase() === itemCat
      );
      if (!match) return false;
    }

    // 3. Opportunity signal filter
    if (
      opportunityFilter !== "ALL" &&
      item.lumpsumSignal !== opportunityFilter
    ) {
      return false;
    }

    // 4. Fund house filter
    if (
      fundHouseFilter !== "All" &&
      (item.fundHouse || "").trim().toLowerCase() !==
        fundHouseFilter.trim().toLowerCase()
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Sort watchlist items according to the requested column field and direction
 */
export function sortWatchlistItems(
  items: WatchlistItem[],
  sortField: WatchlistSortField,
  sortOrder: WatchlistSortOrder
): WatchlistItem[] {
  const modifier = sortOrder === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    switch (sortField) {
      case "schemeName":
        return modifier * a.schemeName.localeCompare(b.schemeName);
      case "currentNav":
        return modifier * (a.currentNav - b.currentNav);
      case "oneDayChangePct": {
        const valA = a.oneDayChangePct ?? -999999;
        const valB = b.oneDayChangePct ?? -999999;
        return modifier * (valA - valB);
      }
      case "return1Y": {
        const valA = a.returns.return1Y ?? -999999;
        const valB = b.returns.return1Y ?? -999999;
        return modifier * (valA - valB);
      }
      case "return3Y": {
        const valA = a.returns.return3Y ?? -999999;
        const valB = b.returns.return3Y ?? -999999;
        return modifier * (valA - valB);
      }
      case "return5Y": {
        const valA = a.returns.return5Y ?? -999999;
        const valB = b.returns.return5Y ?? -999999;
        return modifier * (valA - valB);
      }
      case "drawdownPct":
        return modifier * (a.drawdownPct - b.drawdownPct);
      case "expenseRatio": {
        const valA = a.expenseRatio ?? 999999;
        const valB = b.expenseRatio ?? 999999;
        return modifier * (valA - valB);
      }
      case "aumCr": {
        const valA = a.aumCr ?? -999999;
        const valB = b.aumCr ?? -999999;
        return modifier * (valA - valB);
      }
      case "sharpe": {
        const valA = a.advancedRatios?.sharpe ?? -999999;
        const valB = b.advancedRatios?.sharpe ?? -999999;
        return modifier * (valA - valB);
      }
      default:
        return 0;
    }
  });
}

/**
 * Returns UI badge style classes for Lumpsum signals
 */
export function getLumpsumSignalBadgeClass(
  signal: WatchlistLumpsumSignal
): string {
  switch (signal) {
    case "DEEP_DIP":
      return "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/40 font-bold";
    case "CORRECTION":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm shadow-yellow-950/40 font-bold";
    case "NEAR_PEAK":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm shadow-yellow-950/40 font-bold";
    case "AT_ATH":
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold";
    default:
      return "bg-slate-800 text-slate-400 border border-slate-700";
  }
}

/**
 * Returns human-readable label for Lumpsum Dip Signals
 */
export function getLumpsumSignalLabel(
  signal: WatchlistLumpsumSignal,
  drawdownPct: number
): string {
  switch (signal) {
    case "DEEP_DIP":
      return `Deep Dip (-${drawdownPct.toFixed(1)}%)`;
    case "CORRECTION":
      return `Correction (-${drawdownPct.toFixed(1)}%)`;
    case "NEAR_PEAK":
      return `Near Peak (-${drawdownPct.toFixed(1)}%)`;
    case "AT_ATH":
      return "At ATH";
    default:
      return "Neutral";
  }
}

/**
 * Exports current filtered and sorted watchlist items to Excel
 */
export function exportWatchlistToExcel(items: WatchlistItem[]): void {
  const data = items.map((item, index) => ({
    "Sr. No.": index + 1,
    "AMFI Code": item.schemeCode,
    "Scheme Name": item.schemeName,
    Category: item.category || "—",
    "Fund House": item.fundHouse || "—",
    "Current NAV (₹)": item.currentNav,
    "1D Change (%)":
      item.oneDayChangePct !== null
        ? `${item.oneDayChangePct.toFixed(2)}%`
        : "—",
    "ATH NAV (₹)": item.athNav,
    "ATH Date": item.athDate || "—",
    "Drawdown from ATH (%)": `-${item.drawdownPct.toFixed(2)}%`,
    "Opportunity Signal": item.lumpsumSignal,
    "1M Return (%)":
      item.returns.return1M !== null
        ? `${item.returns.return1M.toFixed(2)}%`
        : "—",
    "6M Return (%)":
      item.returns.return6M !== null
        ? `${item.returns.return6M.toFixed(2)}%`
        : "—",
    "1Y Return (%)":
      item.returns.return1Y !== null
        ? `${item.returns.return1Y.toFixed(2)}%`
        : "—",
    "3Y Return (%)":
      item.returns.return3Y !== null
        ? `${item.returns.return3Y.toFixed(2)}%`
        : "—",
    "5Y Return (%)":
      item.returns.return5Y !== null
        ? `${item.returns.return5Y.toFixed(2)}%`
        : "—",
    "Since Inception (%)":
      item.returns.sinceInception !== null
        ? `${item.returns.sinceInception.toFixed(2)}%`
        : "—",
    "TER / Expense Ratio (%)":
      item.expenseRatio !== null ? `${item.expenseRatio.toFixed(2)}%` : "—",
    "AUM (₹ Cr)": item.aumCr !== null ? item.aumCr : "—",
    "Sharpe Ratio":
      item.advancedRatios?.sharpe !== null &&
      item.advancedRatios?.sharpe !== undefined
        ? item.advancedRatios.sharpe
        : "—",
    "Sortino Ratio":
      item.advancedRatios?.sortino !== null &&
      item.advancedRatios?.sortino !== undefined
        ? item.advancedRatios.sortino
        : "—",
    Alpha:
      item.advancedRatios?.alpha !== null &&
      item.advancedRatios?.alpha !== undefined
        ? item.advancedRatios.alpha
        : "—",
    Beta:
      item.advancedRatios?.beta !== null &&
      item.advancedRatios?.beta !== undefined
        ? item.advancedRatios.beta
        : "—",
    "P/E Ratio":
      item.advancedRatios?.peRatio !== null &&
      item.advancedRatios?.peRatio !== undefined
        ? item.advancedRatios.peRatio
        : "—",
    "P/B Ratio":
      item.advancedRatios?.pbRatio !== null &&
      item.advancedRatios?.pbRatio !== undefined
        ? item.advancedRatios.pbRatio
        : "—",
    "Large Cap (%)": item.marketCap ? `${item.marketCap.largeCap}%` : "—",
    "Mid Cap (%)": item.marketCap ? `${item.marketCap.midCap}%` : "—",
    "Small Cap (%)": item.marketCap ? `${item.marketCap.smallCap}%` : "—",
    "Equity Alloc (%)": item.assetAllocation
      ? `${item.assetAllocation.equity}%`
      : "—",
    "Debt Alloc (%)": item.assetAllocation
      ? `${item.assetAllocation.debt}%`
      : "—",
    "Cash Alloc (%)": item.assetAllocation
      ? `${item.assetAllocation.cash}%`
      : "—",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Watchlist");

  const fileName = `Mutual_Fund_Watchlist_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
