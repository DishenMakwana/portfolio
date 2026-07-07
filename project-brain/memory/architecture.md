# Architectural Blueprint - architecture.md

## Core Stack
*   **Framework**: Next.js (App Router, Turbopack)
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Styles**: Tailwind CSS
*   **Charts**: Recharts
*   **Parser**: SheetJS (`xlsx`) for processing valuation spreadsheets

## Data Flow
```
Consolidated Portfolio XLSX
   │
   ▼
Parser (SheetJS)
   │
   ▼
Server Actions (db.insert snapshots/holdings/members/SIPs)
   │
   ▼
Database (PostgreSQL)
   │
   ▼
Page Components (Promise.all parallel fetches)
   │
   ▼
Client Presentation (React/Tailwind/Recharts)
```
