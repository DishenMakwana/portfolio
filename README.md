# Family Portfolio Tracker

An advanced, production-ready mutual fund portfolio tracking application designed for Indian investors. It aggregates multiple family members' mutual fund holdings, calculates key performance metrics (CAGR, XIRR, and Alpha outperformance over Nifty 50), and tracks SIP mandates, powered by a PostgreSQL database with dynamic, database-backed pricing caches.

---

## 🚀 Key Features

* **Multi-Member Family Aggregation**: Group holdings by family members, track individual contributions, and view consolidated family-wide metrics.
* **In-Depth Financial Metrics**:
  * **XIRR (Internal Rate of Return)**: Computes precise annualized returns based on reconstructed cash flow dates.
  * **CAGR (Compound Annual Growth Rate)**: Weighted average growth rate of active holdings.
  * **Alpha Comparison**: Outperformance metrics relative to the Nifty 50 index (automatically integrates and pulls historical NAVs from the benchmark UTI Nifty 50 Index Fund Direct Growth).
* **Dynamic Excel Parser**: Seamlessly ingest standard portfolio valuation reports and SIP mandate sheets.
* **Smart Fund Mapping**: Automatically links mutual fund schemes from Excel sheets to real-time public APIs using an **Edit Distance (Fuzzy Match)** string similarity algorithm, with support for manual overrides.
* **SIP Mandate Tracker**: View active SIPs, historical monthly amounts, and overall monthly commitments per member.
* **Upload Tracker**: A calendar-based dashboard tracking when portfolio snapshots were uploaded, alerting you of missing trading days.
* **Asset Allocation Visualizer**: Interactive charts showing asset class ratios (Equity, Debt, Hybrid), market cap sizes, and AMC-wise concentration.
* **Production-Ready & Stateless**: Designed for Vercel/Neon deployment with all cache states persisted in the database.

---

## 🔌 Live NAV Fetching & Caching (`api.mfapi.in`)

To calculate XIRR, volatility metrics, and Nifty 50 Alpha outperformance, the application pulls daily historical Net Asset Value (NAV) price points from the public AMFI api `api.mfapi.in`. 

### The Cache Database Architecture
To remain completely stateless (essential for cold-starts on serverless hosts like Vercel) and avoid hitting API rate limits, the app persists NAV data in two database tables:
1. **`scheme_nav_cache_meta`**: Stores the metadata of fetched funds (`fundHouse`, `schemeType`, `schemeCategory`, `schemeName`) along with a `lastFetchedAt` timestamp.
2. **`scheme_nav_history`**: Stores individual daily historical NAV prices (`date` as `DD-MM-YYYY`, `nav` as float, `fetchedAt` timestamp) with a composite unique index on `(schemeCode, date)` to prevent duplicate entries.

### The Caching Workflow
- **Database Lookup**: First queries the PostgreSQL database for cached data. If the cache exists and is fresh (less than 24 hours old), the values are loaded instantly.
- **AMFI Fetch & Batch Insert**: If the cache is expired or missing, it queries `api.mfapi.in` for the complete daily historical NAV array, upserts the scheme metadata, and batch inserts the price points in chunks of 500 records using `ON CONFLICT DO NOTHING` to bypass parameters limits and duplicate key errors.
- **Failover / Fallback**: If the API call times out or fails, the application falls back gracefully to the latest available NAV data points in the database cache.

---

## 🛠️ Technology Stack

* **Core**: Next.js 16 (App Router), React 19
* **Styling**: Tailwind CSS, PostCSS
* **Database & ORM**: PostgreSQL (`pg` pool connection) with Drizzle ORM
* **Data Visualization**: Recharts (interactive area, bar, and pie charts)
* **File Processing**: SheetJS (`xlsx`) for parsing Excel sheets
* **Icons & Animation**: Lucide React, Framer Motion

---

## 📂 Project Structure

```text
├── drizzle/                   # Drizzle migration files
├── public/                    # Static assets
├── scripts/                   # Utility scripts (data migration, schema updates)
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
    ├── components/            # Reusable UI client components (Framer Motion animations)
    ├── db/                    # PostgreSQL client connection & Drizzle schemas
    └── lib/                   # Math utilities (XIRR, Alpha), parsers & APIs
```

---

## ⚙️ Setup & Deployment

### 1. Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:pass@host:port/dbname?sslmode=require"
DB_SCHEMA="portfolio"
```
* `DATABASE_URL`: Connection string for your local PostgreSQL or remote Neon/Vercel Postgres.
* `DB_SCHEMA`: The custom database schema name where all tables are isolated (defaults to `portfolio`).

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Initialization & Schema Push
Compile schema definitions and create tables in your PostgreSQL database under the custom schema:
```bash
npx drizzle-kit generate
```
Then run the migration script:
```bash
npm run db:migrate-data
```
*(This script dynamically loads the migration SQL, applies schema & table creation, truncates tables, relational-copies all records, and resets PostgreSQL ID sequences.)*

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

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

## 🛡️ Security & Privacy

* Excel files are parsed client-side/server-side locally without uploading to unverified third-party processing servers.
* No telemetry or external cloud storage is utilized; your data is stored completely inside your own private PostgreSQL database.
