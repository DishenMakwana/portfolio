# Graph Retriever Specification - graph-retriever.md

## Purpose
Identifies upstream and downstream file relationships from the active graph layer to establish the minimal set of files requiring analysis.

## Execution Rules
1.  Lookup target file imports and exports.
2.  Follow caller/callee relationships for edited server actions or database queries.
3.  Load dependent component paths into context so the engine can verify compile safety and check for regressions.
