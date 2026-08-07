# Task 9: Retry Logic for Cloud APIs - Report

## What was implemented

- Created `web/src/lib/retry.ts` with `withRetry<T>()` — exponential backoff with jitter, 3 retries default, skips 4xx client errors
- Updated `web/src/lib/cloud/aws.ts` — wrapped `GetCostAndUsageCommand` call with `withRetry`
- Updated `web/src/lib/cloud/gcp.ts` — wrapped `bigquery.query()` call with `withRetry`

## Test results

- `npx next build` compiles successfully (Turbopack compiled in 942ms)
- Pre-existing type error in `src/__tests__/api.test.ts:74` (not from this task) — expected 1 argument, got 0

## Files changed

| File | Action |
|------|--------|
| `web/src/lib/retry.ts` | Created |
| `web/src/lib/cloud/aws.ts` | Modified (added import, wrapped API call) |
| `web/src/lib/cloud/gcp.ts` | Modified (added import, wrapped API call) |

## Self-review

- **Completeness**: All 3 files implemented per spec. `withRetry` covers exponential backoff, jitter, 4xx skip, logger integration.
- **Quality**: Clean, minimal. Follows existing logger pattern. Generic return type preserves inference.
- **Discipline**: No unnecessary abstractions. No new dependencies. Shortest path.
- **Concerns**: The task brief's `withRetry` has `attempt === maxRetries` before the error is retried — on the final attempt, it throws immediately. This means only `maxRetries - 1` actual retries occur. This matches the spec, so kept as-is. The `testAWSConnection` and `testGCPConnection` functions do NOT use retry — spec only asked for sync functions.
