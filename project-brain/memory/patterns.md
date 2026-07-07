# Code Patterns - patterns.md

## 1. Parallel Promise Loading
Always combine independent database fetches in route handlers and actions via `Promise.all` to execute queries concurrently.
```typescript
const [a, b] = await Promise.all([
  fetchA(),
  fetchB()
]);
```

## 2. Request-Level Caching
Cache identical database lookups (such as benchmark NAV histories) during a single request lifecycle using an in-memory Promise-level cache map to bypass repetitive roundtrips.

## 3. Single-Query Bulk Upserts
Avoid N+1 INSERT/UPDATE patterns in loops. Pre-fetch existing configurations and bulk-upsert differences in a single SQL operation.
```typescript
await db.insert(table).values(chunk).onConflictDoUpdate({ ... });
```
