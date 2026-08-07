# Task 9: Retry Logic for Cloud APIs

**Files:**
- Create: `web/src/lib/retry.ts`
- Modify: `web/src/lib/cloud/aws.ts` (add retry)
- Modify: `web/src/lib/cloud/gcp.ts` (add retry)

**Interfaces:**
- Consumes: None
- Produces: `withRetry()` helper function

## Step 1: Create retry helper

Create `web/src/lib/retry.ts`:

```typescript
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

## Step 2: Update AWS SDK calls

Update `web/src/lib/cloud/aws.ts`:

```typescript
import { withRetry } from '../retry';

export async function syncAWSCosts(userId: number, account: AWSAccount) {
  // ... existing code ...
  
  const data = await withRetry(async () => {
    const command = new GetCostAndUsageCommand(params);
    return client.send(command);
  });
  
  // ... rest of function ...
}
```

## Step 3: Update GCP SDK calls

Update `web/src/lib/cloud/gcp.ts`:

```typescript
import { withRetry } from '../retry';

export async function syncGCPCosts(userId: number, account: GCPAccount) {
  // ... existing code ...
  
  const [rows] = await withRetry(async () => {
    return bigquery.query(query);
  });
  
  // ... rest of function ...
}
```

## Step 4: Run build

Run: `npm run build` in `web/` directory
Expected: PASS

## Step 5: Commit

```bash
git add web/src/lib/retry.ts web/src/lib/cloud/aws.ts web/src/lib/cloud/gcp.ts
git commit -m "feat: add exponential backoff retry for cloud API calls"
```
