## Task 5: Sentry Monitoring

**Status:** DONE_WITH_CONCERNS

### What was done

- Created `web/src/lib/sentry.ts` with `initSentry()` and `captureException()` functions
- Updated `web/src/lib/api-error.ts` to call Sentry on unhandled errors
- Added `SENTRY_DSN` as optional env var to `env.ts`
- Installed `@sentry/nextjs` (114 packages added)

### Commit

`e9e6c7a` feat: add Sentry error tracking integration

### Build

Compiles successfully. TypeScript type-check fails on a pre-existing issue in `jest.setup.ts` (line 2: `process.env.NODE_ENV` is readonly per `@types/node`). Not related to Sentry changes.

### Design decisions

- **No-op when no DSN**: `initSentry()` returns early if `SENTRY_DSN` is not set — no crash, no init in dev
- **Production only**: `enabled: false` outside production; `tracesSampleRate: 0.1` in prod, `1.0` in dev
- **Idempotent init**: `initialized` flag prevents double-init
- **Context passing**: `captureException` accepts optional `Record<string, unknown>` context mapped to Sentry `extra`

### Concern

The `jest.setup.ts` TS error is pre-existing. Needs a fix (exclude from tsconfig or use `as string` cast) for clean builds. Not blocking for Sentry integration.
