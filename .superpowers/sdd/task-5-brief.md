# Task 5: Password Reset Flow

**Files:**
- Create: `web/src/app/api/auth/forgot-password/route.ts`
- Create: `web/src/app/api/auth/reset-password/route.ts`
- Modify: `web/src/lib/db.ts` (add password reset token functions + table)
- Modify: `web/src/lib/validation.ts` (add reset schemas)

**Interfaces:**
- Consumes: `hashPassword()`, `verifyPassword()` from auth.ts
- Produces: Token-based password reset (mock email)

## Step 1: Add password_resets table to schema

Update `web/src/lib/db.ts` - add to initSqliteSchema:

```sql
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
```

## Step 2: Add DB functions for reset tokens

Add to `web/src/lib/db.ts`:

```typescript
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

## Step 3: Add validation schemas

Add to `web/src/lib/validation.ts`:

```typescript
export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
```

## Step 4: Create forgot-password endpoint

Create `web/src/app/api/auth/forgot-password/route.ts`:

```typescript
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

## Step 5: Create reset-password endpoint

Create `web/src/app/api/auth/reset-password/route.ts`:

```typescript
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

## Step 6: Run build

Run: `npm run build` in `web/` directory
Expected: PASS

## Step 7: Commit

```bash
git add web/src/app/api/auth/forgot-password/route.ts web/src/app/api/auth/reset-password/route.ts web/src/lib/db.ts web/src/lib/validation.ts
git commit -m "feat: add password reset flow with token-based reset"
```
