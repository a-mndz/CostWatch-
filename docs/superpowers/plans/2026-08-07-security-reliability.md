# Security + Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the CostWatch app with CSRF protection, short-lived access tokens with refresh tokens, environment validation, health checks, graceful shutdown, and API error handling.

**Architecture:** Add security middleware (CSRF, env validation), split auth into access/refresh tokens, add reliability endpoints (health, graceful shutdown), and standardize error handling across all API routes.

**Tech Stack:** Next.js 16, jose (JWT), zod (validation), better-sqlite3, node-cron

---

## Global Constraints

- TypeScript strict mode
- All API routes use `requireUser()` for userId extraction
- All mutations rate-limited via `rateLimit()` from `@/lib/rate-limit`
- All errors logged via `logger` from `@/lib/logger`
- Cookies: httpOnly, sameSite: 'lax', path: '/'
- No new dependencies unless absolutely necessary

---

## Task 1: Environment Variable Validation

**Files:**
- Create: `web/src/lib/env.ts`
- Modify: `web/src/middleware.ts` (import env check)

**Interfaces:**
- Consumes: `process.env`
- Produces: `getEnv()` returns validated env object

- [ ] **Step 1: Create env validation schema**

```typescript
// web/src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) return cachedEnv;
  
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }
  
  cachedEnv = result.data;
  return cachedEnv;
}
```

- [ ] **Step 2: Add env check to middleware**

```typescript
// web/src/middleware.ts - add at top
import { getEnv } from '@/lib/env';

// Call getEnv() at middleware startup to fail fast
try {
  getEnv();
} catch (e) {
  console.error('Environment validation failed:', e);
  // In dev, allow through with warning; in prod, block all requests
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update auth.ts to use getEnv()**

```typescript
// web/src/lib/auth.ts - replace line 5
import { getEnv } from './env';

const { JWT_SECRET } = getEnv();
const SECRET = new TextEncoder().encode(JWT_SECRET);
```

- [ ] **Step 4: Run build to verify**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/env.ts web/src/middleware.ts web/src/lib/auth.ts
git commit -m "feat: add environment variable validation at startup"
```

---

## Task 2: Short-Lived Access + Refresh Tokens

**Files:**
- Modify: `web/src/lib/auth.ts` (split token creation)
- Modify: `web/src/app/api/auth/login/route.ts` (set both cookies)
- Modify: `web/src/app/api/auth/register/route.ts` (set both cookies)
- Modify: `web/src/app/api/auth/logout/route.ts` (clear both cookies)
- Modify: `web/src/lib/require-user.ts` (use access token)
- Modify: `web/src/middleware.ts` (check access token)

**Interfaces:**
- Consumes: `getEnv()` from Task 1
- Produces: `createAccessToken()`, `createRefreshToken()`, `verifyAccessToken()`, `verifyRefreshToken()`

- [ ] **Step 1: Update auth.ts with split tokens**

```typescript
// web/src/lib/auth.ts - replace token functions
export async function createAccessToken(user: User): Promise<string> {
  return new SignJWT({ sub: String(user.id), email: user.email, type: 'access' })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(SECRET);
}

export async function createRefreshToken(user: User): Promise<string> {
  return new SignJWT({ sub: String(user.id), email: user.email, type: 'refresh' })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyAccessToken(token: string): Promise<{ sub: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== 'access') return null;
    return { sub: Number(payload.sub), email: payload.email as string };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== 'refresh') return null;
    return { sub: Number(payload.sub), email: payload.email as string };
  } catch {
    return null;
  }
}

// Keep backward compatibility
export async function createToken(user: User): Promise<string> {
  return createAccessToken(user);
}

export async function verifyToken(token: string): Promise<{ sub: number; email: string } | null> {
  return verifyAccessToken(token);
}
```

- [ ] **Step 2: Update login route to set both cookies**

```typescript
// web/src/app/api/auth/login/route.ts - update cookie section
const accessToken = await createAccessToken({ id: user.id, email: user.email, name: user.name });
const refreshToken = await createRefreshToken({ id: user.id, email: user.email, name: user.name });

logger.info('User logged in', { email });
const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
res.cookies.set('token', accessToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 15 }); // 15 min
res.cookies.set('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }); // 7 days
return res;
```

- [ ] **Step 3: Update register route similarly**

```typescript
// web/src/app/api/auth/register/route.ts - same pattern as login
const accessToken = await createAccessToken({ id: userId, email, name: name || null });
const refreshToken = await createRefreshToken({ id: userId, email, name: name || null });

const res = NextResponse.json({ success: true, user: { id: userId, email, name } });
res.cookies.set('token', accessToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 15 });
res.cookies.set('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
return res;
```

- [ ] **Step 4: Update logout to clear both cookies**

