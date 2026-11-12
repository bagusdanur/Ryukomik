import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { grantScanlatorPremium } from "@/lib/scanlatorPremium";
import { invalidatePremiumAccess } from "@/lib/chapterAccess";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hanya platform donasi yang dikenal. Pencocokan memakai hostname (bukan regex
// pada string URL), supaya `trakteer.id.evil.com` tidak lolos seperti dulu.
const DONATION_HOSTS = [
  "dana.link",
  "link.dana",
  "gopay.co.id",
  "go.gopay",
  "trakteer.id",
  "tako.id",
  "lynk.id",
  "id.lynk",
  "ko-fi.com",
  "buymeacoffee.com",
  "saweria.co",
  "sociabuzz.com",
  "nyawer.co",
  "bagibagi.co",
  "tip.id",
  "karyakarsa.com",
  "patreon.com",
];

function cleanLink(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().slice(0, 300) : "";
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(v.includes("://") ? v : `https://${v}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  const allowed = DONATION_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) return null;
  return url.toString();
}

function phoneOf(value: unknown): string | null {
  const digits = typeof value === "string" ? value.replace(/[^\d]/g, "") : "";
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

function usernameOf(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().replace(/^@/, "") : "";
  return /^[A-Za-z0-9._-]{2,40}$/.test(v) ? v : null;
}

const PROFILE_FIELDS = `handle, team_name, bio, avatar_url, support_dana, support_trakteer, support_tako, support_url_lain,
  contact_wa, contact_telegram, contact_discord, status, warnings, suspended_until, moderation_note, created_at`;

/** GET: profil saya (login) atau publik via ?handle=. PATCH: simpan profil & tautan. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = (searchParams.get("handle") || "").toLowerCase();
  try {
    if (handle) {
      const { rows } = await socialQuery(
        `select s.handle, s.team_name, s.bio, s.avatar_url, s.support_dana, s.support_trakteer, s.support_tako,
                s.support_url_lain, s.status, s.verified, s.created_at,
                p.username as owner_username, p.avatar_url as owner_avatar_url
           from scanlator_profiles s
           left join social_profiles p on p.user_id = s.user_id
          where s.handle = $1 and s.status <> 'revoked' limit 1`,
        [handle],
      );
      if (!rows[0]) return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ success: true, profile: rows[0] }, { headers: { "Cache-Control": "public, max-age=60" } });
    }
    const userId = await requireUserId(request);
    let { rows } = await socialQuery(`select ${PROFILE_FIELDS} from scanlator_profiles where user_id = $1 limit 1`, [userId]);

    // Pemulihan otomatis: pengajuan sudah ACC tapi baris profil hilang (mis. tim
    // pernah dihapus). ACC adalah sumber kebenaran, jadi profil dibuat ulang.
    if (!rows[0]) {
      const app = await socialQuery<{
        handle: string; team_name: string; contact_wa: string | null;
        contact_telegram: string | null; contact_discord: string | null;
      }>(
        `select handle, team_name, contact_wa, contact_telegram, contact_discord
           from scanlator_applications
          where user_id = $1 and status = 'approved'
          order by reviewed_at desc nulls last, created_at desc
          limit 1`,
        [userId],
      );
      const approved = app.rows[0];
      const tomb = await socialQuery("select 1 from scanlator_deleted where user_id = $1 or handle = $2 limit 1", [userId, approved?.handle || ""]);
      if (approved && !tomb.rows[0]) {
        await socialQuery(
          `insert into scanlator_profiles (user_id, handle, team_name, contact_wa, contact_telegram, contact_discord, status)
           values ($1, $2, $3, $4, $5, $6, 'active')
           on conflict (user_id) do nothing`,
          [userId, approved.handle, approved.team_name, approved.contact_wa, approved.contact_telegram, approved.contact_discord],
        );
        await socialQuery(
          `update social_profiles
              set role = case when role in ('admin','staff') then role else 'scanlator' end,
                  updated_at = now()
            where user_id = $1`,
          [userId],
        );
        await grantScanlatorPremium(userId);
        invalidatePremiumAccess(userId);
        ({ rows } = await socialQuery(`select ${PROFILE_FIELDS} from scanlator_profiles where user_id = $1 limit 1`, [userId]));
      }
    }

    return NextResponse.json({ success: true, profile: rows[0] || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat profil." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId(request);
    const limited = rateLimitResponse(`profile-edit:${userId}`, 20, 10 * 60 * 1000);
    if (limited) return limited;
    const current = await socialQuery<{ status: string }>("select status from scanlator_profiles where user_id = $1 limit 1", [userId]);
    const me = current.rows[0];
    if (!me) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });
    if (me.status === "revoked") return NextResponse.json({ error: "Akses Scanlator kamu sudah dicabut." }, { status: 403 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 1000) : null;
    const teamName = typeof body?.team_name === "string" ? body.team_name.trim().slice(0, 80) : "";
    if (teamName && teamName.length < 2) return NextResponse.json({ error: "Nama user minimal 2 karakter." }, { status: 400 });

    const dana = cleanLink(body?.support_dana);
    const trakteer = cleanLink(body?.support_trakteer);
    const tako = cleanLink(body?.support_tako);
    const rawLain = typeof body?.support_url_lain === "string" ? body.support_url_lain.trim().slice(0, 300) : "";
    // Tautan ini dirender sebagai tombol di halaman publik (kartu atribusi
    // halaman seri) → wajib platform donasi yang dikenal, bukan URL bebas.
    const lain: string | null = rawLain ? cleanLink(rawLain) : null;
    if (rawLain && !lain) {
      return NextResponse.json(
        {
          error:
            "Tautan dukungan harus dari platform donasi (DANA, Trakteer, Tako, Saweria, Sociabuzz, Lynk, Nyawer, Ko-fi, Patreon).",
        },
        { status: 400 },
      );
    }

    const rawAvatar = typeof body?.avatar_url === "string" ? body.avatar_url.trim().slice(0, 500) : "";
    let avatarUrl: string | null = null;
    if (rawAvatar) {
      try {
        const u = new URL(rawAvatar);
        if (u.protocol !== "https:") throw new Error("https only");
        avatarUrl = u.toString();
      } catch {
        return NextResponse.json({ error: "URL foto grup tidak valid." }, { status: 400 });
      }
    }

    const wa = phoneOf(body?.contact_wa);
    const telegram = usernameOf(body?.contact_telegram);
    const discord = usernameOf(body?.contact_discord);
    if (body?.contact_discord !== undefined && !discord) {
      return NextResponse.json({ error: "Username Discord tidak valid (2–40 karakter, tanpa spasi)." }, { status: 400 });
    }

    await socialQuery(
      `update scanlator_profiles set
         bio = coalesce($1, bio),
         team_name = case when $2 = '' then team_name else $2 end,
         avatar_url = coalesce($11, avatar_url),
         support_dana = $3, support_trakteer = $4, support_tako = $5, support_url_lain = $6,
         contact_wa = coalesce($7, contact_wa),
         contact_telegram = coalesce($8, contact_telegram),
         contact_discord = coalesce($9, contact_discord),
         updated_at = now()
       where user_id = $10`,
      [bio, teamName, dana, trakteer, tako, lain, wa, telegram, discord, userId, avatarUrl],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }
}
