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
  isBuyTransactionType,
  isSellTransactionType,
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
import { getAmcName } from "@/helpers/allocation";
import { getFyTrackerData } from "@/lib/insightsService";
import { db } from "@/db/db";
import {
  transactions as txTable,
  reports,
  memberReportCagrs,
  familyMembers,
  schemes,
} from "@/db/schema";
import { eq, lte, inArray, desc } from "drizzle-orm";

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
        error:
          "No valid holdings found. Please ensure the uploaded sheet is a valid Mutual Fund Valuation report containing the '1. Mutual Fund' tab.",
      };
    }

    // Check if snapshot with this date already exists to prevent duplicate uploads
    const existing = await db.query.reports.findFirst({
      columns: { id: true },
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
        currentValueDiff: null,
        investedDiff: null,
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

  // Pre-fetch all member CAGRs for selected and previous reports to avoid N+1 queries in loop
  const reportIdsToCheck = [selectedReport.id];
  if (previousReport) {
    reportIdsToCheck.push(previousReport.id);
  }

  // Run DB queries in parallel for optimal render performance
  const [
    holdings,
    allMemberCagrs,
    txHistory,
    previousHoldings,
    dbMembers,
    allDBSchemes,
  ] = await Promise.all([
    getReportHoldings(selectedReport.id),
    db
      .select({
        reportId: memberReportCagrs.reportId,
        memberId: memberReportCagrs.memberId,
        cagr: memberReportCagrs.cagr,
      })
      .from(memberReportCagrs)
      .where(inArray(memberReportCagrs.reportId, reportIdsToCheck)),
    db
      .select({
        id: txTable.id,
        memberId: txTable.memberId,
        schemeId: txTable.schemeId,
        folioNo: txTable.folioNo,
        date: txTable.date,
        type: txTable.type,
        transactionType: txTable.transactionType,
        units: txTable.units,
        nav: txTable.nav,
        amount: txTable.amount,
        sourceReportId: txTable.sourceReportId,
      })
      .from(txTable)
      .where(lte(txTable.date, selectedReport.asOfDate))
      .orderBy(desc(txTable.date), desc(txTable.id)),
    previousReport ? getReportHoldings(previousReport.id) : Promise.resolve([]),
    db
      .select({
        id: familyMembers.id,
        name: familyMembers.name,
        pan: familyMembers.pan,
        address: familyMembers.address,
        email: familyMembers.email,
        mobile: familyMembers.mobile,
        dematNominee: familyMembers.dematNominee,
        dpId: familyMembers.dpId,
        clientId: familyMembers.clientId,
        dpName: familyMembers.dpName,
        boSubStatus: familyMembers.boSubStatus,
        bsda: familyMembers.bsda,
        rgess: familyMembers.rgess,
        accountStatus: familyMembers.accountStatus,
        frozenStatus: familyMembers.frozenStatus,
        boStatus: familyMembers.boStatus,
        nsdlId: familyMembers.nsdlId,
        dob: familyMembers.dob,
        aadhaarStatus: familyMembers.aadhaarStatus,
        linkedBankName: familyMembers.linkedBankName,
        linkedBankIfsc: familyMembers.linkedBankIfsc,
        linkedBankAccountNo: familyMembers.linkedBankAccountNo,
      })
      .from(familyMembers),
    db.select({ name: schemes.name, category: schemes.category }).from(schemes),
  ]);

  const memberCagrMap = new Map<string, number>();
  allMemberCagrs.forEach((c) => {
    memberCagrMap.set(`${c.reportId}_${c.memberId}`, c.cagr);
  });

  const getPortfolioTransactions = (
    filterFn?: (
      tx: RawTransaction & {
        memberId?: number | null;
        schemeId?: number | null;
        transactionType?: string | null;
      }
    ) => boolean
  ): PortfolioTransaction[] => {
    return txHistory.filter(filterFn || (() => true)).map((tx) => ({
      date: tx.date,
      type: (tx.type || "BUY") as "BUY" | "SELL",
      transactionType: tx.transactionType || tx.type || undefined,
      amount: tx.amount,
      units: tx.units,
      memberId: tx.memberId ?? undefined,
      schemeId: tx.schemeId ?? undefined,
    }));
  };

  // Calculate Active Holdings for portfolio-wide totals
  const activeHoldings = holdings.filter(
    (h) => (h.balanceUnits ?? 0) > 0.0001 || (h.currentValue ?? 0) > 0
  );
  const activePreviousHoldings = previousHoldings.filter(
    (h) => (h.balanceUnits ?? 0) > 0.0001 || (h.currentValue ?? 0) > 0
  );

  // Calculate Overall Portfolio Metrics
  // XIRR methodology: Include SWITCH IN/OUT (real value transfers between funds),
  // exclude only STP (Systematic Transfer In/Out — these are pure internal rollovers that roughly cancel each other)
  const overallTxs = getPortfolioTransactions((tx) => {
    const tType = (tx.transactionType || tx.type || "").toUpperCase().trim();
    // Exclude Systematic Transfers (STP) — they are internal rollovers
    if (tType.startsWith("SYSTEMATIC TRANSFER") || tType.startsWith("STP"))
      return false;
    return isBuyTransactionType(tType) || isSellTransactionType(tType);
  });
  const overallValuation = activeHoldings.reduce(
    (acc, h) => acc + h.currentValue,
    0
  );
  const overallInvested = activeHoldings.reduce(
    (acc, h) => acc + h.purchaseValue,
    0
  );

  const previousValuation = activePreviousHoldings.reduce(
    (acc, h) => acc + h.currentValue,
    0
  );
  const previousInvested = activePreviousHoldings.reduce(
    (acc, h) => acc + h.purchaseValue,
    0
  );
  const previousTxs = previousReport
    ? getPortfolioTransactions((tx) => tx.date <= previousReport.asOfDate)
    : [];

  // 1. Calculate Scheme level XIRR in parallel
  const detailedHoldings = await Promise.all(
    holdings.map(async (h) => {
      let schemeTxs = getPortfolioTransactions(
        (tx) =>
          tx.schemeId === h.schemeId &&
          tx.memberId === h.memberId &&
          (!!h.folioNo && !!tx.folioNo
            ? tx.folioNo === h.folioNo || h.folioNo.includes(tx.folioNo)
            : true)
      );

      if (schemeTxs.length === 0) {
        schemeTxs = getPortfolioTransactions(
          (tx) => tx.schemeId === h.schemeId && tx.memberId === h.memberId
        );
      }

      let schemeXirr = h.cagr || 0;
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
        if (metrics.portfolioXirr !== 0 && !isNaN(metrics.portfolioXirr)) {
          schemeXirr = metrics.portfolioXirr;
          schemeAlpha = metrics.alpha;
        }
      }

      return {
        ...h,
        xirr: schemeXirr,
        alpha: schemeAlpha,
      };
    })
  );

  // Run overall & previous alpha calculations in parallel
  const [alphaMetrics, previousAlphaMetrics] = await Promise.all([
    calculateAlpha(overallTxs, selectedReport.asOfDate, overallValuation),
    previousReport
      ? calculateAlpha(previousTxs, previousReport.asOfDate, previousValuation)
      : Promise.resolve({ portfolioXirr: 0, benchmarkXirr: 0, alpha: 0 }),
  ]);

  // Overall Portfolio XIRR is always computed from transaction cashflows
  // (selectedReport.cagr is CAGR from valuation file, not XIRR — do NOT use it for portfolioXirr)
  const portfolioXirr = alphaMetrics.portfolioXirr;

  const benchmarkXirr = alphaMetrics.benchmarkXirr;
  const alpha = alphaMetrics.alpha;

  const currentCagr =
    selectedReport.cagr !== undefined && selectedReport.cagr !== null
      ? selectedReport.cagr
      : activeHoldings.length > 0
        ? activeHoldings.reduce(
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
    currentValueDiff: null,
    investedDiff: null,
  };
  const previousMemberMetrics = new Map<
    string,
    {
      xirr: number;
      cagr: number;
      alpha: number;
      invested: number;
      currentValue: number;
    }
  >();

  if (previousReport) {
    const previousCagr =
      previousReport.cagr !== undefined && previousReport.cagr !== null
        ? previousReport.cagr
        : activePreviousHoldings.length > 0
          ? activePreviousHoldings.reduce(
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
      currentValueDiff: overallValuation - previousValuation,
      investedDiff: overallInvested - previousInvested,
    };

    const previousMembers = Array.from(
      new Set(previousHoldings.map((h) => h.memberName))
    );
    await Promise.all(
      previousMembers.map(async (name) => {
        const allMemberHoldings = previousHoldings.filter(
          (h) => h.memberName === name
        );
        const memberHoldings = allMemberHoldings.filter(
          (h) => (h.balanceUnits ?? 0) > 0.0001 || (h.currentValue ?? 0) > 0
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
          allMemberHoldings.length > 0
            ? memberCagrMap.get(
                `${previousReport.id}_${allMemberHoldings[0].memberId}`
              )
            : null;
        const activeMemberHoldings = memberHoldings.filter(
          (h) => (h.balanceUnits ?? 0) > 0.0001 && h.currentValue > 0
        );
        const isMemberActive =
          activeMemberHoldings.length > 0 && currentValue > 0;

        const cagr = isMemberActive
          ? storedMemberCagrVal !== undefined && storedMemberCagrVal !== null
            ? storedMemberCagrVal
            : memberHoldings.reduce(
                (acc, h) => acc + h.cagr * h.purchaseValue,
                0
              ) / (invested || 1)
          : 0;

        const memberTxs = getPortfolioTransactions((tx) => {
          const tType = (tx.transactionType || tx.type || "")
            .toUpperCase()
            .trim();
          // Exclude Systematic Transfers (STP) only \u2014 keep SWITCH IN/OUT
          if (
            tType.startsWith("SYSTEMATIC TRANSFER") ||
            tType.startsWith("STP")
          )
            return false;
          const dbHolding = memberHoldings.find(
            (h) => h.schemeId === tx.schemeId
          );
          return (
            !!dbHolding &&
            tx.memberId === dbHolding.memberId &&
            tx.date <= previousReport.asOfDate
          );
        });
        let xirr = 0;
        let alpha = 0;
        if (isMemberActive && memberTxs.length >= 1) {
          const metrics = await calculateAlpha(
            memberTxs,
            previousReport.asOfDate,
            currentValue
          );
          xirr = metrics.portfolioXirr;
          alpha = metrics.alpha;
        }

        previousMemberMetrics.set(name, {
          xirr,
          cagr,
          alpha,
          invested,
          currentValue,
        });
        if (memberHoldings[0]?.memberId) {
          previousMemberMetrics.set(`id_${memberHoldings[0].memberId}`, {
            xirr,
            cagr,
            alpha,
            invested,
            currentValue,
          });
        }
      })
    );
  }

  // 2. Calculate Family Member Summaries in parallel
  const dbMembersMap = new Map<string, (typeof dbMembers)[number]>();
  dbMembers.forEach((m) => {
    dbMembersMap.set(m.name, m);
  });

  const members = Array.from(new Set(holdings.map((h) => h.memberName)));
  const memberSummaries = await Promise.all(
    members.map(async (name) => {
      const allMemberHoldings = holdings.filter((h) => h.memberName === name);
      const memberHoldings = allMemberHoldings.filter(
        (h) => (h.balanceUnits ?? 0) > 0.0001 || (h.currentValue ?? 0) > 0
      );
      const invested = memberHoldings.reduce(
        (acc, h) => acc + h.purchaseValue,
        0
      );
      const currentValue = memberHoldings.reduce(
        (acc, h) => acc + h.currentValue,
        0
      );
      const gain = currentValue - invested;

      const activeMemberHoldings = memberHoldings.filter(
        (h) => (h.balanceUnits ?? 0) > 0.0001 && h.currentValue > 0
      );
      const isMemberActive =
        activeMemberHoldings.length > 0 && currentValue > 0;

      const storedMemberCagrVal =
        allMemberHoldings.length > 0
          ? memberCagrMap.get(
              `${selectedReport.id}_${allMemberHoldings[0].memberId}`
            )
          : null;

      const cagr = isMemberActive
        ? storedMemberCagrVal !== undefined && storedMemberCagrVal !== null
          ? storedMemberCagrVal
          : memberHoldings.reduce(
              (acc, h) => acc + h.cagr * h.purchaseValue,
              0
            ) / (invested || 1)
        : 0;

      // Calculate Member XIRR with exact tolerance matching (prefer transaction XIRR when within +-0.05%, fallback to stored report XIRR)
      let mXirr = 0;
      let mAlpha = 0;

      const pan = allMemberHoldings[0]?.memberPan || null;
      const memberId = allMemberHoldings[0]?.memberId;
      const profile = dbMembersMap.get(name);
      const targetMemberId = memberId || profile?.id;

      // Member XIRR: Include SWITCH IN/OUT (real value transfers), exclude STP (internal rollovers)
      const pureMemberTxs = getPortfolioTransactions((tx) => {
        if (targetMemberId && tx.memberId !== targetMemberId) return false;
        const tType = (tx.transactionType || tx.type || "")
          .toUpperCase()
          .trim();
        // Exclude Systematic Transfers (STP) only
        if (tType.startsWith("SYSTEMATIC TRANSFER") || tType.startsWith("STP"))
          return false;
        return isBuyTransactionType(tType) || isSellTransactionType(tType);
      });

      if (pureMemberTxs.length >= 1) {
        const memberMetrics = await calculateAlpha(
          pureMemberTxs,
          selectedReport.asOfDate,
          currentValue
        );
        mXirr = memberMetrics.portfolioXirr;
        mAlpha = memberMetrics.alpha;
      }

      if (mXirr === 0) {
        if (
          storedMemberCagrVal !== undefined &&
          storedMemberCagrVal !== null &&
          storedMemberCagrVal > 0
        ) {
          mXirr = storedMemberCagrVal;
        }
      }

      const previousMember =
        (memberId ? previousMemberMetrics.get(`id_${memberId}`) : null) ||
        previousMemberMetrics.get(name);

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
        currentValueDelta: previousMember
          ? currentValue - previousMember.currentValue
          : null,
        investedDelta: previousMember
          ? invested - previousMember.invested
          : null,
        address: profile?.address || null,
        email: profile?.email || null,
        mobile: profile?.mobile || null,
        dematNominee: profile?.dematNominee || null,
        dpId: profile?.dpId || null,
        clientId: profile?.clientId || null,
        dpName: profile?.dpName || null,
        boSubStatus: profile?.boSubStatus || null,
        bsda: profile?.bsda || null,
        rgess: profile?.rgess || null,
        accountStatus: profile?.accountStatus || null,
        frozenStatus: profile?.frozenStatus || null,
        boStatus: profile?.boStatus || null,
        nsdlId: profile?.nsdlId || null,
        dob: profile?.dob || null,
        aadhaarStatus: profile?.aadhaarStatus || null,
        linkedBankName: profile?.linkedBankName || null,
        linkedBankIfsc: profile?.linkedBankIfsc || null,
        linkedBankAccountNo: profile?.linkedBankAccountNo || null,
      };
    })
  );

  // 4. Asset Allocations
  const categoryMap = new Map<string, number>();
  const capMap = new Map<string, number>();
  const amcMap = new Map<string, number>();

  // Use pre-fetched allDBSchemes from initial Promise.all
  const dbCategories = Array.from(
    new Set(allDBSchemes.map((s) => s.category).filter(Boolean))
  );
  const dbAmcs = Array.from(
    new Set(allDBSchemes.map((s) => getAmcName(s.name)).filter(Boolean))
  );

  // Initialize all DB categories & AMCs with 0 so zero-value items are included in breakdown
  dbCategories.forEach((cat) => {
    categoryMap.set(cat, 0);
    capMap.set(cat, 0);
  });
  dbAmcs.forEach((amc) => {
    amcMap.set(amc, 0);
  });

  for (const h of holdings) {
    if ((h.balanceUnits ?? 0) <= 0.0001 && (h.currentValue ?? 0) <= 0) continue;

    // Category allocation (directly from schemes.category database column)
    categoryMap.set(
      h.category,
      (categoryMap.get(h.category) || 0) + h.currentValue
    );

    // Scheme Category Allocation (directly from schemes.category database column)
    capMap.set(h.category, (capMap.get(h.category) || 0) + h.currentValue);

    // AMC allocation
    const amcName = getAmcName(h.schemeName);
    amcMap.set(amcName, (amcMap.get(amcName) || 0) + h.currentValue);
  }

  const categoryAllocation = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const capAllocation = Array.from(capMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const amcAllocation = Array.from(amcMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  // 5. Timeline data (invested vs value over time)
  const latestTimelineDate =
    chronologicalReports[chronologicalReports.length - 1]?.asOfDate ||
    selectedReport.asOfDate;
  const timelineTxHistory = await db
    .select({
      id: txTable.id,
      memberId: txTable.memberId,
      schemeId: txTable.schemeId,
      folioNo: txTable.folioNo,
      date: txTable.date,
      type: txTable.type,
      units: txTable.units,
      nav: txTable.nav,
      amount: txTable.amount,
      sourceReportId: txTable.sourceReportId,
    })
    .from(txTable)
    .where(lte(txTable.date, latestTimelineDate));

  const timelineData = await Promise.all(
    chronologicalReports.map(async (r) => {
      const snapHoldings = await getReportHoldings(r.id);
      const activeHoldings = snapHoldings.filter(
        (h) => (h.balanceUnits ?? 0) > 0.0001 || (h.currentValue ?? 0) > 0
      );
      const snapInvested = activeHoldings.reduce(
        (acc, h) => acc + h.purchaseValue,
        0
      );
      const snapValue = activeHoldings.reduce(
        (acc, h) => acc + h.currentValue,
        0
      );
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

      return {
        date: formattedDate,
        invested: snapInvested,
        value: snapValue,
        portfolioXirr: snapAlpha.portfolioXirr,
        benchmarkXirr: snapAlpha.benchmarkXirr,
        alpha: snapAlpha.alpha,
        cagr: snapCagr,
      };
    })
  );

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
        error:
          "No valid SIP mandates found. Please ensure the uploaded sheet contains a tab with 'SIP' in its name.",
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
    // 1. Clear in-memory RAM caches for benchmarks, NAVs, and stocks
    clearAllAlphaCaches();
    clearAllZerodhaCaches();
    clearAllMsflCaches();

    // 2. Purge Next.js page layout cache
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: unknown) {
    console.error("globalRefreshAction Error:", err);
    const errorMsg =
      err instanceof Error ? err.message : "Global refresh failed";
    return { success: false, error: errorMsg };
  }
}

/**
 * Fetch Financial Year Tracker data for selected FY or default
 */
export async function getFyTrackerDataAction(selectedFyLabel?: string) {
  return getFyTrackerData(selectedFyLabel);
}
