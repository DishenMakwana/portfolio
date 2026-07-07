# Graph Updater Specification - graph-updater.md

## Purpose
Maintains and updates metadata structures in `graph/` when files are created, renamed, or deleted.

## Execution Rules
1.  Read walkthrough of completed task files.
2.  If any files were added or removed, update the nodes mapping array inside `graph/nodes.json`.
3.  Re-map imports/exports to keep dependencies aligned in `graph/edges.json`.
