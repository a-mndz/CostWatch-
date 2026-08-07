import { NextRequest, NextResponse } from 'next/server';
import { getPasswordResetToken, deletePasswordResetToken, updateUserPassword } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { validate, ResetPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:reset', 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const v = validate(ResetPasswordSchema, body);
    if (!v.success) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const resetRecord = getPasswordResetToken(v.data.token);
    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      deletePasswordResetToken(v.data.token);
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    const passwordHash = await hashPassword(v.data.password);
    updateUserPassword(resetRecord.user_id, passwordHash);
    deletePasswordResetToken(v.data.token);

    logger.info('Password reset completed', { userId: resetRecord.user_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Reset password failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
