import { db } from "../db/db";
import {
  reports,
  familyMembers,
  schemes,
  holdingsSnapshot,
  transactions,
  sipMandates,
  memberReportCagrs,
  sipTransactions,
} from "../db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { autoMapScheme } from "./mfApi";
import {
  HoldingDetails,
  ParsedHolding,
  SipMandateRow,
} from "@/types/portfolio";
import { ParsedSipMandate, SaveSipMandatesResult } from "@/types/sips";

/**
 * Subtract days from YYYY-MM-DD date string
 */
function subDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

/**
 * Safe delete report and all associated child rows
 */
export async function deleteReport(reportId: number): Promise<void> {
  // 0. Delete member report CAGRs referencing this report
  await db
    .delete(memberReportCagrs)
    .where(eq(memberReportCagrs.reportId, reportId));
  // 1. Delete transactions referencing this report
  await db
    .delete(transactions)
    .where(eq(transactions.sourceReportId, reportId));
  // 2. Delete holdings snapshots referencing this report
  await db
    .delete(holdingsSnapshot)
    .where(eq(holdingsSnapshot.reportId, reportId));
  // 3. Delete the report row
  await db.delete(reports).where(eq(reports.id, reportId));
  // 4. Rebuild all transactions to update snapshots diff ledger
  await rebuildAllTransactions();
}

/**
 * Process parsed Excel data and save to database
 */
export async function saveReportSnapshot(
  asOfDate: string,
  filename: string,
  parsedHoldings: ParsedHolding[],
  familyCagr?: number,
  memberCagrs?: { memberName: string; cagr: number }[]
): Promise<number> {
  // 1. Delete existing report for the same date if it exists (for overwrite)
  const existingReport = await db.query.reports.findFirst({
    where: eq(reports.asOfDate, asOfDate),
  });

  if (existingReport) {
    await deleteReport(existingReport.id);
  }

  // 2. Insert new report metadata
  const [newReport] = await db
    .insert(reports)
    .values({
      asOfDate,
      uploadedAt: new Date().toISOString(),
      filename,
      cagr: familyCagr || null,
    })
    .returning();

  // 3. Process family members, schemes and snapshots
  for (const item of parsedHoldings) {
    // 3.1 Get or Create Family Member
    let member = await db.query.familyMembers.findFirst({
      where: eq(familyMembers.name, item.memberName),
    });

    if (!member) {
      const [inserted] = await db
        .insert(familyMembers)
        .values({
          name: item.memberName,
          pan: item.memberPan || null,
        })
        .returning();
      member = inserted;
    }

    // 3.2 Get or Create Scheme
    let scheme = await db.query.schemes.findFirst({
      where: eq(schemes.name, item.schemeName),
    });

    if (!scheme) {
      // Perform auto mapping
      const apiMapping = await autoMapScheme(item.schemeName);
      const [inserted] = await db
        .insert(schemes)
        .values({
          name: item.schemeName,
          category: item.category,
          schemeCodeApi: apiMapping ? apiMapping.schemeCode : null,
          mappedAt: apiMapping ? new Date().toISOString() : null,
        })
        .returning();
      scheme = inserted;
    }

    // 3.3 Insert Holdings Snapshot
    await db.insert(holdingsSnapshot).values({
      reportId: newReport.id,
      memberId: member.id,
      schemeId: scheme.id,
      folioNo: item.folioNo,
      balanceUnits: item.balanceUnits,
      purchaseNav: item.purchaseNav,
      purchaseValue: item.purchaseValue,
      currentNav: item.currentNav,
      currentValue: item.currentValue,
      dividend: item.dividend || 0,
      gain: item.gain,
      holdingDays: item.holdingDays,
      absoluteReturn: item.absoluteReturn,
      cagr: item.cagr,
      comments: item.comments || null,
    });
  }

  // 3.4 Save member-level total CAGRs
  if (memberCagrs) {
    for (const mc of memberCagrs) {
      let member = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.name, mc.memberName),
      });
      if (!member) {
        const [inserted] = await db
          .insert(familyMembers)
          .values({
            name: mc.memberName,
          })
          .returning();
        member = inserted;
      }
      await db.insert(memberReportCagrs).values({
        reportId: newReport.id,
        memberId: member.id,
        cagr: mc.cagr,
      });
    }
  }

  // 4. Rebuild the transaction history chronologically
  await rebuildAllTransactions();

  return newReport.id;
}

