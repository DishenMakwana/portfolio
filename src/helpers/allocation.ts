import type {
  AmcPoint,
  AllocationAnalysisGroup,
  AllocationAnalysisSortKey,
} from "@/types/insights";
import { AssetAllocation } from "@/types/portfolio";

/**
 * Normalizes mutual fund scheme names to their corresponding standard AMC names.
 */
export function getAmcName(name: string): string {
  const n = name.trim();
  if (/^aditya birla/i.test(n)) return "Aditya Birla Sun Life Mutual Fund";
  if (/^axis/i.test(n)) return "Axis Mutual Fund";
  if (/^bajaj/i.test(n)) return "Bajaj Finserv Mutual Fund";
  if (/^bandhan/i.test(n)) return "Bandhan Mutual Fund";
  if (/^canara/i.test(n)) return "Canara Robeco Mutual Fund";
  if (/^dsp/i.test(n)) return "DSP Mutual Fund";
  if (/^edelweiss/i.test(n)) return "Edelweiss Mutual Fund";
  if (/^franklin/i.test(n)) return "Franklin Templeton Mutual Fund";
  if (/^hdfc/i.test(n)) return "HDFC Mutual Fund";
  if (/^hsbc/i.test(n)) return "HSBC Mutual Fund";
  if (/^icici pru/i.test(n)) return "ICICI Prudential Mutual Fund";
  if (/^invesco/i.test(n)) return "Invesco Mutual Fund";
  if (/^kotak/i.test(n)) return "Kotak Mutual Fund";
  if (/^lic/i.test(n)) return "LIC Mutual Fund";
  if (/^mirae/i.test(n)) return "Mirae Asset Mutual Fund";
  if (/^motilal/i.test(n)) return "Motilal Oswal Mutual Fund";
  if (/^nippon/i.test(n)) return "Nippon India Mutual Fund";
  if (/^pgim/i.test(n)) return "PGIM India Mutual Fund";
  if (/^ppfas/i.test(n) || /parag parikh/i.test(n)) return "PPFAS Mutual Fund";
  if (/^quant/i.test(n)) return "Quant Mutual Fund";
  if (/^sbi/i.test(n)) return "SBI Mutual Fund";
  if (/^sundaram/i.test(n)) return "Sundaram Mutual Fund";
  if (/^tata/i.test(n)) return "Tata Mutual Fund";
  if (/^uti/i.test(n)) return "UTI Mutual Fund";
  if (/^whiteoak/i.test(n) || /white oak/i.test(n))
    return "WhiteOak Capital Mutual Fund";
  return n.split(" ")[0] + " Mutual Fund";
}

/**
 * Map raw allocation groups to complete AMC allocation data points.
 */
export function mapAllocationAnalysisGroups(
  groups: AllocationAnalysisGroup[],
  totalCurrent: number
): AmcPoint[] {
  return groups
    .map((group) => {
      const cagr =
        group.totalCagrWeight > 0
          ? group.weightedCagrSum / group.totalCagrWeight
          : 0;
      const avgHoldingDays =
        group.totalHoldingDaysWeight > 0
          ? group.weightedHoldingDaysSum / group.totalHoldingDaysWeight
          : 0;
      const weight =
        totalCurrent > 0 ? (group.current / totalCurrent) * 100 : 0;
      const xirr =
        group.invested > 0 && avgHoldingDays > 0
          ? (Math.pow(group.current / group.invested, 365.25 / avgHoldingDays) -
              1) *
            100
          : 0;

      return {
        name: group.name,
        invested: group.invested,
        current: group.current,
        gain: group.gain,
        cagr,
        avgHoldingDays,
        weight,
        xirr,
      };
    })
    .sort((a, b) => b.current - a.current);
}

/**
 * Sorts AMC / category points by a specific column key and direction.
 */
export function sortAllocationAnalysisData(
  analysisData: AmcPoint[],
  sortKey: AllocationAnalysisSortKey,
  sortDir: "asc" | "desc"
): AmcPoint[] {
  return [...analysisData].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];

    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }

    return sortDir === "asc"
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });
}

/**
 * Computes future value of a growing annuity (used for SIP projections with step-up).
 */
export function futureValueGrowingAnnuity(
  pmt: number,
  annualCagr: number,
  growthRate: number,
  years: number
): number {
  const r = annualCagr / 12 / 100;
  const g = growthRate / 12 / 100;
  const n = years * 12;
  if (Math.abs(r - g) < 1e-10) return pmt * n * Math.pow(1 + r, n);
  return pmt * ((Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g));
}

