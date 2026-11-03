import { NextResponse } from "next/server";

import { buildGoogleAuthUrl, createOAuthState, googleConfigured } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "google_not_configured", message: "Login Google lokal belum diaktifkan." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("next") || "/";
  // Cegah open redirect: hanya path relatif.
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const { state, challenge } = await createOAuthState(next);
  return NextResponse.redirect(buildGoogleAuthUrl(state, challenge));
}
