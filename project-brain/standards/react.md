# React Standards - react.md

## 1. Component Hierarchy & Modularity
* **Directory Structure**:
  * `src/components/shared/`: Generic, domain-agnostic UI primitives (e.g. `HeaderClient.tsx`, `Loading.tsx`, `AppSidebar.tsx`, reusable modals, pagination, sortable table headers).
  * `src/components/[domain]/`: Feature-driven components (e.g. `src/components/mutual-fund/`, `src/components/watchlist/`, `src/components/ipo/`, `src/components/zerodha/`, `src/components/msfl/`).
  * `src/components/[domain]/[tab]/`: For complex multi-tab modules (e.g. `src/components/mutual-fund/insights/category-alpha/`, `src/components/zerodha/overview/`).
* **Container vs. Presentation Pattern**:
  * **Client Orchestrator / Container** (e.g., `WatchlistDashboard.tsx`, `IpoDashboardClient.tsx`): Manages local state, filter modals, search debouncing, and optimistic updates.
  * **Presentation Components** (e.g., `*Table.tsx`, `*TableRow.tsx`, `*Card.tsx`): Stateless, receive strictly-typed props, focus exclusively on rendering and accessibility.

---

## 2. Purity & Separation of Concerns
* **No Inline Business Logic or Math**: Extract all calculations, metrics aggregation, returns formulas, and date manipulations into `src/helpers/`.
* **No Inline Formatters**: Formatters (e.g., currency `fmtIN`, percentages, dates) must never be re-declared inside components. Import centralized formatters from `src/helpers/formatters.ts`.
* **Zero Database Calls**: Components must never directly query the database or invoke ORM methods. All data fetching is handled by Server Components (via DAL/API layer) or Client Components (via API routes or Server Actions).
* **Zero Component Type Declarations**: All props and state interfaces must reside in `src/types/`.

---

## 3. State & URL Synchronization
* **URL as Single Source of Truth**: For filter states, selected tabs, search queries, and selected reports, synchronize state with URL search params (`useSearchParams`, `useRouter`, `usePathname`).
* **Debounced Inputs**: Wrap text search inputs with `useDebounce` (300ms) before updating URL search params or triggering server queries.
* **Optimistic UI Updates**: Use React 19 `useOptimistic` or immediate state mutation with error rollback for high-frequency user actions (e.g. pinning watchlist items, toggling flags).
