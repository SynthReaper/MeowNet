import { clerkMiddleware } from '@clerk/nextjs/server';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const isPublicRoute = (pathname: string) => {
  if (
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/rules' ||
    pathname === '/safety' ||
    pathname.startsWith('/api/ai/health') ||
    pathname.startsWith('/api/weather') ||
    pathname.startsWith('/api/catfact') ||
    pathname === '/icon.png'
  ) {
    return true;
  }
  return false;
};

export default clerkMiddleware(async (auth, request: NextRequest) => {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This will refresh the session token if needed and store it in cookies
  const { data: { user } } = await supabase.auth.getUser();

  // Route Gating for Non-Public pages
  const pathname = request.nextUrl.pathname;
  if (!isPublicRoute(pathname)) {
    const authObj = await auth();
    const clerkUserId = authObj?.userId;

    if (!clerkUserId && !user) {
      // Redirect to volunteer login
      const signInUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
