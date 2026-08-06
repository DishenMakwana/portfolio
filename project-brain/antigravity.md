# Antigravity Developer Instructions & Coding Standards

This document establishes the code organization, refactoring, async performance, and quality standards for Antigravity and other AI coding assistants working on this project.

## 1. Code Reusability & Helpers
*   **Decouple Helper Functions**: All helper functions, utility formulas, or calculations defined inside page files, components, hooks, or routers must be extracted into the `src/helpers/` directory.
*   **Domain-Based Files**: Organize helpers into logically named files based on responsibility (e.g., `allocation.ts`, `dates.ts`, `formatters.ts`).
*   **DRY Principle**: Never redefine or duplicate the same utility logic inside multiple component files. Import the centralized helper functions instead.

## 2. Centralized Interfaces & Type Definitions
*   **Centralize Shared Types**: Move all reusable interfaces, type aliases, enums, and schema types out of page/component files and into the `src/types/` folder.
*   **File Organization**: Organize files by feature or domain (e.g., `insights.ts`, `zerodha.ts`, `portfolio.ts`, `fund-details.ts`).
*   **Strict Types**: Do not use the `any` keyword. Ensure strict typing for all variables, function arguments, and return types.
*   **Local Exception**: A type or interface may remain local to a file only if it is used exclusively in that file and is highly unlikely to be reused.

## 3. Directory Layout & Structure
*   **Separate Concerns**: Keep the `src/app/` directory focused solely on Next.js routing and page-level container layout.
*   **Modular Component Folders**: Components should live in structured directories under `src/components/` (e.g., `src/components/shared/` for reusable components, `src/components/mutual-fund/` for main MF modules, `src/components/zerodha/` for Zerodha portfolio screens).
*   **Tab-Level Nesting**: If a dashboard module (such as Zerodha or Insights) contains multiple tabs, create a sub-folder named after the tab (e.g., `src/components/zerodha/overview/`, `src/components/zerodha/stocks/`) to store its tab-specific sub-components.

## 4. Async Concurrency & Page Load Performance
*   **No Sequential Database Awaits**: Never execute independent database queries or server actions sequentially. Always combine independent queries into a single `Promise.all([ ... ])` batch.
*   **Parallel NAV & Metadata Fetching**: In NAV cache functions (`getSchemeHistoryForDbCode`, `getBenchmarkHistory`), execute cache metadata (`findFirst`) and history (`findMany`) queries concurrently.
*   **Parallel Metric Computations**: Calculate current report and previous report metrics (`calculateAlpha`) in parallel using `Promise.all`.
*   **Pre-Fetch Lookups**: Pre-fetch shared lookup datasets (e.g., `familyMembers` and `schemes`) in the initial `Promise.all` batch at the top of server actions to eliminate N+1 query overhead.

## 5. Chart & Visual UI Standards
*   **Y-Axis Headroom Padding**: Always calculate dynamic `yDomain` for line/area charts with a minimum **15% top & bottom headroom padding** (`Math.max(range * 0.15, 5)`) to prevent peak (High) and trough (Low) reference dots/badges from clipping against SVG canvas boundaries.
*   **Smart SVG Edge Detection**: Position SVG label badges dynamically with edge-detection checks (`x > 620`) to prevent right-edge container clipping.
*   **Adaptive Marker De-Cluttering**: When marker counts exceed threshold (e.g., > 8 transaction dots), suppress inline text labels and reduce dot radius (`r=3.5`, `opacity=0.7`) to maintain high-contrast readability of peak/trough badges.

## 6. Verification Checklists
*   **Static Analysis**: Always run `npm run lint` to check for linter or unused variable warnings.
*   **Code Formatting**: Always run `npm run format` to ensure Prettier/formatting compliance before pushing.
*   **Production Build**: Verify all changes by running `npm run build` to guarantee successful Next.js Turbopack compilation.
