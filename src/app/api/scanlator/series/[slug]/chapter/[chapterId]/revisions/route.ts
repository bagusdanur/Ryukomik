import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Riwayat revisi satu chapter — hanya untuk pemilik project. */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; chapterId: string }> },
) {
  try {
    const userId = await requireUserId(request);
    const { slug, chapterId } = await context.params;

    const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(
      `/admin/projects/by-slug/${encodeURIComponent(slug)}`,
    ).catch(() => null);

    if (!manga?.data || (manga.data.owner_user_id as string | undefined) !== userId) {
      return NextResponse.json({ error: "Project tidak ditemukan atau bukan milikmu." }, { status: 404 });
    }

    const { rows } = await socialQuery<{
      id: string;
      action: string;
      before: Record<string, unknown> | null;
      after: Record<string, unknown> | null;
      actor_id: string;
      created_at: string;
    }>(
      `select id::text as id, action, before, after, actor_id::text as actor_id, created_at
         from scanlator_chapter_revisions
        where chapter_id = $1 and manga_slug = $2
        order by created_at desc
        limit 30`,
      [chapterId, slug],
    );

    return NextResponse.json(
      { success: true, revisions: rows },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat riwayat chapter." }, { status: 500 });
  }
}
