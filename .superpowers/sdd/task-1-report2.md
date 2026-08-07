# Task 1 Report: Fix Jose ESM Test Failures

## Status: DONE_WITH_CONCERNS

## Changes Made

### `web/jest.config.ts`
- Added `transformIgnorePatterns: ['node_modules/(?!(jose)/)']` to transform jose ESM
- Added `transform` rule with `ts-jest` + `allowJs: true` to handle jose `.js` files
- Added `setupFiles` pointing to `jest.setup.ts`

### `web/jest.setup.ts` (new)
- Sets `JWT_SECRET` and `NODE_ENV=test` env vars for test environment

### `web/src/__tests__/api.test.ts`
- Added `mockRequest()` helper that attaches `nextUrl` to mock `Request` objects (needed by Next.js 16 route handlers)

## Test Results
- **30/33 passing** (same count as before, but jose ESM error is resolved)
- 3 remaining failures are **pre-existing** — they were always failing, just with a different error (jose ESM → `cookies() outside request scope`)

## Commit
- `c1434dc` fix: configure Jest to handle jose ESM and fix test setup

## Concerns
1. **3 pre-existing test failures** in `api.test.ts` — route handlers call `cookies()` from `next/headers` which requires a Next.js request context. These tests need Next.js testing utilities or route handler mocking to work properly.
2. **ts-jest 29.x + Jest 30.x** — minor version mismatch. Works now but may cause issues on upgrade.
3. **`jest.setup.ts` sets JWT_SECRET** — tests depend on this env var being set. If the setup file is removed, api.test.ts will fail.
