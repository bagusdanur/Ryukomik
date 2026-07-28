import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request, props: { params: Promise<{ slug: string, chapter: string }> }) {
  try {
    const params = await props.params;
    const { slug, chapter } = params;

    if (!slug || !chapter) {
      return NextResponse.json({ success: false, error: "Slug and chapter are required" }, { status: 400 });
    }

    // Ekstrak angka dari chapter string (misal: "chapter-1.5" -> 1.5)
    let chapterNum = 0;
    const match = chapter.match(/chapter-([\d.]+)/i);
    if (match) {
      chapterNum = parseFloat(match[1]);
    } else {
      chapterNum = parseFloat(chapter);
    }

    if (isNaN(chapterNum)) {
      return NextResponse.json({ success: false, error: "Invalid chapter number" }, { status: 400 });
    }

    // Dapatkan data manga (untuk prev/next logic dan title)
    const { data: manga, error: mangaError } = await supabaseAdmin
      .from("project_manga")
      .select("title")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (mangaError) throw mangaError;
    if (!manga) {
      return NextResponse.json({ success: false, error: "Project tidak ditemukan" }, { status: 404 });
    }

    // Dapatkan data chapter aktif + navigasi secara paralel
    const [
      { data: chapData, error: chapterError },
      { data: nextChapData },
      { data: prevChapData },
    ] = await Promise.all([
      supabaseAdmin
        .from("project_chapters")
        .select("chapter_number, title, image_urls")
        .eq("manga_slug", slug)
        .eq("chapter_number", chapterNum)
        .single(),
      supabaseAdmin
        .from("project_chapters")
        .select("chapter_number")
        .eq("manga_slug", slug)
        .gt("chapter_number", chapterNum)
        .order("chapter_number", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("project_chapters")
        .select("chapter_number")
        .eq("manga_slug", slug)
        .lt("chapter_number", chapterNum)
        .order("chapter_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (chapterError) throw chapterError;

    const nextChapter = nextChapData ? `chapter-${nextChapData.chapter_number}` : null;
    const prevChapter = prevChapData ? `chapter-${prevChapData.chapter_number}` : null;

    // Normalize ke format ReaderChapter
    const response = NextResponse.json({
      success: true,
      title: chapData.title || `Chapter ${chapData.chapter_number}`,
      currentChapter: `Chapter ${chapData.chapter_number}`,
      mangaId: slug,
      series: {
        slug: slug
      },
      prev: prevChapter,
      next: nextChapter,
      images: chapData.image_urls || []
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
