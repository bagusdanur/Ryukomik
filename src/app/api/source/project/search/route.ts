import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { projectApiUrl } from "@/lib/projectApiServer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = 20;
    const offset = (page - 1) * limit;

    const projectUrl = projectApiUrl(`/projects/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);
    if (projectUrl) {
      const upstream = await fetch(projectUrl, { next: { revalidate: 30, tags: [`project-search:${q}:${page}`] } });
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
          success: true,
          hasMore: Boolean(json.hasMore),
        },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
      );
    }

    // Cek total dulu -- Supabase/PostgREST bisa balikin HTTP 416 (body gak
    // konsisten, gak bisa diandalkan lewat error.code) kalau range yang
    // diminta melebihi total baris yang ada.
    let countQuery = supabaseAdmin
      .from("project_manga")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);
    if (q) countQuery = countQuery.ilike("title", `%${q}%`);

    const { count: totalCount, error: countError } = await countQuery;
    if (countError) throw countError;
    if (offset >= (totalCount || 0)) {
      return NextResponse.json({ data: [], success: true });
    }

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

    // Query 2: Latest chapter per manga — RPC DISTINCT ON per manga_slug
    const slugs = projects.map((p) => p.slug);
    const { data: chapters } = await supabaseAdmin.rpc(
      "get_latest_project_chapters",
      { p_manga_slugs: slugs },
    );

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