```typescript
// web/src/app/api/auth/logout/route.ts
const res = NextResponse.json({ success: true });
res.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
res.cookies.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
return res;
```

- [ ] **Step 5: Update middleware to use verifyAccessToken**

```typescript
// web/src/middleware.ts - replace token verification
const token = request.cookies.get('token')?.value;
if (!token) {
  return NextResponse.redirect(new URL('/login', request.url));
}

try {
  const { payload } = await jwtVerify(token, SECRET);
  if (payload.type !== 'access') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
} catch {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

- [ ] **Step 6: Run tests to verify**

Run: `npm test`
Expected: PASS (existing tests should still work with backward-compatible verifyToken)

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/auth.ts web/src/app/api/auth/login/route.ts web/src/app/api/auth/register/route.ts web/src/app/api/auth/logout/route.ts web/src/middleware.ts
git commit -m "feat: split auth into 15min access + 7d refresh tokens"
```

---

## Task 3: Token Refresh Endpoint

**Files:**
- Create: `web/src/app/api/auth/refresh/route.ts`
- Modify: `web/src/lib/require-user.ts` (handle expired access token)

**Interfaces:**
- Consumes: `verifyRefreshToken()`, `createAccessToken()` from Task 2
- Produces: `POST /api/auth/refresh` rotates access token

- [ ] **Step 1: Create refresh endpoint**

```typescript
// web/src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, createAccessToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
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
    
    logger.info('Token refreshed', { userId: user.id });
    const res = NextResponse.json({ success: true });
    res.cookies.set('token', newAccessToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 15 });
    return res;
  } catch (err) {
    logger.error('Token refresh failed', { error: String(err) });
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update require-user to handle expired tokens**

```typescript
// web/src/lib/require-user.ts
import { cookies } from 'next/headers';
import { verifyAccessToken, verifyRefreshToken } from './auth';

export async function requireUser(): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('Unauthorized');

  const payload = await verifyAccessToken(token);
  if (payload) return payload.sub;

  // Access token expired, try refresh
  const refreshToken = cookieStore.get('refresh_token')?.value;
  if (!refreshToken) throw new Error('Unauthorized');

  const refreshPayload = await verifyRefreshToken(refreshToken);
  if (!refreshPayload) throw new Error('Unauthorized');

  // Return the user ID from refresh token (client should call /api/auth/refresh)
  return refreshPayload.sub;
}
```

- [ ] **Step 3: Add refresh endpoint to middleware public paths**

```typescript
// web/src/middleware.ts - add to PUBLIC_PATHS
const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout', '/api/auth/refresh'];
```

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/app/api/auth/refresh/route.ts web/src/lib/require-user.ts web/src/middleware.ts
git commit -m "feat: add token refresh endpoint for seamless auth"
```

---

## Task 4: CSRF Protection

**Files:**
- Modify: `web/src/middleware.ts` (generate/validate CSRF tokens)
- Modify: `web/src/lib/auth.ts` (export CSRF helpers)

**Interfaces:**
- Consumes: None (standalone middleware)
- Produces: CSRF token in cookie, validation for state-changing requests

- [ ] **Step 1: Add CSRF token generation to middleware**

```typescript
// web/src/middleware.ts - add CSRF logic
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

function isValidCsrfRequest(request: NextRequest): boolean {
  // Only check state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return true;
  }

  // Skip CSRF for login/register (they're protected by rate limiting)
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return true;
  }

  const cookieToken = request.cookies.get('csrf_token')?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}
```

- [ ] **Step 2: Add CSRF token to responses**

```typescript
// web/src/middleware.ts - add to response handling
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ... existing public path check ...

  // Generate CSRF token for GET requests
  const response = NextResponse.next();
  
  if (request.method === 'GET' && !request.cookies.get('csrf_token')) {
    const csrfToken = generateCsrfToken();
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Needs to be readable by JS
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });
  }

  // Validate CSRF for state-changing requests
  if (!isValidCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // ... rest of middleware ...
  return response;
}
```

- [ ] **Step 3: Update client-side fetch to include CSRF header**

```typescript
// Add to web/src/app/dashboard/settings/page.tsx or create a helper
// Create web/src/lib/api.ts
export async function apiFetch(url: string, options: RequestInit = {}) {
  const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return fetch(url, { ...options, headers });
}
```

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/middleware.ts web/src/lib/api.ts
git commit -m "feat: add CSRF protection with token validation"
```

---

## Task 5: Password Reset Flow

**Files:**
- Create: `web/src/app/api/auth/forgot-password/route.ts`
- Create: `web/src/app/api/auth/reset-password/route.ts`
- Modify: `web/src/lib/db.ts` (add password reset token functions)
- Modify: `web/src/lib/validation.ts` (add reset schemas)
- Modify: `web/src/app/login/page.tsx` (add forgot password link)

**Interfaces:**
- Consumes: `hashPassword()`, `verifyPassword()` from auth.ts
- Produces: Token-based password reset (mock email)

- [ ] **Step 1: Add DB functions for reset tokens**

```typescript
// web/src/lib/db.ts - add after existing functions
export function createPasswordResetToken(userId: number, token: string, expiresAt: string) {
  const db = getDb();
  db.prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)").run(userId, token, expiresAt);
}

