import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE, checkPin } from '@/lib/auth-pin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the auth page itself
  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // 'ok' also covers dev without AUTH_PIN; production without AUTH_PIN is 'misconfigured' and stays closed
  if (checkPin(request.cookies.get(AUTH_COOKIE)?.value) === 'ok') {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/auth';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-|.*\\.png$).*)'],
};
