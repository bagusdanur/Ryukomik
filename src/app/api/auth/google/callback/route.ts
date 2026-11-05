import { NextResponse } from "next/server";

import { authBaseUrl, consumeOAuthState, exchangeGoogleCode, googleConfigured } from "@/lib/auth/google";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { createHandoffCode } from "@/lib/auth/handoff";
import { upsertAuthUserFromGoogle } from "@/lib/auth/userStore";
import { socialQuery } from "@/lib/social/db";

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

  // Ban dicek di dua sumber: tabel auth lokal dan profil sosial (sumber
  // kebenaran otorisasi API selama masa transisi).
  const { rows: profileRows } = await socialQuery<{ is_banned: boolean | null; banned_until: string | null }>(
    "select is_banned, banned_until from social_profiles where user_id = $1 limit 1",
    [user.id],
  );
  const profile = profileRows[0];
  const bannedUntil = [user.banned_until, profile?.banned_until]
    .map((value) => (value ? new Date(value).getTime() : 0))
    .reduce((left, right) => Math.max(left, right), 0);
  if (profile?.is_banned || bannedUntil > Date.now()) {
    return NextResponse.redirect(`${base}/?login=banned`);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const { refreshToken, expiresAt } = await createSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip,
  });

  // Mode PWA: terbitkan kode sekali pakai supaya aplikasi bisa membuat sesinya
  // sendiri (cookie OAuth tidak terbaca dari dalam aplikasi di Android).
  if (pending.nextUrl.startsWith("pwa:")) {
    const code = await createHandoffCode(user.id);
    const handoffResponse = NextResponse.redirect(`${base}/auth/kode?c=${code}`);
    handoffResponse.cookies.set(SESSION_COOKIE, refreshToken, sessionCookieOptions(expiresAt));
    return handoffResponse;
  }

  const target = pending.nextUrl.startsWith("/") && !pending.nextUrl.startsWith("//") ? pending.nextUrl : "/";
  const response = NextResponse.redirect(`${base}${target}`);

  // Hanya refresh token yang disimpan di cookie — httpOnly, tidak bisa dibaca
  // JavaScript, jadi XSS tidak bisa mencurinya. Access token diminta klien ke
  // /api/auth/me dan disimpan di memori saja.
  response.cookies.set(SESSION_COOKIE, refreshToken, sessionCookieOptions(expiresAt));

  return response;
}
