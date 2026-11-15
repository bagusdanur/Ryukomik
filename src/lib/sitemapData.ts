import { promises as fs } from "node:fs";
import path from "node:path";
import { buildCanonicalUrl } from "@/lib/canonicalUrl";
import { socialQuery } from "@/lib/social/db";

export const dynamic = "force-dynamic";

/**
 * Sumber data semua sitemap. Chapter dari sumber luar disimpan sebagai snapshot
 * (dibangun `scripts/build-chapter-sitemap.mjs` lewat cron), karena menghitung
 * 30 ribu chapter dari backend scraper saat request pasti timeout.
 *
 * Satu file dibaca sekali lalu ditahan di memori 10 menit — 3,6 MB JSON dibaca
 * ulang tiap ketukan Googlebot akan membuang I/O percuma.
 */
export const SHARD_SIZE = 5000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_FILE = path.join(process.cwd(), ".sitemap-cache", "chapters.json");

export type ChapterEntry = { url: string; lastmod?: string | null };
type CacheFile = { generatedAt?: string; total?: number; entries?: ChapterEntry[] };

let cached: { at: number; entries: ChapterEntry[] } | null = null;

export async function loadChapterEntries(): Promise<ChapterEntry[]> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.entries;
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as CacheFile;
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    cached = { at: Date.now(), entries };
    return entries;
  } catch {
    // Snapshot belum dibangun / rusak: sitemap tetap harus membalas XML valid.
    return [];
  }
}

/**
 * Slug seri diturunkan dari URL chapter, supaya tidak perlu request tambahan.
 *
 * Dua bentuk URL chapter hidup berdampingan:
 *   /chapter/kiryuu/<seri>/chapter-92.8      → seri di segmen pertama
 *   /chapter/komiku/<seri>-chapter-42        → seri + penanda chapter menempel
 * Bentuk kedua WAJIB dipotong, kalau tidak setiap chapter jadi "seri" palsu
 * (pernah menghasilkan 29 ribu URL /komik pada satu sitemap).
 */
export function seriesFromChapters(entries: ChapterEntry[], source: string): string[] {
  const prefix = `/chapter/${source}/`;
  const seen = new Set<string>();
  for (const entry of entries) {
    const path = entry.url.replace("https://ryukomik.com", "");
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    const first = rest.split("/")[0] || "";
    const series = first.replace(/-chapter-.*$/i, "");
    if (series) seen.add(series);
  }
  return [...seen];
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function urlsetXml(entries: { url: string; lastmod?: string | null; changefreq?: string; priority?: number }[]): string {
  const body = entries
    .map((entry) => {
      const parts = [`<loc>${xmlEscape(entry.url)}</loc>`];
      if (entry.lastmod) parts.push(`<lastmod>${xmlEscape(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) parts.push(`<changefreq>${entry.changefreq}</changefreq>`);
      if (typeof entry.priority === "number") parts.push(`<priority>${entry.priority}</priority>`);
      return `<url>${parts.join("")}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function sitemapResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}

/** Halaman statis + direktori. Dipakai shard `main`. */
export async function mainRoutes(): Promise<{ url: string; lastmod?: string | null; changefreq?: string; priority?: number }[]> {
  const routes = [
    { url: buildCanonicalUrl("/"), changefreq: "daily", priority: 1 },
    { url: buildCanonicalUrl("/list-komik"), changefreq: "daily", priority: 0.9 },
    { url: buildCanonicalUrl("/terbaru"), changefreq: "hourly", priority: 0.9 },
    { url: buildCanonicalUrl("/marathon"), changefreq: "daily", priority: 0.7 },
    { url: buildCanonicalUrl("/leaderboard"), changefreq: "daily", priority: 0.6 },
    { url: buildCanonicalUrl("/border"), changefreq: "weekly", priority: 0.5 },
    { url: buildCanonicalUrl("/scanlator/direktori"), changefreq: "weekly", priority: 0.6 },
    { url: buildCanonicalUrl("/info/domain-baru"), changefreq: "weekly", priority: 0.5 },
    { url: buildCanonicalUrl("/dmca"), changefreq: "monthly", priority: 0.3 },
  ];

  try {
    const { rows } = await socialQuery<{ handle: string }>(
      `select handle from scanlator_profiles where status <> 'revoked' order by updated_at desc nulls last limit 500`,
    );
    for (const row of rows) {
      routes.push({ url: buildCanonicalUrl(`/scanlator/${encodeURIComponent(row.handle)}`), changefreq: "weekly", priority: 0.6 });
    }
  } catch {
    /* direktori scanlator opsional */
  }

  return routes;
}
