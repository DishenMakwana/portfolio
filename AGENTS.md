<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Verification Requirements
Whenever you modify or add any code files in this project, you MUST run verification checks:
1. Run `npm run lint` to check for linter issues.
2. Run `npm run format` to ensure code formatting guidelines are followed.

# TypeScript & Code Cleanliness Requirements
1. Strictly type all variables, function arguments, and return types across the codebase. Do not use the `any` keyword.
2. Maintain `"noUnusedLocals": true` and `"noUnusedParameters": true` enabled in `tsconfig.json`. Check for and remove any unused local variables, parameters, or imports.
3. Define all static imports at the top level of files, not inside function code or loops.
4. Define all global variables and module-level constants at the top level, not inside or between functions.
5. All interface, type, and enum declarations must reside in the `src/types/` folder, organized by domain. Avoid inline object type declarations with more than 3 properties at function signatures or code levels. Create a custom type/interface in `src/types/` and import it instead.
6. All formatters, date utilities, and common business logic helper functions must reside in the `src/helpers/` folder. Never define local formatting helpers (`fmtIN`, `pct2`, `formatDate`) inside page or component files. Group them in the helpers folder and import them.
7. Do not use the deprecated `<Cell />` component for customizing chart elements in Recharts. Use the `shape` prop or `content` prop directly on parent chart components (e.g., `<Pie />`) to customize rendering.
8. Reusable helper functions and utility formulas (e.g., calculations, custom sorting, converters) must be extracted to `src/helpers/` in responsibility-driven filenames (e.g., `allocation.ts`), rather than being defined locally in components or pages.
9. Centralize all shared types, interfaces, and enums in `src/types/` (e.g., `insights.types.ts`). Keep types local to page or component files only when they are strictly single-use.
10. Maintain a consistent modular directory structure. App routes under `src/app/` must only handle pages and routing. Component files must live under structured folders in `src/components/` (such as `shared/`, `mutual-fund/`, `zerodha/`, `msfl/`). Create tab-specific subfolders if a dashboard module contains multiple tabs.
