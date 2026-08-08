import { supabaseAdmin } from "@/lib/supabaseServer";

interface BannerItem {
  title: string;
  image: string;
  genre: string;
  type: string;
  status: string;
  chapter: string;
  slug: string;
}

export async function getBannerKomiku(): Promise<BannerItem[]> {
  try {
    const { data: mangaList, error } = await supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status, genres")
      .eq("is_spotlight", true)
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!mangaList || mangaList.length === 0) return [];

    // Get latest chapter for each spotlight manga
    const slugs = mangaList.map((m) => m.slug);
    const { data: allChapters } = await supabaseAdmin
      .from("project_chapters")
      .select("manga_slug, chapter_number")
      .eq("is_published", true)
      .in("manga_slug", slugs)
      .order("chapter_number", { ascending: false })
      .limit(slugs.length * 3);

    const latestChapterMap = new Map<string, number>();
    for (const ch of allChapters || []) {
      if (!latestChapterMap.has(ch.manga_slug)) {
        latestChapterMap.set(ch.manga_slug, ch.chapter_number);
      }
    }

    return mangaList.map((item) => ({
      title: item.title,
      image: item.cover_url || "",
      genre: Array.isArray(item.genres) ? item.genres.join(", ") : "",
      type: item.type || "",
      status: item.status || "",
      chapter: latestChapterMap.has(item.slug)
        ? `Chapter ${latestChapterMap.get(item.slug)}`
        : "",
      slug: item.slug,
    }));
  } catch (e) {
    console.error("getBannerKomiku error:", e);
    return [];
  }
}
