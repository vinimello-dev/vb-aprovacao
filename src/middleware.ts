import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isValid = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.ADMIN_SESSION_SECRET || 'admin-secret-plataforma-vb-aprovacao-2025'
      );
      const { payload } = await jwtVerify(token, secret);
      isValid = payload.role === 'admin';
    } catch {
      isValid = false;
    }
  }

  // Rota de login
  if (pathname === '/admin/login') {
    if (isValid) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // Proteção das rotas /admin
  if (pathname.startsWith('/admin')) {
    if (!isValid) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
