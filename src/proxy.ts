import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

/**
 * Server-side guard for the admin panel. The bare /admin route is left
 * unguarded so the client-side login modal can render; every deeper admin
 * route requires a valid admin session (validated against the backend),
 * otherwise the visitor is bounced back to /admin.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || !pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const user = await res.json();
      if (user.role === "admin") {
        return NextResponse.next();
      }
    }
  } catch {
    // Backend unreachable — let the client-side guard decide.
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
