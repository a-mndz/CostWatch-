# Task 2: Short-Lived Access + Refresh Tokens

**Files:**
- Modify: `web/src/lib/auth.ts` (split token creation)
- Modify: `web/src/app/api/auth/login/route.ts` (set both cookies)
- Modify: `web/src/app/api/auth/register/route.ts` (set both cookies)
- Modify: `web/src/app/api/auth/logout/route.ts` (clear both cookies)
- Modify: `web/src/middleware.ts` (check access token)

**Interfaces:**
- Consumes: `getEnv()` from Task 1
- Produces: `createAccessToken()`, `createRefreshToken()`, `verifyAccessToken()`, `verifyRefreshToken()`

## Step 1: Update auth.ts with split tokens

Replace token functions in `web/src/lib/auth.ts`:

```typescript
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

## Step 2: Update login route to set both cookies

Update `web/src/app/api/auth/login/route.ts`:

```typescript
const accessToken = await createAccessToken({ id: user.id, email: user.email, name: user.name });
const refreshToken = await createRefreshToken({ id: user.id, email: user.email, name: user.name });

logger.info('User logged in', { email });
const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
res.cookies.set('token', accessToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 15 }); // 15 min
res.cookies.set('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }); // 7 days
return res;
```

## Step 3: Update register route similarly

Same pattern as login - use createAccessToken and createRefreshToken, set both cookies with 15min and 7d maxAge.

## Step 4: Update logout to clear both cookies

```typescript
const res = NextResponse.json({ success: true });
res.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
res.cookies.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
return res;
```

## Step 5: Update middleware to use verifyAccessToken

```typescript
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

## Step 6: Run tests

Run: `npm test` in `web/` directory
Expected: PASS (backward-compatible verifyToken still works)

## Step 7: Commit

```bash
git add web/src/lib/auth.ts web/src/app/api/auth/login/route.ts web/src/app/api/auth/register/route.ts web/src/app/api/auth/logout/route.ts web/src/middleware.ts
git commit -m "feat: split auth into 15min access + 7d refresh tokens"
```