export function getPasswordResetToken(token: string) {
  const db = getDb();
  return db.prepare("SELECT user_id, expires_at FROM password_resets WHERE token = ?").get(token) as { user_id: number; expires_at: string } | undefined;
}

export function deletePasswordResetToken(token: string) {
  const db = getDb();
  db.prepare("DELETE FROM password_resets WHERE token = ?").run(token);
}

export function updateUserPassword(userId: number, passwordHash: string) {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}
```

- [ ] **Step 2: Add password_resets table to schema**

```typescript
// web/src/lib/db.ts - add to initSchema
db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
`);
```

- [ ] **Step 3: Add validation schemas**

```typescript
// web/src/lib/validation.ts - add
export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
```

- [ ] **Step 4: Create forgot-password endpoint**

```typescript
// web/src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken } from '@/lib/db';
import { validate, ForgotPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:forgot', 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const v = validate(ForgotPasswordSchema, body);
    if (!v.success) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const user = getUserByEmail(v.data.email);
    
    // Always return success to prevent email enumeration
    if (user) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      createPasswordResetToken(user.id, token, expiresAt);
      
      // TODO: Send email with reset link
      logger.info('Password reset requested', { email: v.data.email, token });
    }

    return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    logger.error('Forgot password failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create reset-password endpoint**

```typescript
// web/src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPasswordResetToken, deletePasswordResetToken, updateUserPassword } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { validate, ResetPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:reset', 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const v = validate(ResetPasswordSchema, body);
    if (!v.success) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const resetRecord = getPasswordResetToken(v.data.token);
    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Check expiry
    if (new Date(resetRecord.expires_at) < new Date()) {
      deletePasswordResetToken(v.data.token);
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    const passwordHash = await hashPassword(v.data.password);
    updateUserPassword(resetRecord.user_id, passwordHash);
    deletePasswordResetToken(v.data.token);

    logger.info('Password reset completed', { userId: resetRecord.user_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Reset password failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Update login page with forgot password link**

```typescript
// web/src/app/login/page.tsx - add after form
<div className="mt-4 text-center">
  <button
    type="button"
    onClick={() => setShowForgot(true)}
    className="text-sm text-primary hover:underline"
  >
    Forgot password?
  </button>
</div>
```

- [ ] **Step 7: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add web/src/app/api/auth/forgot-password/route.ts web/src/app/api/auth/reset-password/route.ts web/src/lib/db.ts web/src/lib/validation.ts web/src/app/login/page.tsx
git commit -m "feat: add password reset flow with token-based reset"
```

---

## Task 6: Health Check Endpoint

**Files:**
- Create: `web/src/app/api/health/route.ts`

**Interfaces:**
- Consumes: `getDb()` from db.ts
- Produces: GET /api/health returns system status

- [ ] **Step 1: Create health check endpoint**

```typescript
// web/src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: 'unknown',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  // Check DB connectivity
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    health.db = 'connected';
  } catch {
    health.db = 'error';
    health.status = 'degraded';
  }

  const status = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status });
}
```

- [ ] **Step 2: Add health check to middleware public paths**

```typescript
// web/src/middleware.ts - add to PUBLIC_PATHS
const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout', '/api/auth/refresh', '/api/health'];
```

- [ ] **Step 3: Test health endpoint**

Run: `curl http://localhost:3000/api/health`
Expected: `{"status":"ok","timestamp":"...","uptime":...,"db":"connected","memory":{...}}`

- [ ] **Step 4: Commit**

```bash
git add web/src/app/api/health/route.ts web/src/middleware.ts
git commit -m "feat: add health check endpoint for monitoring"
```

---

## Task 7: Graceful Shutdown

**Files:**
- Modify: `web/src/lib/worker.ts` (add shutdown handler)
- Modify: `web/src/lib/db.ts` (add close function)

**Interfaces:**
- Consumes: None
- Produces: Clean shutdown on SIGTERM/SIGINT

- [ ] **Step 1: Add close function to db.ts**

```typescript
// web/src/lib/db.ts - add
export function closeDb() {
  const db = getDb();
  db.close();
}
```

- [ ] **Step 2: Update worker.ts with shutdown handler**

