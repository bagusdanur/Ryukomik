// app/lib/komiku.js
import type { Dict } from "@/types/common";
import { CONTENT_API_URL, fetchContentJson } from "@/lib/contentApi";

type KomikuListItem = {
  link: string;
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

export async function getTerbaru(): Promise<KomikuListItem[]> {
  try {
    const json = await fetchContentJson<unknown>(
      `${CONTENT_API_URL}/komiku/terbaru`,
      { revalidate: 600 },
    );

    if (Array.isArray(json)) return toKomikuList(json);
    const data = json as Dict;
    if (Array.isArray(data.data)) return toKomikuList(data.data);
    const found = Object.values(data).find((v) => Array.isArray(v));
    return toKomikuList(found);
  } catch (e) {
    console.error("getTerbaru error:", e);
    return [];
  }
}

export async function getHomeKomiku(): Promise<KomikuHomeData> {
  try {
    const json = await fetchContentJson<unknown>(
      `${CONTENT_API_URL}/komiku/home`,
      { revalidate: 600 },
    );

    const d = ((json as Dict).data || {}) as Dict;

    return {
      manga: toKomikuList(d.populer_manga),
      manhwa: toKomikuList(d.populer_manhwa),
      manhua: toKomikuList(d.populer_manhua),
    };
  } catch (e) {
    console.error("getHomeKomiku error:", e);
    return { manga: [], manhwa: [], manhua: [] };
  }
}
