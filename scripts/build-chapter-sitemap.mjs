#!/usr/bin/env node
/**
 * Bangun snapshot sitemap chapter semua sumber.
 *
 * Kenapa snapshot, bukan dihitung saat request: /sitemap.xml dulu hanya memuat
 * chapter Project. Menambah chapter sumber luar secara live berarti ratusan
 * request ke backend scraper setiap kali Google mengetuk sitemap — lambat dan
 * gampang timeout. Snapshot dibangun oleh script ini (cron), route sitemap
 * tinggal membaca file JSON-nya.
 *
 * Output: .sitemap-cache/chapters.json
 *   { generatedAt, total, entries: [{ url, lastmod }] }
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".sitemap-cache");
const OUT_FILE = path.join(OUT_DIR, "chapters.json");
const SITE = "https://ryukomik.com";

// Sumber publik yang URL-nya kanonik (lihat src/lib/canonicalUrl.ts).
const SOURCES = ["komiku", "komikid", "josei", "luvyaa", "kiryuu", "project"];
const MAX_PAGES = 8;
const MAX_CHAPTERS_PER_SERIES = 4000;
const CONCURRENCY = 6;

async function getJson(url, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function chapterUrl(source, slug) {
  // Project memakai satu segmen ("slug/chapter-N"); sumber luar sama bentuknya
  // setelah normalisasi backend, jadi pola URL-nya identik.
  return `${SITE}/chapter/${source}/${slug}`;
}

function toDate(value) {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function listSeries(source) {
  const slugs = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url =
      source === "project"
        ? `${SITE}/api/project/pustaka?page=${page}`
        : `https://api.ryukomik.com/${source}/pustaka-filter?page=${page}&orderby=modified`;
    const json = await getJson(url);
    const items = Array.isArray(json?.data) ? json.data : [];
    if (!items.length) break;
    for (const item of items) {
      const slug = typeof item?.slug === "string" ? item.slug : "";
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    }
    if (json?.hasMore === false || json?.meta?.hasMore === false) break;
  }
  return slugs;
}

async function chaptersOf(source, slug) {
  const url =
    source === "project"
      ? `${SITE}/api/project/${encodeURIComponent(slug)}`
      : `https://api.ryukomik.com/${source}/detail/${encodeURIComponent(slug)}`;
  const json = await getJson(url, 15_000);
  const data = json?.data ?? json;
  const list = Array.isArray(data?.chapters) ? data.chapters : [];
  const out = [];
  for (const chapter of list.slice(0, MAX_CHAPTERS_PER_SERIES)) {
    const chapterSlug = typeof chapter?.slug === "string" ? chapter.slug : "";
    if (!chapterSlug) continue;
    out.push({
      url: chapterUrl(source, chapterSlug),
      lastmod: toDate(chapter?.uploaded_at || chapter?.date),
    });
  }
  return out;
}

async function pool(items, worker, size) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results.push(...(await worker(items[index])));
      } catch {
        /* satu seri gagal tidak boleh membatalkan sisanya */
      }
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const entries = [];
  const seenUrls = new Set();

  for (const source of SOURCES) {
    const started = Date.now();
    const series = await listSeries(source);
    const collected = await pool(series, (slug) => chaptersOf(source, slug), CONCURRENCY);
    let added = 0;
    for (const entry of collected) {
      if (seenUrls.has(entry.url)) continue;
      seenUrls.add(entry.url);
      entries.push(entry);
      added += 1;
    }
    console.log(`  ${source.padEnd(8)} seri=${String(series.length).padStart(4)} chapter=${String(added).padStart(6)} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }

  // Terbaru dulu: shard pertama paling sering dicrawl Google.
  entries.sort((a, b) => String(b.lastmod || "").localeCompare(String(a.lastmod || "")));

  const payload = {
    generatedAt: new Date().toISOString(),
    total: entries.length,
    entries,
  };
  await fs.writeFile(OUT_FILE, JSON.stringify(payload));
  const size = (await fs.stat(OUT_FILE)).size;
  console.log(`  total chapter: ${entries.length} | ${(size / 1024 / 1024).toFixed(2)} MB -> ${OUT_FILE}`);
}

main().catch((error) => {
  console.error("gagal membangun sitemap:", error);
  process.exit(1);
});
