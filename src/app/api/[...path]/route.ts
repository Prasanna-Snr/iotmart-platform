import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function proxy(
  req: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> {
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
      if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    return new NextResponse(resBody, {
      status: res.status,
      headers: resHeaders,
    });
  } catch {
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
