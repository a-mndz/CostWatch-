# Remaining Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining security, DevOps, testing, and DX improvements for CostWatch.

**Architecture:** Add refresh token rotation, HTTPS enforcement, fix test failures, CI/CD pipeline, Docker env validation, monitoring, E2E tests, request logging, and database migrations.

**Tech Stack:** Next.js 16, TypeScript, Jest, Playwright, GitHub Actions, Docker, Sentry

---

## Global Constraints

- TypeScript strict mode
- All API routes use `requireUser()` for userId extraction
- All mutations rate-limited via `rateLimit()` from `@/lib/rate-limit`
- All errors logged via `logger` from `@/lib/logger`
- Cookies: httpOnly, sameSite: 'lax', path: '/'
- No new dependencies unless absolutely necessary

---

## Task 1: Fix Jose ESM Test Failures

**Files:**
- Modify: `web/jest.config.ts`

**Interfaces:**
- Consumes: None
- Produces: Working Jest config for jose ESM

- [ ] **Step 1: Update Jest config for ESM**

```typescript
// web/jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose)/)',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
};

export default config;
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: 33/33 passing

- [ ] **Step 3: Commit**

```bash
git add web/jest.config.ts
git commit -m "fix: configure Jest for jose ESM support"
```

---

## Task 2: Refresh Token Rotation

**Files:**
- Modify: `web/src/app/api/auth/refresh/route.ts`

**Interfaces:**
- Consumes: `verifyRefreshToken()`, `createAccessToken()`, `createRefreshToken()` from auth.ts
- Produces: Rotated refresh token on each use

- [ ] **Step 1: Update refresh endpoint to rotate tokens**

```typescript
// web/src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, createAccessToken, createRefreshToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:refresh', 20, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.sub) as { id: number; email: string; name: string | null } | undefined;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const newAccessToken = await createAccessToken({ id: user.id, email: user.email, name: user.name });
    const newRefreshToken = await createRefreshToken({ id: user.id, email: user.email, name: user.name });

    logger.info('Token refreshed', { userId: user.id });
    const res = NextResponse.json({ success: true });
    res.cookies.set('token', newAccessToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 15 });
    res.cookies.set('refresh_token', newRefreshToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (err) {
    logger.error('Token refresh failed', { error: String(err) });
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/auth/refresh/route.ts
git commit -m "feat: rotate refresh token on each use"
```

---

## Task 3: HTTPS Enforcement

**Files:**
- Modify: `web/src/middleware.ts`

**Interfaces:**
- Consumes: None
- Produces: HTTP→HTTPS redirect in production

- [ ] **Step 1: Add HTTPS redirect to middleware**

```typescript
// web/src/middleware.ts - add after public paths check
// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production' && !request.url.startsWith('https://')) {
  const httpsUrl = request.url.replace('http://', 'https://');
  return NextResponse.redirect(httpsUrl);
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add web/src/middleware.ts
git commit -m "feat: enforce HTTPS in production"
```

---

## Task 4: Docker Environment Validation

**Files:**
- Modify: `web/Dockerfile`

**Interfaces:**
- Consumes: None
- Produces: Docker build with env validation

- [ ] **Step 1: Update Dockerfile with env validation**

```dockerfile
# web/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Validate environment variables at build time
ARG JWT_SECRET
RUN if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then \
  echo "ERROR: JWT_SECRET must be at least 32 characters" && exit 1; \
fi

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Update docker-compose.yml with env validation**

```yaml
# web/docker-compose.yml
version: '3.8'

services:
  costwatch:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL:-}
    volumes:
      - costwatch-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  costwatch-data:
```

- [ ] **Step 3: Commit**

```bash
git add web/Dockerfile web/docker-compose.yml
git commit -m "feat: add environment validation to Docker build"
```

---

## Task 5: Sentry Monitoring

**Files:**
- Create: `web/src/lib/sentry.ts`
- Modify: `web/src/lib/api-error.ts`

**Interfaces:**
- Consumes: None
- Produces: Sentry error tracking integration

- [ ] **Step 1: Create Sentry wrapper**

```typescript
// web/src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NODE_ENV !== 'production') return;
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Sentry (dev):', error, context);
    return;
  }
  
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}
```

- [ ] **Step 2: Update API error handler to use Sentry**

```typescript
// web/src/lib/api-error.ts - update catch block
import { captureException } from './sentry';

// In the catch block:
captureException(e instanceof Error ? e : new Error(String(e)), {
  requestId,
  path: request.nextUrl.pathname,
  method: request.method,
});
```

- [ ] **Step 3: Install Sentry dependency**

Run: `npm install @sentry/nextjs`
Expected: Success

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/sentry.ts web/src/lib/api-error.ts web/package.json web/package-lock.json
git commit -m "feat: add Sentry error tracking integration"
```

---

## Task 6: Request Logging Middleware

**Files:**
- Create: `web/src/lib/request-logger.ts`
- Modify: `web/src/middleware.ts`

**Interfaces:**
- Consumes: `logger` from logger.ts
- Produces: Request/response logging

- [ ] **Step 1: Create request logger**

```typescript
// web/src/lib/request-logger.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

export function logRequest(request: NextRequest, response: NextResponse, startTime: number) {
  const duration = Date.now() - startTime;
  const { method, url } = request;
  const { status } = response;
  
  // Don't log health checks or static assets
  if (url.includes('/api/health') || url.includes('/_next') || url.includes('/public')) {
    return;
  }
  
  const logData = {
    method,
    url,
    status,
    duration,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.ip,
  };
  
  if (status >= 500) {
    logger.error('Request failed', logData);
  } else if (status >= 400) {
    logger.warn('Request error', logData);
  } else {
    logger.info('Request completed', logData);
  }
}
```

- [ ] **Step 2: Add request logging to middleware**

```typescript
// web/src/middleware.ts - add at start of middleware function
import { logRequest } from '@/lib/request-logger';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // ... existing middleware logic ...
  
  // Log response (for successful responses)
  const response = NextResponse.next();
  logRequest(request, response, startTime);
  return response;
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/request-logger.ts web/src/middleware.ts
git commit -m "feat: add request logging middleware"
```

---

## Task 7: Database Migrations System

**Files:**
- Create: `web/src/lib/migrations.ts`
- Modify: `web/src/lib/db.ts`

**Interfaces:**
- Consumes: `getDb()` from db.ts
- Produces: Migration runner

- [ ] **Step 1: Create migration runner**

```typescript
// web/src/lib/migrations.ts
import { getDb } from './db';
import { logger } from './logger';

interface Migration {
  id: number;
  name: string;
  up: string;
  down: string;
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'add_password_resets_table',
    up: `
      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    `,
    down: 'DROP TABLE IF EXISTS password_resets;',
  },
];

export function runMigrations() {
  const db = getDb();
  
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
  
  // Get applied migrations
  const applied = db.prepare('SELECT id FROM migrations').all() as { id: number }[];
  const appliedIds = new Set(applied.map(m => m.id));
  
  // Run pending migrations
  for (const migration of migrations) {
    if (!appliedIds.has(migration.id)) {
      logger.info('Running migration', { id: migration.id, name: migration.name });
      db.exec(migration.up);
      db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
    }
  }
}

export function rollbackMigration(migrationId: number) {
  const db = getDb();
  const migration = migrations.find(m => m.id === migrationId);
  
  if (!migration) {
    throw new Error(`Migration ${migrationId} not found`);
  }
  
  logger.info('Rolling back migration', { id: migration.id, name: migration.name });
  db.exec(migration.down);
  db.prepare('DELETE FROM migrations WHERE id = ?').run(migration.id);
}
```

- [ ] **Step 2: Update db.ts to run migrations on init**

```typescript
// web/src/lib/db.ts - add after initSqliteSchema
import { runMigrations } from './migrations';

// In getSqlite function, after initSqliteSchema():
runMigrations();
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/migrations.ts web/src/lib/db.ts
git commit -m "feat: add database migrations system"
```

---

## Task 8: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: None
- Produces: CI/CD pipeline

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        working-directory: web
        run: npm ci
      
      - name: Run lint
        working-directory: web
        run: npm run lint
      
      - name: Run tests
        working-directory: web
        run: npm test
      
      - name: Run build
        working-directory: web
        run: npm run build
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

- [ ] **Step 2: Create deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
    workflow_run:
      workflows: ["CI"]
      types: [completed]

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "Deploy to your hosting provider here"
          # Add your deployment commands here
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/
git commit -m "feat: add GitHub Actions CI/CD pipeline"
```

---

## Task 9: E2E Tests with Playwright

**Files:**
- Create: `web/e2e/auth.spec.ts`
- Create: `web/playwright.config.ts`

**Interfaces:**
- Consumes: None
- Produces: E2E test suite

- [ ] **Step 1: Create Playwright config**

```typescript
// web/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Create auth E2E test**

```typescript
// web/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('registers new user', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Register');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('logs in existing user', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
```

- [ ] **Step 3: Install Playwright**

Run: `npm install -D @playwright/test`
Run: `npx playwright install`
Expected: Success

- [ ] **Step 4: Run E2E tests**

Run: `npx playwright test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/e2e/ web/playwright.config.ts web/package.json web/package-lock.json
git commit -m "feat: add E2E tests with Playwright"
```

---

## Task 10: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: 33/33 passing

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test`
Expected: All tests PASS

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Start server and test manually**

Run: `npm run dev`
Test:
- Login works
- Dashboard loads
- Health check returns OK
- Refresh token rotation works
- HTTPS redirect works (in production)

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification and fixes"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Fix Jose ESM tests | jest.config.ts |
| 2 | Refresh token rotation | refresh/route.ts |
| 3 | HTTPS enforcement | middleware.ts |
| 4 | Docker env validation | Dockerfile, docker-compose.yml |
| 5 | Sentry monitoring | sentry.ts, api-error.ts |
| 6 | Request logging | request-logger.ts, middleware.ts |
| 7 | Database migrations | migrations.ts, db.ts |
| 8 | GitHub Actions CI/CD | .github/workflows/ |
| 9 | E2E tests (Playwright) | e2e/, playwright.config.ts |
| 10 | Final verification | - |
