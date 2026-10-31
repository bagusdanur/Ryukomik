// app/lib/komiku.js
import type { Dict } from "@/types/common";
import { CONTENT_API_URL, fetchContentJson } from "@/lib/contentApi";

type KomikuListItem = {
  link: string;
  slug?: string;
  source?: string;
  image?: string;
  title?: string;
  type?: string;
  up?: string;
  chapter_terbaru?: string;
  waktu?: string;
  genre?: string;
};

type KomikuHomeData = {
  manga: KomikuListItem[];
  manhwa: KomikuListItem[];
  manhua: KomikuListItem[];
};

const isKomikuListItem = (value: unknown): value is KomikuListItem => {
  return typeof value === "object" && value !== null && "link" in value;
};

const toKomikuList = (value: unknown): KomikuListItem[] => {
  return Array.isArray(value) ? value.filter(isKomikuListItem) : [];
};

/**
 * Update terbaru dari Komikid (slot 1).
 *
 * Komiku sedang diblokir Cloudflare, jadi feed beranda memakai Komikid lebih
 * dulu. Bentuk data /komikid/pustaka dipetakan ke bentuk yang dipakai kartu
 * UpdateList (link, slug, chapter_terbaru, waktu).
 */
async function getTerbaruKomikid(): Promise<KomikuListItem[]> {
  const json = await fetchContentJson<{ data?: Array<Record<string, unknown>> }>(
    `${CONTENT_API_URL}/komikid/pustaka?page=1`,
    { revalidate: 60, timeoutMs: 27_000 },
  );
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows
    .map((row) => {
      const slug = String(row.slug ?? "").trim();
      if (!slug) return null;
      return {
        link: `${slug}/`,
        slug,
        source: "komikid",
        title: typeof row.title === "string" ? row.title : undefined,
        image: typeof row.image === "string" ? row.image : undefined,
        chapter_terbaru:
          typeof row.chapter_terbaru === "string" ? row.chapter_terbaru : undefined,
        waktu: typeof row.info === "string" ? row.info : undefined,
        type: typeof row.type === "string" ? row.type : undefined,
      } satisfies KomikuListItem;
    })
    .filter((item) => item !== null) as KomikuListItem[];
}

export async function getTerbaru(): Promise<KomikuListItem[]> {
  try {
    const komikid = await getTerbaruKomikid();
    if (komikid.length) return komikid;
  } catch (error) {
    console.error("getTerbaru komikid error:", error);
  }

  try {
    const json = await fetchContentJson<unknown>(
      `${CONTENT_API_URL}/komiku/terbaru`,
      { revalidate: 60, timeoutMs: 27_000 },
    );

    if (Array.isArray(json)) {
      const items = toKomikuList(json);
      if (items.length) return items;
    }
    const data = json as Dict;
    if (Array.isArray(data.data)) {
      const items = toKomikuList(data.data);
      if (items.length) return items;
    }
    const found = Object.values(data).find((v) => Array.isArray(v));
    const items = toKomikuList(found);
    if (!items.length) throw new Error("Content API returned an empty latest update list");
    return items;
  } catch (e) {
    console.error("getTerbaru error:", e);
    return [];
  }
}

export async function getHomeKomiku(): Promise<KomikuHomeData> {
  try {
    const json = await fetchContentJson<unknown>(
      `${CONTENT_API_URL}/komiku/home`,
      { revalidate: 300, timeoutMs: 27_000 },
    );

    const d = ((json as Dict).data || {}) as Dict;

    const result = {
      manga: toKomikuList(d.populer_manga),
      manhwa: toKomikuList(d.populer_manhwa),
      manhua: toKomikuList(d.populer_manhua),
    };
    if (!result.manga.length && !result.manhwa.length && !result.manhua.length) {
      throw new Error("Content API returned empty popular lists");
    }
    return result;
  } catch (e) {
    console.error("getHomeKomiku error:", e);
    return { manga: [], manhwa: [], manhua: [] };
  }
}
