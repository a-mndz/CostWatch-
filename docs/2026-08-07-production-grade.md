# CostWatch Production-Grade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push CostWatch from MVP (7.5/10) to production-grade (9/10) by adding tests, auth, Postgres support, background workers, and real cloud SDK integration.

**Architecture:** Each subsystem is independent — tests first (safety net), then auth (required for multi-tenant), then Postgres migration (required for scale), then workers (required for automation), then real cloud SDKs (requires all prior pieces). Build order matters.

**Tech Stack:** Jest, bcryptjs, jose (JWT), postgres (node-postgres), node-cron, @aws-sdk/client-cost-explorer, @google-cloud/bigquery

## Global Constraints
- Next.js 16.3.0, TypeScript 5, Tailwind CSS 4
- Ponytail: full mode — stdlib first, shortest diff
- Caveman: full mode — terse output
- All existing API routes must continue working
- SQLite remains default; Postgres is opt-in via `DATABASE_URL` env var
- No breaking changes to existing `web/sample-data.csv` upload flow

---

## Phase 1: Tests (Safety Net)

### Task 1.1: Test Infrastructure

**Files:**
- Create: `web/jest.config.ts`
- Create: `web/src/__tests__/helpers.ts`
- Modify: `web/package.json` (add test script)

**Interfaces:**
- Consumes: existing `web/src/lib/` modules
- Produces: `getDb()` test helper that returns in-memory SQLite

- [ ] **Step 1: Install Jest**

Run: `cd web && npm install -D jest ts-jest @types/jest`

- [ ] **Step 2: Create jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
```

- [ ] **Step 3: Add test script to package.json**

Add to scripts: `"test": "jest"`

- [ ] **Step 4: Create test helper**

```typescript
// web/src/__tests__/helpers.ts
import Database from 'better-sqlite3';
import path from 'path';

// Override DB_PATH for tests
process.env.COSTWATCH_DB = ':memory:';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Import and run schema from db.ts but on this instance
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      service TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'unknown',
      account TEXT NOT NULL DEFAULT 'default',
      amount REAL NOT NULL,
      usage_quantity REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date, service, region, account)
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      service TEXT NOT NULL,
      region TEXT NOT NULL,
      dimension_type TEXT NOT NULL DEFAULT 'service',
      expected REAL NOT NULL,
      actual REAL NOT NULL,
      z_score REAL NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')),
      root_cause TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anomaly_id INTEGER REFERENCES anomalies(id),
      channel TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      sent_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cloud_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL CHECK(provider IN ('aws', 'gcp')),
      label TEXT NOT NULL,
      account_id TEXT NOT NULL,
      role_arn TEXT,
      external_id TEXT,
      project_id TEXT,
      service_account_key TEXT,
      status TEXT NOT NULL DEFAULT 'connected' CHECK(status IN ('connected', 'error', 'disconnected')),
      last_sync TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}
```

- [ ] **Step 5: Run to verify setup**

Run: `cd web && npm test -- --passWithNoTests`
Expected: PASS (no tests yet)

- [ ] **Step 6: Commit**

```bash
cd web && git add jest.config.ts src/__tests__/helpers.ts package.json package-lock.json
git commit -m "test: add Jest infrastructure with in-memory SQLite helper"
```

---

### Task 1.2: Parser Tests

**Files:**
- Create: `web/src/__tests__/parser.test.ts`

**Interfaces:**
- Consumes: `parseCostCsv()` from `@/lib/cost-ingest/parser`
- Produces: coverage for CSV parsing edge cases

- [ ] **Step 1: Write parser tests**

```typescript
// web/src/__tests__/parser.test.ts
import { parseCostCsv } from '@/lib/cost-ingest/parser';

