"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/db";
import {
  familyMembers,
  zerodhaSchemes,
  zerodhaTransactions,
  schemeNavCacheMeta,
} from "@/db/schema";
import { normalizeSchemeName } from "@/helpers/schemeNormalize";
import { calculateMutualFundStampDuty } from "@/helpers/transactions";
import { parseZerodhaCoinCsv } from "@/lib/zerodhaCoinCsvParser";
import { purgeAllApplicationCaches } from "@/actions/portfolio";
import { getFamilyMembers } from "@/lib/portfolioService";
import { getZerodhaMembers, getRawZerodhaSchemes } from "@/lib/zerodhaService";
import type { TransactionUploadResult } from "@/types/transactionUpload";

export async function uploadZerodhaCoinCsvAction(
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
    const parseResult = parseZerodhaCoinCsv(buffer);

    if (parseResult.rows.length === 0) {
      return {
        success: false,
        message:
          parseResult.errors.length > 0
            ? `CSV Parsing Error: ${parseResult.errors.join(", ")}`
            : "No valid complete order records found in the uploaded Coin CSV file.",
        totalProcessed: parseResult.totalRows,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: parseResult.skippedNonComplete,
        error: "No complete orders found",
      };
    }

    // Extract distinct dates from CSV rows to prefetch existing transactions
    const distinctDates = Array.from(
      new Set(parseResult.rows.map((r) => r.tradeDate))
    );

    // Pre-fetch all lookup entities and relevant existing transactions in a single Promise.all batch
    const [
      allFamilyMembers,
      allZerodhaMembers,
      allSchemes,
      allMeta,
      existingTransactions,
    ] = await Promise.all([
      getFamilyMembers(),
      getZerodhaMembers(),
      getRawZerodhaSchemes(),
      db
        .select({
          schemeCode: schemeNavCacheMeta.schemeCode,
          schemeName: schemeNavCacheMeta.schemeName,
          schemeCategory: schemeNavCacheMeta.schemeCategory,
          isinGrowth: schemeNavCacheMeta.isinGrowth,
          isinDivReinvestment: schemeNavCacheMeta.isinDivReinvestment,
        })
        .from(schemeNavCacheMeta),
      distinctDates.length > 0
        ? db
            .select({
              id: zerodhaTransactions.id,
              memberId: zerodhaTransactions.memberId,
              schemeId: zerodhaTransactions.schemeId,
              date: zerodhaTransactions.date,
              units: zerodhaTransactions.units,
              amount: zerodhaTransactions.amount,
              stampDuty: zerodhaTransactions.stampDuty,
              folioNo: zerodhaTransactions.folioNo,
            })
            .from(zerodhaTransactions)
            .where(inArray(zerodhaTransactions.date, distinctDates))
        : Promise.resolve([]),
    ]);

    const familyMap = new Map<string, (typeof allFamilyMembers)[0]>();
    for (const fm of allFamilyMembers) {
      if (fm.clientId) familyMap.set(fm.clientId.trim().toUpperCase(), fm);
      if (fm.pan) familyMap.set(fm.pan.trim().toUpperCase(), fm);
      familyMap.set(fm.name.trim().toLowerCase(), fm);
    }

    // Map schemes by ISIN and normalized names
    const schemeIsinMap = new Map<string, (typeof allSchemes)[0]>();
    const schemeNameMap = new Map<string, (typeof allSchemes)[0]>();
    for (const s of allSchemes) {
      if (s.isin) schemeIsinMap.set(s.isin.trim().toUpperCase(), s);
      schemeNameMap.set(s.name.trim().toLowerCase(), s);
      schemeNameMap.set(normalizeSchemeName(s.name), s);
    }

    // Map schemeNavCacheMeta by ISIN
    const metaIsinMap = new Map<string, (typeof allMeta)[0]>();
    for (const m of allMeta) {
      if (m.isinGrowth) metaIsinMap.set(m.isinGrowth.trim().toUpperCase(), m);
      if (m.isinDivReinvestment)
        metaIsinMap.set(m.isinDivReinvestment.trim().toUpperCase(), m);
    }

    // Map existing transactions for O(1) deduplication check: (memberId, schemeId, date, units)
    const existingTxMap = new Map<string, (typeof existingTransactions)[0]>();
    for (const tx of existingTransactions) {
      existingTxMap.set(
        `${tx.memberId}_${tx.schemeId}_${tx.date}_${tx.units}`,
        tx
      );
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of parseResult.rows) {
      // 1. Resolve Member ID
      const clientIdKey = row.clientId.trim().toUpperCase();
      let targetMember = familyMap.get(clientIdKey);

      if (!targetMember) {
        // Look up Zerodha member info
        const zMember = allZerodhaMembers.find(
          (zm) => zm.clientId.trim().toUpperCase() === clientIdKey
        );

        const panKey = zMember?.pan ? zMember.pan.trim().toUpperCase() : null;
        if (panKey && familyMap.has(panKey)) {
          targetMember = familyMap.get(panKey);
        }

        if (!targetMember) {
          // Create family member
          const [newMember] = await db
            .insert(familyMembers)
            .values({
              name: zMember?.name || `Zerodha Client ${row.clientId}`,
              pan: panKey,
              email: zMember?.email || null,
              mobile: zMember?.phone || null,
              clientId: row.clientId,
              dpName: "ZERODHA BROKING LIMITED",
              accountStatus: "Active",
            })
            .returning();

          targetMember = newMember;
          familyMap.set(clientIdKey, newMember);
          if (panKey) familyMap.set(panKey, newMember);
        }
      }

      const memberId = targetMember.id;

      // 2. Resolve Scheme ID
      const isinKey = row.isin.trim().toUpperCase();
      let targetScheme =
        schemeIsinMap.get(isinKey) ||
        schemeNameMap.get(row.schemeName.trim().toLowerCase()) ||
        schemeNameMap.get(normalizeSchemeName(row.schemeName));

      const navMeta = metaIsinMap.get(isinKey);

      if (!targetScheme) {
        // Create new scheme in zerodhaSchemes
        const schemeName =
          row.schemeName.trim() || navMeta?.schemeName || row.isin;
        const category = navMeta?.schemeCategory || "Mutual Fund";
        const schemeCodeApi = navMeta?.schemeCode || null;

        const [newScheme] = await db
          .insert(zerodhaSchemes)
          .values({
            name: schemeName,
            isin: row.isin,
            category,
            holdingType: "mutual_fund",
            schemeCodeApi,
          })
          .returning();

        targetScheme = newScheme;
        schemeIsinMap.set(isinKey, newScheme);
        schemeNameMap.set(schemeName.toLowerCase(), newScheme);
      } else if (!targetScheme.schemeCodeApi && navMeta?.schemeCode) {
        // Backfill schemeCodeApi if missing
        await db
          .update(zerodhaSchemes)
          .set({ schemeCodeApi: navMeta.schemeCode })
          .where(eq(zerodhaSchemes.id, targetScheme.id));
        targetScheme.schemeCodeApi = navMeta.schemeCode;
      }

      const schemeId = targetScheme.id;
      const calculatedAmount = Math.round(row.units * row.nav * 100) / 100;
      const calculatedStampDuty = calculateMutualFundStampDuty(
        row.transactionMode,
        calculatedAmount,
        row.tradeDate
      );

      // 3. Deduplication Check: (memberId, schemeId, date, units)
      const txKey = `${memberId}_${schemeId}_${row.tradeDate}_${row.units}`;
      const existingTx = existingTxMap.get(txKey);

      if (existingTx) {
        // If existing record is missing folio number, or has unrounded amount or missing stamp duty, update it
        const needsFolioUpdate = !existingTx.folioNo && row.folioNumber;
        const needsAmountUpdate = existingTx.amount !== calculatedAmount;
        const needsStampUpdate =
          (!existingTx.stampDuty || existingTx.stampDuty === 0) &&
          calculatedStampDuty > 0;

        if (needsFolioUpdate || needsAmountUpdate || needsStampUpdate) {
          await db
            .update(zerodhaTransactions)
            .set({
              ...(needsFolioUpdate ? { folioNo: row.folioNumber } : {}),
              ...(needsAmountUpdate ? { amount: calculatedAmount } : {}),
              ...(needsStampUpdate ? { stampDuty: calculatedStampDuty } : {}),
            })
            .where(eq(zerodhaTransactions.id, existingTx.id));
          updatedCount++;
          existingTxMap.set(txKey, {
            ...existingTx,
            folioNo: needsFolioUpdate ? row.folioNumber : existingTx.folioNo,
            amount: needsAmountUpdate ? calculatedAmount : existingTx.amount,
            stampDuty: needsStampUpdate
              ? calculatedStampDuty
              : existingTx.stampDuty,
          });
        } else {
          skippedCount++;
        }
        continue;
      }

      // 4. Insert new transaction
      const [insertedTx] = await db
        .insert(zerodhaTransactions)
        .values({
          memberId,
          schemeId,
          folioNo: row.folioNumber,
          date: row.tradeDate,
          type: row.transactionMode,
          rawTransactionType: row.transactionMode,
          units: row.units,
          nav: row.nav,
          amount: calculatedAmount,
          stampDuty: calculatedStampDuty,
          broker: "Zerodha Coin",
          assetType: "mutual_fund",
          uploadedAt: new Date().toISOString(),
        })
        .returning({
          id: zerodhaTransactions.id,
          memberId: zerodhaTransactions.memberId,
          schemeId: zerodhaTransactions.schemeId,
          date: zerodhaTransactions.date,
          units: zerodhaTransactions.units,
          amount: zerodhaTransactions.amount,
          stampDuty: zerodhaTransactions.stampDuty,
          folioNo: zerodhaTransactions.folioNo,
        });

      if (insertedTx) {
        existingTxMap.set(txKey, insertedTx);
      }
      insertedCount++;
    }

    await purgeAllApplicationCaches();
    revalidatePath("/zerodha");
    revalidatePath("/fund");

    return {
      success: true,
      message: `Successfully processed ${parseResult.rows.length} completed Coin orders. Inserted: ${insertedCount}, Updated folios: ${updatedCount}, Skipped duplicates: ${skippedCount}.`,
      totalProcessed: parseResult.totalRows,
      insertedCount,
      updatedCount,
      skippedCount,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to upload Coin CSV";
    return {
      success: false,
      message: `Error processing file: ${errorMsg}`,
      totalProcessed: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error: errorMsg,
    };
  }
}
