# Naming & Architecture Conventions - naming.md

## 1. Identifiers & Naming Rules
* **Database Tables & Columns**: Always use `snake_case` (e.g. `watchlist_schemes`, `scheme_code_api`, `is_pinned`, `as_of_date`).
* **TypeScript Variables & Functions**: Always use `camelCase` (e.g. `getDashboardDataAction`, `unmappedCount`, `calculateHistoricalReturns`).
* **React Components**: Always use `PascalCase` (e.g. `OverviewTab`, `HeaderClient`, `WatchlistTableRow`).
* **Types, Interfaces & Enums**: Always use `PascalCase` (e.g. `WatchlistFundDetails`, `ApiResponse`, `ReportSummary`).
* **Constants**: Always use `UPPER_SNAKE_CASE` (e.g. `DEFAULT_BENCHMARK_CODE`, `MARKET_HOURS_CACHE_TTL_MS`, `ROLLING_HORIZON_OPTIONS`).
* **File Names**:
  * Component files: `PascalCase.tsx` (e.g. `WatchlistDashboard.tsx`).
  * Helper files: `camelCase.ts` (e.g. `formatters.ts`, `rollingReturns.ts`).
  * Service files: `camelCaseService.ts` (e.g. `watchlistService.ts`, `portfolioService.ts`).
  * Constant files: `camelCase.ts` in `src/constants/` (e.g. `portfolio.ts`, `routes.ts`).
  * Route handlers: `src/app/api/[domain]/[resource]/route.ts`.

---

## 2. Directory Responsibilities
* `src/app/`: Next.js App Router pages, layouts, error boundaries, and REST API route handlers (`src/app/api/`).
* `src/components/`: Modular UI components. Zero database logic, zero local interfaces.
* `src/constants/`: Centralized frozen constants (`as const`), configuration maps, lookup defaults.
* `src/helpers/`: Pure utility functions, formatters, calculations, math, date handling.
* `src/lib/`: Domain business logic, database queries (Drizzle ORM), third-party API integration, cache management.
* `src/services/` or `src/lib/api/`: Typed API client abstraction connecting frontend to backend endpoints.
* `src/types/`: Centralized TypeScript interfaces, types, DTO contracts, enum definitions.
