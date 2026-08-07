# Task 1: Environment Variable Validation

**Files:**
- Create: `web/src/lib/env.ts`
- Modify: `web/src/middleware.ts` (import env check)
- Modify: `web/src/lib/auth.ts` (use getEnv)

**Interfaces:**
- Consumes: `process.env`
- Produces: `getEnv()` returns validated env object

## Step 1: Create env validation schema

Create `web/src/lib/env.ts`:

```typescript
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

## Step 2: Add env check to middleware

Update `web/src/middleware.ts` - add at top:

```typescript
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

## Step 3: Update auth.ts to use getEnv()

Update `web/src/lib/auth.ts`:

```typescript
import { getEnv } from './env';

const { JWT_SECRET } = getEnv();
const SECRET = new TextEncoder().encode(JWT_SECRET);
```

Replace line 5 (`const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'costwatch-dev-secret-change-in-production');`) with the above.

## Step 4: Run build

Run: `npm run build` in `web/` directory
Expected: PASS

## Step 5: Commit

```bash
git add web/src/lib/env.ts web/src/middleware.ts web/src/lib/auth.ts
git commit -m "feat: add environment variable validation at startup"
```
