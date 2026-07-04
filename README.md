# Family Portfolio Tracker

An advanced, self-hosted mutual fund portfolio tracking application designed for Indian investors. It aggregates multiple family members' mutual fund holdings, calculates key performance metrics (CAGR, XIRR, and Alpha outperformance over Nifty 50), and tracks SIP mandates, all powered by a local SQLite database.

## 🚀 Key Features

* **Multi-Member Family Aggregation**: Group holdings by family members, track individual contributions, and view consolidated family-wide metrics.
* **In-Depth Financial Metrics**:
  * **XIRR (Internal Rate of Return)**: Computes precise annualized returns based on reconstructed cash flow dates.
  * **CAGR (Compound Annual Growth Rate)**: Weighted average growth rate of active holdings.
  * **Alpha Comparison**: Outperformance metrics relative to the Nifty 50 index (automatically integrates and pulls historical NAVs from SBI Nifty 50 Index Fund).
* **Dynamic Excel Parser**: Seamlessly ingest standard portfolio valuation reports and SIP mandate sheets.
* **Smart Fund Mapping**: Automatically links mutual fund schemes from Excel sheets to real-time public APIs using an **Edit Distance (Fuzzy Match)** string similarity algorithm, with support for manual overrides.
* **SIP Mandate Tracker**: View active SIPs, historical monthly amounts, and overall monthly commitments per member.
* **Upload Tracker**: A calendar-based dashboard tracking when portfolio snapshots were uploaded, alerting you of missing trading days.
* **Asset Allocation Visualizer**: Interactive charts showing asset class ratios (Equity, Debt, Hybrid), market cap sizes, and AMC-wise concentration.

---

## 🛠️ Technology Stack

* **Core**: Next.js 16 (App Router), React 19
* **Styling**: Tailwind CSS, PostCSS
* **Database & ORM**: SQLite (`better-sqlite3`), Drizzle ORM
* **Data Visualization**: Recharts (interactive area, bar, and pie charts)
* **File Processing**: SheetJS (`xlsx`) for parsing Excel sheets
* **Icons & Animation**: Lucide React, Framer Motion

---

## 📂 Project Structure

```text
├── drizzle/                   # Drizzle migration files
├── public/                    # Static assets
└── src/
    ├── app/                   # Next.js App Router pages and Server Actions
    │   ├── allocation/        # Asset allocation dashboard page
    │   ├── family/            # Family members dashboard page
    │   ├── fund/[id]/         # Detailed fund metrics page
    │   ├── holdings/          # Interactive holdings grid page
    │   ├── mapping/           # Fund mapping dashboard page
    │   ├── sips/              # SIP mandates overview page
    │   ├── uploads/           # Upload calendar tracker page
    │   ├── actions.ts         # Server Actions for DB queries and uploads
    │   └── layout.tsx         # Root layout with sidebar navigation
    ├── components/            # Reusable UI component clients
    ├── db/                    # SQLite connection & schema definitions
    └── lib/                   # Math utilities (XIRR, Alpha), parsers & APIs
```

---

## ⚙️ Local Setup & Installation

### Prerequisites
* **Node.js**: `v18` or higher
* **npm** or **yarn**

### 1. Clone & Install Dependencies
Navigate to the project root and install package dependencies:
```bash
npm install
```

### 2. Database Initialization
This project uses SQLite stored locally in the root directory as `portfolio.db`. Push the schema directly to initialize the database:
```bash
npx drizzle-kit push
```

### 3. Run the Development Server
Start the Next.js local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to explore the dashboard.

### 4. Running the Test Utility
To dry-run or verify the parsing of your Excel file without using the web UI, you can use the built-in test script:
```bash
npx tsx src/lib/test-parser.ts <path-to-excel-file>
```

---

## 📊 Excel Sheet Formats

### 1. Portfolio Valuation Excel Sheet
The parser looks for the following layout conventions:
* **As of Date**: Row 2 should contain the snapshot date matching the pattern `as on DD-MM-YYYY` (e.g. `Portfolio Valuation Report as on 01-07-2026`).
* **Member Row Headers**: Each family member's section starts with their name and PAN card number formatted as `Name (PAN_NUMBER)`.
* **Columns**: The sheet must contain headers in row 4 and include columns for:
  * Scheme Name (Column 1)
  * Folio No (Column 2)
  * Balance Units (Column 3)
  * Purchase NAV (Column 4)
  * Purchase Value (Column 5)
  * Current NAV (Column 6)
  * Current Value (Column 7)
  * Absolute Return (Column 11)
  * CAGR (Column 12)

### 2. SIP Mandate Excel Sheet
The SIP parser looks for sheets with "SIP" in the tab name:
* **As of Date**: Extracted from Row 2 matching the pattern `DD-MM-YYYY`.
* **Headers**: Looks for the header row starting with `SR NO.`.
* **Columns**:
  * SR NO.
  * Investor Name
  * Scheme Name
  * Folio No.
  * Following columns contain monthly payment values (e.g., `APR 26`, `MAY 26`), which are used to reconstruct historical SIP flows and calculate the active monthly SIP commitment.

---

## 🔒 Security & Privacy

All processing is done **100% locally** on your machine:
* Excel files are parsed client-side/server-side locally without uploading to external servers.
* No telemetry or external cloud storage is utilized; your data is stored completely inside the `portfolio.db` SQLite file on your filesystem.
