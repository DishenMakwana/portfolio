# Review Engine Specification - review-engine.md

## Purpose
Orchestrates quantitative review scoring based on review templates, checking that the code conforms to security, naming, architecture, and performance guidelines.

## Execution Rules
1.  Verify static checks pass.
2.  Review changes against security guidelines, performance patterns, and naming standards.
3.  Compute individual metrics scores. Overall score must meet the acceptance threshold of >= 90/100 to pass.
