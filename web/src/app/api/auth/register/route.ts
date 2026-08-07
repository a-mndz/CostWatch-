import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken } from '@/lib/auth';
import { createUser, getUserByEmail } from '@/lib/db';
import { validate, RegisterSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const rl = rateLimit('auth:register', 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const v = validate(RegisterSchema, body);
    if (!v.success) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const { email, password, name } = v.data;
    if (getUserByEmail(email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hash = await hashPassword(password);
    const result = createUser(email, hash, name);
    const token = await createToken({ id: Number(result.lastInsertRowid), email, name: name || null });

    logger.info('User registered', { email });
    const res = NextResponse.json({ success: true, user: { id: result.lastInsertRowid, email, name } });
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (err) {
    logger.error('Registration failed', { error: String(err) });
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
