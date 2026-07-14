"use server";

import { revalidatePath } from "next/cache";
import { parseZerodhaHoldings } from "@/lib/zerodhaParser";
import {
  saveZerodhaHoldingsReport,
  deleteZerodhaHoldingsReport,
  getZerodhaDashboardData,
  updateZerodhaSchemeCode,
} from "@/lib/zerodhaService";
import { db } from "@/db/db";
import { zerodhaSchemes } from "@/db/schema";
import { autoMapScheme } from "@/lib/mfApi";
import { eq } from "drizzle-orm";
import { ZerodhaAutoMapResult } from "@/types/zerodha";

export async function uploadZerodhaHoldingsAction(
  formData: FormData
): Promise<{ success: boolean; reportId?: number; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file uploaded" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseZerodhaHoldings(buffer);

    if (parsed.holdings.length === 0) {
      return {
        success: false,
        error:
          "No valid stocks or mutual funds holdings found in sheets 'Equity' or 'Mutual Funds'",
      };
    }

    const reportId = await saveZerodhaHoldingsReport(
      parsed.asOfDate,
      file.name,
      parsed.holdings
    );

    revalidatePath("/zerodha");
    return { success: true, reportId };
  } catch (error: unknown) {
    console.error("Zerodha Upload Action Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to parse file";
    return { success: false, error: errorMsg };
  }
}

export async function deleteZerodhaHoldingsAction(
  reportId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteZerodhaHoldingsReport(reportId);
    revalidatePath("/zerodha");
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

export async function getZerodhaDashboardAction(
  reportId?: number
): Promise<ReturnType<typeof getZerodhaDashboardData>> {
  try {
    return await getZerodhaDashboardData(reportId);
  } catch (error: unknown) {
    console.error("Zerodha Get Dashboard Data Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to fetch dashboard data";
    throw new Error(errorMsg);
  }
}

export async function updateZerodhaSchemeMappingAction(
  schemeId: number,
  code: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateZerodhaSchemeCode(schemeId, code);
    revalidatePath("/zerodha");
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
    const allSchemes = await db.query.zerodhaSchemes.findMany();
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

    revalidatePath("/zerodha");
    return results;
  } catch (error: unknown) {
    console.error("autoMapAllZerodhaSchemesAction Error:", error);
    return [];
  }
}

export async function updateZerodhaSchemeCategoryAction(
  schemeId: number,
  category: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(zerodhaSchemes)
      .set({ category })
      .where(eq(zerodhaSchemes.id, schemeId));

    revalidatePath("/zerodha");
    return { success: true };
  } catch (error: unknown) {
    console.error("updateZerodhaSchemeCategoryAction Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update category";
    return { success: false, error: errorMsg };
  }
}
