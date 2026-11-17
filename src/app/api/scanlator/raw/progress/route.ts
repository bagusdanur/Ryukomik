import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { getProgress } from "@/lib/rawProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status proses unduhan RAW untuk indikator di studio. */
export async function GET(request: Request) {
  try {
    await requireUserId(request);
    const job = new URL(request.url).searchParams.get("job") || "";
    if (!/^[a-z0-9-]{8,40}$/i.test(job)) {
      return NextResponse.json({ error: "Job tidak valid." }, { status: 400 });
    }
    return NextResponse.json(
      { success: true, progress: getProgress(job) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal membaca progres." }, { status: 500 });
  }
}
