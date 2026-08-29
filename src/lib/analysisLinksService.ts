import { db } from "@/db/db";
import { analysisLinks } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import type {
  AnalysisLink,
  CreateAnalysisLinkInput,
  UpdateAnalysisLinkInput,
  AnalysisLinksStats,
} from "@/types/analysisLinks";
import { scrapeLinkMetadata } from "@/helpers/linkScraper";

let tableEnsured = false;
async function ensureAnalysisLinksTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    const schemaName = process.env.DB_SCHEMA || "portfolio";
    await db.execute(
      sql.raw(`
      CREATE SCHEMA IF NOT EXISTS "${schemaName}";
      CREATE TABLE IF NOT EXISTS "${schemaName}"."analysis_links" (
        "id" serial PRIMARY KEY NOT NULL,
        "url" text NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "domain" text NOT NULL,
        "favicon_url" text,
        "category" text DEFAULT 'General' NOT NULL,
        "pinned" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "analysis_links_category_idx" ON "${schemaName}"."analysis_links" USING btree ("category");
      CREATE INDEX IF NOT EXISTS "analysis_links_created_at_idx" ON "${schemaName}"."analysis_links" USING btree ("created_at");
    `)
    );
    tableEnsured = true;
  } catch (e) {
    console.warn("Could not ensure analysis_links table:", e);
  }
}

/**
 * Fetch all stored analysis links ordered by pinned status and creation date
 */
export async function getAnalysisLinks(): Promise<AnalysisLink[]> {
  await ensureAnalysisLinksTable();
  try {
    const rows = await db
      .select()
      .from(analysisLinks)
      .orderBy(desc(analysisLinks.pinned), desc(analysisLinks.createdAt));

    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
    }));
  } catch (error) {
    console.error("Error fetching analysis links:", error);
    return [];
  }
}

/**
 * Calculate KPI summary stats for analysis links
 */
export function calculateAnalysisLinksStats(
  links: AnalysisLink[]
): AnalysisLinksStats {
  const categories = new Set<string>();
  const domainMap = new Map<string, number>();
  let pinnedCount = 0;

  for (const l of links) {
    if (l.category) categories.add(l.category);
    if (l.pinned) pinnedCount++;
    if (l.domain) {
      domainMap.set(l.domain, (domainMap.get(l.domain) || 0) + 1);
    }
  }

  const topDomains = Array.from(domainMap.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    totalLinks: links.length,
    totalCategories: categories.size,
    topDomains,
    pinnedCount,
  };
}

/**
 * Create a new analysis link with automatic title/meta scraping if title is omitted
 */
export async function createAnalysisLink(
  input: CreateAnalysisLinkInput
): Promise<AnalysisLink> {
  await ensureAnalysisLinksTable();
  const metadata = await scrapeLinkMetadata(input.url);

  const finalTitle = input.title?.trim() || metadata.title;
  const finalDescription = input.description?.trim() || metadata.description;
  const finalCategory = input.category?.trim() || "General";

  const [inserted] = await db
    .insert(analysisLinks)
    .values({
      url: metadata.url,
      title: finalTitle,
      description: finalDescription,
      domain: metadata.domain,
      faviconUrl: metadata.faviconUrl,
      category: finalCategory,
      pinned: input.pinned ? 1 : 0,
    })
    .returning();

  return {
    ...inserted,
    createdAt: inserted.createdAt
      ? new Date(inserted.createdAt).toISOString()
      : "",
    updatedAt: inserted.updatedAt
      ? new Date(inserted.updatedAt).toISOString()
      : "",
  };
}

/**
 * Update an existing analysis link
 */
export async function updateAnalysisLink(
  input: UpdateAnalysisLinkInput
): Promise<AnalysisLink | null> {
  const updateData: Partial<typeof analysisLinks.$inferInsert> = {};

  if (input.url !== undefined) {
    updateData.url = input.url;
    try {
      const parsed = new URL(
        input.url.startsWith("http") ? input.url : `https://${input.url}`
      );
      updateData.domain = parsed.hostname.replace(/^www\./, "");
      updateData.faviconUrl = `https://www.google.com/s2/favicons?domain=${updateData.domain}&sz=64`;
    } catch {
      // Keep existing domain
    }
  }
  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.description !== undefined)
    updateData.description = input.description.trim();
  if (input.category !== undefined)
    updateData.category = input.category.trim() || "General";
  if (input.pinned !== undefined) updateData.pinned = input.pinned ? 1 : 0;

  const [updated] = await db
    .update(analysisLinks)
    .set(updateData)
    .where(eq(analysisLinks.id, input.id))
    .returning();

  if (!updated) return null;

  return {
    ...updated,
    createdAt: updated.createdAt
      ? new Date(updated.createdAt).toISOString()
      : "",
    updatedAt: updated.updatedAt
      ? new Date(updated.updatedAt).toISOString()
      : "",
  };
}

/**
 * Delete an analysis link by ID
 */
export async function deleteAnalysisLink(id: number): Promise<boolean> {
  const deleted = await db
    .delete(analysisLinks)
    .where(eq(analysisLinks.id, id))
    .returning();

  return deleted.length > 0;
}
