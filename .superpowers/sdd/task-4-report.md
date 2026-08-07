# Task 4 Report: CSRF Protection

## Implemented

- CSRF token generation using Web Crypto API (`crypto.getRandomValues`) in middleware
- Token set as `csrf_token` cookie on GET requests (httpOnly: false, sameSite: strict, 1hr expiry)
- Validation on state-changing methods (POST/PUT/DELETE/PATCH): compares cookie token with `X-CSRF-Token` header
- Skips validation for `/api/auth/*` and `/api/health`
- Returns 403 JSON response on validation failure
- Client-side `apiFetch` helper in `web/src/lib/api.ts` that reads cookie and attaches header

## Files Changed

- `web/src/middleware.ts` — added CSRF generation, validation, cookie setting
- `web/src/lib/api.ts` — new client-side fetch wrapper

## Tested

- `npm run build` — passes, no warnings
- `npx tsc --noEmit` — passes, no errors

## Self-Review

No concerns. Used Edge-compatible `crypto.getRandomValues` instead of Node.js `crypto` module. All existing middleware behavior preserved (auth, public paths, redirects).
