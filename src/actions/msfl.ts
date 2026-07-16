"use server";

import { revalidatePath } from "next/cache";
import { parseMsflHoldings } from "@/lib/msflParser";
import {
  saveMsflHoldingsReport,
  deleteMsflHoldingsReport,
  getMsflDashboardData,
  updateMsflSchemeCode,
} from "@/lib/msflService";
import { db } from "@/db/db";
import { msflSchemes } from "@/db/schema";
import type { ActionResult } from "@/types/portfolio";
import type { AutoMapMsflSchemeResult } from "@/types/msfl";
import { eq } from "drizzle-orm";

export async function uploadMsflHoldingsAction(
  formData: FormData
): Promise<ActionResult<{ reportId?: number }>> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file uploaded" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseMsflHoldings(buffer, file.name);

    if (parsed.holdings.length === 0) {
      return {
        success: false,
        error: "No valid stocks holdings found in sheet 'Holding_Report'",
      };
    }

    const reportId = await saveMsflHoldingsReport(
      parsed.asOfDate,
      file.name,
      parsed.holdings
    );

    revalidatePath("/zerodha");
    return { success: true, data: { reportId } };
  } catch (error: unknown) {
    console.error("MSFL Upload Action Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to parse file";
    return { success: false, error: errorMsg };
  }
}

export async function deleteMsflHoldingsAction(
  reportId: number
): Promise<ActionResult> {
  try {
    await deleteMsflHoldingsReport(reportId);
    revalidatePath("/zerodha");
    return { success: true };
  } catch (error: unknown) {
    console.error("MSFL Delete Action Error:", error);
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

export async function getMsflDashboardAction(
  reportId?: number
): Promise<ReturnType<typeof getMsflDashboardData>> {
  try {
    return await getMsflDashboardData(reportId);
  } catch (error: unknown) {
    console.error("MSFL Get Dashboard Data Error:", error);
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Failed to fetch MSFL dashboard data";
    throw new Error(errorMsg);
  }
}

export async function updateMsflSchemeMappingAction(
  schemeId: number,
  code: string | null
): Promise<ActionResult> {
  try {
    await updateMsflSchemeCode(schemeId, code);
    revalidatePath("/zerodha");
    return { success: true };
  } catch (error: unknown) {
    console.error("updateMsflSchemeMappingAction Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update mapping";
    return { success: false, error: errorMsg };
  }
}

export async function autoMapAllMsflSchemesAction(
  onlyUnmapped = true
): Promise<AutoMapMsflSchemeResult[]> {
  try {
    const allSchemes = await db.query.msflSchemes.findMany();
    const results = [];

    for (const s of allSchemes) {
      if (onlyUnmapped && s.schemeCodeApi) {
        results.push({
          schemeId: s.id,
          schemeName: s.name,
          status: "already_mapped",
          schemeCode: s.schemeCodeApi,
        });
        continue;
      }

      const ticker = `${s.name}.NS`;
      await db
        .update(msflSchemes)
        .set({
          schemeCodeApi: ticker,
          mappedAt: new Date().toISOString(),
        })
        .where(eq(msflSchemes.id, s.id));

      results.push({
        schemeId: s.id,
        schemeName: s.name,
        status: "mapped",
        schemeCode: ticker,
      });
    }

    revalidatePath("/zerodha");
    return results;
  } catch (error: unknown) {
    console.error("autoMapAllMsflSchemesAction Error:", error);
    return [];
  }
}
