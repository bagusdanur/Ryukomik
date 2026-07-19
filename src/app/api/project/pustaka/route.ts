import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const offset = (page - 1) * limit;

    // Ambil manga + total count
    const { data: mangaList, count, error } = await supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status, author, genres, updated_at", {
        count: "exact",
      })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (!mangaList || mangaList.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: count || 0,
        hasMore: false,
      });
    }

    // Ambil chapter terbaru untuk semua manga sekaligus
    // Batasi jumlah total chapter yang diambil untuk efisiensi egress
    const mangaSlugs = mangaList.map(m => m.slug);
    const { data: allChapters } = await supabaseAdmin
      .from("project_chapters")
      .select("manga_slug, chapter_number, uploaded_at")
      .in("manga_slug", mangaSlugs)
      .order("chapter_number", { ascending: false })
      .limit(mangaSlugs.length * 5); // Maks 5 chapter per manga untuk kebutuhan latest-only

    // Build map: slug -> latest chapter (ambil yang pertama karena sudah di-order DESC)
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
      };
    });

    const response = NextResponse.json({
      success: true,
      data: results,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300",
    );
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