/**
 * Completely rebuilds the reconstructed transaction ledger based on all report snapshots
 */
export async function rebuildAllTransactions(): Promise<void> {
  // Clear all transactions first
  await db.delete(transactions);

  // Get all reports in chronological order
  const allReports = await db.query.reports.findMany({
    orderBy: [asc(reports.asOfDate)],
  });

  if (allReports.length === 0) return;

  for (let rIndex = 0; rIndex < allReports.length; rIndex++) {
    const currentReport = allReports[rIndex];
    const currentHoldings = await db.query.holdingsSnapshot.findMany({
      where: eq(holdingsSnapshot.reportId, currentReport.id),
    });

    if (rIndex === 0) {
      // First Report: Reconstruct initial buys from holdingDays
      for (const holding of currentHoldings) {
        const purchaseDate = subDays(
          currentReport.asOfDate,
          holding.holdingDays
        );
        await db.insert(transactions).values({
          memberId: holding.memberId,
          schemeId: holding.schemeId,
          folioNo: holding.folioNo,
          date: purchaseDate,
          type: "BUY",
          units: holding.balanceUnits,
          nav: holding.purchaseNav,
          amount: holding.purchaseValue,
          sourceReportId: currentReport.id,
        });
      }
    } else {
      // Subsequent Reports: Diff units against the previous report
      const prevReport = allReports[rIndex - 1];
      const prevHoldings = await db.query.holdingsSnapshot.findMany({
        where: eq(holdingsSnapshot.reportId, prevReport.id),
      });

      // Create a map of previous holdings for quick lookup: memberId_schemeId_folioNo
      const prevMap = new Map<string, typeof holdingsSnapshot.$inferSelect>();
      for (const ph of prevHoldings) {
        const key = `${ph.memberId}_${ph.schemeId}_${ph.folioNo}`;
        prevMap.set(key, ph);
      }

      const processedKeys = new Set<string>();

      // Check current holdings for buys/sells
      for (const holding of currentHoldings) {
        const key = `${holding.memberId}_${holding.schemeId}_${holding.folioNo}`;
        processedKeys.add(key);

        const prevHolding = prevMap.get(key);

        if (prevHolding) {
          const diffUnits = holding.balanceUnits - prevHolding.balanceUnits;

          if (diffUnits > 0.001) {
            // Units increased (SIP / Lumpsum Buy)
            const diffAmount =
              holding.purchaseValue - prevHolding.purchaseValue;
            const amount =
              diffAmount > 0 ? diffAmount : diffUnits * holding.purchaseNav;
            const nav = amount / diffUnits;

            await db.insert(transactions).values({
              memberId: holding.memberId,
              schemeId: holding.schemeId,
              folioNo: holding.folioNo,
              date: currentReport.asOfDate,
              type: "BUY",
              units: diffUnits,
              nav,
              amount,
              sourceReportId: currentReport.id,
            });
          } else if (diffUnits < -0.001) {
            // Units decreased (Partial Redemption)
            const unitsSold = Math.abs(diffUnits);
            const amount = unitsSold * holding.currentNav;

            await db.insert(transactions).values({
              memberId: holding.memberId,
              schemeId: holding.schemeId,
              folioNo: holding.folioNo,
              date: currentReport.asOfDate,
              type: "SELL",
              units: unitsSold,
              nav: holding.currentNav,
              amount,
              sourceReportId: currentReport.id,
            });
          }
        } else {
          // New Scheme / Folio added in this report snapshot
          const purchaseDate = subDays(
            currentReport.asOfDate,
            holding.holdingDays
          );
          await db.insert(transactions).values({
            memberId: holding.memberId,
            schemeId: holding.schemeId,
            folioNo: holding.folioNo,
            date: purchaseDate,
            type: "BUY",
            units: holding.balanceUnits,
            nav: holding.purchaseNav,
            amount: holding.purchaseValue,
            sourceReportId: currentReport.id,
          });
        }
      }

      // Check for fully redeemed funds (existed in prev, but not in current)
      for (const prevHolding of prevHoldings) {
        const key = `${prevHolding.memberId}_${prevHolding.schemeId}_${prevHolding.folioNo}`;
        if (!processedKeys.has(key)) {
          // Fully redeemed (Sell all remaining units)
          const amount = prevHolding.balanceUnits * prevHolding.currentNav;
          await db.insert(transactions).values({
            memberId: prevHolding.memberId,
            schemeId: prevHolding.schemeId,
            folioNo: prevHolding.folioNo,
            date: currentReport.asOfDate,
            type: "SELL",
            units: prevHolding.balanceUnits,
            nav: prevHolding.currentNav,
            amount,
            sourceReportId: currentReport.id,
          });
        }
      }
    }
  }
}

