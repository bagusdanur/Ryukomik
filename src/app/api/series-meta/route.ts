import { NextResponse } from "next/server";
import { getProjectMeta, getSeriesMeta } from "@/lib/seriesMeta";
import { getSourceConfig } from "@/config/sources";

/**
 * Metadata update untuk BANYAK seri sekaligus.
 *
 * Dipakai halaman Favorit: sebelumnya klien memanggil /api/series-thumb satu
 * per satu (dibatasi 18 per kunjungan), sehingga sebagian besar favorit belum
 * punya tanggal update dan urutannya jatuh kembali ke "favorit terbaru".
 * Endpoint ini mengembalikan tanggal update semua favorit dalam satu request,
 * dengan concurrency dibatasi supaya scraper tidak dibanjiri.
 */
export const revalidate = 300;

const MAX_ITEMS = 120;
const CONCURRENCY = 6;

function parseItems(raw: string | null) {
  if (!raw) return [] as { source: string; slug: string; key: string }[];
  const seen = new Set<string>();
  const items: { source: string; slug: string; key: string }[] = [];
  for (const entry of raw.split(",")) {
    const [source, ...rest] = entry.split(":");
    const slug = rest.join(":").trim();
    if (!source || !slug) continue;
    if (!getSourceConfig(source)) continue;
    const key = `${source}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ source, slug, key });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

export async function GET(request: Request) {
  const items = parseItems(new URL(request.url).searchParams.get("items"));
  if (!items.length) {
    return NextResponse.json({ items: {} }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const result: Record<string, { at: string | null; chapter: number | null }> = {};

  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try {
        const meta =
          getSourceConfig(item.source)?.group === "project"
            ? await getProjectMeta(item.slug)
            : await getSeriesMeta(item.source, item.slug);
        result[item.key] = { at: meta.latestChapterAt, chapter: meta.latestChapter };
      } catch {
        // biarkan kosong; klien akan menaruhnya di urutan bawah
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));

  return NextResponse.json(
    { items: result },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
  );
}
