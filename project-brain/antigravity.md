# Antigravity Developer Instructions & Coding Standards

This document establishes the code organization, refactoring, and quality standards for Antigravity and other AI coding assistants working on this project.

## 1. Code Reusability & Helpers
*   **Decouple Helper Functions**: All helper functions, utility formulas, or calculations defined inside page files, components, hooks, or routers must be extracted into the `src/helpers/` directory.
*   **Domain-Based Files**: Organize helpers into logically named files based on responsibility (e.g., `allocation.ts`, `date.ts`, `formatting.ts`).
*   **DRY Principle**: Never redefine or duplicate the same utility logic inside multiple component files. Import the centralized helper functions instead.

## 2. Centralized Interfaces & Type Definitions
*   **Centralize Shared Types**: Move all reusable interfaces, type aliases, enums, and schema types out of page/component files and into the `src/types/` folder.
*   **File Organization**: Organize files by feature or domain (e.g., `insights.types.ts`, `zerodha.types.ts`, `portfolio.types.ts`).
*   **Strict Types**: Do not use the `any` keyword. Ensure strict typing for all variables, function arguments, and return types.
*   **Local Exception**: A type or interface may remain local to a file only if it is used exclusively in that file and is highly unlikely to be reused.

## 3. Directory Layout & Structure
*   **Separate Concerns**: Keep the `src/app/` directory focused solely on Next.js routing and page-level container layout.
*   **Modular Component Folders**: Components should live in structured directories under `src/components/` (e.g., `src/components/shared/` for reusable components, `src/components/mutual-fund/` for main MF modules, `src/components/zerodha/` for Zerodha portfolio screens).
*   **Tab-Level Nesting**: If a dashboard module (such as Zerodha or Insights) contains multiple tabs, create a sub-folder named after the tab (e.g., `src/components/zerodha/overview/`, `src/components/zerodha/stocks/`) to store its tab-specific sub-components.

## 4. Verification Checklists
*   **Static Analysis**: Always run `npm run lint` to check for linter or unused variable warnings.
*   **Code Formatting**: Always run `npm run format` to ensure Prettier/formatting compliance before pushing.
*   **Production Build**: Verify all changes by running `npm run build` to guarantee successful Next.js Turbopack compilation.
