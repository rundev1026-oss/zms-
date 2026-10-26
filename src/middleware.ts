import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get('zms_session')?.value;

  // Protected paths requiring active authenticated session
  const isProtectedPath = pathname.startsWith('/my-account') || pathname.startsWith('/profile');

  if (isProtectedPath) {
    if (!sessionCookie || sessionCookie.trim() === '') {
      // Build safe redirect target
      const safeRedirectPath = encodeURIComponent(pathname + search);
      const loginUrl = new URL(`/login?redirect=${safeRedirectPath}`, request.url);
      
      const response = NextResponse.redirect(loginUrl);
      // Strictly prevent browser history cache from keeping private authenticated views
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
  }

  const response = NextResponse.next();

  // Add no-store cache headers for sensitive and authentication views
  if (isProtectedPath || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    '/my-account/:path*',
    '/profile/:path*',
    '/login',
  ],
};
