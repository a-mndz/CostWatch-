import { NextRequest, NextResponse } from 'next/server';
import { getAlertHistory } from '@/lib/db';
import { requireUser } from '@/lib/require-user';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const userId = await requireUser();
    return NextResponse.json({ alerts: getAlertHistory(userId) });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error('Failed to fetch alerts', { error: String(e) });
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    const { anomalyId, channel } = await request.json();
    const { logAlert } = await import('@/lib/db');
    logAlert(userId, anomalyId, channel || '#cost-alerts');
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to log alert' }, { status: 500 });
  }
}
