# Memory Updater Specification - memory-updater.md

## Purpose
Ensures memory layer files are kept up to date incrementally as changes are finalized.

## Execution Rules
1.  Read walkthrough of completed task files.
2.  Locate relevant domain memory files (e.g. `backend.md`, `patterns.md`).
3.  Perform surgical edits to reflect the latest codebase changes (e.g. new helper actions, caching systems, custom queries).
4.  Capped size check: Keep memory files under 300–500 lines to avoid token bloated contexts.
