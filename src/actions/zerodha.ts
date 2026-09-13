"use server";

import { parseZerodhaHoldings } from "@/lib/zerodhaParser";
import {
  saveZerodhaHoldingsReport,
  deleteZerodhaHoldingsReport,
  updateZerodhaSchemeCode,
} from "@/lib/zerodhaService";
import { purgeAllApplicationCaches } from "@/actions/portfolio";

import { db } from "@/db/db";
import { zerodhaSchemes } from "@/db/schema";
import { autoMapScheme } from "@/lib/mfApi";
import { searchStockSymbols } from "@/lib/stockApi";
import { eq } from "drizzle-orm";
import type { ZerodhaAutoMapResult, StockSearchResult } from "@/types/zerodha";
import type { ActionResult } from "@/types/portfolio";

export async function uploadZerodhaHoldingsAction(
  formData: FormData
): Promise<ActionResult<{ reportId?: number }>> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file uploaded" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseZerodhaHoldings(buffer, file.name);

    if (parsed.holdings.length === 0) {
      return {
        success: false,
        error:
          "No valid holdings found. Please ensure the uploaded sheet is a valid Zerodha Console Holdings report containing the 'Equity' or 'Mutual Funds' tabs.",
      };
    }

    const reportId = await saveZerodhaHoldingsReport(
      parsed.asOfDate,
      file.name,
      parsed.holdings,
      parsed.clientId
    );

    await purgeAllApplicationCaches();

    return { success: true, data: { reportId } };
  } catch (error: unknown) {
    console.error("Zerodha Upload Action Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to parse file";
    return { success: false, error: errorMsg };
  }
}

export async function deleteZerodhaHoldingsAction(
  reportId: number
): Promise<ActionResult> {
  try {
    await deleteZerodhaHoldingsReport(reportId);
    await purgeAllApplicationCaches();
    return { success: true };
  } catch (error: unknown) {
    console.error("Zerodha Delete Action Error:", error);
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Failed to delete report snapshot";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function updateZerodhaSchemeMappingAction(
  schemeId: number,
  code: string | null
): Promise<ActionResult> {
  try {
    await updateZerodhaSchemeCode(schemeId, code);
    await purgeAllApplicationCaches();
    return { success: true };
  } catch (error: unknown) {
    console.error("updateZerodhaSchemeMappingAction Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update mapping";
    return { success: false, error: errorMsg };
  }
}

export async function autoMapAllZerodhaSchemesAction(
  onlyUnmapped = true
): Promise<ZerodhaAutoMapResult[]> {
  try {
    const allSchemes = await db.query.zerodhaSchemes.findMany({
      columns: {
        id: true,
        name: true,
        isin: true,
        schemeCodeApi: true,
      },
    });
    const results: ZerodhaAutoMapResult[] = [];

    for (const s of allSchemes) {
      if (onlyUnmapped && s.schemeCodeApi) {
        results.push({
          schemeId: s.id,
          schemeName: s.name,
          status: "already_mapped",
          schemeCode: s.schemeCodeApi,
          confidence: 100,
        });
        continue;
      }

      try {
        const match = await autoMapScheme(s.name);
        if (match) {
          const isLowConf = match.confidence < 0.65;
          const status = isLowConf ? "low_confidence" : "mapped";

          await db
            .update(zerodhaSchemes)
            .set({
              schemeCodeApi: match.schemeCode,
              mappedAt: new Date().toISOString(),
            })
            .where(eq(zerodhaSchemes.id, s.id));

          results.push({
            schemeId: s.id,
            schemeName: s.name,
            status,
            schemeCode: match.schemeCode,
            confidence: Math.round(match.confidence * 100),
          });
        } else {
          results.push({
            schemeId: s.id,
            schemeName: s.name,
            status: "not_found",
            schemeCode: null,
            confidence: null,
          });
        }
      } catch {
        results.push({
          schemeId: s.id,
          schemeName: s.name,
          status: "api_error",
          schemeCode: null,
          confidence: null,
        });
      }
    }

    await purgeAllApplicationCaches();
    return results;
  } catch (error: unknown) {
    console.error("autoMapAllZerodhaSchemesAction Error:", error);
    return [];
  }
}

export async function updateZerodhaSchemeCategoryAction(
  schemeId: number,
  category: string
): Promise<ActionResult> {
  try {
    await db
      .update(zerodhaSchemes)
      .set({ category })
      .where(eq(zerodhaSchemes.id, schemeId));

    await purgeAllApplicationCaches();
    return { success: true };
  } catch (error: unknown) {
    console.error("updateZerodhaSchemeCategoryAction Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update category";
    return { success: false, error: errorMsg };
  }
}

export async function searchStockApiAction(
  query: string
): Promise<ActionResult<StockSearchResult[]>> {
  try {
    const data = await searchStockSymbols(query);
    return { success: true, data };
  } catch (error: unknown) {
    console.error("searchStockApiAction Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to search stock symbols";
    return { success: false, error: errorMsg };
  }
}
