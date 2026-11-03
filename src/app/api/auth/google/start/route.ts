import { NextResponse } from "next/server";

import { buildGoogleAuthUrl, createOAuthState, googleConfigured } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

// Batasi pembuatan state per IP: mencegah pengisian tabel / spam redirect.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "google_not_configured", message: "Login Google lokal belum diaktifkan." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("next") || "/";
  // Cegah open redirect: hanya path relatif.
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const { state, challenge } = await createOAuthState(next);
  return NextResponse.redirect(buildGoogleAuthUrl(state, challenge));
}
