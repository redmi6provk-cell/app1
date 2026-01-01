import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session'; // Assuming your tsconfig has paths setup for @/

// Re-using the local interface declaration as in the API route for consistency
interface AppSessionData {
  isLoggedIn?: boolean;
  username?: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res = NextResponse.next(); // Create response object early

  // Allow requests for API routes, Next.js specific paths, static files, and the login page itself to pass through
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') || // Adjust if your static files are served differently
    pathname.includes('.') || // Generally allows files with extensions (e.g., favicon.ico, images)
    pathname === '/login'
  ) {
    return res; // Use the already created response object
  }

  // Pass both request and response to getIronSession for compatibility
  // iron-session uses these to read existing cookies and to be able to set new ones if session.save() is called.
  const session = await getIronSession<AppSessionData>(request, res, sessionOptions);

  if (!session.isLoggedIn) {
    // If not logged in and trying to access a protected page, redirect to login
    const loginUrl = new URL('/login', request.url);
    // Enable redirect back to the original page after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res; // Return the response, potentially with session cookies if session.save() was used.
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (the login page itself)
     * - files with extensions (e.g. .png, .jpg, .svg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.).*)',
  ],
}; 