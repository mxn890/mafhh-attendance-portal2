import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const PUBLIC_PATHS = ['/login'];
const PUBLIC_API_PREFIXES = ['/api/auth/'];

async function hasValidSession(request) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublicPage || isPublicApi) return NextResponse.next();

  const authed = await hasValidSession(request);
  if (authed) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|face-models|.*\\..*).*)'],
};
