# TypeScript Standards - typescript.md

## 1. Strict Type Safety & Zero `any`
* **Zero `any` Policy**: Never use `any` keyword. Use explicit interfaces, type aliases, generics, or `unknown` with runtime type narrowing.
* **Strict Compiler Options**:
  * `"strict": true`
  * `"noUnusedLocals": true`
  * `"noUnusedParameters": true`
  * `"noImplicitReturns": true`
  * `"noFallthroughCasesInSwitch": true`
* **Explicit Function Signatures**: All exported functions in services, API routes, server actions, and helpers must explicitly declare return types (e.g. `Promise<DashboardData>`, `boolean`, `string`).
* **API DTOs (Data Transfer Objects)**: All API route request payloads and response bodies must have dedicated interfaces defined in `src/types/` (e.g. `ApiResponse<T>`, `WatchlistAddFundInput`, `CreateIpoTradeInput`).

---

## 2. Type Centralization & Architecture
* **Centralized Location**: All shared types, interfaces, enums, and union definitions must reside in domain-specific files under `src/types/` (e.g., `src/types/portfolio.ts`, `src/types/watchlist.ts`, `src/types/insights.ts`, `src/types/api.ts`).
* **Component Type Purity**: No `interface` or `type` definitions inside `src/components/` files. Components must import their props and internal state types directly from `src/types/`.
* **Zero Inline Type Imports**: Prohibit inline namespace or dynamic type syntax such as `prop?: import("./module").TypeName`. Always declare explicit top-level type imports:
  ```typescript
  // CORRECT:
  import type { PortfolioSummaryData } from "@/types/summary";

  // PROHIBITED:
  function render(data: import("@/types/summary").PortfolioSummaryData) { ... }
  ```

---

## 3. Import & Code Organization
* **Top-Level Static Imports Only**: All imports (both values and types) must reside strictly at the very top of every file before any constants, variables, or functions.
* **Separation of Type & Value Imports**: Use explicit `import type { ... }` syntax for type-only imports to aid bundler tree-shaking.
* **Top-Level Module Constants**: Declare constants, configurations, regexes, and maps at the top of the file, never inside functions or nested blocks.
