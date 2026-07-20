import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { unstable_cache } from "next/cache";

const CACHE_TTL = 120; // 2 menit

const getPustakaPage = unstable_cache(
  async (page: number) => {
    const limit = 20;
    const offset = (page - 1) * limit;

    // Query 1: Ambil manga list — kolom spesifik, TANPA JOIN
    const { data: projects, error } = await supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!projects || projects.length === 0) return { data: [] };

    // Query 2: Ambil latest chapter per manga — satu query, LIMIT ketat
    const slugs = projects.map((p) => p.slug);
    const { data: chapters } = await supabaseAdmin
      .from("project_chapters")
      .select("manga_slug, chapter_number")
      .in("manga_slug", slugs)
      .order("chapter_number", { ascending: false })
      .limit(slugs.length * 10); // Ambil lebih banyak untuk menghindari chapter tertinggal

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