/**
 * Get all reports from database
 */
export async function getReports() {
  return await db.query.reports.findMany({
    orderBy: [desc(reports.asOfDate)],
  });
}

/**
 * Get detailed holdings snapshot for a specific report
 */
export async function getReportHoldings(
  reportId: number
): Promise<HoldingDetails[]> {
  const snapshots = await db
    .select({
      id: holdingsSnapshot.id,
      schemeId: holdingsSnapshot.schemeId,
      memberId: holdingsSnapshot.memberId,
      schemeName: schemes.name,
      category: schemes.category,
      schemeCodeApi: schemes.schemeCodeApi,
      folioNo: holdingsSnapshot.folioNo,
      balanceUnits: holdingsSnapshot.balanceUnits,
      purchaseNav: holdingsSnapshot.purchaseNav,
      purchaseValue: holdingsSnapshot.purchaseValue,
      currentNav: holdingsSnapshot.currentNav,
      currentValue: holdingsSnapshot.currentValue,
      gain: holdingsSnapshot.gain,
      holdingDays: holdingsSnapshot.holdingDays,
      absoluteReturn: holdingsSnapshot.absoluteReturn,
      cagr: holdingsSnapshot.cagr,
      comments: holdingsSnapshot.comments,
      memberName: familyMembers.name,
      memberPan: familyMembers.pan,
    })
    .from(holdingsSnapshot)
    .leftJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
    .leftJoin(familyMembers, eq(holdingsSnapshot.memberId, familyMembers.id))
    .where(eq(holdingsSnapshot.reportId, reportId));

  return snapshots as HoldingDetails[];
}

/**
 * Get all schemes mapped & unmapped
 */
export async function getSchemes() {
  return await db.query.schemes.findMany({
    orderBy: [asc(schemes.name)],
  });
}

/**
 * Update scheme API code mapping
 */
export async function updateSchemeCode(
  schemeId: number,
  code: string | null
): Promise<void> {
  await db
    .update(schemes)
    .set({
      schemeCodeApi: code,
      mappedAt: code ? new Date().toISOString() : null,
    })
    .where(eq(schemes.id, schemeId));

  // Re-run transaction rebuild to ensure historical data has fresh maps
  await rebuildAllTransactions();
}

// ─────────────────────────────────────────────────────────────────────────────
// SIP MANDATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save or replace all SIP mandates from a parsed SIP upload.
 * Strategy: clear all existing records for the same sourceFile, then insert fresh.
 */
