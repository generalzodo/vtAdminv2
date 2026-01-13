import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('vts-token');
  const userCookie = request.cookies.get('vts-user');
  
  // Parse user from cookie to check type
  let userType: string | null = null;
  if (userCookie?.value) {
    try {
      const user = JSON.parse(userCookie.value);
      userType = user.type;
    } catch (e) {
      // Invalid cookie, will be handled below
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/bookings') || 
      pathname.startsWith('/users') || pathname.startsWith('/agents') ||
      pathname.startsWith('/reviews') || pathname.startsWith('/withdrawals') ||
      pathname.startsWith('/trips') || pathname.startsWith('/buses') ||
      pathname.startsWith('/drivers') || pathname.startsWith('/routes') ||
      pathname.startsWith('/subroutes') || pathname.startsWith('/settings') ||
      pathname.startsWith('/agent-reports') || pathname.startsWith('/admin-users') ||
      pathname.startsWith('/roles')) {
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    if (userType !== 'admin') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }
    
    // Super admin only routes
    // Note: Full permission check will be done in the page components using hooks
    // This middleware only ensures the user is an admin
  }

  // Redirect logged-in admins away from login page
  if (pathname === '/login' && token && userType === 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

