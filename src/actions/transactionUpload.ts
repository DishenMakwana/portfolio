"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/db";
import { familyMembers, schemes, transactions } from "@/db/schema";
import { parseTransactionXlsx } from "@/lib/transactionXlsxParser";
import type { TransactionUploadResult } from "@/types/transactionUpload";

function normalizeTxType(type: string): string {
  const t = type.trim().toLowerCase();
  if (t.includes("sip") || t.includes("systematic")) return "SIP";
  if (t.includes("purchase") || t.includes("lumpsum") || t.includes("fresh"))
    return "Purchase";
  if (
    t.includes("switch in") ||
    t.includes("switch-in") ||
    t.includes("stp in")
  )
    return "Switch-In";
  if (
    t.includes("switch out") ||
    t.includes("switch-out") ||
    t.includes("stp out")
  )
    return "Switch-Out";
  if (
    t.includes("redemption") ||
    t.includes("repurchase") ||
    t.includes("sell")
  )
    return "Redemption";
  if (t.includes("dividend")) return "Dividend";
  return type.trim();
}

export async function uploadTransactionsAction(
  formData: FormData
): Promise<TransactionUploadResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return {
        success: false,
        message: "No file selected.",
        totalProcessed: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: "No file uploaded",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedRows = parseTransactionXlsx(buffer);

    if (parsedRows.length === 0) {
      return {
        success: false,
        message:
          "No valid transaction records found in the uploaded XLSX file. Please ensure it is a valid transaction statement.",
        totalProcessed: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: "No valid rows found",
      };
    }

    // Pre-fetch all members and schemes for fast lookup
    const allMembers = await db.select().from(familyMembers);
    const allSchemes = await db.select().from(schemes);

    const memberMap = new Map<string, number>();
    const memberPanMap = new Map<string, number>();
    allMembers.forEach((m) => {
      memberMap.set(m.name.trim().toLowerCase(), m.id);
      if (m.pan) memberPanMap.set(m.pan.trim().toUpperCase(), m.id);
    });

    const schemeMap = new Map<string, number>();
    allSchemes.forEach((s) => {
      schemeMap.set(s.name.trim().toLowerCase(), s.id);
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Track DB transaction IDs claimed during this batch run to prevent duplicate cross-matching
    const matchedDbIds = new Set<number>();

    for (const row of parsedRows) {
      // 1. Resolve Member ID
      let memberId: number | undefined = undefined;
      if (row.pan && memberPanMap.has(row.pan.trim().toUpperCase())) {
        memberId = memberPanMap.get(row.pan.trim().toUpperCase());
      } else if (memberMap.has(row.memberName.trim().toLowerCase())) {
        memberId = memberMap.get(row.memberName.trim().toLowerCase());
      }

      if (!memberId) {
        // Create new member in DB
        const [insertedMember] = await db
          .insert(familyMembers)
          .values({
            name: row.memberName.trim(),
            pan: row.pan ? row.pan.trim().toUpperCase() : null,
          })
          .returning({ id: familyMembers.id });

        memberId = insertedMember.id;
        memberMap.set(row.memberName.trim().toLowerCase(), memberId);
        if (row.pan) {
          memberPanMap.set(row.pan.trim().toUpperCase(), memberId);
        }
      }

      // 2. Resolve Scheme ID
      let schemeId: number | undefined = schemeMap.get(
        row.schemeName.trim().toLowerCase()
      );

      if (!schemeId) {
        // Create new scheme in DB
        const [insertedScheme] = await db
          .insert(schemes)
          .values({
            name: row.schemeName.trim(),
            category: "Equity",
          })
          .returning({ id: schemes.id });

        schemeId = insertedScheme.id;
        schemeMap.set(row.schemeName.trim().toLowerCase(), schemeId);
      }

      const cleanFolioNo = row.folioNo.replace(/^'/, "").trim();
      const cleanDate = row.date.trim();
      const cleanTxnType = row.transactionType.trim();
      const normTxnType = normalizeTxType(cleanTxnType);

      // 3. Query all candidate transactions from DB for this member on this date
      const dateTxs = await db
        .select({
          id: transactions.id,
          nav: transactions.nav,
          amount: transactions.amount,
          units: transactions.units,
          schemeId: transactions.schemeId,
          folioNo: transactions.folioNo,
          transactionType: transactions.transactionType,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.memberId, memberId),
            eq(transactions.date, cleanDate)
          )
        );

      // Candidates matching folio AND transactionType (strictly respecting SIP vs Purchase vs Switch)
      const sameTypeCandidates = dateTxs.filter((t) => {
        const dbFolio = (t.folioNo || "").replace(/^'/, "").trim();
        const dbNormType = normalizeTxType(t.transactionType || "");
        return (
          dbFolio === cleanFolioNo &&
          dbNormType.toLowerCase() === normTxnType.toLowerCase() &&
          !matchedDbIds.has(t.id)
        );
      });

      // Step A: Check for exact Amount + NAV match among same-type candidates
      let target = sameTypeCandidates.find((t) => {
        const navDiff = Math.abs(t.nav - row.nav);
        const amountDiff = Math.abs(t.amount - row.amount);
        return navDiff <= 0.0001 && amountDiff <= 0.05;
      });

      if (target) {
        matchedDbIds.add(target.id);
        skippedCount++;
        continue;
      }

      // Step B: If an unmatched same-type candidate exists for this date/folio/type, update it
      target = sameTypeCandidates[0];

      if (target) {
        await db
          .update(transactions)
          .set({
            schemeId,
            nav: row.nav,
            amount: row.amount,
            units: row.units,
            stampDuty: row.stampDuty ?? 0,
            stt: row.stt ?? 0,
            transactionType: cleanTxnType,
            type: row.type,
            folioNo: cleanFolioNo,
          })
          .where(eq(transactions.id, target.id));
        matchedDbIds.add(target.id);
        updatedCount++;
      } else {
        // Step C: No candidate matching (memberId, folioNo, date, transactionType) -> INSERT new record
        const [inserted] = await db
          .insert(transactions)
          .values({
            memberId,
            schemeId,
            folioNo: cleanFolioNo,
            date: cleanDate,
            type: row.type,
            transactionType: cleanTxnType,
            units: row.units,
            nav: row.nav,
            amount: row.amount,
            stampDuty: row.stampDuty ?? 0,
            stt: row.stt ?? 0,
          })
          .returning({ id: transactions.id });

        matchedDbIds.add(inserted.id);
        insertedCount++;
      }
    }

    revalidatePath("/transactions");
    revalidatePath("/holdings");
    revalidatePath("/");

    const details: string[] = [];
    details.push(`${insertedCount} newly added`);
    details.push(`${updatedCount} updated`);
    details.push(`${skippedCount} skipped (already matched)`);

    return {
      success: true,
      message: `Statement Uploaded Successfully: ${details.join(", ")}.`,
      totalProcessed: parsedRows.length,
      insertedCount,
      updatedCount,
      skippedCount,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return {
      success: false,
      message: `Failed to upload transactions: ${errorMsg}`,
      totalProcessed: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error: errorMsg,
    };
  }
}
