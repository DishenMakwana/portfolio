"use server";

import { parseMsflHoldings } from "@/lib/msflParser";
import {
  saveMsflHoldingsReport,
  deleteMsflHoldingsReport,
  updateMsflSchemeCode,
} from "@/lib/msflService";
import { purgeAllApplicationCaches } from "@/actions/portfolio";
import type { ActionResult } from "@/types/portfolio";

export async function uploadMsflHoldingsAction(
  formData: FormData
): Promise<ActionResult<{ reportId?: number }>> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file uploaded" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseMsflHoldings(buffer, file.name);

    if (!parsed.holdings.length) {
      return {
        success: false,
        error: "No holdings found in the MSFL file",
      };
    }

    const filename = file.name;
    const reportId = await saveMsflHoldingsReport(
      parsed.asOfDate,
      filename,
      parsed.holdings
    );

    await purgeAllApplicationCaches();
    return { success: true, data: { reportId } };
  } catch (error: unknown) {
    console.error("MSFL Upload Action Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to upload MSFL holdings";
    return { success: false, error: errorMsg };
  }
}

export async function deleteMsflHoldingsAction(
  reportId: number
): Promise<ActionResult> {
  try {
    await deleteMsflHoldingsReport(reportId);
    await purgeAllApplicationCaches();
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

export async function updateMsflSchemeMappingAction(
  schemeId: number,
  code: string | null
): Promise<ActionResult> {
  try {
    await updateMsflSchemeCode(schemeId, code);
    await purgeAllApplicationCaches();
    return { success: true };
  } catch (error: unknown) {
    console.error("updateMsflSchemeMappingAction Error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update mapping";
    return { success: false, error: errorMsg };
  }
}
