import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function requireScanlator(userId: string) {
  const { rows } = await socialQuery<{ handle: string; team_name: string; status: string }>(
    "select handle, team_name, status from scanlator_profiles where user_id = $1 limit 1",
    [userId],
  );
  const me = rows[0];
  if (!me || me.status === "revoked") return null;
  return me;
}

function blockedMessage(status: string): string | null {
  if (status === "suspended") return "Akun Scanlator kamu sedang disuspend. Hubungi admin.";
  return null;
}

/**
 * Karya Scanlator (Fase B): POST buat seri (status pending, terbit setelah ACC admin),
 * GET daftar karya saya + status review.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const profile = await requireScanlator(userId);
    if (!profile) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });

    const data = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
      `/admin/projects?limit=100&search=&page=1`,
    ).catch(() => ({ data: [] }));
    const owned = (data.data || []).filter((m) => (m as { owner_user_id?: string }).owner_user_id === userId);
    const mine = await Promise.all(
      owned.map(async (m) => {
        const row = m as Record<string, unknown>;
        const slug = String(row.slug || "");
        const chapterRows = await projectApiFetch<{ data?: unknown[] }>(
          `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
        ).catch(() => ({ data: [] }));
        return {
          slug: row.slug,
          title: row.title,
          cover_url: row.cover_url,
          type: row.type,
          review_status: row.review_status,
          review_note: row.review_note ?? null,
          is_published: row.is_published,
          is_adult: row.is_adult,
          chapters: Array.isArray(chapterRows.data) ? chapterRows.data.length : 0,
        };
      }),
    );
    return NextResponse.json({ success: true, profile, works: mine }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat karya." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const profile = await requireScanlator(userId);
    if (!profile) return NextResponse.json({ error: "Kamu belum Scanlator aktif. Ajukan dulu di /scanlator/daftar." }, { status: 403 });
    const blocked = blockedMessage(profile.status);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    const author = typeof body?.author === "string" ? body.author.trim().slice(0, 100) : "";
    const coverUrl = typeof body?.cover_url === "string" ? body.cover_url.trim().slice(0, 500) : "";
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 3000) : "";
    const type = typeof body?.type === "string" ? body.type.trim().slice(0, 30) : "Manhwa";
    const statusSeries = typeof body?.status === "string" ? body.status.trim().slice(0, 30) : "Ongoing";
    const genres = Array.isArray(body?.genres) ? body.genres.filter((g): g is string => typeof g === "string").slice(0, 10) : [];
    const isAdult = body?.is_adult === true;
    const rightsConfirmed = body?.rights_confirmed === true;

    if (title.length < 2) return NextResponse.json({ error: "Judul wajib diisi." }, { status: 400 });
    if (!rightsConfirmed) {
      return NextResponse.json(
        { error: "Centang pernyataan bahwa karya ini hasil terjemahanmu sendiri." },
        { status: 400 },
      );
    }
    if (!coverUrl.startsWith("https://")) return NextResponse.json({ error: "Cover wajib diunggah dulu (URL https dari upload)." }, { status: 400 });

    // Anti-duplikat: judul yang sama/mirip dengan project yang sudah ada ditolak.
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const existing = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
      "/admin/projects?limit=100&page=1",
    ).catch(() => ({ data: [] }));
    const wanted = normalize(title);
    const clash = (existing.data || []).find((row) => {
      const t = normalize(String((row as { title?: string }).title || ""));
      return t === wanted || (t.length > 8 && wanted.length > 8 && (t.includes(wanted) || wanted.includes(t)));
    });
    if (clash) {
      return NextResponse.json(
        { error: `Judul ini sudah ada di Project (“${String((clash as { title?: string }).title)}”). Gunakan judul lain atau hubungi admin bila kamu tim yang sama.` },
        { status: 409 },
      );
    }

    let slug = slugify(`${profile.handle}-${title}`) || `scanlator-${Date.now()}`;
    // Slug pernah dipakai (termasuk project yang sudah dihapus) → beri akhiran unik.
    const takenSlug = await projectApiFetch<{ exists?: boolean }>(`/admin/projects/slug-exists/${encodeURIComponent(slug)}`)
      .then((r) => Boolean(r?.exists))
      .catch(() => false);
    if (takenSlug) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const created = await projectApiFetch<{ data?: Record<string, unknown> }>("/admin/projects", {
      method: "POST",
      body: JSON.stringify({
        slug,
        title,
        author: author || null,
        cover_url: coverUrl,
        description: description || null,
        status: statusSeries,
        type,
        genres,
        is_published: false,
        is_spotlight: false,
        is_adult: isAdult,
        owner_user_id: userId,
        review_status: "pending",
        scanlator_handle: profile.handle,
        scanlator_team: profile.team_name,
      }),
    }).catch((e: unknown) => {
      console.error("[scanlator/series] project-db gagal:", e instanceof Error ? e.message : e);
      return null;
    });

    if (!created?.data) {
      return NextResponse.json({ error: "Gagal membuat seri di Project API. Coba lagi." }, { status: 502 });
    }

    // Bukti pernyataan hak unggah (dipakai bila ada sengketa).
    await socialQuery(
      `insert into scanlator_rights_confirmations (user_id, manga_slug) values ($1, $2)
       on conflict (user_id, manga_slug) do update set confirmed_at = now()`,
      [userId, slug],
    ).catch(() => undefined);

    return NextResponse.json({ success: true, slug, status: "pending" });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[scanlator/series] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal membuat seri. Coba lagi." }, { status: 500 });
  }
}
