import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/db';
import { validate, SettingsSchema } from '@/lib/validation';
import { requireUser } from '@/lib/require-user';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const userId = await requireUser();
    return NextResponse.json({ webhookUrl: getConfig(userId, 'slack_webhook_url') || '' });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    const body = await request.json();
    const v = validate(SettingsSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    if (v.data.webhookUrl) {
      setConfig(userId, 'slack_webhook_url', v.data.webhookUrl);
    } else {
      setConfig(userId, 'slack_webhook_url', '');
    }
    logger.info('Settings updated', { userId });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
