import { buildComicUrl } from "@/lib/canonicalUrl";
import {
  SHARD_SIZE,
  loadChapterEntries,
  mainRoutes,
  seriesFromChapters,
  sitemapResponse,
  urlsetXml,
} from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

const SERIES_SOURCES = ["komiku", "komikid", "josei", "luvyaa", "kiryuu", "project"];

/**
 * Satu berkas sitemap.
 *   main.xml        → halaman statis + direktori seri
 *   chapters-N.xml  → potongan chapter (5.000 per berkas)
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const entries = await loadChapterEntries();

  if (id === "main.xml") {
    const routes = await mainRoutes();
    const series = SERIES_SOURCES.flatMap((source) =>
      seriesFromChapters(entries, source).map((slug) => ({
        url: buildComicUrl(source, slug),
        changefreq: "weekly",
        priority: 0.7,
      })),
    );
    return sitemapResponse(urlsetXml([...routes, ...series]));
  }

  const match = id.match(/^chapters-(\d+)\.xml$/);
  if (!match) {
    return new Response("Not Found", { status: 404, headers: { "content-type": "text/plain" } });
  }

  const shard = Number(match[1]);
  const start = shard * SHARD_SIZE;
  const slice = entries.slice(start, start + SHARD_SIZE);

  return sitemapResponse(
    urlsetXml(
      slice.map((entry) => ({
        url: entry.url,
        lastmod: entry.lastmod || undefined,
        changefreq: "monthly",
        priority: 0.6,
      })),
    ),
  );
}
