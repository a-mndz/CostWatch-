# Task 3: Token Refresh Endpoint

**Files:**
- Create: `web/src/app/api/auth/refresh/route.ts`
- Modify: `web/src/lib/require-user.ts` (handle expired access token)

**Interfaces:**
- Consumes: `verifyRefreshToken()`, `createAccessToken()` from Task 2
- Produces: `POST /api/auth/refresh` rotates access token

## Step 1: Create refresh endpoint

Create `web/src/app/api/auth/refresh/route.ts`:

```typescript
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

## Step 2: Update require-user to handle expired tokens

Update `web/src/lib/require-user.ts`:

```typescript
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

## Step 3: Add refresh endpoint to middleware public paths

Update `web/src/middleware.ts` - add to PUBLIC_PATHS:

```typescript
const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout', '/api/auth/refresh'];
```

## Step 4: Run build

Run: `npm run build` in `web/` directory
Expected: PASS

## Step 5: Commit

```bash
git add web/src/app/api/auth/refresh/route.ts web/src/lib/require-user.ts web/src/middleware.ts
git commit -m "feat: add token refresh endpoint for seamless auth"
```
