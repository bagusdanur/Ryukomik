import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const { slug } = params;

    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug is required" }, { status: 400 });
    }

    const { data: manga, error: mangaError } = await supabaseServer
      .from("project_manga")
      .select("*")
      .eq("slug", slug)
      .single();

    if (mangaError) throw mangaError;

    const { data: chapters, error: chapterError } = await supabaseServer
      .from("project_chapters")
      .select("id, chapter_number, title, uploaded_at")
      .eq("manga_slug", slug)
      .order("chapter_number", { ascending: false });

    if (chapterError) throw chapterError;

    // Normalize ke format yang diharapkan frontend (ComicDetail)
    return NextResponse.json({
      success: true,
      data: {
        title: manga.title,
        thumbnail: manga.cover_url,
        type: manga.type,
        status: manga.status,
        author: manga.author,
        genres: manga.genres,
        description: manga.description,
        chapters: chapters?.map(c => ({
          chapter: `Chapter ${c.chapter_number}`,
          url: `/chapter/project/${slug}/chapter-${c.chapter_number}`,
          time: c.uploaded_at
        })) || []
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
