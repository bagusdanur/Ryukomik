import type { MetadataRoute } from "next";
import { buildCanonicalUrl, buildComicUrl, PUBLIC_COMIC_SOURCES } from "@/lib/canonicalUrl";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type SitemapItem = { slug?: string; source?: string; updated_at?: string; modified?: string };
type ApiResponse = { data?: SitemapItem[]; hasMore?: boolean; meta?: { hasMore?: boolean } };

async function fetchSource(source: string): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 50; page += 1) {
    try {
      const endpoint = source === "project"
        ? `https://ryukomik.my.id/api/project/pustaka?page=${page}`
        : `https://api.ryukomik.web.id/${source}/pustaka-filter?page=${page}&orderby=modified`;
      const response = await fetch(endpoint, { next: { revalidate: 3600 } });
      if (!response.ok) break;
      const json = await response.json() as ApiResponse;
      const items = Array.isArray(json.data) ? json.data : [];
      if (!items.length) break;
      for (const item of items) {
        if (!item.slug) continue;
        const url = buildComicUrl(source, item.slug);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        const rawDate = item.updated_at || item.modified;
        const parsedDate = rawDate ? new Date(rawDate) : null;
        routes.push({
          url,
          ...(parsedDate && !Number.isNaN(parsedDate.getTime()) ? { lastModified: parsedDate } : {}),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
      if (json.hasMore === false || json.meta?.hasMore === false) break;
    } catch {
      break;
    }
  }
  return routes;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sourceRoutes = await Promise.all(PUBLIC_COMIC_SOURCES.map(fetchSource));
  return [
    { url: buildCanonicalUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: buildCanonicalUrl("/list-komik"), changeFrequency: "daily", priority: 0.8 },
    { url: buildCanonicalUrl("/terbaru"), changeFrequency: "daily", priority: 0.8 },
    ...sourceRoutes.flat(),
  ];
}
