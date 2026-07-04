// DashboardClient is no longer used.
// All tab content is now served via dedicated routes:
//   /         → OverviewPage  (src/app/page.tsx)
//   /family   → FamilyPage   (src/app/family/page.tsx)
//   /holdings → HoldingsPage (src/app/holdings/page.tsx)
//   /mapping  → MappingPage  (src/app/mapping/page.tsx)
// This file is kept as a placeholder to avoid breaking any stale imports.
export default function DashboardClient() {
  return null;
}
