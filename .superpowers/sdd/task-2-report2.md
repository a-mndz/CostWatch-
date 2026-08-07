# Task 2: Refresh Token Rotation — Report

## What Changed

`web/src/app/api/auth/refresh/route.ts` updated to rotate tokens on each use.

1. Added `createRefreshToken` import from `@/lib/auth`
2. After verifying existing refresh token and user, generate both new access + refresh tokens
3. Set both new cookies with same settings as login endpoint (httpOnly, lax, 7-day expiry for refresh, 15-min for access)

## How It Works

Before: refresh endpoint verified old token, issued only a new access token. Stolen refresh token stayed valid until expiry.

After: each refresh invalidates the old refresh token by issuing a brand new one (stateless JWT rotation). Single-use theft window.

## Concerns

- **No server-side revocation list.** JWTs are stateless — if the attacker uses the stolen token before the legitimate user, the attacker wins. True revocation requires a token family/blocklist in the DB. This is acceptable for the current threat model but worth noting.
- **Concurrent requests.** If two requests hit refresh simultaneously with the same token, both succeed and produce two valid refresh tokens (race). Mitigated by short access token TTL (15m) and rate limiting (20 req/min).
- **Build:** `next build` compiled successfully. Pre-existing TS error in `jest.setup.ts` unrelated to this change.

## Commits

- `7471734` — feat: add refresh token rotation on /auth/refresh
