import { db } from "@/db/db";
import { isBuyTransactionType, isSellTransactionType } from "@/lib/alpha";
import {
  holdingsSnapshot,
  transactions,
  schemes,
  familyMembers,
  reports,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { PortfolioAuditData, AuditHoldingItem } from "@/types/audit";
import { analyzeAuditRootCause } from "@/helpers/audit";

export async function getPortfolioAuditData(): Promise<PortfolioAuditData> {
  const latestReport = await db
    .select()
    .from(reports)
    .orderBy(desc(reports.id))
    .limit(1);

  if (!latestReport || latestReport.length === 0) {
    return {
      summary: {
        totalAudited: 0,
        perfectMatchCount: 0,
        navRoundingCount: 0,
        partialRedemptionCount: 0,
        unitMismatchCount: 0,
        missingTxCount: 0,
        totalCasValue: 0,
        totalTxNetValue: 0,
      },
      items: [],
    };
  }

  const reportId = latestReport[0].id;

  // Execute independent database queries concurrently using Promise.all
  const [snapshotRows, allTxs] = await Promise.all([
    db
      .select({
        id: holdingsSnapshot.id,
        memberId: holdingsSnapshot.memberId,
        schemeId: holdingsSnapshot.schemeId,
        folioNo: holdingsSnapshot.folioNo,
        balanceUnits: holdingsSnapshot.balanceUnits,
        purchaseValue: holdingsSnapshot.purchaseValue,
        currentValue: holdingsSnapshot.currentValue,
        schemeName: schemes.name,
        schemeCategory: schemes.category,
        memberName: familyMembers.name,
      })
      .from(holdingsSnapshot)
      .innerJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
      .innerJoin(familyMembers, eq(holdingsSnapshot.memberId, familyMembers.id))
      .where(eq(holdingsSnapshot.reportId, reportId))
      .orderBy(desc(holdingsSnapshot.currentValue)),

    db
      .select({
        memberId: transactions.memberId,
        schemeId: transactions.schemeId,
        folioNo: transactions.folioNo,
        type: transactions.type,
        units: transactions.units,
        amount: transactions.amount,
        stt: transactions.stt,
        stampDuty: transactions.stampDuty,
      })
      .from(transactions),
  ]);

  const items: AuditHoldingItem[] = [];
  let perfectMatchCount = 0;
  let navRoundingCount = 0;
  let partialRedemptionCount = 0;
  let unitMismatchCount = 0;
  let missingTxCount = 0;
  let totalCasValue = 0;
  let totalTxNetValue = 0;

  for (const h of snapshotRows) {
    const cleanFolio = (h.folioNo || "").replace(/^'/, "").trim();
    const matchedTxs = allTxs.filter(
      (tx) =>
        tx.memberId === h.memberId &&
        tx.schemeId === h.schemeId &&
        (tx.folioNo || "").replace(/^'/, "").trim() === cleanFolio
    );

    let buyUnits = 0;
    let sellUnits = 0;
    let buyAmount = 0;
    let sellAmount = 0;
    let totalStt = 0;
    let totalStampDuty = 0;

    for (const tx of matchedTxs) {
      if (isBuyTransactionType(tx.type)) {
        buyUnits += tx.units;
        buyAmount += tx.amount;
        totalStt += tx.stt ?? 0;
        totalStampDuty += tx.stampDuty ?? 0;
      } else if (isSellTransactionType(tx.type)) {
        sellUnits += tx.units;
        sellAmount += tx.amount;
      }
    }

    const txNetUnits = buyUnits - sellUnits;
    const unitDifference = h.balanceUnits - txNetUnits;
    const txNetAmount = buyAmount - sellAmount;
    // Include STT + stamp duty (BUY charges only) to get the effective invested amount
    const txNetAmountWithCharges = txNetAmount + totalStt + totalStampDuty;
    const rawAmountDiff = h.purchaseValue - txNetAmountWithCharges;
    const amountDifference = Math.abs(rawAmountDiff) < 1.0 ? 0 : rawAmountDiff;

    const analysis = analyzeAuditRootCause(
      h.balanceUnits,
      unitDifference,
      sellAmount,
      amountDifference,
      matchedTxs.length
    );

    if (analysis.auditStatus === "PERFECT_MATCH") {
      perfectMatchCount++;
    } else if (analysis.auditStatus === "NAV_ROUNDING") {
      navRoundingCount++;
    } else if (analysis.auditStatus === "PARTIAL_REDEMPTION") {
      partialRedemptionCount++;
    } else if (analysis.auditStatus === "UNIT_COST_MISMATCH") {
      unitMismatchCount++;
    } else if (analysis.auditStatus === "MISSING_HISTORY") {
      missingTxCount++;
    }

    totalCasValue += h.currentValue || 0;
    totalTxNetValue += txNetAmount;

    items.push({
      holdingId: h.id,
      memberName: h.memberName || "Unknown",
      schemeName: h.schemeName,
      schemeCategory: h.schemeCategory,
      folioNo: h.folioNo || "—",
      casBalanceUnits: h.balanceUnits,
      txNetUnits,
      unitDifference,
      unitStatus: analysis.unitStatus,
      casPurchaseValue: h.purchaseValue,
      txNetAmount,
      totalBuyAmount: buyAmount,
      totalSellAmount: sellAmount,
      totalStt,
      totalStampDuty,
      txNetAmountWithCharges,
      amountDifference,
      casCurrentValue: h.currentValue,
      auditStatus: analysis.auditStatus,
      rootCauseAnalysis: analysis.rootCauseAnalysis,
    });
  }

  return {
    summary: {
      totalAudited: snapshotRows.length,
      perfectMatchCount,
      navRoundingCount,
      partialRedemptionCount,
      unitMismatchCount,
      missingTxCount,
      totalCasValue,
      totalTxNetValue,
    },
    items,
  };
}
