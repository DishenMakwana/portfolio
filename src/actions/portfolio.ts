"use server";

import { revalidatePath } from "next/cache";
import { parsePortfolioExcel } from "@/lib/parser";
import {
  saveReportSnapshot,
  getReports,
  getReportHoldings,
  getSchemes,
  updateSchemeCode,
  getSipMandates,
  saveSipMandates,
  clearSipMandates,
  deleteReport,
} from "@/lib/portfolioService";
import {
  calculateAlpha,
  getBenchmarkCodeForCategory,
  clearAllAlphaCaches,
} from "@/lib/alpha";
import {
  PortfolioTransaction,
  AutoMapResult,
  DashboardData,
  RawTransaction,
  ActionResult,
  BullionRatesResponse,
} from "@/types/portfolio";
import { clearAllZerodhaCaches } from "@/lib/zerodhaService";
import type { MfSearchResult } from "@/types/mf-api";
import { clearAllMsflCaches } from "@/lib/msflService";
import { searchMutualFund, autoMapScheme } from "@/lib/mfApi";
import { parseSipExcel } from "@/lib/sipParser";
import { getBullionData } from "@/lib/bullionService";
import { getAmcName, getSubCategory } from "@/helpers/allocation";
import { db } from "@/db/db";
import {
  transactions as txTable,
  reports,
  memberReportCagrs,
} from "@/db/schema";
import { eq, lte, inArray } from "drizzle-orm";

/**
 * Upload and parse Excel report
 */
export async function uploadReportAction(
  formData: FormData
): Promise<ActionResult<{ reportId?: number }>> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file uploaded" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parsePortfolioExcel(buffer);

    if (parsed.holdings.length === 0) {
      return {
        success: false,
        error: 'No valid holdings found in sheet "1. Mutual Fund"',
      };
    }

    // Check if snapshot with this date already exists to prevent duplicate uploads
    const existing = await db.query.reports.findFirst({
      where: eq(reports.asOfDate, parsed.asOfDate),
    });

    if (existing) {
      const formattedDate = new Date(parsed.asOfDate).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
      return {
        success: false,
        error: `Snapshot for ${formattedDate} already exists. Delete the existing snapshot first if you want to replace it.`,
      };
    }

    const reportId = await saveReportSnapshot(
      parsed.asOfDate,
      file.name,
      parsed.holdings,
      parsed.familyCagr,
      parsed.memberCagrs
    );

    revalidatePath("/");
    return { success: true, data: { reportId } };
  } catch (error: unknown) {
    console.error("Upload Action Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to parse file";
    return { success: false, error: errorMsg };
  }
}

/**
 * Delete a report snapshot
 */