/**
 * Categorizes a mutual fund scheme into standard asset/purity classes based on name and category strings.
 */
export function getSubCategory(name: string, category: string): string {
  const n = name.toLowerCase();
  const cat = (category || "").toLowerCase();
  if (
    cat.includes("debt") ||
    n.includes("debt") ||
    n.includes("bond") ||
    n.includes("liquid") ||
    n.includes("gilt") ||
    n.includes("overnight") ||
    n.includes("credit risk")
  )
    return "Debt";
  if (n.includes("multi asset") || n.includes("multi-asset"))
    return "Hybrid: Multi Asset";
  if (n.includes("balanced advantage") || n.includes("dynamic asset"))
    return "Hybrid: Balanced Advantage";
  if (n.includes("aggressive hybrid") || n.includes("equity & debt"))
    return "Hybrid: Aggressive";
  if (n.includes("hybrid") || n.includes("conservative hybrid"))
    return "Hybrid";
  if (n.includes("long short") || n.includes("long-short"))
    return cat.includes("equity") ? "SIF: Equity LS" : "SIF: Hybrid LS";
  if (n.includes("flexi cap") || n.includes("flexicap"))
    return "Equity: Flexi Cap";
  if (
    n.includes("large & mid") ||
    n.includes("large and mid") ||
    n.includes("large & mid cap")
  )
    return "Equity: Large & Mid Cap";
  if (n.includes("multi cap") || n.includes("multicap"))
    return "Equity: Multi Cap";
  if (n.includes("mid small") || n.includes("mid & small"))
    return "Equity: Mid Small Cap";
  if (n.includes("mid cap") || n.includes("midcap")) return "Equity: Mid Cap";
  if (n.includes("small cap") || n.includes("smallcap"))
    return "Equity: Small Cap";
  if (
    n.includes("large cap") ||
    n.includes("largecap") ||
    n.includes("bluechip")
  )
    return "Equity: Large Cap";
  if (n.includes("focused")) return "Equity: Focused";
  if (n.includes("elss") || n.includes("tax saver") || n.includes("tax saving"))
    return "Equity: ELSS";
  if (
    n.includes("thematic") ||
    n.includes("opportunities") ||
    n.includes("india opp")
  )
    return "Equity: Thematic";
  if (n.includes("sectoral") || n.includes("sector")) return "Equity: Sectoral";
  if (n.includes("gold") || n.includes("precious")) return "Gold";
  if (
    n.includes("international") ||
    n.includes("global") ||
    n.includes("nasdaq") ||
    n.includes("us ")
  )
    return "Global Equity";
  if (cat.includes("equity") || n.includes("equity")) return "Equity";
  return "Other";
}

export function getCapRatios(subCat: string): {
  large: number;
  mid: number;
  small: number;
} {
  switch (subCat) {
    case "Equity: Large Cap":
      return { large: 1.0, mid: 0.0, small: 0.0 };
    case "Equity: Mid Cap":
      return { large: 0.0, mid: 0.85, small: 0.15 };
    case "Equity: Small Cap":
      return { large: 0.0, mid: 0.15, small: 0.85 };
    case "Equity: Large & Mid Cap":
      return { large: 0.55, mid: 0.4, small: 0.05 };
    case "Equity: Flexi Cap":
      return { large: 0.45, mid: 0.35, small: 0.2 };
    case "Equity: Multi Cap":
      return { large: 0.33, mid: 0.34, small: 0.33 };
    case "Equity: Mid Small Cap":
      return { large: 0.05, mid: 0.55, small: 0.4 };
    case "Equity: Focused":
      return { large: 0.65, mid: 0.25, small: 0.1 };
    case "Equity: ELSS":
      return { large: 0.55, mid: 0.3, small: 0.15 };
    case "Equity: Thematic":
      return { large: 0.5, mid: 0.35, small: 0.15 };
    case "Equity: Sectoral":
      return { large: 0.6, mid: 0.3, small: 0.1 };
    case "Equity":
      return { large: 0.4, mid: 0.35, small: 0.25 };
    case "Hybrid: Aggressive":
      return { large: 0.5, mid: 0.3, small: 0.15 };
    case "Hybrid: Multi Asset":
      return { large: 0.3, mid: 0.2, small: 0.1 };
    case "SIF: Equity LS":
      return { large: 0.3, mid: 0.4, small: 0.3 };
    case "SIF: Hybrid LS":
      return { large: 0.2, mid: 0.3, small: 0.2 };
    default:
      return { large: 0.0, mid: 0.0, small: 0.0 };
  }
}

