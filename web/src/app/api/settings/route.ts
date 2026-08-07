import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/db';
import { validate, SettingsSchema } from '@/lib/validation';
import { requireUser } from '@/lib/require-user';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api-error';

export const GET = withErrorHandling(async () => {
  const userId = await requireUser();
  return NextResponse.json({ webhookUrl: getConfig(userId, 'slack_webhook_url') || '' });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
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
});
