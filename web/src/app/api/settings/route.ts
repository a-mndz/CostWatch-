import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/db';
import { validate, SettingsSchema } from '@/lib/validation';
import { requireUser } from '@/lib/require-user';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api-error';

export const GET = withErrorHandling(async () => {
  const userId = await requireUser();
  return NextResponse.json({
    webhookUrl: getConfig(userId, 'slack_webhook_url') || '',
    smtpHost: getConfig(userId, 'smtp_host') || '',
    smtpPort: getConfig(userId, 'smtp_port') || '',
    smtpUser: getConfig(userId, 'smtp_user') || '',
    smtpPass: getConfig(userId, 'smtp_pass') || '',
    smtpFrom: getConfig(userId, 'smtp_from') || '',
    alertEmail: getConfig(userId, 'alert_email') || '',
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUser();
  const body = await request.json();
  const v = validate(SettingsSchema, body);
  if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

  const { webhookUrl, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, alertEmail } = v.data;

  setConfig(userId, 'slack_webhook_url', webhookUrl || '');
  setConfig(userId, 'smtp_host', smtpHost || '');
  setConfig(userId, 'smtp_port', smtpPort ? String(smtpPort) : '');
  setConfig(userId, 'smtp_user', smtpUser || '');
  setConfig(userId, 'smtp_pass', smtpPass || '');
  setConfig(userId, 'smtp_from', smtpFrom || '');
  setConfig(userId, 'alert_email', alertEmail || '');

  logger.info('Settings updated', { userId });
  return NextResponse.json({ success: true });
});