export async function deleteReportAction(
  reportId: number
): Promise<ActionResult> {
  try {
    await deleteReport(reportId);
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete Action Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to delete report";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Search public mutual funds API
 */
export async function searchMfApiAction(
  query: string
): Promise<ActionResult<MfSearchResult[]>> {
  return await searchMutualFund(query);
}

/**
 * Update scheme API code mapping
 */
export async function updateSchemeMappingAction(
  schemeId: number,
  code: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateSchemeCode(schemeId, code);
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update mapping";
    return { success: false, error: errorMsg };
  }
}

/**
 * Auto-fetch and map ALL schemes using fuzzy name matching against api.mfapi.in
 * Returns a detailed per-scheme result including confidence scores and top matches.
 */
export async function autoMapAllSchemesAction(
  onlyUnmapped: boolean = true
): Promise<{ results: AutoMapResult[]; savedCount: number }> {
  const allSchemes = await getSchemes();

  const targets = onlyUnmapped
    ? allSchemes.filter((s) => !s.schemeCodeApi)
    : allSchemes;

  const results: AutoMapResult[] = [];
  let savedCount = 0;

  for (const scheme of targets) {
    // Skip if already mapped and we're only doing unmapped
    if (onlyUnmapped && scheme.schemeCodeApi) {
      results.push({
        schemeId: scheme.id,
        schemeName: scheme.name,
        status: "already_mapped",
        schemeCode: scheme.schemeCodeApi,
        confidence: null,
        topMatches: [],
      });
      continue;
    }

    try {
      // Build a clean search query from the scheme name
      const cleanName = scheme.name
        .replace(/Reg(?:ular)?/gi, "")
        .replace(/\(G\)/g, "Growth")
        .replace(/Growth/gi, "")
        .replace(/-+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const searchQuery = cleanName.slice(0, 35);
      const searchRes = await searchMutualFund(searchQuery);
      const searchResults = searchRes.data || [];

      if (!searchRes.success || searchResults.length === 0) {
        results.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          status: "not_found",
          schemeCode: null,
          confidence: null,
          topMatches: [],
        });
        continue;
      }

      const mapped = await autoMapScheme(scheme.name);

      const topMatches = searchResults.slice(0, 5).map((r) => ({
        schemeCode: r.schemeCode,
        schemeName: r.schemeName,
      }));

      if (!mapped) {
        results.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          status: "not_found",
          schemeCode: null,
          confidence: null,
          topMatches,
        });
        continue;
      }

      const confidencePct = Math.round(mapped.confidence * 100);
      // Auto-save if confidence is high enough (>=55%)
      if (confidencePct >= 55) {
        await updateSchemeCode(scheme.id, mapped.schemeCode);
        savedCount++;
        results.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          status: "mapped",
          schemeCode: mapped.schemeCode,
          confidence: confidencePct,
          topMatches,
        });
      } else {
        // Low confidence — surface matches to user but don't save
        results.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          status: "low_confidence",
          schemeCode: mapped.schemeCode,
          confidence: confidencePct,
          topMatches,
        });
      }
    } catch {
      results.push({
        schemeId: scheme.id,
        schemeName: scheme.name,
        status: "api_error",
        schemeCode: null,
        confidence: null,
        topMatches: [],
      });
    }
  }

  if (savedCount > 0) {
    revalidatePath("/");
  }

  return { results, savedCount };
}

/**
 * Fetch and calculate all dashboard metrics
 */
