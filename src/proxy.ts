import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: redirects signed-out visitors before the page renders.
// It does not validate the session. Every page, query and Server Action must still call requireUser().
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const login = new URL("/login", request.url);
  return NextResponse.redirect(login);
}

// Keep in sync with the routes under src/app/(app)/.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/applications/:path*",
    "/calendar/:path*",
    "/reminders/:path*",
    "/contacts/:path*",
    "/settings/:path*",
  ],
};
