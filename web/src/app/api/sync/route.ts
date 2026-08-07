import { NextRequest, NextResponse } from 'next/server';
import { getCloudAccounts, updateCloudAccountSync } from '@/lib/db';
import { requireUser } from '@/lib/require-user';
import { validate, SyncSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api-error';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUser();
  const body = await request.json();
  const v = validate(SyncSchema, body);
  if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

  const accounts = getCloudAccounts(userId);
  const account = accounts.find(a => a.id === v.data.accountId);
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  let rowsSynced = 0;
  if (account.provider === 'aws') {
    const { syncAWSCosts } = await import('@/lib/cloud/aws');
    rowsSynced = await syncAWSCosts(userId, { account_id: account.account_id, role_arn: account.role_arn!, external_id: account.external_id });
  } else {
    const { syncGCPCosts } = await import('@/lib/cloud/gcp');
    rowsSynced = await syncGCPCosts(userId, { project_id: account.project_id!, service_account_key: account.service_account_key });
  }

  updateCloudAccountSync(userId, account.id);
  logger.info('Sync completed', { userId, provider: account.provider, label: account.label, rowsSynced });
  return NextResponse.json({ success: true, rowsSynced, provider: account.provider, label: account.label });
});
