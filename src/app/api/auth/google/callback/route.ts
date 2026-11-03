import { NextResponse } from "next/server";

import { authBaseUrl, consumeOAuthState, exchangeGoogleCode, googleConfigured } from "@/lib/auth/google";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { upsertAuthUserFromGoogle } from "@/lib/auth/userStore";
import { signAccessToken } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const base = authBaseUrl();
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "google_not_configured", message: "Login Google lokal belum diaktifkan." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const errorParam = url.searchParams.get("error");

  if (errorParam) return NextResponse.redirect(`${base}/?login=error`);
  if (!code || !state) return NextResponse.redirect(`${base}/?login=error`);

  const pending = await consumeOAuthState(state);
  if (!pending) return NextResponse.redirect(`${base}/?login=error`);

  const identity = await exchangeGoogleCode(code, pending.verifier);
  if (!identity) return NextResponse.redirect(`${base}/?login=error`);

  const user = await upsertAuthUserFromGoogle({
    sub: identity.sub,
    email: identity.email,
    name: identity.name,
    picture: identity.picture,
  });

  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
    return NextResponse.redirect(`${base}/?login=banned`);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const { refreshToken, expiresAt } = await createSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip,
  });

  const access = signAccessToken(user.id, process.env.AUTH_JWT_SECRET || "", 60 * 60 * 24 * 7);
  const target = pending.nextUrl.startsWith("/") && !pending.nextUrl.startsWith("//") ? pending.nextUrl : "/";
  const response = NextResponse.redirect(`${base}${target}`);

  // Refresh token (httpOnly) dipakai untuk /api/auth/me & rotasi sesi.
  response.cookies.set(SESSION_COOKIE, refreshToken, sessionCookieOptions(expiresAt));
  // Access token dibaca klien untuk memanggil API (bearer), sama seperti pola lama.
  response.cookies.set("rk_access", access, {
    ...sessionCookieOptions(expiresAt),
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
