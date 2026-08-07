# Task 9 Report: E2E Tests with Playwright

## Status: DONE

## Files Created
- `web/playwright.config.ts` — Playwright config with test dir, base URL, web server command
- `web/e2e/auth.spec.ts` — 4 auth E2E tests
- `web/package.json` — Added `@playwright/test` devDependency and `test:e2e` script

## Tests Implemented

1. **Redirects to login when not authenticated** — Visits `/dashboard` without auth, expects redirect to `/login`
2. **Shows login form** — Visits `/login`, checks CostWatch heading, Sign In button, email/password inputs
3. **Registers new user** — Switches to Create Account tab, fills form, submits, expects `/dashboard`
4. **Logs in existing user** — Registers via API, then logs in via form, expects `/dashboard`

## Concerns
None. Tests use `page.request.post()` for API setup (Playwright's built-in request context), avoiding external dependencies.

## How to Run
```bash
cd web
npm run test:e2e
```
