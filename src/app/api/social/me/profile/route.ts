import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { AVATAR_BORDERS, isAdminOnlyBorder } from "@/lib/avatarBorders";
import { getCachedRole } from "@/lib/serverRoleCache";

function mediaUrl(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_MEDIA");
  const trimmed = value.trim();
  if (trimmed.length > 2048 || !trimmed.startsWith("https://")) throw new Error("INVALID_MEDIA");
  const url = new URL(trimmed);
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) throw new Error("INVALID_MEDIA");
  return trimmed;
}

/** Hanya id border yang terdaftar di registry yang boleh disimpan. */
function avatarBorderId(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  return Object.hasOwn(AVATAR_BORDERS, value) ? value : null;
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    await ensureSocialProfile(userId);
    const result = await socialQuery(
      "select user_id as id,username,avatar_url,avatar_border,banner_url,bio,level from social_profiles where user_id=$1",
      [userId],
    );
    // Dipakai UI untuk menyembunyikan border yang terkunci; penegakannya tetap
    // di PATCH (sumber kebenaran = getCachedRole, bukan nilai kiriman klien).
    const role = await getCachedRole(userId);
    return socialJson(
      { profile: result.rows[0] || null, is_admin: role.isAdmin },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return socialError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    await ensureSocialProfile(userId);
    if (!socialLimit(request, userId, 10)) return socialJson({ error: "Terlalu banyak perubahan." }, { status: 429 });

    const body = (await request.json()) as Record<string, unknown>;
    const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 280) || null : null;
    const banner = mediaUrl(body.banner_url);
    const border = avatarBorderId(body.avatar_border);

    if (isAdminOnlyBorder(border) && !(await getCachedRole(userId)).isAdmin) {
      return socialJson({ error: "Border ini khusus admin." }, { status: 403 });
    }

    await socialQuery(
      "update social_profiles set bio=$2,banner_url=$3,avatar_border=$4,updated_at=now() where user_id=$1",
      [userId, bio, banner, border],
    );
    return socialJson({ success: true, avatar_border: border });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEDIA") {
      return socialJson({ error: "Banner wajib berupa URL HTTPS publik." }, { status: 400 });
    }
    return socialError(error);
  }
}
