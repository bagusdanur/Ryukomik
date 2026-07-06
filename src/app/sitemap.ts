import type { MetadataRoute } from "next";

type KomikItem = {
  source: string;
  slug: string;
  title: string;
  chapter_awal?: string;
  chapter_terbaru?: string;
};

type ApiResponse = {
  data?: KomikItem[];
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://ryukomik.my.id";
  const komikRoutes: MetadataRoute.Sitemap = [];

  // Ambil semua komik dari API (loop semua page)
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 50) {
    try {
      const res = await fetch(
        `https://api.ryukomik.web.id/komiku/pustaka-filter?page=${page}&orderby=modified`,
        { next: { revalidate: 3600 } }
      );
      const json: ApiResponse = await res.json();
      const items = json.data || [];

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of items) {
        if (!item.slug) continue;

        const source = item.source || "komiku";

        // Halaman detail komik
        komikRoutes.push({
          url: `${baseUrl}/komik/${source}/${item.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        });

      
      }

      page++;
    } catch {
      hasMore = false;
    }
  }

  return [
    // Halaman statis
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/list-komik`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/terbaru`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/genre`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },

    // Semua komik
    ...komikRoutes,

  ];
}
