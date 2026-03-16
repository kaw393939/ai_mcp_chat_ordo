import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "lms_session_token";

const ANONYMOUS_CONVERSATION_ROUTES = new Set([
  "/api/conversations/active",
  "/api/conversations/active/archive",
]);

/**
 * Routes that require a session cookie to be present.
 * Full session validation happens in the route handler; the proxy only checks cookie presence.
 */
const PROTECTED_API_PREFIXES = [
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/switch",
];

function isProtectedRoute(pathname: string): boolean {
  if (ANONYMOUS_CONVERSATION_ROUTES.has(pathname)) {
    return false;
  }

  if (
    pathname === "/api/conversations" ||
    pathname.startsWith("/api/conversations/")
  ) {
    return true;
  }

  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only inspect API routes; pages always render and resolve auth server-side.
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};