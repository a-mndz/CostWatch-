import { NextRequest, NextResponse } from 'next/server';
import { getAlertHistory } from '@/lib/db';
import { requireUser } from '@/lib/require-user';
import { withErrorHandling } from '@/lib/api-error';

export const GET = withErrorHandling(async () => {
  const userId = await requireUser();
  return NextResponse.json({ alerts: getAlertHistory(userId) });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUser();
  const { anomalyId, channel } = await request.json();
  const { logAlert } = await import('@/lib/db');
  logAlert(userId, anomalyId, channel || '#cost-alerts');
  return NextResponse.json({ success: true });
});
