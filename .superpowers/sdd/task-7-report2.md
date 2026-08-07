# Task 7: Database Migrations — Report

## Status: DONE

## Changes

### `web/src/lib/migrations.ts` (new)
- `Migration` interface with `id`, `name`, `up()`, `down()`
- `migrations` array — first migration: `password_resets` table
- `runMigrations(db)` — creates `migrations` tracking table, applies pending migrations
- `rollbackMigration(db)` — reverses last applied migration

### `web/src/lib/db.ts` (modified)
- Import `runMigrations` from `./migrations`
- Remove `password_resets` table and index from `initSqliteSchema()`
- Call `runMigrations(sqliteDb)` after base schema creation

## Build
- Compiled successfully
- TS type check: pre-existing `jest.setup.ts` error only (`NODE_ENV` readonly in Node 16) — unrelated

## Commit
- `f7d0ee7` — feat: add database migrations system

## Design Notes
- Migrations tracked via `migrations` table (id, name, applied_at)
- Base schema (users, costs, anomalies, etc.) stays in `initSqliteSchema()` as `CREATE IF NOT EXISTS`
- Only `password_resets` extracted to migration — other tables are too tightly coupled to move safely
- Future tables should go through `migrations` array
