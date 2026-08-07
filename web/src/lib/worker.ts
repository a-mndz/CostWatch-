import cron from 'node-cron';
import { getCloudAccounts, updateCloudAccountSync } from './db';
import { logger } from './logger';

let isRunning = false;

async function syncAll() {
  if (isRunning) return;
  isRunning = true;

  try {
    // Get all users' accounts (query all users, sync each)
    const Database = (await import('better-sqlite3')).default;
    const path = (await import('path')).default;
    const db = new Database(path.join(process.cwd(), 'costwatch.db'));
    const users = db.prepare('SELECT id FROM users').all() as Array<{ id: number }>;

    for (const user of users) {
      const accounts = getCloudAccounts(user.id);
      for (const account of accounts) {
        try {
          if (account.provider === 'aws') {
            const { syncAWSCosts } = await import('./cloud/aws');
            await syncAWSCosts(user.id, { account_id: account.account_id, role_arn: account.role_arn!, external_id: account.external_id });
          } else if (account.provider === 'gcp') {
            const { syncGCPCosts } = await import('./cloud/gcp');
            await syncGCPCosts(user.id, { project_id: account.project_id!, service_account_key: account.service_account_key });
          }
          updateCloudAccountSync(user.id, account.id);
        } catch (err) {
          logger.error('Sync failed for account', { userId: user.id, label: account.label, error: String(err) });
        }
      }
    }
    db.close();
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  cron.schedule('0 */6 * * *', syncAll);
  logger.info('Sync scheduler started (every 6 hours)');
}

export function triggerSync() {
  syncAll();
  return { triggered: true };
}

export function getSyncStatus() {
  return { running: isRunning };
}
