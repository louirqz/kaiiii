import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'nnichna_pos_super_secret_jwt_key_2026_change_in_production'
);

const COOKIE_NAME = 'nnichna_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let sessionUser: { role: string; id: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionUser = { role: payload.role as string, id: payload.id as string };
    } catch {
      sessionUser = null;
    }
  }

  // 1. Root redirect directly to POS storefront
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/pos', request.url));
  }

  // 2. Protect /admin routes (ADMIN and MANAGER only)
  if (pathname.startsWith('/admin')) {
    if (!sessionUser) {
      // Redirect to POS with query to open Admin PIN prompt
      const url = new URL('/pos', request.url);
      url.searchParams.set('loginAdmin', '1');
      return NextResponse.redirect(url);
    }
    if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/pos', request.url));
    }
    return NextResponse.next();
  }

  // 3. If on /login page and already authenticated
  if (pathname === '/login') {
    if (sessionUser) {
      if (sessionUser.role === 'CASHIER') {
        return NextResponse.redirect(new URL('/pos', request.url));
      }
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // /pos is public - storefront is immediately accessible
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*'],
};
