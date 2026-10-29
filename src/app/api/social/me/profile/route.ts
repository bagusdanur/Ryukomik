import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { AVATAR_BORDERS, isAdminOnlyBorder } from "@/lib/avatarBorders";
import { getCachedRole } from "@/lib/serverRoleCache";
import { getMarathonStanding } from "@/lib/social/marathonChampion";

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
      "select user_id as id,username,avatar_url,avatar_border,banner_url,bio,level,is_premium,premium_until from social_profiles where user_id=$1",
      [userId],
    );
    // Dipakai UI untuk menyembunyikan border yang terkunci; penegakannya tetap
    // di PATCH (sumber kebenaran = getCachedRole, bukan nilai kiriman klien).
    const role = await getCachedRole(userId);
    return socialJson(
      {
        profile: result.rows[0]
          ? {
              ...result.rows[0],
              // Premium dianggap aktif hanya kalau masa berlakunya belum lewat;
              // galeri border memakai ini untuk membuka tab Premium.
              is_premium: Boolean(
                result.rows[0].is_premium &&
                  (!result.rows[0].premium_until ||
                    Date.parse(result.rows[0].premium_until) > Date.now()),
              ),
            }
          : null,
        is_admin: role.isAdmin,
        // Dipakai galeri border: peringkat minggu ini + title terbaik yang pernah diraih.
        ...(await getMarathonStanding(userId).then((standing) => ({
          marathon_rank: standing.current,
          marathon_best_rank: standing.best,
        }))),
      },
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
    // Patch parsial: hanya field yang DIKIRIM yang diubah. Sebelumnya field
    // yang tidak ada di body dianggap null sehingga update border saja gagal
    // dengan "Banner wajib berupa URL HTTPS publik".
    const updates: Record<string, unknown> = {};
    if ("bio" in body) {
      updates.bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 280) || null : null;
    }
    if ("banner_url" in body) {
      updates.banner_url = mediaUrl(body.banner_url);
    }
    if ("avatar_border" in body) {
      updates.avatar_border = avatarBorderId(body.avatar_border);
    }

    if (!Object.keys(updates).length) {
      return socialJson({ error: "Tidak ada perubahan." }, { status: 400 });
    }

    const nextBorder = updates.avatar_border as string | null | undefined;
    const role = await getCachedRole(userId);
    if (isAdminOnlyBorder(nextBorder) && !role.isAdmin) {
      return socialJson({ error: "Border ini khusus admin." }, { status: 403 });
    }

    // Border premium (mis. Red Wings / Black Wings) hanya untuk member premium.
    const borderMeta = nextBorder ? AVATAR_BORDERS[nextBorder as keyof typeof AVATAR_BORDERS] : null;
    if (borderMeta?.premiumOnly) {
      const { rows } = await socialQuery<{ is_premium: boolean; premium_until: string | null }>(
        "select is_premium, premium_until from social_profiles where user_id = $1",
        [userId],
      );
      const row = rows[0];
      const activePremium = Boolean(
        row?.is_premium && (!row.premium_until || Date.parse(row.premium_until) > Date.now()),
      );
      // Admin tetap boleh memakai frame premium tanpa langganan.
      if (!activePremium && !role.isAdmin) {
        return socialJson({ error: "Border ini khusus member premium." }, { status: 403 });
      }
    }

    // Frame juara maraton: hanya peringkat yang sesuai di minggu berjalan.
    if (borderMeta?.rankOnly && !role.isAdmin) {
      const standing = await getMarathonStanding(userId);
      // Boleh kalau sedang di peringkat itu, atau pernah meraih title itu/sebelumnya.
      // Title bersifat mingguan: begitu title pindah orang, akses ikut pindah.
      const entitled = standing.current === borderMeta.rankOnly;
      if (!entitled) {
        return socialJson(
          { error: `Border ini khusus Juara ${borderMeta.rankOnly} Marathon minggu ini.` },
          { status: 403 },
        );
      }
    }

    const assignments = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`);
    await socialQuery(
      `update social_profiles set ${assignments.join(", ")}, updated_at = now() where user_id = $1`,
      [userId, ...Object.values(updates)],
    );
    return socialJson({ success: true, ...updates });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEDIA") {
      return socialJson({ error: "Banner wajib berupa URL HTTPS publik." }, { status: 400 });
    }
    return socialError(error);
  }
}
