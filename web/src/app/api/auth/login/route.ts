import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';
import { validate, LoginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:login', 20, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const v = validate(LoginSchema, body);
    if (!v.success) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const { email, password } = v.data;
    const user = getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      logger.warn('Failed login attempt', { email });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken({ id: user.id, email: user.email, name: user.name });
    logger.info('User logged in', { email });
    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (err) {
    logger.error('Login failed', { error: String(err) });
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
