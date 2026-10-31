# Antigravity Developer Instructions & Enterprise Coding Standards

This document establishes the overarching architecture, code organization, async performance, and quality standards for Antigravity and any automated coding agents working on this project.

---

## 1. Enterprise Architecture & Backend Decoupling
To ensure this codebase scales effortlessly to large enterprise multi-developer setups and enables seamless transition to standalone external microservices (e.g. Go, FastAPI, NestJS, Spring Boot):

1. **Decoupled Data Access Layer & Dedicated `src/api/` Folder**:
   * Next.js components MUST NOT invoke direct `fetch(...)`, `axios`, or write raw endpoint URLs like `/api/watchlist/pin`.
   * All API interactions must go through typed SDK helper functions housed inside domain files within `src/api/` (e.g., `src/api/watchlist.ts`, `src/api/portfolio.ts`, `src/api/zerodha.ts`, `src/api/ipos.ts`, `src/api/audit.ts`).
   * The centralized HTTP client (`src/api/client.ts`) handles base URL configuration via `NEXT_PUBLIC_BACKEND_URL`, timeouts, and standardized error parsing.
   * When migrating to an external backend, changing `NEXT_PUBLIC_BACKEND_URL` in `.env` redirects data fetching without modifying a single UI component or page.

2. **Standardized HTTP & API Envelopes**:
   * All API route handlers must return standard JSON response envelopes:
     ```typescript
     interface ApiResponse<T> {
       success: boolean;
       data?: T;
       error?: string;
       meta?: { timestamp: number; cached?: boolean };
     }
     ```
   * Enforce appropriate HTTP status codes (200 OK, 400 Bad Request, 404 Not Found, 500 Server Error) and production caching headers.

---

## 2. Directory Layout & Responsibility Matrix

| Directory | Permitted Contents | Prohibited Contents |
| :--- | :--- | :--- |
| `src/app/` | Pages (`page.tsx`), layouts (`layout.tsx`), loading skeletons (`loading.tsx`), error boundaries (`error.tsx`), and API routes (`src/app/api/**/route.ts`). | Complex UI rendering, business calculations, direct SQL queries. |
| `src/components/` | Reusable UI presentation, interactive dashboards, modals, tabs, and charts. Must import types from `src/types/`, helpers from `src/utils/` / `src/helpers/`, and API callers from `src/service/` / `src/api/`. | Direct `fetch`/`axios` calls, inline SQL/database calls, local `interface`/`type` declarations, raw formatters. |
| `src/context/` | React Context providers and custom consumer hooks (`PortfolioContext`, `usePortfolioContext`) for shared client-side state. | Server actions, direct database access, heavy calculations. |
| `src/css/` | Global styles, Tailwind base configurations (`globals.css`), modular CSS files. | JavaScript code, component JSX. |
| `src/data/` | Static datasets, lookup tables, options, and immutable configuration constants. | Mutable state, database queries, business calculations. |
| `src/hooks/` | Dedicated custom React hooks (`useTableSort`, `useDebounce`, `useClickOutside`, `useViewport`). | UI rendering JSX, non-hook business logic. |
| `src/routes/` | Centralized route configurations (`routes.tsx`), navigation arrays, route types (`routes.type.ts`), and path helpers. | Page rendering, direct database calls. |
| `src/service/` (and `src/api/`) | Dedicated client API SDK modules wrapping `apiClient` (`axiosInstance`) organized by domain (`portfolioService.ts`, `watchlistService.ts`, `zerodhaService.ts`, etc.). | Raw SQL, component JSX, local UI state. |
| `src/types/` | Centralized TypeScript interfaces, types, DTO contracts, enums. Organized by domain. | Value implementations, executable code, database logic. |
| `src/utils/` (and `src/helpers/`) | Pure, side-effect-free utility functions, formatters (`fmtIN`), date parsers, math/statistics. | Database queries, network requests, React state/hooks. |
| `src/lib/` | Server-side domain service layers, Drizzle ORM queries, external financial API integrations (AMFI, Yahoo), in-memory cache registry. | React components, UI JSX, direct browser DOM manipulation. |

---

## 3. Strict TypeScript & Code Cleanliness Standards
1. **Zero `any` Policy**: Strictly type all variables, function arguments, and return types. Use generics or `unknown` with runtime type narrowing.
2. **Top-Level Static Imports Only**: All imports (both value and type imports) MUST be placed at the very top of the file before any constants, types, or functions.
3. **No Inline Type Imports**: Prohibit inline namespace or dynamic type syntax such as `import("./path").Type`. Always declare explicit top-level type imports: `import type { Type } from "@/types/...";`.
4. **Top-Level Constants**: Declare global variables, configuration maps, and module constants at the top of the file, never inside functions or nested blocks.
5. **Compiler Strictness**: Maintain `"noUnusedLocals": true` and `"noUnusedParameters": true`. Zero unused imports or variables permitted.

---

## 4. Async Concurrency & Performance Standards
1. **No Sequential Database Awaits**: Never execute independent database queries or server actions sequentially. Always combine independent queries into a single `Promise.all([ ... ])` batch.
2. **Parallel NAV & Metadata Fetching**: In NAV cache functions, execute cache metadata (`findFirst`) and history (`findMany`) queries concurrently.
3. **Parallel Metric Computations**: Calculate current report and previous report metrics in parallel using `Promise.all`.
4. **Eliminate N+1 Queries**: Pre-fetch shared lookup datasets (e.g., `familyMembers`, `schemes`, `latestPrices`) in the initial `Promise.all` batch at the top of server actions or API routes.
5. **Bounded Memory Caching**: Use `getGlobalCache` (`BoundedMap`) with market-aware TTL (2 mins during market hours, 24 hours off-market) to protect server memory.

---

## 5. Next.js Production & Visual Standards
1. **Code-Splitting via `next/dynamic`**: Dynamically import heavy client-only packages (Recharts, file parsers, sheet generators) using `next/dynamic` with `ssr: false` where appropriate to optimize bundle size and Core Web Vitals.
2. **Granular Suspense & Skeletons**: Wrap all dynamic dashboard widgets in `<Suspense fallback={<Skeleton />}>` boundaries to enable streaming SSR.
3. **Recharts Deprecation & Headroom Padding**:
   * Do not use the deprecated `<Cell />` component in Recharts; use the `shape` or `content` props directly.
   * Always calculate dynamic `yDomain` for line/area charts with a minimum **15% top & bottom headroom padding** (`Math.max(range * 0.15, 5)`) to prevent peak/trough reference badges from clipping against SVG canvas boundaries.
4. **Smart SVG Edge Detection**: Position SVG label badges dynamically with edge-detection checks to prevent right-edge container clipping.

---

## 6. Mandatory Verification Protocol
Whenever you modify or add code in this codebase:
1. `bun --bun x knip` - Verify 0 dead code or unused exports.
2. `bun run --bun lint` - Verify 0 linter warnings or TypeScript errors.
3. `bun run --bun format` - Enforce Prettier formatting.
4. `bun run --bun build` - Verify clean production compilation.