export async function saveSipMandates(
  sips: ParsedSipMandate[],
  sourceFile: string
): Promise<SaveSipMandatesResult> {
  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  // Pre-fetch all family members, schemes, and mandates to avoid repeated queries in loop
  const allMembers = await db.select().from(familyMembers);
  const allSchemes = await db.select().from(schemes);
  const allMandates = await db.select().from(sipMandates);

  // Cache in Maps for fast, in-memory lookups
  const membersMap = new Map<string, typeof familyMembers.$inferSelect>(
    allMembers.map((m) => [m.name.trim().toLowerCase(), m])
  );
  const schemesMap = new Map<string, typeof schemes.$inferSelect>(
    allSchemes.map((s) => [s.name.trim().toLowerCase(), s])
  );
  const mandatesMap = new Map<string, typeof sipMandates.$inferSelect>(
    allMandates.map((m) => [
      `${m.memberId}_${m.schemeId}_${m.folioNo.trim().toLowerCase()}`,
      m,
    ])
  );

  // We will collect all transaction records to upsert in a single bulk query
  const txsToUpsert: {
    sipMandateId: number;
    month: string;
    amount: number;
    uploadedAt: string;
    sourceFile: string | null;
  }[] = [];

  for (const sip of sips) {
    // 1. Get or create member in cache/db
    const memberKey = sip.investorName.trim().toLowerCase();
    let member = membersMap.get(memberKey);
    if (!member) {
      const [m] = await db
        .insert(familyMembers)
        .values({ name: sip.investorName })
        .returning();
      member = m;
      membersMap.set(memberKey, m);
    }

    // 2. Get or create scheme in cache/db
    const schemeKey = sip.schemeName.trim().toLowerCase();
    let scheme = schemesMap.get(schemeKey);
    if (!scheme) {
      const [s] = await db
        .insert(schemes)
        .values({ name: sip.schemeName, category: "Equity" })
        .returning();
      scheme = s;
      schemesMap.set(schemeKey, s);
    }

    if (!sip.monthlyAmount || sip.monthlyAmount <= 0) {
      skipped++;
      continue;
    }

    // 3. Get or create mandate
    const mandateKey = `${member.id}_${scheme.id}_${sip.folioNo.trim().toLowerCase()}`;
    const existing = mandatesMap.get(mandateKey);

    let mandateId: number;
    if (existing) {
      await db
        .update(sipMandates)
        .set({
          monthlyAmount: sip.monthlyAmount,
          monthlyHistory: null, // Clear old JSON field
          isActive: sip.isActive ? 1 : 0,
          uploadedAt: now,
          sourceFile,
        })
        .where(eq(sipMandates.id, existing.id));
      mandateId = existing.id;
    } else {
      const [newMandate] = await db
        .insert(sipMandates)
        .values({
          memberId: member.id,
          schemeId: scheme.id,
          folioNo: sip.folioNo,
          monthlyAmount: sip.monthlyAmount,
          monthlyHistory: null,
          startMonth: sip.startMonth,
          isActive: sip.isActive ? 1 : 0,
          uploadedAt: now,
          sourceFile,
        })
        .returning();
      mandateId = newMandate.id;

      // Update our map to avoid duplicate inserts if the same mandate is processed again in the loop
      mandatesMap.set(mandateKey, newMandate);
    }

    // 4. Accumulate transaction records
    for (const [month, amount] of Object.entries(sip.monthlyHistory)) {
      txsToUpsert.push({
        sipMandateId: mandateId,
        month,
        amount,
        uploadedAt: now,
        sourceFile,
      });
    }

    inserted++;
  }

  // 5. Bulk upsert all monthly transaction records in a single query
  if (txsToUpsert.length > 0) {
    await db
      .insert(sipTransactions)
      .values(txsToUpsert)
      .onConflictDoUpdate({
        target: [sipTransactions.sipMandateId, sipTransactions.month],
        set: {
          amount: sql`EXCLUDED.amount`,
          uploadedAt: sql`EXCLUDED.uploaded_at`,
          sourceFile: sql`EXCLUDED.source_file`,
        },
      });
  }

  return { inserted, skipped };
}

/**
 * Get all SIP mandates with member and scheme info joined
 */
export async function getSipMandates(): Promise<SipMandateRow[]> {
  const rows = await db
    .select({
      id: sipMandates.id,
      memberId: sipMandates.memberId,
      memberName: familyMembers.name,
      schemeId: sipMandates.schemeId,
      schemeName: schemes.name,
      folioNo: sipMandates.folioNo,
      monthlyAmount: sipMandates.monthlyAmount,
      startMonth: sipMandates.startMonth,
      isActive: sipMandates.isActive,
      uploadedAt: sipMandates.uploadedAt,
      sourceFile: sipMandates.sourceFile,
    })
    .from(sipMandates)
    .leftJoin(familyMembers, eq(sipMandates.memberId, familyMembers.id))
    .leftJoin(schemes, eq(sipMandates.schemeId, schemes.id))
    .orderBy(asc(familyMembers.name), asc(schemes.name));

  // Fetch all monthly transaction payment records
  const txs = await db.select().from(sipTransactions);

  // Group transactions by mandateId
  const txsMap: Record<number, Record<string, number>> = {};
  txs.forEach((tx) => {
    if (!tx.sipMandateId) return;
    if (!txsMap[tx.sipMandateId]) txsMap[tx.sipMandateId] = {};
    txsMap[tx.sipMandateId][tx.month] = tx.amount;
  });

  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId!,
    memberName: r.memberName || "Unknown",
    schemeId: r.schemeId!,
    schemeName: r.schemeName || "Unknown",
    folioNo: r.folioNo,
    monthlyAmount: r.monthlyAmount,
    monthlyHistory: txsMap[r.id] || {},
    startMonth: r.startMonth,
    isActive: r.isActive === 1,
    uploadedAt: r.uploadedAt,
    sourceFile: r.sourceFile,
  }));
}

/**
 * Delete all SIP mandates (for a fresh re-upload)
 */
export async function clearSipMandates(): Promise<void> {
  await db.delete(sipMandates);
}
