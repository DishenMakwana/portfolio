"use server";

import { revalidatePath } from "next/cache";
import { parseMsflHoldings } from "@/lib/msflParser";
import {
  saveMsflHoldingsReport,
  deleteMsflHoldingsReport,
  getMsflDashboardData,
  updateMsflSchemeCode,
} from "@/lib/msflService";

export async function uploadMsflHoldingsAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
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
    return { success: true, reportId };
  } catch (error: any) {
    console.error("MSFL Upload Action Error:", error);
    return { success: false, error: error.message || "Failed to parse file" };
  }
}

export async function deleteMsflHoldingsAction(reportId: number) {
  try {
    await deleteMsflHoldingsReport(reportId);
    revalidatePath("/zerodha");
    return { success: true };
  } catch (error: any) {
    console.error("MSFL Delete Action Error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete report snapshot",
    };
  }
}

export async function getMsflDashboardAction(reportId?: number) {
  try {
    return await getMsflDashboardData(reportId);
  } catch (error: any) {
    console.error("MSFL Get Dashboard Data Error:", error);
    throw new Error(error.message || "Failed to fetch MSFL dashboard data");
  }
}

export async function updateMsflSchemeMappingAction(
  schemeId: number,
  code: string | null
) {
  try {
    await updateMsflSchemeCode(schemeId, code);
    revalidatePath("/zerodha");
    return { success: true };
  } catch (error: any) {
    console.error("updateMsflSchemeMappingAction Error:", error);
    return { success: false, error: error.message };
  }
}

export async function autoMapAllMsflSchemesAction(onlyUnmapped = true) {
  try {
    const { db } = await import("@/db/db");
    const { msflSchemes } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

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
  } catch (error) {
    console.error("autoMapAllMsflSchemesAction Error:", error);
    return [];
  }
}
