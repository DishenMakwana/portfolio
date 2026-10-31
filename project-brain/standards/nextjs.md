# Next.js App Router Enterprise Standards - nextjs.md

## 1. Architectural Layers & Separation of Concerns

To ensure enterprise-grade maintainability, performance, and clean future migration to standalone backend microservices:

```
[ Page / Layout (Server Component) ] 
       │
       ▼
[ Client SDK Layer (`src/service/*Service.ts` / `src/api/*`) ] ──► Future: External Backend (Go / Java / Python / NestJS)
       │
       ▼
[ Next.js Route Handlers (`src/app/api/...`) ]
       │
       ▼
[ Service Domain Logic (`src/lib/...`) ]
       │
       ▼
[ Database Layer (Drizzle ORM / Postgres) ]
```

### 1.1 Production Folder Structure Standards
To maintain high-velocity developer clarity and avoid architectural entropy in production Next.js repositories, code must adhere strictly to the following 10-tier folder layout:
* `src/app/`: Next.js App Router routing only (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `route.ts`).
* `src/components/`: Reusable presentation components categorized by domain.
* `src/context/`: React context providers and consumption hooks for client state.
* `src/css/`: Global styles, Tailwind definitions, and custom themes (`globals.css`).
* `src/data/`: Static lookup tables, configuration presets, and immutable datasets.
* `src/hooks/`: Dedicated custom React hooks (`useTableSort`, `useDebounce`, `useClickOutside`, `useViewport`).
* `src/routes/`: Route paths, navigation trees, and route type definitions (`routes.tsx`, `routes.type.ts`).
* `src/service/` (and `src/api/`): Client-side API service SDK modules wrapping HTTP clients (`client.ts`, `axiosInstance.ts`).
* `src/types/`: Centralized TypeScript interfaces, types, and DTO contracts.
* `src/utils/` (and `src/helpers/`): Pure, side-effect-free utility calculations, formatters, and date parsers.
* `src/lib/`: Server-side domain services, scrapers, calculators, and database operations.

### A. Pages (`src/app/**/page.tsx`)
* **Role**: Server Component layout orchestrators.
* **Responsibilities**:
  * Parse params and searchParams.
  * Delegate data loading to the client SDK API abstraction (`src/api/`) or directly to cached service functions.
  * Compose client and server components with `Suspense` streaming boundaries.
  * Never contain inline styling, complex calculation logic, or local type definitions.

### B. Dedicated Client API Layer (`src/api/`)
* **Role**: Dedicated client-side and server-side data access SDK.
* **Rule**: Components MUST NOT contain direct `fetch(...)`, `axios`, or raw endpoint URLs (`/api/...`).
* **Responsibilities**:
  * Organize endpoints by domain: `src/api/watchlist.ts`, `src/api/portfolio.ts`, `src/api/zerodha.ts`, `src/api/msfl.ts`, `src/api/ipos.ts`, `src/api/bullion.ts`, `src/api/insights.ts`, `src/api/audit.ts`, `src/api/notifications.ts`.
  * Return strictly-typed `Promise<ApiResponse<T>>`.
  * Use the centralized `apiClient` (`src/api/client.ts`) which handles base URL switching via `NEXT_PUBLIC_BACKEND_URL`, timeouts, and standardized error parsing.

### C. API Route Handlers (`src/app/api/**/route.ts`)
* **Role**: Formal REST / JSON HTTP boundary isolating backend and database logic.
* **Higher-Order Route Wrapper Standard**: All route handlers MUST be wrapped using `createApiHandler` from `@/utils/apiHandler`. Never write repetitive manual `try/catch`, manual `NextResponse.json(...)` envelopes, or raw error string parsing in route files.
  ```typescript
  import { createApiHandler, ApiError } from "@/utils/apiHandler";
  import { getBullionData } from "@/lib/bullionService";

  export const dynamic = "force-dynamic";

  export const GET = createApiHandler(async (request) => {
    const { searchParams } = new URL(request.url);
    const res = await getBullionData(...);
    if (!res.success) {
      throw new ApiError(400, res.error);
    }
    return res.data;
  });
  ```
* **Responsibilities**:
  * Validate request parameters, searchParams, and bodies.
  * Delegate business logic to domain services (`src/lib/`).
  * Return standardized JSON envelope responses:
    ```typescript
    interface ApiResponse<T> {
      success: boolean;
      data?: T;
      error?: string;
      meta?: { timestamp: number; cached?: boolean };
    }
    ```
  * Enforce appropriate HTTP status codes (200, 400, 404, 500) and caching headers (`Cache-Control`, `stale-while-revalidate`).
  * **Backend Portability Rule**: By routing database interactions through standardized Next.js API endpoints, the entire frontend can be repointed to an external backend service (e.g. FastAPI, Go, NestJS) by merely switching the `API_BASE_URL` in `src/service/axiosInstance.ts`.

### D. Server vs. Client Component Boundaries
* **Server Components (Default)**: Keep pages, layouts, and static content as Server Components.
* **Client Components (`"use client"`)**: Push client components to the absolute leaf nodes of the component tree (interactive buttons, tabs, modal forms, Recharts visualizations).
* **Slots & Composition**: Pass Server Components as `children` or props to Client Component containers to prevent unneeded client bundle bloat.

---

## 2. Next.js Performance & Production Checklist

Adhering to the official [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) and modern performance patterns:

### A. Dynamic Imports & Code Splitting (`next/dynamic`)
* Dynamically import heavy client-only libraries (e.g., Recharts, Excel parsers, heavy modal dialogs) using `next/dynamic` with `ssr: false` where SSR is impossible or adds unnecessary initial JS payload:
  ```typescript
  import dynamic from "next/dynamic";
  const ChartComponent = dynamic(() => import("./ChartComponent"), {
    ssr: false,
    loading: () => <ChartSkeleton />,
  });
  ```
* Leverage `optimizePackageImports` in `next.config.ts` for icon packages (e.g., `lucide-react`) and component libraries to minimize bundle sizes.

### B. Streaming, Loading & Error Boundaries
* Every page or major dynamic section must have:
  * A `loading.tsx` or granular `<Suspense fallback={<Skeleton />}>` boundary to prevent waterfall blocking.
  * An `error.tsx` boundary with recovery action to isolate errors and prevent entire page crashes.
  * A `not-found.tsx` for clean 404 handling.

### C. Core Web Vitals (CWV)
* **LCP (Largest Contentful Paint)**: Deliver server-rendered HTML shells instantly with parallelized data fetches.
* **CLS (Cumulative Layout Shift)**: Provide explicit width/height or aspect-ratio containers for charts and dynamic cards before data loads.
* **INP (Interaction to Next Paint)**: Offload heavy data reshaping to server actions/APIs or memoize via `useMemo`.
