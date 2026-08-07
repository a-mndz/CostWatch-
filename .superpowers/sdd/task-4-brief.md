# Task 4: CSRF Protection

**Files:**
- Modify: `web/src/middleware.ts` (generate/validate CSRF tokens)
- Create: `web/src/lib/api.ts` (client-side fetch helper)

**Interfaces:**
- Consumes: None (standalone middleware)
- Produces: CSRF token in cookie, validation for state-changing requests

## Step 1: Add CSRF token generation to middleware

Update `web/src/middleware.ts` - add CSRF logic:

```typescript
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

  // Skip CSRF for auth routes (they're protected by rate limiting)
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return true;
  }

  // Skip CSRF for health check
  if (request.nextUrl.pathname === '/api/health') {
    return true;
  }

  const cookieToken = request.cookies.get('csrf_token')?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}
```

## Step 2: Add CSRF token to responses

Update `web/src/middleware.ts` - add to response handling:

```typescript
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

## Step 3: Create client-side fetch helper

Create `web/src/lib/api.ts`:

```typescript
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

## Step 4: Run build

Run: `npm run build` in `web/` directory
Expected: PASS

## Step 5: Commit

```bash
git add web/src/middleware.ts web/src/lib/api.ts
git commit -m "feat: add CSRF protection with token validation"
```
