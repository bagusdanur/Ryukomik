import type { MetadataRoute } from "next";
import { buildCanonicalUrl, buildChapterUrl, buildComicUrl, PUBLIC_COMIC_SOURCES } from "@/lib/canonicalUrl";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type SitemapItem = { slug?: string; source?: string; updated_at?: string; modified?: string };
type ApiResponse = { data?: SitemapItem[]; hasMore?: boolean; meta?: { hasMore?: boolean } };
type ProjectDetailResponse = {
  data?: { chapters?: Array<{ slug?: string; uploaded_at?: string }> };
};

async function fetchSource(source: string): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  const projectSlugs: string[] = [];
  // Keep the public sitemap responsive. Deeper shards will be supplied from
  // backend snapshots; live scraper pagination must never hold this route open.
  for (let page = 1; page <= 3; page += 1) {
    try {
      const endpoint = source === "project"
        ? `https://ryukomik.my.id/api/project/pustaka?page=${page}`
        : `https://api.ryukomik.web.id/${source}/pustaka-filter?page=${page}&orderby=modified`;
      const response = await fetch(endpoint, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(4_000),
      });
      if (!response.ok) break;
      const json = await response.json() as ApiResponse;
      const items = Array.isArray(json.data) ? json.data : [];
      if (!items.length) break;
      for (const item of items) {
        if (!item.slug) continue;
        if (source === "project") projectSlugs.push(item.slug);
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

  if (source === "project" && projectSlugs.length) {
    const chapterGroups = await Promise.all(projectSlugs.map(async (slug) => {
      try {
        const response = await fetch(
          `https://ryukomik.my.id/api/project/${encodeURIComponent(slug)}`,
          { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4_000) },
        );
        if (!response.ok) return [];
        const json = await response.json() as ProjectDetailResponse;
        return (json.data?.chapters || []).map((chapter) => {
          if (!chapter.slug) return null;
          const url = buildChapterUrl("project", chapter.slug);
          const parsedDate = chapter.uploaded_at ? new Date(chapter.uploaded_at) : null;
          return url ? {
            url,
            ...(parsedDate && !Number.isNaN(parsedDate.getTime()) ? { lastModified: parsedDate } : {}),
            changeFrequency: "monthly" as const,
            priority: 0.65,
          } : null;
        }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      } catch {
        return [];
      }
    }));
    for (const chapter of chapterGroups.flat()) {
      if (!seen.has(chapter.url)) {
        seen.add(chapter.url);
        routes.push(chapter);
      }
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
