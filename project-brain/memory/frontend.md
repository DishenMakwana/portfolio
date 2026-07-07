# Frontend Reference - frontend.md

## Client Components
*   `OverviewTab`: Renders the high-level XIRR and Alpha cards, plus portfolio asset allocation charts.
*   `HoldingsTab`: Multi-column data grid listing fund positions, units, purchase value, current value, CAGR, XIRR, and Alpha. Filters by family member.
*   `AllocationClient`: Premium visualization of allocation details by asset category, cap, and fund houses using customized Recharts charts.
*   `MembersTab`: Interactive summary showing performance breakdown by family member, including CAGR/XIRR comparisons.
*   `SipsClient`: Tracks live SIP mandates with running status displays.

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
