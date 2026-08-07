# Task 7: Graceful Shutdown

**Files:**
- Modify: `web/src/lib/worker.ts` (add shutdown handler)
- Modify: `web/src/lib/db.ts` (add close function)

**Interfaces:**
- Consumes: None
- Produces: Clean shutdown on SIGTERM/SIGINT

## Step 1: Add close function to db.ts

Add to `web/src/lib/db.ts`:

```typescript
export function closeDb() {
  const db = getSqlite();
  db.close();
}
```

## Step 2: Update worker.ts with shutdown handler

Update `web/src/lib/worker.ts` - add at bottom:

```typescript
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

## Step 3: Run build

Run: `npm run build` in `web/` directory
Expected: PASS

## Step 4: Commit

```bash
git add web/src/lib/worker.ts web/src/lib/db.ts
git commit -m "feat: add graceful shutdown handler for SIGTERM/SIGINT"
```
