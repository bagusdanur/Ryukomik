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
    "you-like-someone-with-that-face",
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
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://ryukomik.my.id";

    const results = await Promise.all(
      slugs.map(async (slug) => {
        const res = await fetch(
          `${siteUrl}/api/project/${encodeURIComponent(slug)}`,
          { next: { revalidate: 3600, tags: [`project-detail:${slug}`] } }
        );
        if (!res.ok) throw new Error(`Project banner gagal dimuat: ${slug}`);
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
