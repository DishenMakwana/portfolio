# Execution Engine Specification - execution-engine.md

## Purpose
Maintains execution safety and ensures code changes conform exactly to the active approved planning artifact.

## Execution Rules
1.  Read `implementation_plan.md` to identify files to modify.
2.  Perform surgical modifications in the workspace.
3.  Ensure no unrelated components are modified or refactored.
4.  Run validation checks (`npm run lint`, `npm run build`) immediately post-execution.
