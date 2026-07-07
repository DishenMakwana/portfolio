# Database Reference - database.md

## Database Schema (PostgreSQL)
Defined in `src/db/schema.ts` under the schema namespace `"portfolio"` (dynamically loaded via `DB_SCHEMA` env var).

### Core Tables
1.  **reports**: Portfolio snapshots table.
2.  **family_members**: Pan numbers and member names.
3.  **member_report_cagrs**: Holds cached grand total CAGR per family member per report snapshot.
4.  **schemes**: Mutual fund scheme names, categories, and API code mapping.
5.  **holdings_snapshot**: Snapshot holdings showing balance units, purchase, and current valuation.
6.  **transactions**: Historic buy/sell logs per member and fund.
7.  **sip_mandates**: Mandate terms, folio numbers, start dates, and status (isActive).
8.  **sip_transactions**: Month-by-month paid amounts linked to mandates.
9.  **scheme_nav_cache_meta** & **scheme_nav_history**: In-memory API NAV data for daily metrics.

---

## Index Optimization Strategy
To resolve performance bottlenecks and query latency, indexing has been applied to all foreign keys and conditional lookup columns:

### Index Definitions in `schema.ts`:
*   `member_report_cagrs`: `report_id` and `member_id`.
*   `holdings_snapshot`: `report_id`, `member_id`, and `scheme_id`.
*   `transactions`: `member_id`, `scheme_id`, and `source_report_id`.
*   `sip_mandates`: `member_id` and `scheme_id`.
*   `sip_transactions`: `sip_mandate_id` and a unique constraint on `(sip_mandate_id, month)`.

---

## Migration & Sync Configurations
*   We use standard `drizzle-kit` push and generate scripts to deploy updates to the PostgreSQL schema.
*   **Database Sync Command**: `npm run db:push` / `npm run db:migrate`.

## Drizzle Logger Setup
*   Configured with Drizzle's native logging option in `src/db/db.ts`:
    ```typescript
    export const db = drizzle(pool, { schema, logger: true });
    ```
    This prints out SQL query executions directly in the development console while avoiding custom stdout interception conflicts.
