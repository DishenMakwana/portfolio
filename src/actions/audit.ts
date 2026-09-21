"use server";

import { getPortfolioAuditData } from "@/lib/auditService";
import { getZerodhaAuditData } from "@/lib/zerodhaAuditService";
import type { AuditMismatchStatus } from "@/types/audit";

export async function getAuditMismatchStatusAction(): Promise<{
  success: boolean;
  data: AuditMismatchStatus;
}> {
  try {
    const [mfAudit, zerodhaAudit] = await Promise.all([
      getPortfolioAuditData(),
      getZerodhaAuditData("all"),
    ]);

    const mfMismatchCount = mfAudit.items.filter(
      (item) =>
        item.unitStatus === "MISMATCH" || Math.abs(item.unitDifference) >= 0.001
    ).length;

    const zerodhaMismatchCount = zerodhaAudit.items.filter(
      (item) => Math.abs(item.unitDifference) >= 0.001
    ).length;

    return {
      success: true,
      data: {
        hasMfUnitMismatch: mfMismatchCount > 0,
        mfMismatchCount,
        hasZerodhaUnitMismatch: zerodhaMismatchCount > 0,
        zerodhaMismatchCount,
      },
    };
  } catch (error) {
    console.error("Error checking audit mismatch status:", error);
    return {
      success: false,
      data: {
        hasMfUnitMismatch: false,
        mfMismatchCount: 0,
        hasZerodhaUnitMismatch: false,
        zerodhaMismatchCount: 0,
      },
    };
  }
}
