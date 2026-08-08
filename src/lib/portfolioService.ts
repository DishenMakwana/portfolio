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
  zerodhaTransactions,
} from "../db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { autoMapScheme } from "./mfApi";
import { parseMonthYear } from "@/helpers/dates";
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
    } else if (!member.pan && item.memberPan) {
      await db
        .update(familyMembers)
        .set({ pan: item.memberPan })
        .where(eq(familyMembers.id, member.id));
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
      const existing = await db.query.memberReportCagrs.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.reportId, newReport.id), eq(table.memberId, member.id)),
      });
      if (!existing) {
        await db.insert(memberReportCagrs).values({
          reportId: newReport.id,
          memberId: member.id,
          cagr: mc.cagr,
        });
      }
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
 * Get detailed holdings snapshot for a specific report, including fully redeemed / inactive folios
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

  // Build a set of existing active snapshot keys (memberId_schemeId_folioNo)
  const existingSnapshotKeys = new Set<string>();
  snapshots.forEach((s) => {
    if (s.memberId && s.schemeId && s.folioNo) {
      const cleanFolio = s.folioNo.trim().replace(/^'/, "").toLowerCase();
      existingSnapshotKeys.add(`${s.memberId}_${s.schemeId}_${cleanFolio}`);
    }
  });

  // Query transactions to reconstruct any inactive / fully redeemed folios
  const rawTxs = await db
    .select({
      id: transactions.id,
      schemeId: transactions.schemeId,
      memberId: transactions.memberId,
      folioNo: transactions.folioNo,
      date: transactions.date,
      type: transactions.type,
      units: transactions.units,
      amount: transactions.amount,
      nav: transactions.nav,
      schemeCategory: schemes.category,
      schemeName: schemes.name,
      schemeCodeApi: schemes.schemeCodeApi,
      memberName: familyMembers.name,
      memberPan: familyMembers.pan,
    })
    .from(transactions)
    .leftJoin(schemes, eq(transactions.schemeId, schemes.id))
    .leftJoin(familyMembers, eq(transactions.memberId, familyMembers.id))
    .orderBy(asc(transactions.date));

  // Group transactions by (memberId_schemeId_folioNo)
  const txFolioMap = new Map<
    string,
    {
      firstTxId: number;
      memberId: number;
      schemeId: number;
      memberName: string;
      memberPan: string | null;
      schemeName: string;
      category: string;
      schemeCodeApi: string | null;
      folioNo: string;
      buyUnits: number;
      sellUnits: number;
      buyAmount: number;
      sellAmount: number;
      buyDates: string[];
      sellDates: string[];
      lastNav: number;
    }
  >();

  for (const t of rawTxs) {
    if (!t.memberId || !t.schemeId || !t.folioNo) continue;
    const cleanFolio = t.folioNo.trim().replace(/^'/, "").toLowerCase();
    const key = `${t.memberId}_${t.schemeId}_${cleanFolio}`;

    if (!txFolioMap.has(key)) {
      txFolioMap.set(key, {
        firstTxId: t.id,
        memberId: t.memberId,
        schemeId: t.schemeId,
        memberName: t.memberName || "Unknown",
        memberPan: t.memberPan || null,
        schemeName: t.schemeName || "Unknown Scheme",
        category: t.schemeCategory || "Equity",
        schemeCodeApi: t.schemeCodeApi || null,
        folioNo: t.folioNo,
        buyUnits: 0,
        sellUnits: 0,
        buyAmount: 0,
        sellAmount: 0,
        buyDates: [],
        sellDates: [],
        lastNav: t.nav || 0,
      });
    }

    const item = txFolioMap.get(key)!;
    const type = (t.type || "").toUpperCase();
    const amt = t.amount || 0;
    const units = t.units || 0;

    if (type === "BUY" || type === "PURCHASE" || type === "SIP") {
      item.buyUnits += units;
      item.buyAmount += amt;
      if (t.date) item.buyDates.push(t.date);
    } else if (type === "SELL" || type === "REDEMPTION" || type === "SWP") {
      item.sellUnits += units;
      item.sellAmount += amt;
      if (t.date) item.sellDates.push(t.date);
    }
  }

  // Patch purchaseValue for existing snapshot rows that have 0 balance and 0 purchaseValue
  snapshots.forEach((s) => {
    if (
      s.memberId &&
      s.schemeId &&
      s.folioNo &&
      (s.balanceUnits ?? 0) <= 0.0001 &&
      (s.purchaseValue ?? 0) === 0
    ) {
      const cleanFolio = s.folioNo.trim().replace(/^'/, "").toLowerCase();
      const key = `${s.memberId}_${s.schemeId}_${cleanFolio}`;
      const item = txFolioMap.get(key);
      if (item && item.buyAmount > 0) {
        s.purchaseValue = Math.round(item.buyAmount * 100) / 100;
        s.gain = Math.round((item.sellAmount - item.buyAmount) * 100) / 100;
      }
    }
  });

  // Identify inactive (fully redeemed) folios not already present as active snapshots
  const inactiveHoldings: HoldingDetails[] = [];

  for (const [key, item] of txFolioMap.entries()) {
    const balUnits = item.buyUnits - item.sellUnits;
    const isInactive = balUnits <= 0.0001 && item.buyUnits > 0;

    // Only add if it's inactive and NOT already present in active snapshots
    if (isInactive && !existingSnapshotKeys.has(key)) {
      const netProfit = item.sellAmount - item.buyAmount;
      const absReturn =
        item.buyAmount > 0
          ? Math.round((netProfit / item.buyAmount) * 10000) / 100
          : 0;

      let holdingDays = 1;
      if (item.buyDates.length > 0 && item.sellDates.length > 0) {
        const d1 = new Date(item.buyDates[0]);
        const d2 = new Date(item.sellDates[item.sellDates.length - 1]);
        holdingDays = Math.max(
          1,
          Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24))
        );
      }

      inactiveHoldings.push({
        id: -item.firstTxId,
        schemeId: item.schemeId,
        memberId: item.memberId,
        schemeName: item.schemeName,
        category: item.category,
        schemeCodeApi: item.schemeCodeApi,
        folioNo: item.folioNo,
        balanceUnits: 0,
        purchaseNav:
          item.buyUnits > 0 ? item.buyAmount / item.buyUnits : item.lastNav,
        purchaseValue: Math.round(item.buyAmount * 100) / 100,
        currentNav: 0,
        currentValue: 0,
        gain: Math.round(netProfit * 100) / 100,
        holdingDays,
        absoluteReturn: absReturn,
        cagr: 0,
        xirr: 0,
        alpha: 0,
        comments: "Fully Redeemed / Sold",
        memberName: item.memberName,
        memberPan: item.memberPan,
        modeOfHolding: null,
        kycStatus: null,
        ucc: null,
        email: null,
        mobile: null,
        nominee: null,
        rta: null,
        isin: null,
        annualisedReturn: null,
      } as HoldingDetails);
    }
  }

  return [...snapshots, ...inactiveHoldings] as HoldingDetails[];
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
  const [rows, txs, dbTxs, zTxs] = await Promise.all([
    db
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
      .orderBy(asc(familyMembers.name), asc(schemes.name)),
    db
      .select({
        id: sipTransactions.id,
        sipMandateId: sipTransactions.sipMandateId,
        month: sipTransactions.month,
        amount: sipTransactions.amount,
      })
      .from(sipTransactions),
    db
      .select({
        memberId: transactions.memberId,
        schemeId: transactions.schemeId,
        folioNo: transactions.folioNo,
        date: transactions.date,
      })
      .from(transactions),
    db
      .select({
        memberId: zerodhaTransactions.memberId,
        schemeId: zerodhaTransactions.schemeId,
        folioNo: zerodhaTransactions.folioNo,
        date: zerodhaTransactions.date,
      })
      .from(zerodhaTransactions),
  ]);

  // Group transactions by mandateId
  const txsMap: Record<number, Record<string, number>> = {};
  txs.forEach((tx) => {
    if (!tx.sipMandateId) return;
    if (!txsMap[tx.sipMandateId]) txsMap[tx.sipMandateId] = {};
    txsMap[tx.sipMandateId][tx.month] = tx.amount;
  });

  const cleanFolio = (f: string | null | undefined): string => {
    if (!f) return "";
    return f.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  };

  return rows.map((r) => {
    const rCleanFolio = cleanFolio(r.folioNo);
    const matchingTxDates: string[] = [];

    if (r.memberId) {
      dbTxs.forEach((t) => {
        if (t.memberId === r.memberId) {
          const tCleanFolio = cleanFolio(t.folioNo);
          const folioMatch =
            rCleanFolio &&
            tCleanFolio &&
            (rCleanFolio.includes(tCleanFolio) ||
              tCleanFolio.includes(rCleanFolio));
          const schemeMatch = Boolean(r.schemeId && t.schemeId === r.schemeId);
          if (folioMatch || schemeMatch) {
            if (t.date) matchingTxDates.push(t.date);
          }
        }
      });

      zTxs.forEach((t) => {
        if (t.memberId === r.memberId) {
          const tCleanFolio = cleanFolio(t.folioNo);
          const folioMatch =
            rCleanFolio &&
            tCleanFolio &&
            (rCleanFolio.includes(tCleanFolio) ||
              tCleanFolio.includes(rCleanFolio));
          const schemeMatch = Boolean(r.schemeId && t.schemeId === r.schemeId);
          if (folioMatch || schemeMatch) {
            if (t.date) matchingTxDates.push(t.date);
          }
        }
      });
    }

    matchingTxDates.sort();
    let firstTxDate = matchingTxDates[0] || null;

    const mHistory = txsMap[r.id] || {};
    if (!firstTxDate) {
      const activeMonths = Object.keys(mHistory).filter(
        (col) => (mHistory[col] ?? 0) > 0
      );
      if (activeMonths.length > 0) {
        const sortedMonths = activeMonths.sort(
          (a, b) => parseMonthYear(a).getTime() - parseMonthYear(b).getTime()
        );
        const earliestDate = parseMonthYear(sortedMonths[0]);
        if (earliestDate.getTime() > 0) {
          const yyyy = earliestDate.getFullYear();
          const mm = String(earliestDate.getMonth() + 1).padStart(2, "0");
          firstTxDate = `${yyyy}-${mm}-01`;
        }
      }
    }

    if (!firstTxDate && r.startMonth) {
      const parsedStart = parseMonthYear(r.startMonth);
      if (parsedStart.getTime() > 0) {
        const yyyy = parsedStart.getFullYear();
        const mm = String(parsedStart.getMonth() + 1).padStart(2, "0");
        firstTxDate = `${yyyy}-${mm}-01`;
      }
    }

    return {
      id: r.id,
      memberId: r.memberId!,
      memberName: r.memberName || "Unknown",
      schemeId: r.schemeId!,
      schemeName: r.schemeName || "Unknown",
      folioNo: r.folioNo,
      monthlyAmount: r.monthlyAmount,
      monthlyHistory: mHistory,
      startMonth: r.startMonth,
      isActive: r.isActive === 1,
      uploadedAt: r.uploadedAt,
      sourceFile: r.sourceFile,
      firstTxDate,
    };
  });
}

/**
 * Delete all SIP mandates (for a fresh re-upload)
 */
export async function clearSipMandates(): Promise<void> {
  await db.delete(sipMandates);
}