export async function getDashboardDataAction(
  reportId?: number
): Promise<DashboardData> {
  const reportsList = await getReports();
  if (reportsList.length === 0) {
    return {
      reportsList: [],
      selectedReport: null,
      totals: {
        invested: 0,
        currentValue: 0,
        gain: 0,
        absoluteReturn: 0,
        portfolioXirr: 0,
        benchmarkXirr: 0,
        alpha: 0,
        cagr: 0,
      },
      memberSummaries: [],
      holdings: [],
      categoryAllocation: [],
      capAllocation: [],
      amcAllocation: [],
      metricDeltas: {
        previousDate: null,
        portfolioXirr: null,
        benchmarkXirr: null,
        alpha: null,
        cagr: null,
      },
      timelineData: [],
    };
  }

  // Sort reports oldest to newest for previous-snapshot comparisons and timeline charts.
  const chronologicalReports = [...reportsList].sort(
    (a, b) => new Date(a.asOfDate).getTime() - new Date(b.asOfDate).getTime()
  );

  // Find selected report or use latest
  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0];
  const selectedReportIndex = chronologicalReports.findIndex(
    (r) => r.id === selectedReport.id
  );
  const previousReport =
    selectedReportIndex > 0
      ? chronologicalReports[selectedReportIndex - 1]
      : null;

  const holdings = await getReportHoldings(selectedReport.id);

  // Pre-fetch all member CAGRs for selected and previous reports to avoid N+1 queries in loop
  const reportIdsToCheck = [selectedReport.id];
  if (previousReport) {
    reportIdsToCheck.push(previousReport.id);
  }
  const allMemberCagrs = await db
    .select()
    .from(memberReportCagrs)
    .where(inArray(memberReportCagrs.reportId, reportIdsToCheck));
  const memberCagrMap = new Map<string, number>();
  allMemberCagrs.forEach((c) => {
    memberCagrMap.set(`${c.reportId}_${c.memberId}`, c.cagr);
  });

  // 1. Fetch transactions up to report date
  const txHistory = await db
    .select()
    .from(txTable)
    .where(lte(txTable.date, selectedReport.asOfDate));

  const getPortfolioTransactions = (
    filterFn?: (tx: RawTransaction) => boolean
  ): PortfolioTransaction[] => {
    return txHistory.filter(filterFn || (() => true)).map((tx) => ({
      date: tx.date,
      type: tx.type as "BUY" | "SELL",
      amount: tx.amount,
      units: tx.units,
    }));
  };

  // Calculate Overall Portfolio Metrics
  const overallTxs = getPortfolioTransactions();
  const overallValuation = holdings.reduce((acc, h) => acc + h.currentValue, 0);
  const overallInvested = holdings.reduce((acc, h) => acc + h.purchaseValue, 0);

  const { portfolioXirr, benchmarkXirr, alpha } = await calculateAlpha(
    overallTxs,
    selectedReport.asOfDate,
    overallValuation
  );

  const currentCagr =
    selectedReport.cagr !== undefined && selectedReport.cagr !== null
      ? selectedReport.cagr
      : holdings.length > 0
        ? holdings.reduce(
            (acc, h) => acc + (h.cagr || 0) * (h.purchaseValue || 0),
            0
          ) / (overallInvested || 1)
        : 0;

  let metricDeltas: DashboardData["metricDeltas"] = {
    previousDate: previousReport?.asOfDate || null,
    portfolioXirr: null,
    benchmarkXirr: null,
    alpha: null,
    cagr: null,
  };
  const previousMemberMetrics = new Map<
    string,
    { xirr: number; cagr: number; alpha: number }
  >();

  if (previousReport) {
    const previousHoldings = await getReportHoldings(previousReport.id);
    const previousValuation = previousHoldings.reduce(
      (acc, h) => acc + h.currentValue,
      0
    );
    const previousInvested = previousHoldings.reduce(
      (acc, h) => acc + h.purchaseValue,
      0
    );
    const previousTxs = getPortfolioTransactions(
      (tx) => tx.date <= previousReport.asOfDate
    );
    const previousAlphaMetrics = await calculateAlpha(
      previousTxs,
      previousReport.asOfDate,
      previousValuation
    );
    const previousCagr =
      previousReport.cagr !== undefined && previousReport.cagr !== null
        ? previousReport.cagr
        : previousHoldings.length > 0
          ? previousHoldings.reduce(
              (acc, h) => acc + (h.cagr || 0) * (h.purchaseValue || 0),
              0
            ) / (previousInvested || 1)
          : 0;

    metricDeltas = {
      previousDate: previousReport.asOfDate,
      portfolioXirr: portfolioXirr - previousAlphaMetrics.portfolioXirr,
      benchmarkXirr: benchmarkXirr - previousAlphaMetrics.benchmarkXirr,
      alpha: alpha - previousAlphaMetrics.alpha,
      cagr: currentCagr - previousCagr,
    };

    const previousMembers = Array.from(
      new Set(previousHoldings.map((h) => h.memberName))
    );
    await Promise.all(
      previousMembers.map(async (name) => {
        const memberHoldings = previousHoldings.filter(
          (h) => h.memberName === name
        );
        const invested = memberHoldings.reduce(
          (acc, h) => acc + h.purchaseValue,
          0
        );
        const currentValue = memberHoldings.reduce(
          (acc, h) => acc + h.currentValue,
          0
        );
        const storedMemberCagrVal =
          memberHoldings.length > 0
            ? memberCagrMap.get(
                `${previousReport.id}_${memberHoldings[0].memberId}`
              )
            : null;
        const cagr =
          storedMemberCagrVal !== undefined && storedMemberCagrVal !== null
            ? storedMemberCagrVal
            : memberHoldings.reduce(
                (acc, h) => acc + h.cagr * h.purchaseValue,
                0
              ) / (invested || 1);
        const memberTxs = getPortfolioTransactions((tx) => {
          const dbHolding = memberHoldings.find(
            (h) => h.schemeId === tx.schemeId
          );
          return (
            !!dbHolding &&
            tx.memberId === dbHolding.memberId &&
            tx.date <= previousReport.asOfDate
          );
        });
        let xirr = cagr;
        let alpha = 0;
        if (memberTxs.length >= 1) {
          const metrics = await calculateAlpha(
            memberTxs,
            previousReport.asOfDate,
            currentValue
          );
          xirr = metrics.portfolioXirr;
          alpha = metrics.alpha;
        }

        previousMemberMetrics.set(name, { xirr, cagr, alpha });
      })
    );
  }

  // 2. Calculate Family Member Summaries in parallel
  const members = Array.from(new Set(holdings.map((h) => h.memberName)));
  const memberSummaries = await Promise.all(
    members.map(async (name) => {
      const memberHoldings = holdings.filter((h) => h.memberName === name);
      const invested = memberHoldings.reduce(
        (acc, h) => acc + h.purchaseValue,
        0
      );
      const currentValue = memberHoldings.reduce(
        (acc, h) => acc + h.currentValue,
        0
      );
      const gain = currentValue - invested;

      const storedMemberCagrVal =
        memberHoldings.length > 0
          ? memberCagrMap.get(
              `${selectedReport.id}_${memberHoldings[0].memberId}`
            )
          : null;

      const cagr =
        storedMemberCagrVal !== undefined && storedMemberCagrVal !== null
          ? storedMemberCagrVal
          : memberHoldings.reduce(
              (acc, h) => acc + h.cagr * h.purchaseValue,
              0
            ) / (invested || 1);

      // Calculate Member XIRR
      const memberTxs = getPortfolioTransactions((tx) => {
        const dbHolding = memberHoldings.find(
          (h) => h.schemeId === tx.schemeId
        );
        return !!dbHolding && tx.memberId === dbHolding.memberId;
      });

      let mXirr = cagr;
      let mAlpha = 0;
      if (memberTxs.length >= 1) {
        const memberMetrics = await calculateAlpha(
          memberTxs,
          selectedReport.asOfDate,
          currentValue
        );
        mXirr = memberMetrics.portfolioXirr;
        mAlpha = memberMetrics.alpha;
      }

      const pan = memberHoldings[0]?.memberPan || null;
      const previousMember = previousMemberMetrics.get(name);

      return {
        name,
        pan,
        invested,
        currentValue,
        gain,
        cagr,
        xirr: mXirr,
        alpha: mAlpha,
        cagrDelta: previousMember ? cagr - previousMember.cagr : null,
        xirrDelta: previousMember ? mXirr - previousMember.xirr : null,
        alphaDelta: previousMember ? mAlpha - previousMember.alpha : null,
      };
    })
  );

  // 3. Scheme level XIRR in parallel
  const detailedHoldings = await Promise.all(
    holdings.map(async (h) => {
      const schemeTxs = getPortfolioTransactions(
        (tx) =>
          tx.schemeId === h.schemeId &&
          tx.memberId === h.memberId &&
          tx.folioNo === h.folioNo
      );

      let schemeXirr = h.cagr;
      let schemeAlpha = 0;

      if (schemeTxs.length >= 1) {
        const benchmarkCode = await getBenchmarkCodeForCategory(
          h.category,
          h.schemeName
        );
        const metrics = await calculateAlpha(
          schemeTxs,
          selectedReport.asOfDate,
          h.currentValue,
          benchmarkCode
        );
        schemeXirr = metrics.portfolioXirr;
        schemeAlpha = metrics.alpha;
      }

      return {
        ...h,
        xirr: schemeXirr,
        alpha: schemeAlpha,
      };
    })
  );

  // 4. Asset Allocations
  const categoryMap = new Map<string, number>();
  const capMap = new Map<string, number>();
  const amcMap = new Map<string, number>();

  for (const h of holdings) {
    // Category allocation
    categoryMap.set(
      h.category,
      (categoryMap.get(h.category) || 0) + h.currentValue
    );

    // Cap Allocation (Sub Category)
    const capCat = getSubCategory(h.schemeName, h.category);
    capMap.set(capCat, (capMap.get(capCat) || 0) + h.currentValue);

    // AMC allocation
    const amcName = getAmcName(h.schemeName);
    amcMap.set(amcName, (amcMap.get(amcName) || 0) + h.currentValue);
  }

  const categoryAllocation = Array.from(categoryMap.entries()).map(
    ([name, value]) => ({ name, value })
  );
  const capAllocation = Array.from(capMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));
  const amcAllocation = Array.from(amcMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 5. Timeline data (invested vs value over time)
  // Retrieve total valuation for each report
  const timelineData = [];
  const latestTimelineDate =
    chronologicalReports[chronologicalReports.length - 1]?.asOfDate ||
    selectedReport.asOfDate;
  const timelineTxHistory = await db
    .select()
    .from(txTable)
    .where(lte(txTable.date, latestTimelineDate));

  for (const r of chronologicalReports) {
    const snapHoldings = await getReportHoldings(r.id);
    const snapInvested = snapHoldings.reduce(
      (acc, h) => acc + h.purchaseValue,
      0
    );
    const snapValue = snapHoldings.reduce((acc, h) => acc + h.currentValue, 0);
    const snapCagr =
      r.cagr !== undefined && r.cagr !== null
        ? r.cagr
        : snapHoldings.length > 0
          ? snapHoldings.reduce(
              (acc, h) => acc + (h.cagr || 0) * (h.purchaseValue || 0),
              0
            ) / (snapInvested || 1)
          : 0;
    const snapTxs: PortfolioTransaction[] = timelineTxHistory
      .filter((tx) => tx.date <= r.asOfDate)
      .map((tx) => ({
        date: tx.date,
        type: tx.type as "BUY" | "SELL",
        amount: tx.amount,
        units: tx.units,
      }));
    const snapAlpha = await calculateAlpha(snapTxs, r.asOfDate, snapValue);

    const formattedDate = new Date(r.asOfDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    timelineData.push({
      date: formattedDate,
      invested: snapInvested,
      value: snapValue,
      portfolioXirr: snapAlpha.portfolioXirr,
      benchmarkXirr: snapAlpha.benchmarkXirr,
      alpha: snapAlpha.alpha,
      cagr: snapCagr,
    });
  }

  return {
    reportsList,
    selectedReport,
    totals: {
      invested: overallInvested,
      currentValue: overallValuation,
      gain: overallValuation - overallInvested,
      absoluteReturn:
        overallInvested > 0
          ? ((overallValuation - overallInvested) / overallInvested) * 100
          : 0,
      portfolioXirr,
      benchmarkXirr,
      alpha,
      cagr: selectedReport.cagr || null,
    },
    memberSummaries,
    holdings: detailedHoldings,
    categoryAllocation,
    capAllocation,
    amcAllocation,
    metricDeltas,
    timelineData,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIP MANDATE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload and parse a "My SIP's" Excel file, save mandates to DB.
 */
export async function uploadSipAction(
  formData: FormData
): Promise<
  ActionResult<{ inserted?: number; skipped?: number; total?: number }>
> {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file uploaded" };

    const buffer = Buffer.from(await file.arrayBuffer());

    const parsed = parseSipExcel(buffer, file.name);

    if (parsed.sips.length === 0) {
      return {
        success: false,
        error: "No SIP rows found in the uploaded file",
      };
    }

    const { inserted, skipped } = await saveSipMandates(parsed.sips, file.name);

    revalidatePath("/sips");
    return {
      success: true,
      data: { inserted, skipped, total: parsed.sips.length },
    };
  } catch (err: unknown) {
    console.error("SIP Upload Error:", err);
    const errorMsg =
      err instanceof Error ? err.message : "Failed to parse SIP file";
    return { success: false, error: errorMsg };
  }
}

/**
 * Get all SIP mandates for the /sips page
 */
export async function getSipMandatesAction() {
  return getSipMandates();
}

/**
 * Clear all SIP mandates (full reset)
 */
export async function clearSipMandatesAction(): Promise<ActionResult> {
  try {
    await clearSipMandates();
    revalidatePath("/sips");
    return { success: true };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to clear SIP mandates";
    return { success: false, error: errorMsg };
  }
}

/**
 * Fetch fresh live rates and chart data by bypassing the in-memory cache
 */
export async function refreshBullionDataAction(): Promise<
  ActionResult<BullionRatesResponse>
> {
  try {
    return await getBullionData(true);
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to refresh bullion rates";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Force clear all in-memory caches for NAVs, stocks, and benchmarks
 */
export async function globalRefreshAction(): Promise<ActionResult> {
  try {
    // 1. Clear in-memory caches
    clearAllAlphaCaches();
    clearAllZerodhaCaches();
    clearAllMsflCaches();

    // 3. Purge Next.js page cache
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: unknown) {
    console.error("globalRefreshAction Error:", err);
    const errorMsg =
      err instanceof Error ? err.message : "Global refresh failed";
    return { success: false, error: errorMsg };
  }
}
