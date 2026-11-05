import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery, socialTransaction } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Antrean pengajuan Scanlator untuk dashboard admin (Fase A, BETA). */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    const { rows } = await socialQuery<{
      id: string;
      user_id: string;
      handle: string;
      team_name: string;
      description: string | null;
      samples: string[];
      status: string;
      review_note: string | null;
      created_at: string;
      username: string | null;
    }>(
      `select a.id::text as id, a.user_id::text as user_id, a.handle, a.team_name, a.description,
              a.samples, a.status, a.review_note, a.created_at, p.username
         from scanlator_applications a
         left join social_profiles p on p.user_id = a.user_id
        order by case when a.status = 'pending' then 0 else 1 end, a.created_at desc
        limit 100`,
    );
    return NextResponse.json({ success: true, applications: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat antrean Scanlator.");
  }
}

/** ACC / Tolak pengajuan. ACC mengaktifkan role scanlator + profil publik. */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    const body = (await request.json().catch(() => null)) as { id?: string; action?: "approve" | "reject"; note?: string } | null;
    if (!body?.id || !["approve", "reject"].includes(body.action || "")) {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

    const app = await socialQuery<{ id: string; user_id: string; handle: string; team_name: string; status: string }>(
      "select id::text as id, user_id::text as user_id, handle, team_name, status from scanlator_applications where id = $1 limit 1",
      [body.id],
    );
    const row = app.rows[0];
    if (!row) return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
    if (row.status !== "pending") {
      return NextResponse.json({ error: "Pengajuan ini sudah diproses." }, { status: 409 });
    }

    if (body.action === "reject") {
      await socialQuery(
        "update scanlator_applications set status = 'rejected', review_note = $1, reviewed_by = $2, reviewed_at = now() where id = $3",
        [note, admin.userId, body.id],
      );
      return NextResponse.json({ success: true, status: "rejected" });
    }

    await socialTransaction(async (client) => {
      await client.query(
        "update scanlator_applications set status = 'approved', review_note = $1, reviewed_by = $2, reviewed_at = now() where id = $3",
        [note, admin.userId, body.id],
      );
      await client.query(
        `insert into social_profiles (user_id, username, role) values ($1, $2, 'scanlator')
         on conflict (user_id) do update set role = 'scanlator', updated_at = now()`,
        [row.user_id, row.team_name],
      );
      await client.query(
        `insert into scanlator_profiles (user_id, handle, team_name) values ($1, $2, $3)
         on conflict (user_id) do update set handle = excluded.handle, team_name = excluded.team_name, updated_at = now()`,
        [row.user_id, row.handle, row.team_name],
      );
    });

    return NextResponse.json({ success: true, status: "approved" });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses pengajuan.");
  }
}
