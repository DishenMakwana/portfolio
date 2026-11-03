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

---

## 🌐 External Data Sources & Storage Architecture

This application aggregates financial market data, broker exports, fund analytics, and macroeconomic indicators from several public APIs, official portals, headless web scrapers, and local report parsers. All external data points are normalized, validated, and persisted directly in your PostgreSQL database (`portfolio` schema) with a multi-tiered in-memory and database cache.

### 1. Data Sources by Asset Class & Feature

| Category / Asset Class | Data Source / Provider | Protocol & Endpoints | Information Fetched | Database Storage Target |
| :--- | :--- | :--- | :--- | :--- |
| **Stocks & Equities** | **Yahoo Finance** | HTTPS REST API<br>`query2.finance.yahoo.com/v8/finance/chart/{ticker}`<br>`period1=0&period2={now}&interval=1d` | Complete daily historical closing prices since original exchange listing date, splits, bonus adjustments, trading volume, currency, and market status. Supports NSE (`.NS`) and BSE (`.BO`) tickers. | `zerodha_scheme_nav_history`<br>`msfl_scheme_nav_history` |
| **Stock Fundamentals & Corporate Health** | **Groww Web & Internal APIs** | HTTPS Entity API & Playwright Scraper<br>`groww.in/v1/api/search/v1/entity?entity_type=stocks`<br>`groww.in/stocks/{slug}` | Real-time valuation multiples (P/E, P/B, Industry P/E, Debt-to-Equity, Market Cap, ROE, EPS), founding year, executive leadership, business description, 1Y & 3Y revenue and net profit growth rates, and quarterly shareholding distribution (Promoters, FIIs, DIIs, Mutual Funds, Retail). | `stock_fundamentals` |
| **Mutual Funds (Daily NAVs)** | **AMFI via `mfapi.in`** | HTTPS REST API<br>`api.mfapi.in/mf/{schemeCode}` | Complete historical Net Asset Value (NAV) daily timeline from scheme inception date to present day, AMC name, scheme code, scheme type (Open-ended, Close-ended), and investment category. | `scheme_nav_history`<br>`zerodha_scheme_nav_history`<br>`watchlist_scheme_nav_history` |
| **Specialized Investment Funds (SIF / AIF)** | **AMFI Official Portal & Upvaly FinAPI** | HTTPS Report Endpoint & REST API<br>`portal.amfiindia.com/SIF_DownloadNAVHistoryReport.aspx`<br>`finapi.upvaly.com/api/mf/isin/{isin}` | Daily NAV price records for Specialized Investment Funds, Alternatives, and Long-Short schemes that are not indexed by conventional retail aggregators. | `scheme_nav_history`<br>`msfl_scheme_nav_history` |
| **Fund Rankings & Peer Analysis** | **Groww Mutual Funds** | Automated Headless Playwright Scraper<br>`groww.in/mutual-funds/{slug}` | Annualised returns (1Y, 3Y, 5Y), absolute returns, benchmark returns, category average returns, scheme rank within category, risk-adjusted ratios (Beta, Sharpe, Sortino, Alpha), expense ratios, exit loads, stamp duty, asset allocation, and market cap breakdown (Large, Mid, Small). | `scheme_category_rankings` |
| **Fund Portfolio Holdings & Risk Profile** | **Value Research Online (VRO)** | Automated Headless Playwright Scraper<br>`valueresearchonline.com/funds/{id}` | Sector weight percentages, top 10 company equity holdings with weightages, fund risk ratings, Standard Deviation, Sharpe ratio, Sortino ratio, Beta, and portfolio turnover. | `watchlist_fund_analytics` |
| **Precious Metals (Bullion)** | **CoinGecko API** | HTTPS REST API<br>`api.coingecko.com/api/v3/simple/price`<br>`api.coingecko.com/api/v3/coins/{id}/market_chart` | Real-time spot prices and 1-Year (365 days) daily historical price corridor for Gold 24K (`pax-gold`), Silver 999 (`kinesis-silver`), and Platinum PT950 in INR. Converted from troy ounces with Indian retail import duty, GST, handling overheads, and city basis differentials. | `bullion_history` |
| **Market Benchmarks** | **AMFI / Yahoo Finance** | UTI Nifty 50 Index Fund Direct Growth (`mfapi: 120716`) & Index Tickers (`^NSEI`, `^BSESN`) | Benchmark index daily NAV timeline utilized for calculating Alpha outperformance, Beta sensitivity, and dynamic category-level asset allocation modeling. | `benchmark_nav_history`<br>`benchmark_rules`<br>`benchmark_category_ratios` |
| **Portfolio Valuation & Broker Ledger** | **User Report Ingestion** | Local SheetJS (`xlsx`) & CSV Parsers | Family mutual fund portfolio valuation snapshots, SIP mandates, Zerodha Coin trade transactions, MSFL broker transaction logs, and IPO allotment / sell trade records. | `reports`<br>`holdings_snapshot`<br>`transactions`<br>`sip_mandates`<br>`zerodha_*`<br>`msfl_*`<br>`ipo_*` |
| **Research Bookmarks & Web Favicons** | **Google Favicon API** | HTTPS REST API<br>`www.google.com/s2/favicons?domain={domain}&sz=64` | High-resolution 64px site favicons for external investment research articles, broker portals, analysis tools, and market trackers. | `analysis_links` |

