"use server";

import {
  getSchemeCategoryRankings,
  syncSchemeCategoryRankings,
  syncActiveFundsMarketCap,
} from "@/lib/fundRankingService";
import { getReports, getReportHoldings } from "@/lib/portfolioService";
import { purgeAllApplicationCaches } from "@/actions/portfolio";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/portfolio";
import type { SchemeCategoryRankingsData } from "@/types/fund-details";
import type { SyncMarketCapResult } from "@/types/marketCap";

/**
 * Server Action: Triggers real-time Playwright scraper to refresh Groww returns & rankings for a scheme,
 * and recalculates local volatility measures (StdDev, R-Squared, Alpha, Beta) from historical NAVs.
 */
export async function refreshSchemeCategoryRankingAction(
  schemeCode: string
): Promise<ActionResult<SchemeCategoryRankingsData | null>> {
  if (!schemeCode) {
    return { success: false, error: "Scheme code is required" };
  }

  const cleanCode = schemeCode
    .replace(/^w_/, "")
    .replace(/^sold_/, "")
    .trim();

  try {
    const updatedData = await syncSchemeCategoryRankings(cleanCode);
    if (!updatedData) {
      const fallbackData = await getSchemeCategoryRankings(cleanCode, {
        forceRefresh: true,
      });
      if (!fallbackData) {
        return {
          success: false,
          error: "No rankings or risk data available for this scheme.",
        };
      }
      return {
        success: true,
        data: fallbackData,
      };
    }

    try {
      revalidatePath(`/fund/${cleanCode}`);
      revalidatePath(`/fund/w_${cleanCode}`);
      revalidatePath("/watchlist");
    } catch {}

    return {
      success: true,
      data: updatedData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to refresh fund rankings: ${message}`,
    };
  }
}

/**
 * Server Action: Scrapes Market Cap Split (Large/Mid/Small Cap) and asset allocations
 * for all active funds in parallel batches of 5, updates PostgreSQL database, and returns fresh holdings.
 */
export async function syncActiveFundsMarketCapAction(
  reportId?: number
): Promise<SyncMarketCapResult> {
  try {
    const syncRes = await syncActiveFundsMarketCap(5);
    if (!syncRes.success) {
      return {
        success: false,
        count: 0,
        error: syncRes.error || "Failed to sync active funds market cap data",
      };
    }

    await purgeAllApplicationCaches();

    let targetReportId = reportId;
    if (!targetReportId) {
      const reportsList = await getReports();
      targetReportId = reportsList[0]?.id;
    }

    if (!targetReportId) {
      return {
        success: true,
        count: syncRes.count,
        holdings: [],
      };
    }

    const updatedHoldings = await getReportHoldings(targetReportId);
    const activeHoldings = updatedHoldings.filter(
      (h) => (h.balanceUnits ?? 0) > 0.0001 || (h.currentValue ?? 0) > 0
    );

    try {
      revalidatePath("/");
      revalidatePath("/allocation");
      revalidatePath("/zerodha");
    } catch {
      // Ignore when running outside Next.js request context
    }

    return {
      success: true,
      count: syncRes.count,
      holdings: activeHoldings,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      count: 0,
      error: `Failed to sync market cap data: ${message}`,
    };
  }
}
