# Changelog - changelog.md

## [2026-07-07] Scaffolding & Optimizations
### Added
*   `project-brain` directory containing system layers, memory layers, review checklists, cache, runtime specifications, task tracking, and graph schemas.
*   Setup standards guidelines for TypeScript compile checks, naming casing, and performance expectations.
*   Setup reviews criteria for checking safety and metrics efficiency.
*   In-memory `schemeHistoryCache` promise lookup cache inside `alpha.ts` to prevent redundant queries.

### Modified
*   `walkthrough.md` to map new folders structures.
*   Parallelized page-level routes (`/`, `/holdings`, `/fund/[id]`, `/mapping`) using `Promise.all` data retrieval.
*   Optimized `getDashboardDataAction` by single-query pre-fetching of member CAGRs.

---

## [Past Logs] Historical Implementations
### Added
*   Database performance indexes on foreign key fields inside `schema.ts` to optimize retrieval speeds.
*   Native drizzle client configuration options in `src/db/db.ts` to log generated queries correctly.
*   Chronological descending order months column sorting in `SipsClient.tsx` using `parseMonthYear` date-time evaluation.

### Modified
*   Updated `saveSipMandates` to preserve older history rows on file uploads, only updating paid amounts.
*   Modified SIP status logic in `sipParser.ts` to treat a mandate as active if paid in the latest or second-latest month.
