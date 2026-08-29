"use server";

import { revalidatePath } from "next/cache";
import {
  createAnalysisLink,
  updateAnalysisLink,
  deleteAnalysisLink,
} from "@/lib/analysisLinksService";
import { scrapeLinkMetadata } from "@/helpers/linkScraper";
import type { ActionResult } from "@/types/portfolio";
import type {
  CreateAnalysisLinkInput,
  UpdateAnalysisLinkInput,
  ScrapedLinkMetadata,
  AnalysisLink,
} from "@/types/analysisLinks";

/**
 * Server action to preview scraped title before saving
 */
export async function scrapeLinkPreviewAction(
  url: string
): Promise<ActionResult<ScrapedLinkMetadata>> {
  try {
    if (!url || !url.trim()) {
      return { success: false, error: "Please enter a valid URL." };
    }
    const data = await scrapeLinkMetadata(url);
    return { success: true, data };
  } catch (error) {
    console.error("Error previewing link metadata:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch link metadata",
    };
  }
}

/**
 * Server action to add a new link with auto-scraped title
 */
export async function createAnalysisLinkAction(
  input: CreateAnalysisLinkInput
): Promise<ActionResult<AnalysisLink>> {
  try {
    if (!input.url || !input.url.trim()) {
      return { success: false, error: "URL is required" };
    }

    const newLink = await createAnalysisLink(input);
    revalidatePath("/analysis-links");
    return { success: true, data: newLink };
  } catch (error) {
    console.error("Error creating analysis link:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add analysis link",
    };
  }
}

/**
 * Server action to update link
 */
export async function updateAnalysisLinkAction(
  input: UpdateAnalysisLinkInput
): Promise<ActionResult<AnalysisLink>> {
  try {
    const updated = await updateAnalysisLink(input);
    if (!updated) {
      return { success: false, error: "Link not found or failed to update" };
    }
    revalidatePath("/analysis-links");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating analysis link:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update link",
    };
  }
}

/**
 * Server action to delete link
 */
export async function deleteAnalysisLinkAction(
  id: number
): Promise<ActionResult<boolean>> {
  try {
    const success = await deleteAnalysisLink(id);
    revalidatePath("/analysis-links");
    return { success, data: success };
  } catch (error) {
    console.error("Error deleting analysis link:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete link",
    };
  }
}

/**
 * Server action to toggle link pinned status
 */
export async function togglePinAnalysisLinkAction(
  id: number,
  currentPinned: number
): Promise<ActionResult<AnalysisLink>> {
  try {
    const updated = await updateAnalysisLink({
      id,
      pinned: currentPinned ? 0 : 1,
    });
    if (!updated) {
      return { success: false, error: "Failed to toggle pin" };
    }
    revalidatePath("/analysis-links");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error pinning analysis link:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to pin link",
    };
  }
}
