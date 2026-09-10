"use server";

import {
  syncBenchmarkCategoryRatios,
  clearCategoryBenchmarkCache,
} from "@/lib/benchmarkCategoryRatioService";
import { clearSchemeCategoryRankingsCache } from "@/lib/fundRankingService";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/portfolio";
import type { CategoryBenchmarkRatios } from "@/types/fund-details";

/**
 * Server Action: Triggers scraper / peer calculation to refresh benchmark category ratios for a category.
 */
export async function syncBenchmarkCategoryRatiosAction(
  categoryName: string,
  schemeCode?: string
): Promise<ActionResult<CategoryBenchmarkRatios | null>> {
  if (!categoryName) {
    return { success: false, error: "Category name is required" };
  }

  try {
    clearCategoryBenchmarkCache();
    clearSchemeCategoryRankingsCache();

    const updatedData = await syncBenchmarkCategoryRatios(
      categoryName,
      schemeCode
    );

    if (!updatedData) {
      return {
        success: false,
        error: "Sync completed but no benchmark ratios could be loaded.",
      };
    }

    if (schemeCode) {
      revalidatePath(`/fund/${schemeCode}`);
    }

    return {
      success: true,
      data: updatedData,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[CategoryRatiosAction] Error syncing category ratios for ${categoryName}:`,
      errorMsg
    );
    return {
      success: false,
      error: `Failed to sync category ratios: ${errorMsg}`,
    };
  }
}
