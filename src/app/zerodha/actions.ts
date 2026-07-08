"use server";

import { revalidatePath } from "next/cache";
import { parseZerodhaHoldings } from "@/lib/zerodhaParser";
import {
  saveZerodhaHoldingsReport,
  deleteZerodhaHoldingsReport,
  getZerodhaDashboardData,
} from "@/lib/zerodhaService";

export async function uploadZerodhaHoldingsAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file uploaded" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseZerodhaHoldings(buffer, file.name);

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
  } catch (error: any) {
    console.error("Zerodha Upload Action Error:", error);
    return { success: false, error: error.message || "Failed to parse file" };
  }
}

export async function deleteZerodhaHoldingsAction(reportId: number) {
  try {
    await deleteZerodhaHoldingsReport(reportId);
    revalidatePath("/zerodha");
    return { success: true };
  } catch (error: any) {
    console.error("Zerodha Delete Action Error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete report snapshot",
    };
  }
}

export async function getZerodhaDashboardAction(reportId?: number) {
  try {
    return await getZerodhaDashboardData(reportId);
  } catch (error: any) {
    console.error("Zerodha Get Dashboard Data Error:", error);
    throw new Error(error.message || "Failed to fetch dashboard data");
  }
}

export interface ZerodhaAutoMapResult {
  schemeId: number;
  schemeName: string;
  status:
    "mapped" | "low_confidence" | "not_found" | "already_mapped" | "api_error";
  schemeCode: string | null;
  confidence: number | null;
}

export async function updateZerodhaSchemeMappingAction(
  schemeId: number,
  code: string | null
) {
  try {
    const { updateZerodhaSchemeCode } = await import("@/lib/zerodhaService");
    await updateZerodhaSchemeCode(schemeId, code);
    revalidatePath("/zerodha");
    return { success: true };
  } catch (error: any) {
    console.error("updateZerodhaSchemeMappingAction Error:", error);
    return { success: false, error: error.message };
  }
}

export async function autoMapAllZerodhaSchemesAction(
  onlyUnmapped = true
): Promise<ZerodhaAutoMapResult[]> {
  try {
    const { db } = await import("@/db/db");
    const { zerodhaSchemes } = await import("@/db/schema");
    const { autoMapScheme } = await import("@/lib/mfApi");
    const { eq } = await import("drizzle-orm");

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
      } catch (e) {
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
  } catch (error) {
    console.error("autoMapAllZerodhaSchemesAction Error:", error);
    return [];
  }
}
