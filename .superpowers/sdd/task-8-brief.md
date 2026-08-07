# Task 8: API Error Handling Middleware

**Files:**
- Create: `web/src/lib/api-error.ts`
- Modify: All API routes to use error handler

**Interfaces:**
- Consumes: `logger` from logger.ts
- Produces: `withErrorHandling()` wrapper function

## Step 1: Create error handler

Create `web/src/lib/api-error.ts`:

```typescript
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

## Step 2: Update costs route to use handler

Update `web/src/app/api/costs/route.ts`:

```typescript
import { withErrorHandling } from '@/lib/api-error';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // ... existing POST logic (remove try/catch, keep content)
});

export const GET = withErrorHandling(async () => {
  // ... existing GET logic (remove try/catch, keep content)
});
```

## Step 3: Update other routes similarly

Apply `withErrorHandling()` to:
- `/api/alerts/route.ts`
- `/api/anomalies/route.ts`
- `/api/settings/route.ts`
- `/api/connect/route.ts`
- `/api/sync/route.ts`
- `/api/sync/status/route.ts`

## Step 4: Run tests

Run: `npm test` in `web/` directory
Expected: PASS

## Step 5: Commit

```bash
git add web/src/lib/api-error.ts web/src/app/api/costs/route.ts web/src/app/api/alerts/route.ts web/src/app/api/anomalies/route.ts web/src/app/api/settings/route.ts web/src/app/api/connect/route.ts web/src/app/api/sync/route.ts web/src/app/api/sync/status/route.ts
git commit -m "feat: add API error handling middleware with request IDs"
```
