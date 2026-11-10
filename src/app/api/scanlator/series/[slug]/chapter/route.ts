import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGES = 100;

/**
 * Upload chapter karya Scanlator. Chapter dibuat is_published=false;
 * ikut terbit saat seri disetujui admin (review Fase B).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const userId = await requireUserId(request);
    const { slug } = await context.params;

    const profile = await socialQuery<{ handle: string; storage_handle: string | null; status: string }>(
      "select handle, storage_handle, status from scanlator_profiles where user_id = $1 limit 1",
      [userId],
    );
    if (!profile.rows[0] || profile.rows[0].status === "revoked") {
      return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });
    }
    if (profile.rows[0].status === "suspended") {
      return NextResponse.json({ error: "Akun Scanlator kamu sedang disuspend. Hubungi admin." }, { status: 403 });
    }

    // Pastikan seri ini milik user ini.
    const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(
      `/admin/projects/by-slug/${encodeURIComponent(slug)}`,
    ).catch(() => null);
    const ownerId = manga?.data?.owner_user_id as string | undefined;
    if (!manga?.data || ownerId !== userId) {
      return NextResponse.json({ error: "Seri tidak ditemukan atau bukan milikmu." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const chapterNumber = Number(body?.chapter_number);
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    const rawUrls = Array.isArray(body?.image_urls)
      ? body.image_urls.filter((u): u is string => typeof u === "string" && u.startsWith("https://"))
      : [];
    const imageUrls = rawUrls.slice(0, MAX_IMAGES);

    if (!Number.isFinite(chapterNumber) || chapterNumber <= 0) {
      return NextResponse.json({ error: "Nomor chapter tidak valid." }, { status: 400 });
    }
    if (imageUrls.length < 1) {
      return NextResponse.json({ error: "Unggah minimal 1 gambar chapter dulu." }, { status: 400 });
    }

    // Gambar wajib dari folder tim sendiri (scanlator/<storage_handle>/).
    // Tanpa guard ini chapter bisa diisi hotlink: kuota tidak terpakai dan isi
    // chapter bisa diganti setelah ACC admin.
    const storage = profile.rows[0].storage_handle || profile.rows[0].handle;
    const allowedPrefix = `/scanlator/${storage}/`;
    const foreign = imageUrls.filter((url) => {
      try {
        return !new URL(url).pathname.startsWith(allowedPrefix);
      } catch {
        return true;
      }
    });
    if (foreign.length > 0) {
      return NextResponse.json(
        { error: `${foreign.length} gambar bukan dari upload Studio tim ini. Unggah ulang gambarnya.` },
        { status: 400 },
      );
    }

    const created = await projectApiFetch<{ data?: Record<string, unknown> }>("/admin/chapters", {
      method: "POST",
      body: JSON.stringify({
        manga_slug: slug,
        chapter_number: chapterNumber,
        title: title || `Chapter ${chapterNumber}`,
        image_urls: imageUrls,
        is_published: false,
      }),
    }).catch(() => null);

    if (!created?.data) {
      return NextResponse.json({ error: "Chapter mungkin sudah ada. Periksa nomor chapter." }, { status: 409 });
    }
    return NextResponse.json({ success: true, chapter: chapterNumber, status: "pending" });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal mengunggah chapter." }, { status: 500 });
  }
}
