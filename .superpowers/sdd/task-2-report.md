# Task 2: Short-Lived Access + Refresh Tokens — Report

## Status: DONE

## What I Implemented

Split the single 7-day JWT into access (15min) + refresh (7d) tokens with type claims:

- **`web/src/lib/auth.ts`** — Added `createAccessToken`, `createRefreshToken`, `verifyAccessToken`, `verifyRefreshToken` with `type` claim. Kept backward-compatible `createToken`/`verifyToken` aliases.
- **`web/src/app/api/auth/login/route.ts`** — Sets both `token` (15min) and `refresh_token` (7d) cookies.
- **`web/src/app/api/auth/register/route.ts`** — Same dual-cookie pattern as login.
- **`web/src/app/api/auth/logout/route.ts`** — Clears both cookies.
- **`web/src/middleware.ts`** — Verifies `type === 'access'` claim on the access token.

## Files Changed

| File | Change |
|------|--------|
| `web/src/lib/auth.ts` | Split token functions, added type claims, backward-compatible aliases |
| `web/src/app/api/auth/login/route.ts` | Import `createAccessToken`/`createRefreshToken`, set both cookies |
| `web/src/app/api/auth/register/route.ts` | Same as login |
| `web/src/app/api/auth/logout/route.ts` | Clear `refresh_token` cookie |
| `web/src/middleware.ts` | Check `payload.type !== 'access'` |

## Test Results

- **`npx tsc --noEmit`**: Clean, no errors
- **`npm test`**: 30/33 passing. 3 failures are **pre-existing** (jose ESM export issue in Jest config — unrelated to this change)

## Self-Review

- **Completeness**: All 5 files modified per spec. Type claims present on both token types. Access token verified in middleware. Backward-compatible `createToken`/`verifyToken` exported for `getCurrentUser` and any other callers.
- **Quality**: Cookie names, maxAge values, and httpOnly/sameSite/path flags match spec exactly.
- **Discipline**: No new files, no new dependencies, no abstractions added. Minimal diff.

## Concerns

None. The pre-existing Jest failures (jose ESM) are outside scope.