export function getAssetRatios(subCat: string): AssetAllocation {
  if (subCat === "Debt")
    return { debt: 1, equity: 0, globalEquity: 0, gold: 0, other: 0 };
  if (subCat === "Gold")
    return { debt: 0, equity: 0, globalEquity: 0, gold: 1, other: 0 };
  if (subCat === "Global Equity")
    return { debt: 0, equity: 0, globalEquity: 1, gold: 0, other: 0 };
  if (subCat === "Hybrid: Balanced Advantage")
    return { debt: 0.45, equity: 0.5, globalEquity: 0, gold: 0, other: 0.05 };
  if (subCat === "Hybrid: Aggressive")
    return { debt: 0.22, equity: 0.75, globalEquity: 0, gold: 0, other: 0.03 };
  if (subCat === "Hybrid: Multi Asset")
    return {
      debt: 0.15,
      equity: 0.6,
      globalEquity: 0.05,
      gold: 0.15,
      other: 0.05,
    };
  if (subCat === "Hybrid")
    return { debt: 0.35, equity: 0.6, globalEquity: 0, gold: 0, other: 0.05 };
  if (subCat === "SIF: Hybrid LS")
    return { debt: 0.3, equity: 0.6, globalEquity: 0, gold: 0, other: 0.1 };
  if (subCat.startsWith("Equity") || subCat === "SIF: Equity LS")
    return { debt: 0, equity: 1, globalEquity: 0, gold: 0, other: 0 };
  return { debt: 0, equity: 0.8, globalEquity: 0, gold: 0, other: 0.2 };
}

/**
 * Categorizes a mutual fund scheme into standard sub-categories specifically for overlap analysis.
 */
export function getOverlapSubCategory(name: string, category: string): string {
  const nameLower = name.toLowerCase();
  const catLower = (category || "").toLowerCase();

  if (
    catLower.includes("ulip") ||
    catLower.includes("insurance") ||
    nameLower.includes("ulis") ||
    nameLower.includes("ulip") ||
    nameLower.includes("unit linked")
  ) {
    return "ULIP / Insurance-Linked";
  } else if (catLower.includes("multi asset")) {
    return "Multi Asset Allocation";
  } else if (catLower.includes("aggressive hybrid")) {
    return "Aggressive Hybrid";
  } else if (
    catLower.includes("large & mid") ||
    catLower.includes("large and mid") ||
    nameLower.includes("large & mid") ||
    nameLower.includes("large and mid")
  ) {
    return "Large & Mid Cap";
  } else if (
    catLower.includes("mid cap") ||
    catLower.includes("midcap") ||
    nameLower.includes("mid cap") ||
    nameLower.includes("midcap")
  ) {
    return "Mid Cap";
  } else if (catLower.includes("flexi") || nameLower.includes("flexi")) {
    return "Flexi Cap";
  } else if (
    catLower.includes("multi cap") ||
    catLower.includes("multicap") ||
    nameLower.includes("multi cap") ||
    nameLower.includes("multicap")
  ) {
    return "Multi Cap";
  } else if (catLower.includes("focused") || nameLower.includes("focused")) {
    return "Focused Equity";
  } else if (
    catLower.includes("thematic") ||
    catLower.includes("opportunity") ||
    catLower.includes("opportunities") ||
    nameLower.includes("opportunities") ||
    nameLower.includes("opportunity") ||
    nameLower.includes("thematic")
  ) {
    return "Thematic / Opportunities";
  } else if (
    catLower.includes("long-short") ||
    catLower.includes("aif") ||
    nameLower.includes("long-short") ||
    nameLower.includes("long short")
  ) {
    return "Specialized Investment Fund - SIF";
  } else if (catLower.includes("large") || nameLower.includes("large cap")) {
    return "Large Cap";
  } else if (catLower.includes("small") || nameLower.includes("smallcap")) {
    return "Small Cap";
  } else if (catLower.includes("debt") || catLower.includes("liquid")) {
    return "Debt & Liquid";
  } else if (
    catLower.includes("hybrid") ||
    catLower.includes("balanced") ||
    catLower.includes("alloc")
  ) {
    return "Hybrid & Multi Asset";
  }

  return "Other Equity";
}
