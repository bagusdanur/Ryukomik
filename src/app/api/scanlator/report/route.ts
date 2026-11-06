import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set(["copyright", "appeal", "other"]);

/** Laporkan project / ajukan banding. Masuk antrean admin. */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const limited = rateLimitResponse(`report:${userId}`, 5, 10 * 60 * 1000);
    if (limited) return limited;
    const body = (await request.json().catch(() => null)) as
      | { kind?: string; target_slug?: string; target_handle?: string; reason?: string; detail?: string }
      | null;

    const kind = KINDS.has(String(body?.kind)) ? String(body?.kind) : "other";
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 200) : "";
    const detail = typeof body?.detail === "string" ? body.detail.trim().slice(0, 2000) : "";
    const slug = typeof body?.target_slug === "string" ? body.target_slug.trim().slice(0, 120) : "";
    const handle = typeof body?.target_handle === "string" ? body.target_handle.trim().toLowerCase().slice(0, 40) : "";

    if (reason.length < 5) return NextResponse.json({ error: "Alasan minimal 5 karakter." }, { status: 400 });

    // Batasi spam: maksimal 5 laporan per user per jam.
    const recent = await socialQuery<{ count: string }>(
      "select count(*)::text as count from scanlator_reports where reporter_id = $1 and created_at > now() - interval '1 hour'",
      [userId],
    );
    if (Number(recent.rows[0]?.count || 0) >= 5) {
      return NextResponse.json({ error: "Terlalu banyak laporan. Coba lagi nanti." }, { status: 429 });
    }

    const { rows } = await socialQuery<{ id: string }>(
      `insert into scanlator_reports (reporter_id, kind, target_slug, target_handle, reason, detail)
       values ($1, $2, $3, $4, $5, $6) returning id::text as id`,
      [userId, kind, slug || null, handle || null, reason, detail || null],
    );

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal mengirim laporan." }, { status: 500 });
  }
}
