import { db } from "@/db/db";
import { msflSchemes, zerodhaSchemes } from "@/db/schema";
import { eq } from "drizzle-orm";

export type MarketCapCategory =
  "Large Cap" | "Mid Cap" | "Small Cap" | "Micro Cap";

export interface StockClassification {
  sector: string;
  marketCapCategory: MarketCapCategory;
}

/**
 * Fallback pattern classifier used strictly when initializing a new unclassified stock.
 * No hardcoded dictionary array is maintained.
 */
export function inferFallbackClassification(
  symbolOrName: string
): StockClassification {
  if (!symbolOrName) {
    return { sector: "Other", marketCapCategory: "Small Cap" };
  }

  const cleaned = symbolOrName
    .toUpperCase()
    .replace(/\.NS$/, "")
    .replace(/\.BO$/, "")
    .replace(/-BL$/, "")
    .trim();

  if (
    cleaned.includes("BANK") ||
    cleaned.includes("FIN") ||
    cleaned.includes("CAPITAL")
  ) {
    return { sector: "Financial Services", marketCapCategory: "Large Cap" };
  }
  if (cleaned.includes("ENERGY") || cleaned.includes("POWER")) {
    return { sector: "Power & Utilities", marketCapCategory: "Mid Cap" };
  }
  if (cleaned.includes("GAS") || cleaned.includes("PETRO")) {
    return { sector: "Oil & Gas", marketCapCategory: "Mid Cap" };
  }
  if (
    cleaned.includes("AUTO") ||
    cleaned.includes("MOTORS") ||
    cleaned.includes("LEYS")
  ) {
    return { sector: "Automobiles", marketCapCategory: "Large Cap" };
  }
  if (
    cleaned.includes("STEEL") ||
    cleaned.includes("MINE") ||
    cleaned.includes("IRON")
  ) {
    return { sector: "Metals & Mining", marketCapCategory: "Large Cap" };
  }
  if (
    cleaned.includes("CHEM") ||
    cleaned.includes("PHARMA") ||
    cleaned.includes("BIO")
  ) {
    return { sector: "Healthcare & Chemicals", marketCapCategory: "Small Cap" };
  }
  if (
    cleaned.includes("TECH") ||
    cleaned.includes("INFO") ||
    cleaned.includes("TELE")
  ) {
    return { sector: "Technology & Telecom", marketCapCategory: "Mid Cap" };
  }

  return { sector: "Diversified / Other", marketCapCategory: "Small Cap" };
}

/**
 * Fetches stock sector and marketCapCategory directly from PostgreSQL database.
 */
export async function getMsflStockClassificationFromDb(
  symbol: string
): Promise<StockClassification | null> {
  const row = await db.query.msflSchemes.findFirst({
    where: eq(msflSchemes.name, symbol),
  });

  if (row && row.sector && row.marketCapCategory) {
    return {
      sector: row.sector,
      marketCapCategory: row.marketCapCategory as MarketCapCategory,
    };
  }

  return null;
}

/**
 * Updates or persists stock classification into PostgreSQL database.
 */
export async function updateMsflStockClassificationInDb(
  symbol: string,
  sector: string,
  marketCapCategory: MarketCapCategory
): Promise<void> {
  await db
    .update(msflSchemes)
    .set({
      sector,
      marketCapCategory,
    })
    .where(eq(msflSchemes.name, symbol));
}

/**
 * Fetches Zerodha stock classification directly from PostgreSQL database.
 */
export async function getZerodhaStockClassificationFromDb(
  symbol: string
): Promise<StockClassification | null> {
  const row = await db.query.zerodhaSchemes.findFirst({
    where: eq(zerodhaSchemes.name, symbol),
  });

  if (row && row.sector && row.marketCapCategory) {
    return {
      sector: row.sector,
      marketCapCategory: row.marketCapCategory as MarketCapCategory,
    };
  }

  return null;
}

/**
 * Updates or persists Zerodha stock classification into PostgreSQL database.
 */
export async function updateZerodhaStockClassificationInDb(
  symbol: string,
  sector: string,
  marketCapCategory: MarketCapCategory
): Promise<void> {
  await db
    .update(zerodhaSchemes)
    .set({
      sector,
      marketCapCategory,
    })
    .where(eq(zerodhaSchemes.name, symbol));
}
