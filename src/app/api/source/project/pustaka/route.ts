import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { unstable_cache } from "next/cache";
import { projectApiUrl } from "@/lib/projectApiServer";

const CACHE_TTL = 120; // 2 menit

const getPustakaPage = unstable_cache(
  async (page: number) => {
    const limit = 20;
    const offset = (page - 1) * limit;

    // Cek total dulu -- Supabase/PostgREST bisa balikin HTTP 416 (body gak
    // konsisten, gak bisa diandalkan lewat error.code) kalau range yang
    // diminta melebihi total baris yang ada.
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from("project_manga")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);

    if (countError) throw countError;
    if (offset >= (totalCount || 0)) return { data: [] };

    // Query 1: Ambil manga list — kolom spesifik, TANPA JOIN
    const { data: projects, error } = await supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!projects || projects.length === 0) return { data: [] };

    // Query 2: Ambil latest chapter per manga — RPC DISTINCT ON per
    // manga_slug, jadi tiap manga pasti kebagian baris chapter terbarunya
    // sendiri (gak keserobot manga lain yang nomor chapternya lebih tinggi).
    const slugs = projects.map((p) => p.slug);
    const { data: chapters } = await supabaseAdmin.rpc(
      "get_latest_project_chapters",
      { p_manga_slugs: slugs },
    );

    // Karena sudah di-ORDER DESC, chapter pertama per slug = yang terbaru
    const latestChapterMap = new Map<string, number>();
    for (const ch of chapters || []) {
      if (!latestChapterMap.has(ch.manga_slug)) {
        latestChapterMap.set(ch.manga_slug, ch.chapter_number);
      }
    }

    const formattedData = projects.map((p) => {
      const latestChapter = latestChapterMap.get(p.slug);
      return {
        slug: p.slug,
        title: p.title,
        source: "project",
        image: p.cover_url || "",
        info: p.status,
        type_genre: p.type || "manga",
        chapter_terbaru: latestChapter ? `Ch. ${latestChapter}` : "",
      };
    });

    return { data: formattedData };
  },
  ["source-project-pustaka"],
  { revalidate: CACHE_TTL, tags: ["source-project-pustaka"] },
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const projectUrl = projectApiUrl(`/projects?page=${page}&limit=20`);
    if (projectUrl) {
      const upstream = await fetch(projectUrl, { next: { revalidate: CACHE_TTL, tags: ["source-project-pustaka"] } });
      if (!upstream.ok) throw new Error(`Project API failed with status ${upstream.status}`);
      const json = await upstream.json();
      return NextResponse.json(
        {
          data: (json.data || []).map((p: Record<string, unknown>) => ({
            slug: p.slug,
            title: p.title,
            source: "project",
            image: p.cover_url || "",
            info: p.status || "",
            type_genre: p.type || "manga",
            chapter_terbaru: p.latest_chapter != null ? `Ch. ${p.latest_chapter}` : "",
          })),
          hasMore: Boolean(json.hasMore),
        },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`,
          },
        },
      );
    }

    const result = await getPustakaPage(page);

    const response = NextResponse.json(result);
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`,
    );
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