```typescript
// web/src/lib/worker.ts - add at bottom
let isShuttingDown = false;

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info('Graceful shutdown initiated');
  
  // Wait for current sync to complete
  while (isRunning) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Close DB connection
  try {
    const { closeDb } = await import('./db');
    closeDb();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error('Error closing database', { error: String(err) });
  }
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/worker.ts web/src/lib/db.ts
git commit -m "feat: add graceful shutdown handler for SIGTERM/SIGINT"
```

---

## Task 8: API Error Handling Middleware

**Files:**
- Create: `web/src/lib/api-error.ts`
- Modify: All API routes to use error handler

**Interfaces:**
- Consumes: `logger` from logger.ts
- Produces: `withErrorHandling()` wrapper function

- [ ] **Step 1: Create error handler**

```typescript
// web/src/lib/api-error.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { randomBytes } from 'crypto';

export type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest) => {
    const requestId = randomBytes(8).toString('hex');
    
    try {
      const response = await handler(request);
      response.headers.set('X-Request-Id', requestId);
      return response;
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized', requestId },
          { status: 401, headers: { 'X-Request-Id': requestId } }
        );
      }

      logger.error('API error', { 
        requestId,
        path: request.nextUrl.pathname,
        method: request.method,
        error: String(e),
      });

      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500, headers: { 'X-Request-Id': requestId } }
      );
    }
  };
}
```

- [ ] **Step 2: Update costs route to use handler**

```typescript
// web/src/app/api/costs/route.ts - update imports and wrap
import { withErrorHandling } from '@/lib/api-error';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // ... existing POST logic ...
});

export const GET = withErrorHandling(async () => {
  // ... existing GET logic ...
});
```

- [ ] **Step 3: Update other routes similarly**

Apply `withErrorHandling()` to:
- `/api/alerts/route.ts`
- `/api/anomalies/route.ts`
- `/api/settings/route.ts`
- `/api/connect/route.ts`
- `/api/sync/route.ts`
- `/api/sync/status/route.ts`

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/api-error.ts web/src/app/api/costs/route.ts web/src/app/api/alerts/route.ts web/src/app/api/anomalies/route.ts web/src/app/api/settings/route.ts web/src/app/api/connect/route.ts web/src/app/api/sync/route.ts web/src/app/api/sync/status/route.ts
git commit -m "feat: add API error handling middleware with request IDs"
```

---

## Task 9: Retry Logic for Cloud APIs

**Files:**
- Modify: `web/src/lib/cloud/aws.ts` (add retry)
- Modify: `web/src/lib/cloud/gcp.ts` (add retry)

**Interfaces:**
- Consumes: None
- Produces: `withRetry()` helper function

- [ ] **Step 1: Create retry helper**

```typescript
// web/src/lib/retry.ts
import { logger } from './logger';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && 'statusCode' in error) {
        const statusCode = (error as any).statusCode;
        if (statusCode >= 400 && statusCode < 500) {
          throw error;
        }
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = delay * 0.1 * Math.random();
      
      logger.warn(`Retry attempt ${attempt}/${maxRetries}`, { 
        error: String(error),
        nextDelayMs: delay + jitter,
      });
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

- [ ] **Step 2: Update AWS SDK calls**

```typescript
// web/src/lib/cloud/aws.ts - wrap SDK calls
import { withRetry } from '../retry';

export async function syncAWSCosts(config: {...}) {
  // ... existing code ...
  
  const data = await withRetry(async () => {
    const command = new GetCostAndUsageCommand(params);
    return client.send(command);
  });
  
  // ... rest of function ...
}
```

- [ ] **Step 3: Update GCP SDK calls**

```typescript
// web/src/lib/cloud/gcp.ts - wrap BigQuery calls
import { withRetry } from '../retry';

export async function syncGCPCosts(config: {...}) {
  // ... existing code ...
  
  const [rows] = await withRetry(async () => {
    return bigquery.query(query);
  });
  
  // ... rest of function ...
}
```

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/retry.ts web/src/lib/cloud/aws.ts web/src/lib/cloud/gcp.ts
git commit -m "feat: add exponential backoff retry for cloud API calls"
```

---

## Task 10: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Start server and test manually**

Run: `npm run dev`
Test:
- Login works
- Dashboard loads
- Settings page works
- Health check returns OK
- CSRF tokens are set

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification and fixes"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Environment validation | env.ts, middleware.ts, auth.ts |
| 2 | Access + refresh tokens | auth.ts, login/register/logout routes |
| 3 | Token refresh endpoint | refresh/route.ts, require-user.ts |
| 4 | CSRF protection | middleware.ts, api.ts |
| 5 | Password reset flow | forgot-password/reset-password routes, db.ts, validation.ts |
| 6 | Health check | health/route.ts |
| 7 | Graceful shutdown | worker.ts, db.ts |
| 8 | API error handling | api-error.ts, all API routes |
| 9 | Retry logic | retry.ts, aws.ts, gcp.ts |
| 10 | Final verification | - |
