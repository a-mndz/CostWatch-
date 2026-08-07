# Task 6: Request Logging - Report

## Status: DONE

## What was built
- Created `web/src/lib/request-logger.ts` with `logRequest(request, response, durationMs)` function
- Updated `web/src/middleware.ts` to log every request/response pair with method, url, status, and duration

## Approach
- Reused existing `logger` utility (`src/lib/logger.ts`) for structured JSON output
- `logRequest` accepts NextRequest, NextResponse, and duration in ms
- Each return point in middleware captures the response, logs it, then returns

## Files modified
- `web/src/lib/request-logger.ts` (new)
- `web/src/middleware.ts` (updated)

## Build
- Compilation successful
- Pre-existing TS error in `jest.setup.ts` (unrelated)

## Commit
- `8918277` - feat: add request logging middleware

## Concerns
- None. Minimal implementation, reuses existing logger.
