# Task 6: Health Check Endpoint

**Files:**
- Create: `web/src/app/api/health/route.ts`

**Interfaces:**
- Consumes: `getDb()` from db.ts
- Produces: GET /api/health returns system status

## Step 1: Create health check endpoint

Create `web/src/app/api/health/route.ts`:

```typescript
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

## Step 2: Run build

Run: `npm run build` in `web/` directory
Expected: PASS

## Step 3: Commit

```bash
git add web/src/app/api/health/route.ts
git commit -m "feat: add health check endpoint for monitoring"
```
