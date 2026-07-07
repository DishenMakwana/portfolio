# TypeScript Standards - typescript.md

## Strict Type Safety
*   Do not bypass the compiler with the `any` keyword. Use concrete interfaces or utility type parameters.
*   Enforce type correctness for all custom hooks, database models, and Server Action payloads.
*   Use safe casting and guard conditionals to handle optional parameters or unknown JSON shapes from external APIs.
*   Exhaustive checking: Ensure interfaces matching external service configurations are fully mapped.
