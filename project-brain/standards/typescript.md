# TypeScript Standards - typescript.md

## Strict Type Safety
*   Do not bypass the compiler with the `any` keyword. Use concrete interfaces or utility type parameters.
*   Enforce type correctness for all custom hooks, database models, and Server Action payloads.
*   Use safe casting and guard conditionals to handle optional parameters or unknown JSON shapes from external APIs.
*   Exhaustive checking: Ensure interfaces matching external service configurations are fully mapped.

## Strict Compiler Rules
*   Maintain `"noUnusedLocals": true` and `"noUnusedParameters": true` enabled in `tsconfig.json`.
*   Unused variables, parameters, or imports are strictly prohibited and must be removed from the files.

## Import & Variable Organization
*   **Top-Level Static Imports**: All static value and type imports must strictly reside at the very top level of the file before any code, variables, types, or functions.
*   **No Inline Type Imports**: Never use inline dynamic type imports (e.g. `field?: import("./module").Type`). Always declare explicit top-level type imports (e.g. `import type { Type } from "./module";`).
*   **No Function-Body Imports**: Do not use dynamic/conditional `import()` statements inside function bodies or loops unless explicitly required for client-side code-splitting or runtime dynamic modules.
*   **Top-Level Constants**: Global variables, schemas, configuration maps, and module-level constants must be declared at the top of the file, not inline between functions or code blocks.

