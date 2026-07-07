# Performance Standards - performance.md

## Database Performance Guidelines
*   **Indexing**: Every foreign key and query lookup condition column must have indexes mapped (e.g. `report_id`, `scheme_id`, `member_id`, `date`).
*   **Parallel Fetching**: Use `Promise.all` in all data routes to prevent blockages.
*   **Request-Level Caching**: Repetitive queries (like benchmark codes) must be cached in memory inside the request lifecycle.
*   **Bulk Operations**: Never execute INSERT/UPDATE queries sequentially inside a loop. Execute bulk operations in transactions.
