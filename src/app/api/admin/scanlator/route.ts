import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { grantScanlatorPremium, revokeScanlatorPremium } from "@/lib/scanlatorPremium";
import { invalidatePremiumAccess } from "@/lib/chapterAccess";
import { notifyScanlator } from "@/lib/scanlatorNotify";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "approve" | "reject" | "warn" | "suspend" | "revoke" | "restore" | "delete" | "verify" | "unverify";

/**
 * Manajemen Scanlator di dashboard admin:
 * - GET: antrean pengajuan + daftar Scanlator aktif/suspended/revoked + riwayat moderasi
 * - POST: approve | reject | warn (SP) | suspend | revoke | restore
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const [applications, scanlators, moderation] = await Promise.all([
      socialQuery(
        `select a.id::text as id, a.user_id::text as user_id, a.handle, a.team_name, a.description,
                a.samples, a.status, a.review_note, a.created_at,
                a.contact_wa, a.contact_telegram, a.contact_discord, p.username
           from scanlator_applications a
           left join social_profiles p on p.user_id = a.user_id
          where not exists (select 1 from scanlator_deleted d where d.user_id = a.user_id)
          order by case when a.status = 'pending' then 0 else 1 end, a.created_at desc
          limit 100`,
      ),
      socialQuery(
        `select s.user_id::text as user_id, s.handle, s.team_name, s.bio,
                s.status, s.verified, s.warnings, s.suspended_until, s.moderation_note,
                s.contact_wa, s.contact_telegram, s.contact_discord, s.created_at,
                p.username
           from scanlator_profiles s
           left join social_profiles p on p.user_id = s.user_id
          order by case s.status when 'active' then 0 when 'suspended' then 1 else 2 end, s.team_name asc
          limit 200`,
      ),
      socialQuery(
        `select m.id::text as id, m.user_id::text as user_id, m.action, m.reason, m.note, m.created_at, s.team_name
           from scanlator_moderation m
           left join scanlator_profiles s on s.user_id = m.user_id
          order by m.created_at desc limit 40`,
      ),
    ]);

    return NextResponse.json(
      { success: true, applications: applications.rows, scanlators: scanlators.rows, moderation: moderation.rows },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat data Scanlator.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = (await request.json().catch(() => null)) as
      | { id?: string; user_id?: string; action?: Action; note?: string; reason?: string; days?: number }
      | null;
    const action = body?.action;
    if (!action || !["approve", "reject", "warn", "suspend", "revoke", "restore", "delete", "verify", "unverify"].includes(action)) {
      return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
    }
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) || null : null;

    if (action === "approve" || action === "reject") {
      return reviewApplication(body?.id, action, note, admin.userId);
    }
    return moderate(body?.user_id, action, reason, note, body?.days, admin.userId);
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses aksi Scanlator.");
  }
}

async function reviewApplication(id: string | undefined, action: "approve" | "reject", note: string | null, adminId: string) {
  if (!id) return NextResponse.json({ error: "ID pengajuan wajib diisi." }, { status: 400 });

  const app = await socialQuery<{
    id: string; user_id: string; handle: string; team_name: string; status: string;
    contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
  }>(
    `select id::text as id, user_id::text as user_id, handle, team_name, status,
            contact_wa, contact_telegram, contact_discord
       from scanlator_applications where id = $1 limit 1`,
    [id],
  );
  const row = app.rows[0];
  if (!row) return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  if (row.status !== "pending") return NextResponse.json({ error: "Pengajuan ini sudah diproses." }, { status: 409 });

  if (action === "reject") {
    await socialQuery(
      "update scanlator_applications set status = 'rejected', review_note = $1, reviewed_by = $2, reviewed_at = now() where id = $3",
      [note, adminId, id],
    );
    await notifyScanlator(row.user_id, {
      type: "project_rejected",
      title: "Pengajuan Scanlator ditolak",
      body: note || "Pengajuanmu belum bisa disetujui. Perbaiki lalu ajukan ulang.",
      link: "/scanlator/daftar",
    });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  await socialTransaction(async (client) => {
    await client.query(
      "update scanlator_applications set status = 'approved', review_note = $1, reviewed_by = $2, reviewed_at = now() where id = $3",
      [note, adminId, id],
    );
    // Jangan turunkan admin/staff: role mereka lebih tinggi dari scanlator.
    await client.query(
      `update social_profiles
          set role = case when role in ('admin','staff') then role else 'scanlator' end,
              updated_at = now()
        where user_id = $1`,
      [row.user_id],
    );
    // ACC baru membatalkan tombstone (tim dihidupkan lagi).
    await client.query("delete from scanlator_deleted where user_id = $1 or handle = $2", [row.user_id, row.handle]);
    // Benefit: premium aktif selama status Scanlator aktif.
    await grantScanlatorPremium(row.user_id, client);
    await client.query(
      `insert into scanlator_profiles (user_id, handle, team_name, contact_wa, contact_telegram, contact_discord, status)
       values ($1, $2, $3, $4, $5, $6, 'active')
       on conflict (user_id) do update set handle = excluded.handle, team_name = excluded.team_name,
         contact_wa = coalesce(excluded.contact_wa, scanlator_profiles.contact_wa),
         contact_telegram = coalesce(excluded.contact_telegram, scanlator_profiles.contact_telegram),
         contact_discord = coalesce(excluded.contact_discord, scanlator_profiles.contact_discord),
         status = 'active', updated_at = now()`,
      [row.user_id, row.handle, row.team_name, row.contact_wa, row.contact_telegram, row.contact_discord],
    );
  });

  invalidatePremiumAccess(row.user_id);

  await notifyScanlator(row.user_id, {
    type: "project_approved",
    title: "Akun Translation disetujui 🎉",
    body: `Tim “${row.team_name}” sudah aktif. Kamu bisa upload chapter dan badge SCANLATOR tampil di profil.`,
    link: "/scanlator",
  });

  return NextResponse.json({ success: true, status: "approved" });
}

async function moderate(
  userId: string | undefined,
  action: "warn" | "suspend" | "revoke" | "restore" | "delete" | "verify" | "unverify",
  reason: string | null,
  note: string | null,
  days: number | undefined,
  adminId: string,
) {
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: "User Scanlator tidak valid." }, { status: 400 });
  }
  const target = await socialQuery<{ team_name: string; handle: string }>(
    "select team_name, handle from scanlator_profiles where user_id = $1 limit 1",
    [userId],
  );
  if (!target.rows[0]) return NextResponse.json({ error: "Scanlator tidak ditemukan." }, { status: 404 });

  if (action === "verify" || action === "unverify") {
    const verified = action === "verify";
    await socialTransaction(async (client) => {
      await client.query("update scanlator_profiles set verified = $2, updated_at = now() where user_id = $1", [userId, verified]);
      await client.query(
        "insert into scanlator_moderation (user_id, action, reason, note, admin_id) values ($1, $2, $3, $4, $5)",
        [userId, action, reason || (verified ? "Tim diverifikasi" : "Verifikasi dicabut"), note, adminId],
      );
    });
    await notifyScanlator(userId, {
      type: verified ? "verify" : "unverify",
      title: verified ? "Tim kamu terverifikasi" : "Verifikasi tim dicabut",
      body: verified
        ? "Badge terverifikasi tampil di profil grup dan direktori."
        : "Badge terverifikasi tidak lagi ditampilkan. Hubungi admin bila keliru.",
      link: "/scanlator",
    });
    return NextResponse.json({ success: true, status: action });
  }

  if (action === "delete") {
    const team = target.rows[0].team_name;
    const teamHandle = target.rows[0].handle;
    await socialTransaction(async (client) => {
      await client.query("delete from scanlator_profiles where user_id = $1", [userId]);
      await client.query(
        `update social_profiles
            set role = case when role = 'scanlator' then 'user' else role end,
                updated_at = now()
          where user_id = $1`,
        [userId],
      );
      await revokeScanlatorPremium(userId, client);
      // Hapus pengajuan supaya handle bebas dipakai lagi (unique per handle),
      // dan catat tombstone agar profil tidak dibuat ulang otomatis.
      await client.query(
        "insert into scanlator_deleted (user_id, handle) values ($1, $2) on conflict (user_id) do update set handle = excluded.handle, deleted_at = now()",
        [userId, teamHandle],
      );
      await client.query("delete from scanlator_applications where user_id = $1", [userId]);
      await client.query(
        "insert into scanlator_moderation (user_id, action, reason, note, admin_id) values ($1, 'delete', $2, $3, $4)",
        [userId, reason || "Tim dihapus admin", note ? `${note} · tim: ${team}` : `tim: ${team}`, adminId],
      );
    });

    invalidatePremiumAccess(userId);

    // Seri milik tim disembunyikan (bukan dihapus) supaya atribusi tidak menggantung.
    let hidden = 0;
    try {
      const list = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>("/admin/projects?limit=100&page=1");
      const owned = (list.data || []).filter((m) => String((m as { owner_user_id?: string }).owner_user_id || "") === userId);
      for (const m of owned) {
        const id = String((m as { id?: string }).id || "");
        if (!id) continue;
        await projectApiFetch(`/admin/projects/${id}`, { method: "PATCH", body: JSON.stringify({ is_published: false }) }).catch(() => null);
        hidden += 1;
      }
    } catch {
      // pengunyian opsional
    }

    return NextResponse.json({ success: true, status: "deleted", hiddenSeries: hidden });
  }

  if (action === "warn") {
    await socialTransaction(async (client) => {
      await client.query(
        "update scanlator_profiles set warnings = warnings + 1, moderation_note = $1, updated_at = now() where user_id = $2",
        [note || reason, userId],
      );
      await client.query(
        "insert into scanlator_moderation (user_id, action, reason, note, admin_id) values ($1, 'warn', $2, $3, $4)",
        [userId, reason, note, adminId],
      );
    });
    await notifyScanlator(userId, {
      type: "warn",
      title: "Surat peringatan (SP)",
      body: [reason, note].filter(Boolean).join(" — ") || "Kamu mendapat peringatan karena melanggar aturan.",
      link: "/scanlator",
    });
    return NextResponse.json({ success: true, status: "warned" });
  }

  if (action === "suspend") {
    const dur = Math.min(365, Math.max(1, Number(days) || 7));
    await socialTransaction(async (client) => {
      await client.query(
        "update scanlator_profiles set status = 'suspended', suspended_until = now() + ($1 || ' days')::interval, moderation_note = $2, updated_at = now() where user_id = $3",
        [String(dur), note || reason, userId],
      );
      await client.query(
        "insert into scanlator_moderation (user_id, action, reason, note, admin_id) values ($1, 'suspend', $2, $3, $4)",
        [userId, reason, note ? `${note} (${dur} hari)` : `${dur} hari`, adminId],
      );
    });
    await notifyScanlator(userId, {
      type: "suspend",
      title: `Akun disuspend ${dur} hari`,
      body: [reason, note].filter(Boolean).join(" — ") || "Upload dibekukan sementara.",
      link: "/scanlator",
    });
    return NextResponse.json({ success: true, status: "suspended", days: dur });
  }

  if (action === "revoke") {
    await socialTransaction(async (client) => {
      await client.query(
        "update scanlator_profiles set status = 'revoked', moderation_note = $1, updated_at = now() where user_id = $2",
        [note || reason, userId],
      );
      await client.query(
        `update social_profiles
            set role = case when role = 'scanlator' then 'user' else role end,
                updated_at = now()
          where user_id = $1`,
        [userId],
      );
      await revokeScanlatorPremium(userId, client);
      await client.query("delete from scanlator_applications where user_id = $1", [userId]);
      await client.query(
        "insert into scanlator_moderation (user_id, action, reason, note, admin_id) values ($1, 'revoke', $2, $3, $4)",
        [userId, reason, note, adminId],
      );
    });
    invalidatePremiumAccess(userId);
    await notifyScanlator(userId, {
      type: "revoke",
      title: "Akses Scanlator dicabut",
      body: [reason, note].filter(Boolean).join(" — ") || "Akses scanlator dicabut karena pelanggaran.",
      link: "/aturan/scanlator",
    });
    return NextResponse.json({ success: true, status: "revoked" });
  }

  // restore
  await socialTransaction(async (client) => {
    await client.query(
      "update scanlator_profiles set status = 'active', suspended_until = null, moderation_note = $1, updated_at = now() where user_id = $2",
      [note, userId],
    );
    await client.query(
      `update social_profiles
          set role = case when role in ('admin','staff') then role else 'scanlator' end,
              updated_at = now()
        where user_id = $1`,
      [userId],
    );
    await grantScanlatorPremium(userId, client);
    await client.query(
      "insert into scanlator_moderation (user_id, action, reason, note, admin_id) values ($1, 'restore', $2, $3, $4)",
      [userId, reason, note, adminId],
    );
  });
  invalidatePremiumAccess(userId);
  await notifyScanlator(userId, {
    type: "restore",
    title: "Akses Scanlator dipulihkan",
    body: note || "Kamu bisa upload dan mengelola project lagi.",
    link: "/scanlator",
  });
  return NextResponse.json({ success: true, status: "active" });
}