---

### 2. Database Storage Schema Reference

Every piece of data is persisted in a designated PostgreSQL table within the isolated `portfolio` database schema:

```text
portfolio/
├── Core Portfolio & Holdings (Mutual Funds)
│   ├── reports                          # Snapshot metadata: as-of date, upload timestamp, file name, total CAGR
│   ├── family_members                   # Member master list: PAN, Demat details, KYC, nominee, linked bank account
│   ├── member_report_cagrs              # Calculated individual member CAGR per uploaded snapshot
│   ├── schemes                          # Unique mutual fund registry, normalized names, AMFI code, and VRO URLs
│   ├── holdings_snapshot                # Active folio holdings: units, purchase NAV, current NAV, invested & current values
│   ├── transactions                     # Complete historical transaction ledger: purchases, SIPs, switches, redemptions
│   ├── sip_mandates                     # Active SIP registrations: member, scheme, folio, monthly amount, status
│   └── sip_transactions                 # Historical monthly SIP payment cash flows
│
├── Broker Ledgers (Zerodha & MSFL)
│   ├── zerodha_members                  # Zerodha client IDs and member profile linkages
│   ├── zerodha_reports                  # Valuation report header records for Zerodha Coin / Kite
│   ├── zerodha_holdings                 # Stock, ETF, and mutual fund positions with average cost, quantity, and P&L
│   ├── zerodha_schemes                  # Stock and ETF master list with exchange symbols (e.g., RELIANCE.NS, INFOSYS.BO)
│   ├── zerodha_transactions             # Complete trade book: buy, sell, dividends, and corporate actions
│   ├── msfl_reports                     # MSFL broker portfolio valuation snapshot headers
│   ├── msfl_holdings                    # MSFL equity and derivative holdings
│   └── msfl_schemes                     # MSFL master security mapping list
│
├── Pricing & NAV Caching Engine (Multi-Tier Historical Prices)
│   ├── scheme_nav_cache_meta            # Cache metadata for AMFI mutual funds: fund house, category, lastFetchedAt
│   ├── scheme_nav_history               # Daily historical NAV prices (date DD-MM-YYYY, NAV float) with composite index
│   ├── zerodha_scheme_nav_cache_meta    # Cache metadata for stocks & ETFs fetched via Yahoo Finance
│   ├── zerodha_scheme_nav_history       # Daily historical closing prices since stock listing date
│   ├── msfl_scheme_nav_cache_meta       # Cache metadata for MSFL instruments
│   ├── msfl_scheme_nav_history          # Daily closing price points for MSFL instruments
│   ├── benchmark_nav_cache_meta         # Cache metadata for market benchmarks (Nifty 50, Sensex)
│   ├── benchmark_nav_history            # Daily historical benchmark levels for Alpha & Beta calculations
│   ├── watchlist_scheme_nav_cache_meta  # Cache metadata for tracked watchlist schemes
│   └── watchlist_scheme_nav_history     # Daily historical NAV prices for watchlist funds
│
├── Fundamentals, Analytics & Market Intelligence
│   ├── stock_fundamentals               # Company financials: Market cap, P/E, P/B, D/E, ROE, 1Y/3Y growth, shareholding
│   ├── scheme_category_rankings         # Groww fund metrics: Category ranks, risk ratios (Sharpe, Beta, Alpha), exit loads
│   ├── watchlist_fund_analytics         # VRO fund analytics: Sector allocations, top 10 company holdings, risk rating
│   ├── bullion_history                  # Precious metals price records: Gold 24K, Silver 999, Platinum PT950 daily rates
│   ├── ipo_records                      # Mainboard and SME IPO applications: shares applied, allotment, listing gains
│   ├── ipo_sell_trades                  # Realized execution trades on listed IPOs: sell date, quantity, realized profit
│   ├── benchmark_rules                  # Dynamic rules mapping fund categories to custom benchmark indices
│   ├── benchmark_category_ratios        # Historical asset allocation ratios per category
│   └── analysis_links                   # Curated external research links with categories, tags, and domain favicons
```

---

### 3. Sync & Automation Tooling

To keep data fresh, historical prices accurate from inception, and fundamentals up to date, the repository provides automated Python and TypeScript batch scripts in `scripts/`:

* **`python3 scripts/sync_latest_nav.py`**:
  Performs an incremental update for all active mutual funds and stocks. Fetches the latest published NAV from `api.mfapi.in` and the last 1 month of stock quotes from Yahoo Finance, inserting new records without re-downloading entire historical archives.
* **`python3 scripts/sync_inception_nav.py`**:
  Full backfill synchronization. Pulls all historical NAVs from inception for mutual funds and all daily closing prices since initial stock exchange listing for equities.
* **`python3 scripts/scrape_fund_rankings.py`**:
  Headless Playwright scraper that extracts category rankings, percentile performance, expense ratios, and risk-adjusted volatility ratios from Groww.
* **`python3 scripts/scrape_stock_fundamentals.py <SYMBOL>`**:
  Scrapes company valuation ratios, balance sheet statements, growth metrics, and quarterly shareholding distribution from Groww's stock pages and internal APIs.
* **`python3 scripts/scrape_vro_fund.py`**:
  Scrapes comprehensive portfolio analytics from Value Research Online (VRO), including top 10 equity holdings, sector concentrations, and risk parameters.