describe('parseCostCsv', () => {
  it('parses valid CSV', () => {
    const csv = 'date,service,region,account,amount,usageQuantity\n2026-01-01,EC2,us-east-1,default,100.50,1000';
    const result = parseCostCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe(100.50);
    expect(result.rows[0].service).toBe('EC2');
  });

  it('skips empty lines', () => {
    const csv = 'date,service,region,account,amount,usageQuantity\n\n2026-01-01,EC2,us-east-1,default,100,1000\n\n';
    const result = parseCostCsv(csv);
    expect(result.rows).toHaveLength(1);
  });

  it('handles missing usageQuantity', () => {
    const csv = 'date,service,region,account,amount,usageQuantity\n2026-01-01,S3,us-east-1,default,50,';
    const result = parseCostCsv(csv);
    expect(result.rows[0].usage_quantity).toBe(0);
  });

  it('throws on empty input', () => {
    expect(() => parseCostCsv('')).toThrow();
  });

  it('throws on missing required columns', () => {
    const csv = 'date,service\n2026-01-01,EC2';
    expect(() => parseCostCsv(csv)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd web && npm test src/__tests__/parser.test.ts`
Expected: Check if parser exports match — may need to adjust import

- [ ] **Step 3: Fix any import issues and re-run**

- [ ] **Step 4: Commit**

```bash
cd web && git add src/__tests__/parser.test.ts
git commit -m "test: add CSV parser tests"
```

---

### Task 1.3: Z-Score Detection Tests

**Files:**
- Create: `web/src/__tests__/zscore.test.ts`

**Interfaces:**
- Consumes: `detectAnomalies()` from `@/lib/anomaly-detection/zscore`
- Produces: coverage for anomaly detection logic

- [ ] **Step 1: Write zscore tests**

```typescript
// web/src/__tests__/zscore.test.ts
import { detectAnomalies } from '@/lib/anomaly-detection/zscore';

describe('detectAnomalies', () => {
  const baseHistory = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    service: 'EC2',
    region: 'us-east-1',
    amount: 100,
  }));

  it('returns empty for normal data', () => {
    const today = [{ date: '2026-01-31', service: 'EC2', region: 'us-east-1', amount: 102 }];
    const anomalies = detectAnomalies(today, baseHistory);
    expect(anomalies).toHaveLength(0);
  });

  it('detects high anomaly (3x average)', () => {
    const today = [{ date: '2026-01-31', service: 'EC2', region: 'us-east-1', amount: 500 }];
    const anomalies = detectAnomalies(today, baseHistory);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].severity).toBe('high');
  });

  it('detects low anomaly (0.1x average)', () => {
    const today = [{ date: '2026-01-31', service: 'EC2', region: 'us-east-1', amount: 5 }];
    const anomalies = detectAnomalies(today, baseHistory);
    expect(anomalies.length).toBeGreaterThan(0);
  });

  it('handles multiple services', () => {
    const today = [
      { date: '2026-01-31', service: 'EC2', region: 'us-east-1', amount: 500 },
      { date: '2026-01-31', service: 'S3', region: 'us-east-1', amount: 100 },
    ];
    const history = [
      ...baseHistory,
      ...Array.from({ length: 30 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        service: 'S3',
        region: 'us-east-1',
        amount: 100,
      })),
    ];
    const anomalies = detectAnomalies(today, history);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].service).toBe('EC2');
  });

  it('returns empty when history is too short', () => {
    const today = [{ date: '2026-01-31', service: 'EC2', region: 'us-east-1', amount: 500 }];
    const anomalies = detectAnomalies(today, []);
    expect(anomalies).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd web && npm test src/__tests__/zscore.test.ts`
Expected: Check function signature matches — adjust imports if needed

- [ ] **Step 3: Commit**

```bash
cd web && git add src/__tests__/zscore.test.ts
git commit -m "test: add z-score anomaly detection tests"
```

---

### Task 1.4: Slack Alert Tests

**Files:**
- Create: `web/src/__tests__/slack.test.ts`

**Interfaces:**
- Consumes: `sendSlackAlert()` from `@/lib/alerts/slack`
- Produces: coverage for Slack webhook formatting

- [ ] **Step 1: Write slack tests**

```typescript
// web/src/__tests__/slack.test.ts
import { buildSlackPayload } from '@/lib/alerts/slack';

describe('Slack alerts', () => {
  it('builds valid payload', () => {
    const anomaly = {
      date: '2026-01-31',
      service: 'EC2',
      region: 'us-east-1',
      expected: 100,
      actual: 500,
      zScore: 4.5,
      severity: 'high' as const,
    };
    const payload = buildSlackPayload(anomaly);
    expect(payload.blocks).toBeDefined();
    expect(JSON.stringify(payload)).toContain('EC2');
    expect(JSON.stringify(payload)).toContain('high');
  });

  it('includes severity color', () => {
    const anomaly = {
      date: '2026-01-31', service: 'S3', region: 'us-east-1',
      expected: 50, actual: 5, zScore: -3.2, severity: 'medium' as const,
    };
    const payload = buildSlackPayload(anomaly);
    const str = JSON.stringify(payload);
    expect(str).toContain('medium');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd web && npm test src/__tests__/slack.test.ts`

- [ ] **Step 3: Commit**

```bash
cd web && git add src/__tests__/slack.test.ts
git commit -m "test: add Slack alert formatting tests"
```

---

### Task 1.5: DB Query Tests

**Files:**
- Create: `web/src/__tests__/db.test.ts`

**Interfaces:**
- Consumes: all query functions from `@/lib/db`
- Produces: coverage for CRUD operations

- [ ] **Step 1: Write db tests**

```typescript
// web/src/__tests__/db.test.ts
import { createTestDb } from './helpers';

// Mock getDb to return test DB
let testDb: ReturnType<typeof createTestDb>;

beforeEach(() => {
  testDb = createTestDb();
  jest.spyOn(require('@/lib/db'), 'getDb').mockReturnValue(testDb);
});

afterEach(() => {
  jest.restoreAllMocks();
  testDb.close();
});

describe('DB operations', () => {
  it('inserts and retrieves costs', () => {
    const { insertCosts, getCostsByDay } = require('@/lib/db');
    insertCosts([
      { date: '2026-01-01', service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usage_quantity: 1000 },
    ]);
    const costs = getCostsByDay(30);
    expect(costs.length).toBeGreaterThan(0);
  });

  it('inserts and retrieves anomalies', () => {
    const { insertAnomaly, getAnomalies } = require('@/lib/db');
    insertAnomaly({
      date: '2026-01-31', service: 'EC2', region: 'us-east-1',
      expected: 100, actual: 500, z_score: 4.5, severity: 'high',
    });
    const anomalies = getAnomalies();
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].severity).toBe('high');
  });

  it('updates anomaly status', () => {
    const { insertAnomaly, updateAnomalyStatus, getAnomalies } = require('@/lib/db');
    insertAnomaly({
      date: '2026-01-31', service: 'EC2', region: 'us-east-1',
      expected: 100, actual: 500, z_score: 4.5, severity: 'high',
    });
    updateAnomalyStatus(1, 'acknowledged');
    const anomalies = getAnomalies('acknowledged');
    expect(anomalies).toHaveLength(1);
  });

  it('manages config', () => {
    const { getConfig, setConfig } = require('@/lib/db');
    setConfig('slack_webhook', 'https://hooks.slack.com/test');
    expect(getConfig('slack_webhook')).toBe('https://hooks.slack.com/test');
  });

  it('manages cloud accounts', () => {
    const { addCloudAccount, getCloudAccounts, removeCloudAccount } = require('@/lib/db');
    addCloudAccount({ provider: 'aws', label: 'Prod', account_id: '123456789012', role_arn: 'arn:aws:iam::123:role/test' });
    const accounts = getCloudAccounts();
    expect(accounts).toHaveLength(1);
    removeCloudAccount(accounts[0].id);
    expect(getCloudAccounts()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd web && npm test src/__tests__/db.test.ts`

- [ ] **Step 3: Commit**

```bash
cd web && git add src/__tests__/db.test.ts
git commit -m "test: add database query tests"
```

---

### Task 1.6: API Route Integration Tests

**Files:**
- Create: `web/src/__tests__/api.test.ts`

**Interfaces:**
- Consumes: API route handlers
- Produces: coverage for request/response flows

- [ ] **Step 1: Write API tests**

```typescript
// web/src/__tests__/api.test.ts
import { createTestDb } from './helpers';

beforeEach(() => {
  jest.spyOn(require('@/lib/db'), 'getDb').mockReturnValue(createTestDb());
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/costs', () => {
  it('parses CSV and returns counts', async () => {
    const csv = 'date,service,region,account,amount,usageQuantity\n2026-01-01,EC2,us-east-1,default,100,1000';
    const { POST } = require('@/app/api/costs/route');
    const req = new Request('http://localhost/api/costs', { method: 'POST', body: csv });
    const res = await POST(req);
    const data = await res.json();
    expect(data.recordsProcessed).toBe(1);
  });
});

describe('GET /api/costs', () => {
  it('returns cost data', async () => {
    const { GET } = require('@/app/api/costs/route');
    const req = new Request('http://localhost/api/costs');
    const res = await GET(req);
    const data = await res.json();
    expect(data).toHaveProperty('daily');
    expect(data).toHaveProperty('byService');
  });
});

describe('GET /api/anomalies', () => {
  it('returns anomalies list', async () => {
    const { GET } = require('@/app/api/anomalies/route');
    const req = new Request('http://localhost/api/anomalies');
    const res = await GET(req);
    const data = await res.json();
    expect(data).toHaveProperty('anomalies');
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `cd web && npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
cd web && git add src/__tests__/api.test.ts
git commit -m "test: add API route integration tests"
```

---

## Phase 2: Auth + Multi-Tenant

### Task 2.1: User Schema + Auth Helpers

**Files:**
- Create: `web/src/lib/auth.ts`
- Modify: `web/src/lib/db.ts` (add users table, tenant_id to all tables)

**Interfaces:**
- Consumes: `bcryptjs`, `jose`
- Produces: `hashPassword()`, `verifyPassword()`, `createToken()`, `verifyToken()`, `getCurrentUser()`

- [ ] **Step 1: Install auth deps**

Run: `cd web && npm install bcryptjs jose && npm install -D @types/bcryptjs`

- [ ] **Step 2: Create auth.ts**

```typescript
// web/src/lib/auth.ts
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'costwatch-dev-secret-change-in-production');
const ALG = 'HS256';

export interface User {
  id: number;
  email: string;
  name: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: User): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<{ sub: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { sub: payload.sub as number, email: payload.email as string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Fetch full user from DB
  const { getDb } = await import('./db');
  const db = getDb();
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.sub) as User | undefined;
  return user || null;
}
```

- [ ] **Step 3: Add users table + tenant_id to db.ts**

Add to `initSchema()` in `db.ts`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Add to all existing tables: add `user_id INTEGER REFERENCES users(id)` column.
- For SQLite, use `ALTER TABLE ... ADD COLUMN` wrapped in try/catch (column may already exist)

- [ ] **Step 4: Add user-scoped query helpers**

```typescript
// Add to db.ts
export function createUser(email: string, passwordHash: string, name?: string) {
  const db = getDb();
  return db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, passwordHash, name);
}

export function getUserByEmail(email: string) {
  const db = getDb();
  return db.prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?').get(email) as {
    id: number; email: string; password_hash: string; name: string | null;
  } | undefined;
}
```

- [ ] **Step 5: Commit**

```bash
cd web && git add src/lib/auth.ts src/lib/db.ts
git commit -m "feat: add user auth with JWT, bcrypt, and users table"
```

---

### Task 2.2: Auth API Routes

**Files:**
- Create: `web/src/app/api/auth/register/route.ts`
- Create: `web/src/app/api/auth/login/route.ts`
- Create: `web/src/app/api/auth/me/route.ts`
- Create: `web/src/app/api/auth/logout/route.ts`

**Interfaces:**
- Consumes: `hashPassword`, `verifyPassword`, `createToken`, `getCurrentUser` from `@/lib/auth`
- Produces: POST/GET routes for register, login, me, logout

- [ ] **Step 1: Create register route**

```typescript
// web/src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken } from '@/lib/auth';
import { createUser, getUserByEmail } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    if (getUserByEmail(email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    const hash = await hashPassword(password);
    const result = createUser(email, hash, name);
    const token = await createToken({ id: Number(result.lastInsertRowid), email, name: name || null });
    const res = NextResponse.json({ success: true, user: { id: result.lastInsertRowid, email, name } });
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create login route**

```typescript
// web/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const user = getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = await createToken({ id: user.id, email: user.email, name: user.name });
    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create me + logout routes**

```typescript
// web/src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
```

```typescript
// web/src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
```

- [ ] **Step 4: Run build**

Run: `cd web && npm run build`
Expected: Pass

- [ ] **Step 5: Commit**

```bash
cd web && git add src/app/api/auth/
git commit -m "feat: add auth API routes (register, login, me, logout)"
```

---

### Task 2.3: Auth Middleware + Login UI

**Files:**
- Create: `web/src/middleware.ts`
- Create: `web/src/app/login/page.tsx`

**Interfaces:**
- Consumes: JWT verification
- Produces: Route protection, login form

- [ ] **Step 1: Create middleware**

```typescript
// web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'costwatch-dev-secret-change-in-production');
const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/_next') || pathname.startsWith('/public'))) {
    return NextResponse.next();
  }

  // Allow API auth routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Create login page**

Simple login/register form with tabs. Use existing design tokens (`var(--bg)`, `var(--text-primary)`, etc.). Submit to `/api/auth/login` or `/api/auth/register`, redirect to `/dashboard` on success.

- [ ] **Step 3: Run build**

Run: `cd web && npm run build`

- [ ] **Step 4: Commit**

```bash
cd web && git add src/middleware.ts src/app/login/
git commit -m "feat: add auth middleware and login page"
```

---

## Phase 3: Postgres Migration

### Task 3.1: Postgres DB Adapter

**Files:**
- Create: `web/src/lib/db-pg.ts`
- Modify: `web/src/lib/db.ts` (add adapter pattern)

**Interfaces:**
- Consumes: `postgres` package
- Produces: Same query interface, Postgres-backed

- [ ] **Step 1: Install postgres**

Run: `cd web && npm install postgres`

- [ ] **Step 2: Create db-pg.ts**

```typescript
// web/src/lib/db-pg.ts
import postgres from 'postgres';

let sql: postgres.Sql;

export function getPG(): postgres.Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    sql = postgres(url);
  }
  return sql;
}

export async function initPGSchema() {
  const sql = getPG();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS costs (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      service TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'unknown',
      account TEXT NOT NULL DEFAULT 'default',
      amount REAL NOT NULL,
      usage_quantity REAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(date, service, region, account)
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      service TEXT NOT NULL,
      region TEXT NOT NULL,
      dimension_type TEXT NOT NULL DEFAULT 'service',
      expected REAL NOT NULL,
      actual REAL NOT NULL,
      z_score REAL NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')),
      root_cause TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alerts_log (
      id SERIAL PRIMARY KEY,
      anomaly_id INTEGER REFERENCES anomalies(id),
      channel TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      sent_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cloud_accounts (
      id SERIAL PRIMARY KEY,
      provider TEXT NOT NULL CHECK(provider IN ('aws', 'gcp')),
      label TEXT NOT NULL,
      account_id TEXT NOT NULL,
      role_arn TEXT,
      external_id TEXT,
      project_id TEXT,
      service_account_key TEXT,
      status TEXT NOT NULL DEFAULT 'connected' CHECK(status IN ('connected', 'error', 'disconnected')),
      last_sync TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date);
    CREATE INDEX IF NOT EXISTS idx_costs_service ON costs(service);
    CREATE INDEX IF NOT EXISTS idx_anomalies_date ON anomalies(date);
    CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
  `;
}
```

- [ ] **Step 3: Update db.ts to use adapter pattern**

Add at top of `db.ts`:
```typescript
const isPG = !!process.env.DATABASE_URL;

export function getDb() {
  if (isPG) {
    // Lazy import to avoid loading postgres when not needed
    const { getPG } = require('./db-pg');
    return getPG();
  }
  // ... existing SQLite logic
}
```

- [ ] **Step 4: Commit**

```bash
cd web && git add src/lib/db-pg.ts src/lib/db.ts
git commit -m "feat: add Postgres adapter, auto-selects based on DATABASE_URL"
```

---

### Task 3.2: DB Query Abstraction

**Files:**
- Modify: `web/src/lib/db.ts`

**Interfaces:**
- Consumes: existing query functions
- Produces: dual SQLite/Postgres compatible queries

- [ ] **Step 1: Refactor query functions to use parameterized queries that work on both**

Key changes:
- `date('now', '-30 days')` → use JS `Date` to compute dates, pass as params
- `INSERT OR REPLACE` → `INSERT ... ON CONFLICT ... DO UPDATE`
- Use parameterized queries consistently

- [ ] **Step 2: Test with SQLite (default)**

Run: `cd web && npm test`

- [ ] **Step 3: Commit**

```bash
cd web && git add src/lib/db.ts
git commit -m "refactor: make DB queries compatible with both SQLite and Postgres"
```

---

## Phase 4: Background Workers

### Task 4.1: Sync Scheduler

**Files:**
- Create: `web/src/lib/worker.ts`
- Create: `web/src/app/api/sync/status/route.ts`

**Interfaces:**
- Consumes: cloud accounts from DB, sync functions
- Produces: cron-based background sync

- [ ] **Step 1: Install node-cron**

Run: `cd web && npm install node-cron && npm install -D @types/node-cron`

- [ ] **Step 2: Create worker.ts**

```typescript
// web/src/lib/worker.ts
import cron from 'node-cron';
import { getCloudAccounts, updateCloudAccountSync } from './db';

let isRunning = false;

async function syncAll() {
  if (isRunning) return;
  isRunning = true;

  try {
    const accounts = getCloudAccounts();
    for (const account of accounts) {
      try {
        if (account.provider === 'aws') {
          const { syncAWSCosts } = await import('./cloud/aws');
          await syncAWSCosts(account);
        } else if (account.provider === 'gcp') {
          const { syncGCPCosts } = await import('./cloud/gcp');
          await syncGCPCosts(account);
        }
        updateCloudAccountSync(account.id);
      } catch (err) {
        console.error(`Sync failed for ${account.label}:`, err);
      }
    }
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', syncAll);
  console.log('Sync scheduler started (every 6 hours)');
}

export function triggerSync() {
  return syncAll();
}

export function getSyncStatus() {
  return { running: isRunning };
}
```

- [ ] **Step 3: Create sync status route**

```typescript
// web/src/app/api/sync/status/route.ts
import { NextResponse } from 'next/server';
import { getSyncStatus, triggerSync } from '@/lib/worker';

export async function GET() {
  return NextResponse.json(getSyncStatus());
}

export async function POST() {
  triggerSync();
  return NextResponse.json({ triggered: true });
}
```

- [ ] **Step 4: Update /api/sync to use worker**

Modify `POST` handler in `/api/sync/route.ts` to call `triggerSync()` instead of inline sync.

- [ ] **Step 5: Commit**

```bash
cd web && git add src/lib/worker.ts src/app/api/sync/status/route.ts src/app/api/sync/route.ts
git commit -m "feat: add background sync scheduler with cron"
```

---

## Phase 5: Real Cloud SDK Integration

### Task 5.1: AWS Cost Explorer Integration

**Files:**
- Create: `web/src/lib/cloud/aws.ts`

**Interfaces:**
- Consumes: `@aws-sdk/client-cost-explorer`
- Produces: `syncAWSCosts(account)`, `testAWSConnection(account)`

- [ ] **Step 1: Install AWS SDK**

Run: `cd web && npm install @aws-sdk/client-cost-explorer @aws-sdk/client-sts`

- [ ] **Step 2: Create aws.ts**

```typescript
// web/src/lib/cloud/aws.ts
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { insertCosts } from '../db';

interface AWSAccount {
  account_id: string;
  role_arn: string;
  external_id: string | null;
}

async function getCredentials(account: AWSAccount) {
  const sts = new STSClient({ region: 'us-east-1' });
  const result = await sts.send(new AssumeRoleCommand({
    RoleArn: account.role_arn,
    RoleSessionName: 'costwatch-sync',
    ExternalId: account.external_id || undefined,
    DurationSeconds: 3600,
  }));

  if (!result.Credentials) throw new Error('Failed to assume role');
  return {
    accessKeyId: result.Credentials.AccessKeyId!,
    secretAccessKey: result.Credentials.SecretAccessKey!,
    sessionToken: result.Credentials.SessionToken!,
  };
}

export async function syncAWSCosts(account: AWSAccount) {
  const creds = await getCredentials(account);
  const client = new CostExplorerClient({
    region: 'us-east-1',
    credentials: creds,
  });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const result = await client.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    GroupBy: [
      { Type: 'DIMENSION', Key: 'SERVICE' },
      { Type: 'DIMENSION', Key: 'REGION' },
    ],
  }));

  const rows = [];
  for (const resultItem of result.ResultsByTime || []) {
    for (const group of resultItem.Groups || []) {
      const service = group.Keys?.[0] || 'Unknown';
      const region = group.Keys?.[1] || 'unknown';
      const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
      rows.push({
        date: resultItem.TimePeriod?.Start || '',
        service,
        region,
        account: account.account_id,
        amount,
        usage_quantity: 0,
      });
    }
  }

  if (rows.length > 0) {
    insertCosts(rows);
  }
  return rows.length;
}

export async function testAWSConnection(account: AWSAccount): Promise<{ success: boolean; message: string }> {
  try {
    await getCredentials(account);
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err}` };
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd web && git add src/lib/cloud/aws.ts
git commit -m "feat: add real AWS Cost Explorer integration"
```

---

### Task 5.2: GCP BigQuery Integration

**Files:**
- Create: `web/src/lib/cloud/gcp.ts`

**Interfaces:**
- Consumes: `@google-cloud/bigquery`
- Produces: `syncGCPCosts(account)`, `testGCPConnection(account)`

- [ ] **Step 1: Install BigQuery client**

Run: `cd web && npm install @google-cloud/bigquery`

- [ ] **Step 2: Create gcp.ts**

```typescript
// web/src/lib/cloud/gcp.ts
import { BigQuery } from '@google-cloud/bigquery';
import { insertCosts } from '../db';

interface GCPAccount {
  project_id: string;
  service_account_key: string | null;
}

function getBigQuery(account: GCPAccount): BigQuery {
  const options: Record<string, unknown> = { projectId: account.project_id };
  if (account.service_account_key) {
    try {
      options.credentials = JSON.parse(account.service_account_key);
    } catch {
      // If not JSON, treat as key file path
    }
  }
  return new BigQuery(options);
}

export async function syncGCPCosts(account: GCPAccount) {
  const bigquery = getBigQuery(account);

  const query = `
    SELECT
      DATE(usage_start_time) as usage_date,
      service.description as service,
      location.region as region,
      SUM(cost) as amount,
      SUM(usage.amount) as usage_quantity
    FROM \`${account.project_id}.gcp_billing_export.gcp_billing_export_v1_*\`
    WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY usage_date, service, region
    ORDER BY usage_date
  `;

  const [rows] = await bigquery.query({
    query,
    location: 'US',
  });

  const costRows = rows.map((row: Record<string, unknown>) => ({
    date: (row.usage_date as Date).toISOString().split('T')[0],
    service: (row.service as string) || 'Unknown',
    region: (row.region as string) || 'unknown',
    account: account.project_id,
    amount: Number(row.amount) || 0,
    usage_quantity: Number(row.usage_quantity) || 0,
  }));

  if (costRows.length > 0) {
    insertCosts(costRows);
  }
  return costRows.length;
}

export async function testGCPConnection(account: GCPAccount): Promise<{ success: boolean; message: string }> {
  try {
    const bigquery = getBigQuery(account);
    await bigquery.getDatasets({ maxResults: 1 });
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err}` };
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd web && git add src/lib/cloud/gcp.ts
git commit -m "feat: add real GCP BigQuery integration"
```

---

### Task 5.3: Wire Cloud SDKs into Connect Route

**Files:**
- Modify: `web/src/app/api/connect/route.ts`
- Modify: `web/src/app/api/sync/route.ts`

**Interfaces:**
- Consumes: `testAWSConnection`, `testGCPConnection`, `syncAWSCosts`, `syncGCPCosts`
- Produces: real connection testing and sync

- [ ] **Step 1: Update POST in connect/route.ts**

After adding account, call `testAWSConnection` or `testGCPConnection` and set status to `connected` or `error`.

- [ ] **Step 2: Update POST in sync/route.ts**

Replace skeleton with actual `syncAWSCosts`/`syncGCPCosts` calls.

- [ ] **Step 3: Run build**

Run: `cd web && npm run build`

- [ ] **Step 4: Run all tests**

Run: `cd web && npm test`

- [ ] **Step 5: Commit**

```bash
cd web && git add src/app/api/connect/route.ts src/app/api/sync/route.ts
git commit -m "feat: wire real cloud SDKs into connect and sync routes"
```

---

## Verification Checklist

After all tasks:
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — clean build
- [ ] `npm run lint` — no errors
- [ ] Upload `sample-data.csv` — still works
- [ ] Register new user — works
- [ ] Login/logout — works
- [ ] Dashboard shows data — works
- [ ] Connect AWS account — tests connection
- [ ] Connect GCP project — tests connection
- [ ] Sync triggers background job — works
- [ ] `DATABASE_URL` set → Postgres used; unset → SQLite used
