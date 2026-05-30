import type { MetadataRoute } from "next";

type SitemapSourceItem = {
  link?: string;
  chapter_link?: string;
};

type SitemapSourceData = Partial<
  Record<
    "terbaru" | "populer_manhwa" | "populer_manga" | "populer_manhua",
    SitemapSourceItem[]
  >
>;

type SitemapSourceResponse = {
  data?: SitemapSourceData;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.ryukomik.my.id";

  let json: SitemapSourceResponse = {};
  try {
    const res = await fetch("https://ryukomikback.vercel.app/komiku/home", {
      next: { revalidate: 3600 },
    });

    json = await res.json();
  } catch (e) {
    json = { data: {} }; // fallback aman
  }

  const data = json.data || {};

  const categories = [
    "terbaru",
    "populer_manhwa",
    "populer_manga",
    "populer_manhua",
  ];

  const komikRoutes: MetadataRoute.Sitemap = [];
  const chapterRoutes: MetadataRoute.Sitemap = [];

  categories.forEach((category) => {
    const items = data[category] || [];

    items.forEach((item) => {
      if (!item.link || !item.chapter_link) return;

      const slug = item.link
        .replace("https://komiku.org/manga/", "")
        .replace(/\/$/, "");

      komikRoutes.push({
        url: `${baseUrl}/komik/${slug}`,
        lastModified: new Date(),
      });

      const chapterSlug = item.chapter_link
        .replace("https://komiku.org/", "")
        .replace(/\/$/, "");

      chapterRoutes.push({
        url: `${baseUrl}/chapter/${chapterSlug}`,
        lastModified: new Date(),
      });
    });
  });

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/bookmark`, lastModified: new Date() },
    { url: `${baseUrl}/list-komik`, lastModified: new Date() },
    { url: `${baseUrl}/history`, lastModified: new Date() },
    { url: `${baseUrl}/icon.png`, lastModified: new Date() },

    ...komikRoutes,
    ...chapterRoutes,
  ];
}
