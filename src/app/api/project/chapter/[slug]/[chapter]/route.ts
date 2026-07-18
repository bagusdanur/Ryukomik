import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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
    const { data: manga, error: mangaError } = await supabaseServer
      .from("project_manga")
      .select("title")
      .eq("slug", slug)
      .single();

    if (mangaError) throw mangaError;

    // Dapatkan data chapter aktif
    const { data: chapData, error: chapterError } = await supabaseServer
      .from("project_chapters")
      .select("*")
      .eq("manga_slug", slug)
      .eq("chapter_number", chapterNum)
      .single();

    if (chapterError) throw chapterError;

    // Dapatkan daftar semua chapter untuk navigasi
    const { data: allChapters } = await supabaseServer
      .from("project_chapters")
      .select("chapter_number")
      .eq("manga_slug", slug)
      .order("chapter_number", { ascending: false });

    // Cari prev / next chapter
    let prevChapter = null;
    let nextChapter = null;
    
    if (allChapters) {
      const idx = allChapters.findIndex(c => c.chapter_number === chapterNum);
      if (idx > 0) {
        nextChapter = `chapter-${allChapters[idx - 1].chapter_number}`;
      }
      if (idx !== -1 && idx < allChapters.length - 1) {
        prevChapter = `chapter-${allChapters[idx + 1].chapter_number}`;
      }
    }

    // Normalize ke format ReaderChapter
    return NextResponse.json({
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
