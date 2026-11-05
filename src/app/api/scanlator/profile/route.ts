import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOST_RE = /^(https?:\/\/)?(dana\.link|link\.dana|gopay\.co\.id|go\.gopay|trakteer\.id|tako\.id|lynk\.id|id\.lynk|ko-fi\.com|buymeacoffee\.com|saweria\.co)/i;

function cleanLink(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().slice(0, 300) : "";
  if (!v) return null;
  let url: string;
  try {
    url = new URL(v.includes("://") ? v : `https://${v}`).toString();
  } catch {
    return null;
  }
  if (!HOST_RE.test(url)) return null;
  return url;
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

const PROFILE_FIELDS = `handle, team_name, bio, support_dana, support_trakteer, support_tako, support_url_lain,
  contact_wa, contact_telegram, contact_discord, status, warnings, suspended_until, moderation_note, created_at`;

/** GET: profil saya (login) atau publik via ?handle=. PATCH: simpan profil & tautan. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = (searchParams.get("handle") || "").toLowerCase();
  try {
    if (handle) {
      const { rows } = await socialQuery(
        `select handle, team_name, bio, support_dana, support_trakteer, support_tako, support_url_lain, status, created_at
           from scanlator_profiles where handle = $1 and status <> 'revoked' limit 1`,
        [handle],
      );
      if (!rows[0]) return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ success: true, profile: rows[0] }, { headers: { "Cache-Control": "public, max-age=60" } });
    }
    const userId = await requireUserId(request);
    const { rows } = await socialQuery(`select ${PROFILE_FIELDS} from scanlator_profiles where user_id = $1 limit 1`, [userId]);
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
    const current = await socialQuery<{ status: string }>("select status from scanlator_profiles where user_id = $1 limit 1", [userId]);
    const me = current.rows[0];
    if (!me) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });
    if (me.status === "revoked") return NextResponse.json({ error: "Akses Scanlator kamu sudah dicabut." }, { status: 403 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 1000) : null;
    const teamName = typeof body?.team_name === "string" ? body.team_name.trim().slice(0, 80) : "";
    if (teamName && teamName.length < 2) return NextResponse.json({ error: "Nama tim minimal 2 karakter." }, { status: 400 });

    const dana = cleanLink(body?.support_dana);
    const trakteer = cleanLink(body?.support_trakteer);
    const tako = cleanLink(body?.support_tako);
    const rawLain = typeof body?.support_url_lain === "string" ? body.support_url_lain.trim().slice(0, 300) : "";
    let lain: string | null = null;
    if (rawLain) {
      try {
        const url = new URL(rawLain.includes("://") ? rawLain : `https://${rawLain}`);
        if (!["http:", "https:"].includes(url.protocol) || ["localhost", "127.0.0.1"].includes(url.hostname)) {
          return NextResponse.json({ error: "Tautan donate lain tidak valid." }, { status: 400 });
        }
        lain = url.toString();
      } catch {
        return NextResponse.json({ error: "Tautan donate lain tidak valid." }, { status: 400 });
      }
    }

    const wa = phoneOf(body?.contact_wa);
    const telegram = usernameOf(body?.contact_telegram);
    const discord = usernameOf(body?.contact_discord);

    await socialQuery(
      `update scanlator_profiles set
         bio = coalesce($1, bio),
         team_name = case when $2 = '' then team_name else $2 end,
         support_dana = $3, support_trakteer = $4, support_tako = $5, support_url_lain = $6,
         contact_wa = coalesce($7, contact_wa),
         contact_telegram = coalesce($8, contact_telegram),
         contact_discord = coalesce($9, contact_discord),
         updated_at = now()
       where user_id = $10`,
      [bio, teamName, dana, trakteer, tako, lain, wa, telegram, discord, userId],
    );
    if (teamName) {
      await socialQuery("update social_profiles set username = $1, updated_at = now() where user_id = $2", [teamName, userId]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }
}
