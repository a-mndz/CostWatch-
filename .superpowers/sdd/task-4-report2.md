# Task 4: Docker Environment Validation — Report

**Status:** DONE

**Commit:** `67e7b93` — Add Docker env validation, health check, and volume persistence

## What changed

### `web/Dockerfile`
- Added `ARG JWT_SECRET` in builder stage
- Two validation RUN layers: empty check + minimum 32-char check
- JWT_SECRET baked into image via `ENV` for build-time use
- Fails fast at build time if secret is missing or too short

### `web/docker-compose.yml`
- Build section now passes `JWT_SECRET` as a build arg using `${JWT_SECRET:?...}` syntax — compose errors with a clear message if unset
- Added `healthcheck` using `wget` against `http://localhost:3000/api/health` (30s interval, 5s timeout, 3 retries, 10s start period)
- `JWT_SECRET` removed from runtime `environment` — it's already baked in at build time
- Named volume `costwatch-data` for `/app/data` was already present

## Concerns

- The `/api/health` endpoint exists in `src/middleware.ts` and returns a response, so the health check should work.
- `wget` is available in `node:20-alpine` by default (via BusyBox), so the health check command is valid.
