import { NextResponse } from "next/server";

import { findAuthUserById } from "@/lib/auth/userStore";
import { resolveSession, SESSION_COOKIE } from "@/lib/auth/session";
import { signAccessToken } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function GET(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

  const session = await resolveSession(token);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

  const user = await findAuthUserById(session.userId);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

  // Access token berumur pendek, hanya untuk dipakai di memori klien.
  const accessToken = process.env.AUTH_JWT_SECRET
    ? signAccessToken(user.id, process.env.AUTH_JWT_SECRET, 60 * 60)
    : null;
  const banned = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());
  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        avatar: user.avatar_url,
      },
      banned,
      bannedUntil: banned ? user.banned_until : null,
      accessToken,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
