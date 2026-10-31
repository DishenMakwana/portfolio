# Performance Standards - performance.md

## 1. Database & Concurrency Optimization
* **No Sequential `await` Database Calls**: Never execute independent database queries or service calls sequentially. Always combine independent queries into a single `Promise.all([ ... ])` batch.
* **Metadata & History Parallelization**: In NAV and price history cache lookup functions (e.g., `getSchemeHistoryForDbCode`, `getBenchmarkHistory`), execute cache metadata (`findFirst`) and historical data (`findMany`) queries concurrently via `Promise.all`.
* **Parallel Period Metric Computations**: When calculating metrics for multiple periods (such as current report vs previous report XIRR / Alpha), execute calculations concurrently using `Promise.all`.
* **Pre-Fetching Shared Lookups (N+1 Elimination)**: Pre-fetch shared lookup tables (e.g., `familyMembers` profile map and `schemes` category/AMC lists) in the primary `Promise.all` query batch at the top of server actions or API routes to eliminate N+1 database queries.
* **Bulk Database Operations**: Never execute `INSERT` or `UPDATE` queries sequentially inside loops. Execute bulk operations in chunks using batch inserts or database transactions.

---

## 2. Caching Strategies & Market-Aware Invalidation
* **Bounded LRU Memory Cache (`BoundedMap`)**: Use `getGlobalCache` in `src/lib/cacheRegistry.ts` to enforce fixed memory bounds (default 200 items) and true O(1) LRU eviction, avoiding memory leaks during long-running Node server lifecycles.
* **Market-Aware Cache TTL**:
  * Indian stock market hours (09:15 to 15:30 IST on working weekdays): Short TTL (`MARKET_HOURS_CACHE_TTL_MS` = 2 minutes).
  * Off-market hours & weekends: Extended TTL (24 hours).
  * Use `isIndianMarketOpen()` to dynamically switch between real-time freshness and maximum off-market cache hit rates.
* **In-Flight Request Deduplication**: Maintain an `inFlight` Map for expensive background promises so simultaneous requests for the same snapshot or fund details await the same pending promise instead of triggering duplicate database computations.
* **HTTP Cache Headers**: Route handlers serving read-only analytical data should return explicit cache control headers (`Cache-Control: private, s-maxage=120, stale-while-revalidate=300`).

---

## 3. Client & Visual Rendering Performance
* **Dynamic Code Splitting**: Heavy modules (Recharts, file parsers, xlsx builders) must be dynamically loaded with `next/dynamic` to keep initial route bundle sizes minimal (<100KB First Load JS).
* **Y-Axis Headroom Padding**: Always calculate dynamic `yDomain` for line/area charts with **15% top & bottom headroom padding** (`Math.max(range * 0.15, 5)`) to prevent peak (High) and trough (Low) reference dots/badges from clipping against SVG canvas boundaries.
* **Smart Edge-Detection for Badges**: Render chart reference badges with smart SVG edge-detection (`x > threshold`) to prevent right-edge container clipping.
* **Adaptive Marker De-Cluttering**: When marker counts exceed threshold (e.g., > 8 transaction dots), suppress inline text labels and reduce dot radius (`r=3.5`, `opacity=0.7`) to maintain high-contrast readability.
* **React Render Memoization**: Wrap computationally heavy data filtering and sorting inside `useMemo`, and wrap callback handlers passed to deeply nested rows inside `useCallback`.
