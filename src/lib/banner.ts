import type { Dict } from "@/types/common";

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
  const slugs = [
    "youre-the-only-one-i-can-see",
    "resurrection-boy",
    "the-demon-king-overrun-by-heroes",
    "became-the-patron-of-villains",
    "academy-of-card",
  ];

  const convert = (detail: Dict = {}, slug = ""): BannerItem => ({
    title: String(detail.title || "").replace("Komik ", ""),
    image: String(detail.thumbnail || ""),
    genre: Array.isArray(detail.genres) ? detail.genres.join(", ") : "",
    type: String(detail.type || ""),
    status: String(detail.status || ""),
    chapter: String(detail.chapter || ""),
    slug,
  });

  try {
    const results = await Promise.all(
      slugs.map(async (slug) => {
        const res = await fetch(
          `https://api.ryukomik.web.id/komiku/detail/${slug}`,
          { next: { revalidate: 86400 } } // ⬅️ penting
        );
        const json = await res.json();
        return convert((json as Dict).data as Dict, slug);
      })
    );

    return results;
  } catch (e) {
    console.error("getBannerKomiku error:", e);
    return [];
  }
}
