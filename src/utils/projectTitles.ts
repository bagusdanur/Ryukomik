"use client";

const cache = new Map<string, string>();

/**
 * Ambil judul seri asli untuk slug project. Dipakai riwayat & "Lanjut Baca"
 * supaya judul tidak ditebak dari slug (yang berawalan nama tim scanlator).
 */
export async function resolveProjectTitles(slugs: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(slugs.filter((s) => s && !cache.has(s)))].slice(0, 20);
  const out: Record<string, string> = {};
  for (const [slug, title] of cache) if (slugs.includes(slug)) out[slug] = title;
  if (!unique.length) return out;

  try {
    const res = await fetch(`/api/project/title?slugs=${encodeURIComponent(unique.join(","))}`, { cache: "force-cache" });
    if (!res.ok) return out;
    const json = (await res.json()) as { titles?: Record<string, string> };
    for (const [slug, title] of Object.entries(json.titles || {})) {
      cache.set(slug, title);
      out[slug] = title;
    }
  } catch {
    // diamkan: tampilan tetap memakai judul apa adanya
  }
  return out;
}

/** True kalau judul tidak layak dipakai (kosong atau "Chapter 4"). */
export function isBadHistoryTitle(title?: string | null) {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return /^(chapter|ch\.?)\s*[\d.]/.test(t) || t === "untitled";
}
