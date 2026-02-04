import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const SESSION_COOKIE = "telepsych_session";

/**
 * Proxies /api/* to the backend and forwards cookies so session auth works
 * when the browser only talks to the frontend origin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, "POST");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, "PATCH");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, "DELETE");
}

async function proxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  // Use pathname and ensure trailing slash for list routes (avoids 307 from FastAPI)
  const pathname = request.nextUrl.pathname;
  let apiPath = pathname.startsWith("/api") ? pathname.slice(4) || "/" : pathname;
  if (
    !apiPath.endsWith("/") &&
    ["/appointments", "/patient-requests", "/request-access"].includes(apiPath)
  ) {
    apiPath += "/";
  }
  const search = request.nextUrl.search;
  const url = `${BACKEND_URL}/api${apiPath}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === "host") return;
    headers.set(key, value);
  });
  // Forward session cookie to backend: use Cookie from request first (what browser sent), else cookies() API
  const requestCookie = request.headers.get("cookie");
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (requestCookie) {
    headers.set("Cookie", requestCookie);
  } else if (sessionCookie?.value) {
    headers.set("Cookie", `${SESSION_COOKIE}=${sessionCookie.value}`);
  }

  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    body = undefined;
  }

  let res = await fetch(url, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    redirect: "manual",
  });

  // If backend returns 307/308 (trailing slash redirect), follow it with same headers (including Cookie)
  if (res.status === 307 || res.status === 308) {
    const location = res.headers.get("location");
    if (location && location.startsWith(BACKEND_URL)) {
      res = await fetch(location, {
        method,
        headers,
        body: body && body.length > 0 ? body : undefined,
        redirect: "manual",
      });
    }
  }

  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    if (key.toLowerCase() === "x-session-token") return; // we set cookie via nextResponse.cookies below
    responseHeaders.set(key, value);
  });

  const responseBody = await res.arrayBuffer();
  const nextResponse = new NextResponse(responseBody, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });

  // Set-Cookie from fetch() is not exposed in Node; backend sends X-Session-Token.
  const sessionToken =
    res.headers.get("x-session-token") ?? res.headers.get("X-Session-Token");
  if (sessionToken) {
    const maxAge = 60 * 60 * 24 * 7; // 7 days, match backend
    const secure = process.env.NODE_ENV === "production";
    nextResponse.cookies.set(SESSION_COOKIE, sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge,
      secure,
    });
    // Also set via header so the browser definitely receives it (some setups ignore cookies.set()).
    const setCookieValue = `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
    nextResponse.headers.append("Set-Cookie", setCookieValue);
    nextResponse.headers.set("Cache-Control", "no-store");
  } else {
    const setCookies = (res.headers as Headers & { getSetCookie?(): string[] }).getSetCookie?.();
    if (setCookies?.length) {
      setCookies.forEach((value) => nextResponse.headers.append("Set-Cookie", value));
    }
  }

  return nextResponse;
}
