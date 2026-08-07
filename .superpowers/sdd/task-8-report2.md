# Task 8: GitHub Actions CI/CD — Report

## Status: DONE_WITH_CONCERNS

## Files Created

- `web/.github/workflows/ci.yml` — CI pipeline (lint, test, build) triggered on push to main/master and PRs
- `web/.github/workflows/deploy.yml` — Deploy placeholder triggered after CI succeeds

## Summary

Created two GitHub Actions workflow files under `web/.github/workflows/`:

**ci.yml** — Runs on push to main/master and PRs. Steps: checkout, setup Node 20 (with npm cache), install deps (`npm ci`), lint, test, build. Uses `JWT_SECRET` secret for build step. All steps use `working-directory: web` since the Next.js project lives in the `web/` subdirectory.

**deploy.yml** — Runs on push to main/master and after CI succeeds via `workflow_run`. Placeholder deploy step with echo statements. The condition ensures deploy only runs if CI passed.

## Concerns

1. **Working directory assumption**: The project structure has the Next.js app in `web/` subdirectory. Workflows use `working-directory: web` consistently. If the repo root changes, these paths need updating.
2. **JWT_SECRET not tested**: CI build step requires `JWT_SECRET` secret. If not configured in repo settings, the build will fail silently (undefined env var). Recommend verifying the secret exists before first push.
3. **No caching of `.next` build cache**: CI rebuilds from scratch each run. For faster CI, could cache `.next` directory, but this adds complexity — left out per simplicity.
4. **Deploy is a placeholder**: The deploy step only echoes. Needs actual deployment logic (Vercel, AWS, etc.) based on infrastructure choices.

## Commit

Not committed yet. Ready for user to review and commit.