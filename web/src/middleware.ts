import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getEnv } from '@/lib/env';

// Call getEnv() at middleware startup to fail fast
getEnv();

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'costwatch-dev-secret-change-in-production');
const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/_next') || pathname.startsWith('/public'))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
