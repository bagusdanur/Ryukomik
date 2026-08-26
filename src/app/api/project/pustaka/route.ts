import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { allowSupabaseProjectReadFallback, projectApiUrl } from "@/lib/projectApiServer";

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffWeek < 4) return `${diffWeek} minggu lalu`;
  if (diffMonth < 12) return `${diffMonth} bulan lalu`;
  return `${diffYear} tahun lalu`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "30", 10)));
    const offset = (page - 1) * limit;
    const tipe = (searchParams.get("tipe") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const genre = (searchParams.get("genre") || "").trim();
    const genre2 = (searchParams.get("genre2") || "").trim();

    // Cek jika microservice project PostgreSQL (ryukomik-project-db) aktif
    const upstreamParams = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (tipe) upstreamParams.set("type", tipe);
    if (status) upstreamParams.set("status", status);
    if (genre) upstreamParams.set("genre", genre);
    if (genre2) upstreamParams.set("genre2", genre2);
    const projectUrl = projectApiUrl(`/projects?${upstreamParams.toString()}`);
    if (projectUrl) {
      try {
        const upstream = await fetch(projectUrl, {
          next: { revalidate: 60, tags: ["source-project-pustaka"] },
        });
        if (upstream.ok) {
          const json = await upstream.json();
          const results = (json.data || []).map((item: any) => ({
            slug: item.slug,
            title: item.title,
            image: item.cover_url || item.image || "",
            source: "project",
            info: item.latest_chapter_uploaded_at
              ? formatRelativeDate(item.latest_chapter_uploaded_at)
              : item.updated_at
              ? formatRelativeDate(item.updated_at)
              : "",
            type_genre: [item.type, ...(item.genres || [])].filter(Boolean).join(", "),
            chapter_terbaru: item.latest_chapter != null ? `Chapter ${item.latest_chapter}` : "",
            updated_at: item.latest_chapter_uploaded_at || item.updated_at || null,
            status: item.status || "",
          }));

          const response = NextResponse.json({
            success: true,
            data: results,
            total: typeof json.total === "number" ? json.total : results.length,
            hasMore: Boolean(json.hasMore),
          });
          response.headers.set(
            "Cache-Control",
            "public, s-maxage=60, stale-while-revalidate=180",
          );
          return response;
        }
      } catch (upstreamErr) {
        console.error("[api/project/pustaka] Upstream project API error:", upstreamErr);
      }
    }

    if (!allowSupabaseProjectReadFallback()) {
      return NextResponse.json(
        { success: false, data: [], total: 0, hasMore: false, error: "Project API sementara tidak tersedia" },
        { status: 503, headers: { "Cache-Control": "public, max-age=30, stale-if-error=3600" } },
      );
    }

    // Fallback: Supabase DB
    let countQuery = supabaseAdmin
      .from("project_manga")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);
    if (tipe) countQuery = countQuery.ilike("type", tipe);
    if (status) countQuery = countQuery.ilike("status", status);
    if (genre) countQuery = countQuery.contains("genres", [genre]);
    if (genre2) countQuery = countQuery.contains("genres", [genre2]);
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) throw countError;

    if (offset >= (totalCount || 0)) {
      return NextResponse.json({
        success: true,
        data: [],
        total: totalCount || 0,
        hasMore: false,
      });
    }

    // Ambil manga untuk halaman ini
    let listQuery = supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status, author, genres, updated_at")
      .eq("is_published", true);
    if (tipe) listQuery = listQuery.ilike("type", tipe);
    if (status) listQuery = listQuery.ilike("status", status);
    if (genre) listQuery = listQuery.contains("genres", [genre]);
    if (genre2) listQuery = listQuery.contains("genres", [genre2]);
    const { data: mangaList, error } = await listQuery
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (!mangaList || mangaList.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: totalCount || 0,
        hasMore: false,
      });
    }

    const mangaSlugs = mangaList.map((m) => m.slug);
    const { data: allChapters } = await supabaseAdmin.rpc(
      "get_latest_project_chapters",
      { p_manga_slugs: mangaSlugs },
    );

    // Build map: slug -> latest chapter
    const latestChapterMap = new Map<string, { chapter_number: number; uploaded_at: string }>();
    for (const ch of allChapters || []) {
      if (!latestChapterMap.has(ch.manga_slug)) {
        latestChapterMap.set(ch.manga_slug, {
          chapter_number: ch.chapter_number,
          uploaded_at: ch.uploaded_at,
        });
      }
    }

    const results = mangaList.map((item) => {
      const latest = latestChapterMap.get(item.slug);
      return {
        slug: item.slug,
        title: item.title,
        image: item.cover_url || "",
        source: "project",
        info: latest ? formatRelativeDate(latest.uploaded_at) : "",
        type_genre: [item.type, ...(item.genres || [])].filter(Boolean).join(", "),
        chapter_terbaru: latest ? `Chapter ${latest.chapter_number}` : "",
        updated_at: latest?.uploaded_at || item.updated_at || null,
        status: item.status || "",
      };
    });

    const response = NextResponse.json({
      success: true,
      data: results,
      total: totalCount || 0,
      hasMore: (totalCount || 0) > offset + limit,
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=180",
    );
    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : (err as { message?: string } | null)?.message || "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
