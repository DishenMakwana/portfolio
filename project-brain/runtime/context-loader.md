# Context Loader Specification - context-loader.md

## Purpose
Loads context subset selectively based on classification to prevent context windows from overflowing.

## Execution Rules
1.  Read classification tag from task input.
2.  Retrieve matching memory file (e.g. `frontend.md` for UI changes, `database.md` for SQL index scripts).
3.  Inject relevant documentation references and rule templates into the current context session.
