import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the auth page itself
  if (pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  const expectedPin = process.env.AUTH_PIN;

  // If no PIN is configured, allow everything (dev / non-protected deployments)
  if (!expectedPin) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('sazon_auth');

  if (authCookie?.value === expectedPin) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/auth';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-|.*\\.png$).*)'],
};
