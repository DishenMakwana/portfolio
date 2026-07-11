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

