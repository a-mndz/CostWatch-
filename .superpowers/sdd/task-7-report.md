# Task 7: Graceful Shutdown — Report

## What I Implemented

Added graceful shutdown handling for SIGTERM/SIGINT signals:

1. **`web/src/lib/db.ts`**: Exported `getSqlite()` (was private) and added `closeDb()` function that closes the SQLite connection.

2. **`web/src/lib/worker.ts`**: Added `shutdown()` handler that:
   - Guards against re-entry via `isShuttingDown` flag
   - Waits for any in-progress sync to complete (polls `isRunning`)
   - Dynamically imports and calls `closeDb()`
   - Exits cleanly with `process.exit(0)`
   - Registered on both `SIGTERM` and `SIGINT`

## What I Tested

- `npm run build` — passes, no TypeScript errors
- All existing routes unaffected (build output identical to pre-change)

## Files Changed

- `web/src/lib/db.ts` — exported `getSqlite()`, added `closeDb()`
- `web/src/lib/worker.ts` — added shutdown handler

## Self-Review

- **Completeness**: All spec requirements met. Both signal handlers registered. DB closes after sync completes.
- **Quality**: Clean, minimal. Reuses existing `isRunning` flag rather than introducing new concurrency primitives.
- **Discipline**: No overbuilding. No new dependencies. No abstractions added.
- **Testing**: Build passes. No behavioral changes to existing code paths.

## Concerns

None.
