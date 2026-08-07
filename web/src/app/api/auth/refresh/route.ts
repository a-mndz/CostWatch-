import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, createAccessToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:refresh', 20, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.sub) as { id: number; email: string; name: string | null } | undefined;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const newAccessToken = await createAccessToken({ id: user.id, email: user.email, name: user.name });

    logger.info('Token refreshed', { userId: user.id });
    const res = NextResponse.json({ success: true });
    res.cookies.set('token', newAccessToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 15 });
    return res;
  } catch (err) {
    logger.error('Token refresh failed', { error: String(err) });
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
