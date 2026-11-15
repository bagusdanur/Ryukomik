import { SHARD_SIZE, loadChapterEntries, sitemapResponse } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

/**
 * Sitemap index.
 *
 * Dulu `/sitemap.xml` adalah satu urlset berisi ±1.600 URL, 500 di antaranya
 * halaman profil yang tidak mendatangkan pengunjung. Sekarang dipecah:
 *   /sitemap/main.xml        → halaman statis + semua seri
 *   /sitemap/chapters-N.xml  → chapter, 5.000 per berkas
 */
export async function GET() {
  const entries = await loadChapterEntries();
  const shards = Math.max(1, Math.ceil(entries.length / SHARD_SIZE));
  const base = "https://ryukomik.com";

  const items = [
    `<sitemap><loc>${base}/sitemap/main.xml</loc></sitemap>`,
    ...Array.from({ length: shards }, (_, index) =>
      `<sitemap><loc>${base}/sitemap/chapters-${index}.xml</loc></sitemap>`,
    ),
  ].join("");

  return sitemapResponse(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`,
  );
}
