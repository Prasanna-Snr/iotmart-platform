import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function checkCsrf(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null;

  const host = req.headers.get("host") ?? req.nextUrl.host;
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return NextResponse.json(
        { detail: "Cross-origin request rejected" },
        { status: 403 }
      );
    }
    if (originHost !== host) {
      return NextResponse.json(
        { detail: "Cross-origin request rejected" },
        { status: 403 }
      );
    }
  }

  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json(
      { detail: "Cross-origin request rejected" },
      { status: 403 }
    );
  }

  return null;
}

async function proxy(
  req: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> {
  const csrf = checkCsrf(req);
  if (csrf) return csrf;

  const path = params.path.join("/");
  const search = req.nextUrl.search ?? "";
  const url = `${API_URL}/api/${path}${search}`;

  const headers = new Headers();
  const auth   = req.headers.get("authorization");
  const ct     = req.headers.get("content-type");
  const cookie = req.headers.get("cookie");
  if (auth)   headers.set("authorization", auth);
  if (ct)     headers.set("content-type", ct);
  if (cookie) headers.set("cookie", cookie);

  const body =
    ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await req.arrayBuffer();

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: body as BodyInit,
      credentials: "include",
    });

    const resBody = await res.arrayBuffer();
    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (["transfer-encoding", "connection", "set-cookie"].includes(k)) return;
      resHeaders.set(key, value);
    });
    // undici's Headers.forEach only surfaces the LAST set-cookie header, so
    // forward the rest via getSetCookie() to preserve ALL cookies (e.g. the
    // backend sets both access_token and refresh_token on login).
    if (typeof res.headers.getSetCookie === "function") {
      res.headers.getSetCookie().forEach((c) => resHeaders.append("set-cookie", c));
    }

    const response = new NextResponse(resBody.byteLength ? resBody : null, {
      status: res.status,
      headers: resHeaders,
    });

    // Mirror the admin session into an httpOnly cookie so the proxy.ts guard
    // can protect /admin/* server-side. The client still keeps its token in
    // localStorage for authenticated API calls.
    if (res.ok && (path === "auth/login" || path === "auth/refresh")) {
      try {
        const data = JSON.parse(new TextDecoder().decode(resBody));
        if (data?.access_token && data?.user?.role === "admin") {
          response.cookies.set("admin_token", data.access_token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60,
            secure: process.env.NODE_ENV === "production",
          });
        }
      } catch { /* response body is not JSON — ignore */ }
    }
    if (res.ok && path === "auth/logout") {
      response.cookies.delete("admin_token");
    }

    return response;
  } catch (err) {
    console.error(`[api-proxy] ${req.method} /api/${path} failed:`, err);
    return NextResponse.json({ error: "API unreachable" }, { status: 502 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) { return proxy(req, await params); }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) { return proxy(req, await params); }

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) { return proxy(req, await params); }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) { return proxy(req, await params); }

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) { return proxy(req, await params); }
