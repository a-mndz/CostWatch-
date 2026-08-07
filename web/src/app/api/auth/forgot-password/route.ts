import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken } from '@/lib/db';
import { validate, ForgotPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:forgot', 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const v = validate(ForgotPasswordSchema, body);
    if (!v.success) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const user = getUserByEmail(v.data.email);

    // Always return success to prevent email enumeration
    if (user) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      createPasswordResetToken(user.id, token, expiresAt);
      logger.info('Password reset requested', { email: v.data.email });
    }

    return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    logger.error('Forgot password failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
