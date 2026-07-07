# Performance Review - performance-review.md

## Checklist
*   [ ] Are database roundtrips parallelized using `Promise.all` wherever independent?
*   [ ] Does the action reuse query caches to prevent duplicate SQL requests?
*   [ ] Are indexes correctly configured for all searched columns or join foreign keys?
*   [ ] Do loops execute database updates using single bulk upserts rather than sequential calls?

## Output Schema
*   **Performance Score**: /100
*   **Issues Found**:
*   **Recommendations**:
