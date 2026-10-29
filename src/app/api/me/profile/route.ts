import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { bumpProfileSignal } from "@/lib/social/profileSignals";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { authErrorResponse } from "@/lib/social/authResponse";

/**
 * Profil milik user sendiri — sumber data: Postgres LOKAL (social_profiles).
 *
 * Dibuat untuk Irisan 1 migrasi: browser berhenti membaca/menulis tabel
 * `profiles` Supabase. Penulisan tetap dicatat di profile_write_log supaya
 * bisa diputar balik ke Supabase kalau irisan ini harus dibatalkan.
 *
 * Auth metadata (nama/avatar di sesi) tetap diperbarui lewat Supabase Auth —
 * itu bukan PostgREST dan bukan pembaca tabel.
 */

type PrivacyField = "show_public_reads" | "show_public_comments" | "show_public_join_date";
const PRIVACY_FIELDS: PrivacyField[] = [
  "show_public_reads",
  "show_public_comments",
  "show_public_join_date",
];

const PROFILE_COLUMNS = `user_id as id, username, avatar_url, level, xp, role, is_premium,
  premium_until, created_at, total_comments, total_reads,
  show_public_reads, show_public_comments, show_public_join_date`;

function httpsUrl(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_MEDIA");
  const trimmed = value.trim();
  if (trimmed.length > 2048 || !trimmed.startsWith("https://")) throw new Error("INVALID_MEDIA");
  const url = new URL(trimmed);
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) throw new Error("INVALID_MEDIA");
  return trimmed;
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const result = await socialQuery(`select ${PROFILE_COLUMNS} from social_profiles where user_id=$1`, [userId]);
    const profile = result.rows[0] || null;
    if (!profile) {
      return socialJson({ profile: null, missing: true }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return socialJson({ profile }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return socialError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 20)) return socialJson({ error: "Terlalu banyak perubahan." }, { status: 429 });

    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if ("username" in body) {
      const username = typeof body.username === "string" ? body.username.trim() : "";
      if (username.length < 3 || username.length > 50) {
        return socialJson({ error: "Username harus 3–50 karakter." }, { status: 400 });
      }
      if (/[\u0000-\u001f\u007f]/.test(username)) {
        return socialJson({ error: "Username mengandung karakter tidak valid." }, { status: 400 });
      }
      const taken = await socialQuery<{ user_id: string }>(
        "select user_id from social_profiles where lower(username)=lower($1) and user_id<>$2 limit 1",
        [username, userId],
      );
      if (taken.rows.length) return socialJson({ error: "Username sudah dipakai." }, { status: 409 });
      updates.username = username;
    }

    if ("avatar_url" in body) {
      try {
        updates.avatar_url = httpsUrl(body.avatar_url);
      } catch {
        return socialJson({ error: "Avatar wajib URL HTTPS publik." }, { status: 400 });
      }
    }

    for (const field of PRIVACY_FIELDS) {
      if (field in body) updates[field] = body[field] !== false;
    }

    if (!Object.keys(updates).length) {
      return socialJson({ error: "Tidak ada perubahan." }, { status: 400 });
    }

    // Pastikan baris lokal ada (user yang belum pernah masuk fitur sosial).
    await socialQuery("insert into social_profiles (user_id, username) values ($1,$2) on conflict (user_id) do nothing", [
      userId,
      `user-${userId.slice(0, 8)}`,
    ]);

    const setClauses = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`);
    const values = [userId, ...Object.values(updates)];
    await socialQuery(
      `update social_profiles set ${setClauses.join(", ")}, updated_at = now() where user_id = $1`,
      values,
    );

    await socialQuery("insert into profile_write_log (user_id, fields, actor) values ($1,$2,$3)", [
      userId,
      JSON.stringify(updates),
      "me/profile",
    ]);
    await bumpProfileSignal(userId);

    // Metadata sesi (Auth, bukan tabel PostgREST). Kegagalan di sini tidak boleh
    // menggagalkan penyimpanan profil.
    if ("username" in updates || "avatar_url" in updates) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            name: (updates.username as string) ?? undefined,
            full_name: (updates.username as string) ?? undefined,
            avatar_url: (updates.avatar_url as string | null) ?? undefined,
          },
        });
      } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
        console.error("[me/profile] auth metadata gagal:", error instanceof Error ? error.message : error);
      }
    }

    const result = await socialQuery(`select ${PROFILE_COLUMNS} from social_profiles where user_id=$1`, [userId]);
    return socialJson({ profile: result.rows[0] || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return socialError(error);
  }
}
