# Frontend Reference - frontend.md

## Component Directory Structure

Components are organized into domain-specific subdirectories under `src/components/` for readability and scaling:

### 1. Shared / Common UI (`@/components/shared/`)
*   `MetricCard.tsx`: Standard stats card with radial gradient overlays and hover animations.
*   `CagrBar.tsx`: Progress bar scaling CAGR relative to portfolio max.
*   `DonutChart.tsx`: Allocation donut chart with hover slice states.
*   `MembersBarChart.tsx`: Leaderboard SVG bar chart.
*   `AllocationAnalysisTab.tsx`: Shared CAGR bubble, Lollipop, and Absolute Return combo graphs.
*   `AppSidebar.tsx` / `HeaderClient.tsx`: Base layouts and header client actions.
*   `DeleteReportButton.tsx` / `UploadTrackerControls.tsx` / `UploadedFilesList.tsx`: Upload & file tracking controls.
*   `DashboardClient.tsx`: Base dashboard wrapper.

### 2. Main Mutual Fund Module (`@/components/mutual-fund/`)
*   `InsightsDashboard.tsx`: Main dashboard entry.
*   `overview/OverviewTab.tsx`: Main overview metrics and allocation weight charts.
*   `holdings/HoldingsTab.tsx`: Flat positions spreadsheet data grid.
*   `members/MembersTab.tsx`: Per-member performance comparison summaries.
*   `mapping/MappingTab.tsx`: Missing API scheme mapping control.
*   `allocation/AllocationClient.tsx`: Asset type/cap allocation charts.
*   `sips/SipsClient.tsx`: Systematic Investment Plan month-by-month tables.
*   `fund-details/FundDetailsClient.tsx`: Factsheet, Beta/Sharpe ratios, and NAV chart.

### 3. Zerodha Module (`@/components/zerodha/`)
*   `ZerodhaDashboard.tsx`: Main Zerodha entry screen.
*   `overview/ZerodhaOverviewTab.tsx`: Stats and index comparison cards.
*   `stocks/ZerodhaStocksTab.tsx`: Stocks holding table.
*   `funds/ZerodhaFundsTab.tsx`: Mutual funds holding table.
*   `mapping/ZerodhaMappingTab.tsx`: Scheme API mappings for Zerodha.
*   `snapshots/ZerodhaSnapshotsTab.tsx`: Spreadsheet registry and parser.
*   `insights/ZerodhaInsightsTab.tsx`: Graph-level AMC / Category Analysis & category overlaps.

### 4. MSFL Module (`@/components/msfl/`)
*   `MsflDashboardClient.tsx`: Main MSFL portfolio stock metric lists and leaderboards.

### 5. Bullion Module (`@/components/bullion/`)
*   `BullionClient.tsx`: Physical gold/silver asset lists and live value aggregators.


---

## Key Frontend Features & Layout Details

### 1. Descending Chronological Month Columns
In `SipsClient.tsx`, month column names (e.g. `JUL 26`, `JUN 26`, `MAY 26`) are sorted in descending order of dates (newest first). This is calculated on the client side using:
```typescript
const monthCols = [...unsortedMonthCols].sort((a, b) => {
  return parseMonthYear(b).getTime() - parseMonthYear(a).getTime();
});
```

### 2. SIP Totals Calculations
*   **Per-Member Totals**: Rendered inside table footers (`tfoot`) dynamically aggregating the amounts of all user rows for each month.
*   **Grand Totals Row**: Rendered at the bottom of the page showing active mandate counts and month-by-month family totals.
*   **Total Monthly SIP Card**: Shows the overall recurring SIP amounts (active mandates only) computed dynamically.
