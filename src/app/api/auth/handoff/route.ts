import { NextResponse } from "next/server";

import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { consumeHandoffCode } from "@/lib/auth/handoff";
import { findAuthUserById } from "@/lib/auth/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tukar kode login (dari browser) menjadi sesi DI KONTEKS APLIKASI (PWA).
 * Cookie diset oleh respons ini, jadi masuk ke jar cookie aplikasi.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const userId = await consumeHandoffCode(String(body?.code || ""));
  if (!userId) {
    return NextResponse.json({ error: "Kode salah atau sudah kedaluwarsa." }, { status: 400 });
  }

  const user = await findAuthUserById(userId);
  if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const { refreshToken, expiresAt } = await createSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip,
  });

  const response = NextResponse.json({ success: true, redirect: "/" });
  response.cookies.set(SESSION_COOKIE, refreshToken, sessionCookieOptions(expiresAt));
  return response;
}
