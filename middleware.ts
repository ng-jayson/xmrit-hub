import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // If user is authenticated and trying to access sign-in page, redirect to home
  if (isLoggedIn && pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allow access to auth pages without authentication
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // Allow access to public API routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Allow access to ingest API (uses API key authentication instead of session)
  if (pathname.startsWith("/api/ingest/")) {
    return NextResponse.next();
  }

  // Protect all other routes - require authentication
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // Allow the request to continue
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
