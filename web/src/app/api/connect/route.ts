import { NextRequest, NextResponse } from 'next/server';
import { getCloudAccounts, addCloudAccount, removeCloudAccount } from '@/lib/db';
import { validate, ConnectSchema } from '@/lib/validation';
import { requireUser } from '@/lib/require-user';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api-error';

export const GET = withErrorHandling(async () => {
  const userId = await requireUser();
  const accounts = getCloudAccounts(userId);
  const safe = accounts.map(a => ({
    id: a.id, provider: a.provider, label: a.label, account_id: a.account_id,
    role_arn: a.role_arn, external_id: a.external_id,
    project_id: a.project_id, status: a.status,
    last_sync: a.last_sync, created_at: a.created_at,
  }));
  return NextResponse.json({ accounts: safe });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const rl = rateLimit('connect', 10, 60000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const userId = await requireUser();
  const body = await request.json();
  const v = validate(ConnectSchema, body);
  if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

  const { provider, label, accountId, roleArn, externalId, projectId, serviceAccountKey } = v.data;
  if (provider === 'aws' && !roleArn) return NextResponse.json({ error: 'roleArn is required for AWS' }, { status: 400 });
  if (provider === 'gcp' && !projectId) return NextResponse.json({ error: 'projectId is required for GCP' }, { status: 400 });

  addCloudAccount(userId, {
    provider, label, account_id: accountId,
    role_arn: roleArn, external_id: externalId,
    project_id: projectId, service_account_key: serviceAccountKey,
  });

  let connectionStatus = 'connected';
  try {
    if (provider === 'aws') {
      const { testAWSConnection } = await import('@/lib/cloud/aws');
      const result = await testAWSConnection({ account_id: accountId, role_arn: roleArn!, external_id: externalId || null });
      if (!result.success) connectionStatus = 'error';
    } else {
      const { testGCPConnection } = await import('@/lib/cloud/gcp');
      const result = await testGCPConnection({ project_id: projectId!, service_account_key: serviceAccountKey || null });
      if (!result.success) connectionStatus = 'error';
    }
  } catch { connectionStatus = 'error'; }

  logger.info('Cloud account connected', { userId, provider, label, status: connectionStatus });
  return NextResponse.json({ success: true, status: connectionStatus });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUser();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || isNaN(Number(id))) return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
  removeCloudAccount(userId, Number(id));
  return NextResponse.json({ success: true });
});
