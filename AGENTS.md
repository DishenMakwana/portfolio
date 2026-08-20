<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Brain & Mandatory Rule Enforcement
Whenever you modify or add any code in this codebase, you MUST strictly adhere to the guidelines and standards defined in the `project-brain/` directory:
- **`project-brain/antigravity.md`**: Core developer standards, async performance, chart padding, and refactoring guidelines.
- **`project-brain/standards/`**: Language and framework-specific standards (`typescript.md`, `react.md`, `nextjs.md`, `performance.md`, `naming.md`, `security.md`, `documentation.md`).

---

# Verification Requirements
Whenever you modify or add any code files in this project, you MUST run verification checks:
1. Run `npm run lint` to check for linter and unused variable warnings.
2. Run `npm run format` to ensure code formatting guidelines are followed.
3. Run `npm run build` when making architectural, structural, or dependency modifications to guarantee clean production compilation.

---

# TypeScript & Code Cleanliness Requirements
1. **No `any` Keyword**: Strictly type all variables, function arguments, and return types across the codebase.
2. **Unused Imports & Variables**: Maintain `"noUnusedLocals": true` and `"noUnusedParameters": true` compliance. Check for and remove all unused variables, parameters, and imports.
3. **Top-Level Static Imports**: Define all static imports at the top level of files before any code, variables, or functions.
4. **Top-Level Constants**: Define all global variables and module-level constants at the top level, not inside or between functions.
5. **Centralized Types**: All interface, type, and enum declarations must reside in `src/types/`, organized by domain (e.g., `insights.ts`, `valuation.ts`, `summary.ts`). Avoid inline object type declarations with more than 3 properties in function signatures.
6. **Centralized Helpers**: All formatters, date utilities, calculations, and business logic helper functions must reside in `src/helpers/` in responsibility-driven files (e.g., `formatters.ts`, `dates.ts`, `allocation.ts`, `transactions.ts`). Never define local formatting helpers (`fmtIN`, `pct2`, `formatDate`) inside page or component files.
7. **Recharts Deprecation**: Do not use the deprecated `<Cell />` component for customizing chart elements in Recharts. Use the `shape` prop or `content` prop directly on parent chart components (e.g., `<Pie />`, `<Bar />`) to customize rendering.
8. **Modular Directory Structure**: App routes under `src/app/` must only handle pages and routing. Component files must live under structured folders in `src/components/` (such as `shared/`, `mutual-fund/`, `zerodha/`, `msfl/`). Create tab-specific subfolders if a dashboard module contains multiple tabs.

---

# Async Concurrency & Performance Standards
1. **No Sequential Database Awaits**: Never execute independent database queries or server actions sequentially. Always combine independent queries into a single `Promise.all([ ... ])` batch.
2. **Parallel NAV & Metadata Fetching**: In NAV cache functions, execute cache metadata (`findFirst`) and history (`findMany`) queries concurrently.
3. **Parallel Metric Computations**: Calculate current report and previous report metrics in parallel using `Promise.all`.
4. **Eliminate N+1 Queries**: Pre-fetch shared lookup datasets (e.g., `familyMembers`, `schemes`, `latestPrices`) in the initial `Promise.all` batch at the top of server actions or service routines.

---

# Chart & Visual UI Standards
1. **Y-Axis Headroom Padding**: Always calculate dynamic `yDomain` for line/area charts with a minimum **15% top & bottom headroom padding** (`Math.max(range * 0.15, 5)`) to prevent peak (High) and trough (Low) reference dots/badges from clipping against SVG canvas boundaries.
2. **Smart SVG Edge Detection**: Position SVG label badges dynamically with edge-detection checks to prevent right-edge container clipping.
3. **Marker Density Management**: When marker counts exceed thresholds, suppress inline text labels and reduce dot radius (`r=3.5`, `opacity=0.7`) to maintain high-contrast readability.
