import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getEnv } from '@/lib/env';

const { JWT_SECRET } = getEnv();
const SECRET = new TextEncoder().encode(JWT_SECRET);
const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout', '/api/auth/refresh'];

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
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== 'access') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
