import { NextResponse } from "next/server";

import { revokeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/social/auth";

export const dynamic = "force-dynamic";

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "bad_origin" }, { status: 400 });
  }

  const token = readCookie(request, SESSION_COOKIE);
  if (token) await revokeSession(token).catch(() => undefined);

  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  const cleared = sessionCookieOptions(new Date(0));
  response.cookies.set(SESSION_COOKIE, "", cleared);
  response.cookies.set("rk_access", "", { ...cleared, httpOnly: false });
  return response;
}
