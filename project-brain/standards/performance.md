# Performance Standards - performance.md

## Database & Server Action Concurrency Guidelines
* **No Sequential `await` Database Calls**: Never `await` independent database queries or service calls sequentially. Always combine independent database calls into a single `Promise.all([ ... ])` batch.
* **Metadata & History Parallelization**: In NAV and price history cache lookup functions (e.g., `getSchemeHistoryForDbCode`, `getBenchmarkHistory`), execute cache metadata (`findFirst`) and historical data (`findMany`) queries concurrently via `Promise.all`.
* **Parallel Period Metric Computations**: When calculating metrics for multiple periods (such as current report vs previous report XIRR / Alpha via `calculateAlpha`), execute calculations concurrently using `Promise.all`.
* **Pre-Fetching Shared Lookups**: Pre-fetch shared lookup tables (e.g., `familyMembers` profile map and `schemes` category/AMC lists) in the primary `Promise.all` query batch at the top of server actions to eliminate N+1 database queries.
* **Bulk Database Operations**: Never execute `INSERT` or `UPDATE` queries sequentially inside a loop. Execute bulk operations in chunks using batch inserts or database transactions.

## Chart & Visual Performance Standards
* **Y-Axis Headroom Padding**: Always calculate dynamic `yDomain` for line/area charts with **15% top & bottom headroom padding** (`Math.max(range * 0.15, 5)`) to prevent peak (High) and trough (Low) reference dots/badges from clipping against SVG canvas boundaries.
* **Smart Edge-Detection for Badges**: Render chart reference badges with smart SVG edge-detection (`x > threshold`) to prevent right-edge container clipping.
* **Adaptive Marker De-Cluttering**: When marker counts exceed threshold (e.g., > 8 transaction dots), suppress inline text labels and reduce dot radius (`r=3.5`, `opacity=0.7`) to maintain high-contrast readability of peak/trough badges.
