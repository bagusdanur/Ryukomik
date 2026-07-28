import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = 20;
    const offset = (page - 1) * limit;

    // Query 1: Search manga — kolom spesifik, TANPA JOIN
    let query = supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    const { data: projects, error } = await query;
    if (error) throw error;

    if (!projects || projects.length === 0) {
      return NextResponse.json({ data: [], success: true });
    }

    // Query 2: Latest chapter per manga — efisien dengan LIMIT ketat
    const slugs = projects.map((p) => p.slug);
    const { data: chapters } = await supabaseAdmin
      .from("project_chapters")
      .select("manga_slug, chapter_number")
      .in("manga_slug", slugs)
      .order("chapter_number", { ascending: false })
      .limit(slugs.length * 10); // Batas aman untuk mendapatkan latest chapter per manga

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

    // Search hasil di-cache singkat (30 detik) karena bergantung query param
    const response = NextResponse.json({ data: formattedData, success: true });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message, success: false }, { status: 500 });
  }
}
