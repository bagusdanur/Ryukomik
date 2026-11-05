import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Antrean laporan/banding Scanlator untuk admin. */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { rows } = await socialQuery(
      `select r.id::text as id, r.kind, r.target_slug, r.target_handle, r.reason, r.detail,
              r.status, r.admin_note, r.created_at, p.username as reporter
         from scanlator_reports r
         left join social_profiles p on p.user_id = r.reporter_id
        order by case when r.status = 'open' then 0 else 1 end, r.created_at desc
        limit 100`,
    );
    return NextResponse.json({ success: true, reports: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat laporan.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = (await request.json().catch(() => null)) as { id?: string; action?: "resolve" | "dismiss"; note?: string } | null;
    if (!body?.id || !["resolve", "dismiss"].includes(body.action || "")) {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }
    const status = body.action === "resolve" ? "resolved" : "dismissed";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

    await socialQuery(
      "update scanlator_reports set status = $1, admin_note = $2, resolved_at = now() where id = $3",
      [status, note, body.id],
    );
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses laporan.");
  }
}
