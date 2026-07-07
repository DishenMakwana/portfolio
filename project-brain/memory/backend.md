# Backend Reference - backend.md

## Core Server Actions
Located in `src/app/actions.ts`:
*   `uploadReportAction(formData)`: Receives validation spreadsheet, parses tabs, upserts Snapshots, members, and holdings records.
*   `getDashboardDataAction(reportId)`: Main engine that aggregates portfolio, member, and holding summaries. Optimized via pre-fetched member CAGRs and concurrent execution.
*   `deleteReportAction(reportId)`: Deletes report snapshots and dependent holding rows.
*   `uploadSipAction(formData)`: Standardized entry gate for parsing and uploading "My SIP's" excel sheets.
*   `clearSipMandatesAction()`: Truncates mandates and transaction history.

---

## Metrics & Custom Calculations

### 1. XIRR & Alpha
Computed in `src/lib/alpha.ts` and `src/lib/xirr.ts`. It maps buy/sell cashflows and valuation snapshots, solving for XIRR iteratively.

### 2. Benchmark NAV Lookup
Benchmark performance references the Nifty 50 Index (code `"120716"`). Lookups utilize an in-memory Promise-level cache (`schemeHistoryCache` inside `alpha.ts`) to avoid duplicate DB queries.

### 3. Dynamic SIP Running Status Rules
Located in `src/lib/sipParser.ts`:
*   **Active vs. Paused Status**: A SIP is marked **Active** if it has a non-zero payment in either the latest month column or the second-to-latest month column. This handles current-running months where the transaction is pending execution or has not yet been processed in the sheet, avoiding false "Paused" flags.
*   **Canonical Monthly Amount**: Computed as the mode (most common non-zero value) of the transaction history to handle variations in monthly installments.

### 4. SIP Monthly Paid Amount Month Updates
Located in `src/lib/portfolioService.ts`:
*   When uploading same or new Excel files, the system retains existing historical mandates and updates the monthly amounts paid via a bulk SQL upsert. Old historical data is never deleted or altered.
