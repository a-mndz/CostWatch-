# Task 8: API Error Handling Middleware — Report

## What was implemented

Created `web/src/lib/api-error.ts` with `withErrorHandling()` wrapper that:
- Generates a random `requestId` per request
- Attaches `X-Request-Id` header to all responses
- Catches `Unauthorized` errors → 401 with requestId
- Catches all other errors → logs via `logger.error` with context (path, method) → 500 with requestId

Wrapped all 7 route files (12 exports total):
- `/api/costs/route.ts` — POST, GET
- `/api/alerts/route.ts` — GET, POST
- `/api/anomalies/route.ts` — POST
- `/api/settings/route.ts` — GET, POST
- `/api/connect/route.ts` — GET, POST, DELETE
- `/api/sync/route.ts` — POST
- `/api/sync/status/route.ts` — GET, POST

Removed all inline try/catch blocks with duplicated Unauthorized handling.

## Test results

30/33 tests passing. 3 failures are **pre-existing** — `jose` (ESM-only) breaks Jest's CommonJS transform in the `auth.ts` → `require-user.ts` chain. These failures existed before my changes.

TypeScript: 1 pre-existing error in test file (`api.test.ts:74`), zero new errors.

## Files changed

- `src/lib/api-error.ts` (new)
- `src/app/api/costs/route.ts`
- `src/app/api/alerts/route.ts`
- `src/app/api/anomalies/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/connect/route.ts`
- `src/app/api/sync/route.ts`
- `src/app/api/sync/status/route.ts`

## Self-review

- All spec requirements met
- No over-engineering — the wrapper is exactly what was specified
- Existing patterns followed (rate limiting stays outside wrapper where it was)
- Rate limit 429 responses now also get `X-Request-Id` from the wrapper (bonus, not a regression)
- `sync/status/route.ts` had no error handling before; now it does via the wrapper (improvement)

## Commit

`956ebee` — `feat: add API error handling middleware with request IDs`
