import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getEnv } from '@/lib/env';

const { JWT_SECRET } = getEnv();
const SECRET = new TextEncoder().encode(JWT_SECRET);
const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout', '/api/auth/refresh'];

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function isValidCsrfRequest(request: NextRequest): boolean {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return true;
  }

  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return true;
  }

  if (request.nextUrl.pathname === '/api/health') {
    return true;
  }

  const cookieToken = request.cookies.get('csrf_token')?.value;
  const headerToken = request.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/_next') || pathname.startsWith('/public'))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  if (!isValidCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
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

    const response = NextResponse.next();
    if (request.method === 'GET' && !request.cookies.get('csrf_token')) {
      const csrfToken = generateCsrfToken();
      response.cookies.set('csrf_token', csrfToken, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      });
    }
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
