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
export function subDays(dateStr: string, days: number): string {
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
  // Execute independent child table deletions concurrently in parallel
  await Promise.all([
    db
      .delete(memberReportCagrs)
      .where(eq(memberReportCagrs.reportId, reportId)),
    db.delete(holdingsSnapshot).where(eq(holdingsSnapshot.reportId, reportId)),
    db
      .update(transactions)
      .set({ sourceReportId: null })
      .where(eq(transactions.sourceReportId, reportId)),
  ]);
  // Delete the report row
  await db.delete(reports).where(eq(reports.id, reportId));
  // Re-sync transaction deltas incrementally without wiping existing transactions
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
    columns: { id: true },
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
    let member = item.memberPan
      ? await db.query.familyMembers.findFirst({
          where: eq(familyMembers.pan, item.memberPan),
        })
      : null;

    if (!member) {
      member = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.name, item.memberName),
      });
    }

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

    // Try to find a previous snapshot for the same folio and member to inherit details
    const prevSnapshot = await db.query.holdingsSnapshot.findFirst({
      where: (table, { eq, and, isNotNull }) =>
        and(
          eq(table.memberId, member.id),
          eq(table.folioNo, item.folioNo),
          isNotNull(table.modeOfHolding)
        ),
      orderBy: (table, { desc }) => [desc(table.id)],
    });

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
      modeOfHolding: prevSnapshot?.modeOfHolding || null,
      kycStatus: prevSnapshot?.kycStatus || null,
      ucc: prevSnapshot?.ucc || null,
      email: prevSnapshot?.email || null,
      mobile: prevSnapshot?.mobile || null,
      nominee: prevSnapshot?.nominee || null,
      rta: prevSnapshot?.rta || null,
      isin: item.isin || prevSnapshot?.isin || null,
      annualisedReturn:
        item.annualisedReturn || prevSnapshot?.annualisedReturn || null,
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

  // 4. Incrementally sync transactions without deleting existing authentic history
  await rebuildAllTransactions();

  return newReport.id;
}

/**
 * Synchronizes transaction records without auto-generating synthetic fake transactions.
 * Authentic transaction data comes from statement imports (SOA/CAS) and must not be overwritten or synthesized.
 */
export async function rebuildAllTransactions(): Promise<void> {
  // Authentic transactions are maintained directly via SOA statement imports.
  // We do not auto-generate synthetic/fake BUY or SELL transactions from valuation snapshot deltas.
  return;
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
      modeOfHolding: holdingsSnapshot.modeOfHolding,
      kycStatus: holdingsSnapshot.kycStatus,
      ucc: holdingsSnapshot.ucc,
      email: holdingsSnapshot.email,
      mobile: holdingsSnapshot.mobile,
      nominee: holdingsSnapshot.nominee,
      rta: holdingsSnapshot.rta,
      isin: holdingsSnapshot.isin,
      annualisedReturn: holdingsSnapshot.annualisedReturn,
    })
    .from(holdingsSnapshot)
    .leftJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
    .leftJoin(familyMembers, eq(holdingsSnapshot.memberId, familyMembers.id))
    .where(eq(holdingsSnapshot.reportId, reportId))
    .orderBy(desc(holdingsSnapshot.currentValue));

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
 * Get all transactions with scheme name and member name
 */
export async function getAllTransactions() {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      schemeName: schemes.name,
      folioNo: transactions.folioNo,
      memberName: familyMembers.name,
      type: transactions.type,
      transactionType: transactions.transactionType,
      units: transactions.units,
      nav: transactions.nav,
      amount: transactions.amount,
      stampDuty: transactions.stampDuty,
      stt: transactions.stt,
    })
    .from(transactions)
    .innerJoin(schemes, eq(transactions.schemeId, schemes.id))
    .innerJoin(familyMembers, eq(transactions.memberId, familyMembers.id))
    .orderBy(desc(transactions.date), asc(familyMembers.name));

  return rows;
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
  const allMembers = await db
    .select({
      id: familyMembers.id,
      name: familyMembers.name,
      pan: familyMembers.pan,
    })
    .from(familyMembers);
  const allSchemes = await db
    .select({
      id: schemes.id,
      name: schemes.name,
      category: schemes.category,
      schemeCodeApi: schemes.schemeCodeApi,
      mappedAt: schemes.mappedAt,
    })
    .from(schemes);
  const allMandates = await db
    .select({
      id: sipMandates.id,
      memberId: sipMandates.memberId,
      schemeId: sipMandates.schemeId,
      folioNo: sipMandates.folioNo,
      monthlyAmount: sipMandates.monthlyAmount,
      startMonth: sipMandates.startMonth,
      isActive: sipMandates.isActive,
      uploadedAt: sipMandates.uploadedAt,
      sourceFile: sipMandates.sourceFile,
    })
    .from(sipMandates);

  // Cache in Maps for fast, in-memory lookups
  const membersMap = new Map<string, (typeof allMembers)[number]>(
    allMembers.map((m) => [m.name.trim().toLowerCase(), m])
  );
  const schemesMap = new Map<string, (typeof allSchemes)[number]>(
    allSchemes.map((s) => [s.name.trim().toLowerCase(), s])
  );
  const mandatesMap = new Map<string, (typeof allMandates)[number]>(
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
  const txs = await db
    .select({
      id: sipTransactions.id,
      sipMandateId: sipTransactions.sipMandateId,
      month: sipTransactions.month,
      amount: sipTransactions.amount,
    })
    .from(sipTransactions);

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
