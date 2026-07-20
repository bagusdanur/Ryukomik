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

export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const { slug } = params;

    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug is required" }, { status: 400 });
    }

    const { data: manga, error: mangaError } = await supabaseAdmin
      .from("project_manga")
      .select("title, cover_url, type, status, author, genres, description")
      .eq("slug", slug)
      .single();

    if (mangaError) throw mangaError;

    const { data: chapters, error: chapterError } = await supabaseAdmin
      .from("project_chapters")
      .select("id, chapter_number, title, uploaded_at")
      .eq("manga_slug", slug)
      .order("chapter_number", { ascending: false });

    if (chapterError) throw chapterError;

    // Normalize ke format yang diharapkan frontend (ComicDetail)
    const response = NextResponse.json({
      success: true,
      data: {
        title: manga.title,
        thumbnail: manga.cover_url,
        type: manga.type,
        status: manga.status,
        author: manga.author,
        genres: manga.genres,
        description: manga.description,
        synopsis: manga.description,
        chapters: chapters?.map(c => ({
          slug: `${slug}/chapter-${c.chapter_number}`,
          title: c.title || `Chapter ${c.chapter_number}`,
          date: formatRelativeDate(c.uploaded_at),
        })) || []
      }
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
