import type { HoldingsCategoryFilters } from "@/types/holdings";

const ALL_CATEGORY_FILTER = "All";

/**
 * Parses the comma-separated category filters stored in the holdings URL.
 */
export function parseCategoryFilters(
  categoryFilter: string | null
): HoldingsCategoryFilters {
  if (!categoryFilter || categoryFilter === ALL_CATEGORY_FILTER) return [];

  return Array.from(
    new Set(
      categoryFilter
        .split(",")
        .map((category) => category.trim())
        .filter((category) => category.length > 0)
    )
  );
}

/**
 * Serializes selected category filters for the holdings URL.
 */
export function serializeCategoryFilters(
  categoryFilters: HoldingsCategoryFilters
): string {
  return categoryFilters.join(",");
}

/**
 * Matches a holding's database scheme category against selected category filters.
 */
export function matchCategoryFilter(
  holdingCategory: string,
  selectedCategories: HoldingsCategoryFilters
): boolean {
  if (selectedCategories.length === 0) return true;
  const normalizedHoldingCategory = (holdingCategory || "")
    .trim()
    .toLowerCase();

  return selectedCategories.some(
    (category) => normalizedHoldingCategory === category.toLowerCase()
  );
}

/**
 * Extracts unique categories dynamically from database schemes category values.
 */
export function getCategoryOptions(
  categories: (string | null | undefined)[]
): string[] {
  const categorySet = new Set<string>();
  for (const cat of categories) {
    if (cat && cat.trim() && cat !== "All" && cat !== "Unknown") {
      categorySet.add(cat.trim());
    }
  }
  return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
}
