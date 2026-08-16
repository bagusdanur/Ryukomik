import { unstable_cache } from "next/cache";
import { projectApiFetch } from "@/lib/projectApiServer";

interface BannerItem {
  title: string;
  image: string;
  genre: string;
  type: string;
  status: string;
  chapter: string;
  slug: string;
}

export const BANNER_CACHE_SECONDS = 600;

const getCachedBannerKomiku = unstable_cache(
  async (): Promise<BannerItem[]> => {
    const { data: mangaList } = await projectApiFetch<{ data: Array<{ slug:string; title:string; cover_url?:string; type?:string; status?:string; genres?:string[]; latest_chapter?:number }> }>("/projects/spotlight");
    if (!mangaList || mangaList.length === 0) return [];

    // Get latest chapter for each spotlight manga — RPC DISTINCT ON per manga_slug
    return mangaList.map((item) => ({
      title: item.title,
      image: item.cover_url || "",
      genre: Array.isArray(item.genres) ? item.genres.join(", ") : "",
      type: item.type || "",
      status: item.status || "",
      chapter: item.latest_chapter != null
        ? `Chapter ${item.latest_chapter}`
        : "",
      slug: item.slug,
    }));
  },
  ["home-banner-v1"],
  {
    revalidate: BANNER_CACHE_SECONDS,
    tags: ["home-banner"],
  },
);

export async function getBannerKomiku(): Promise<BannerItem[]> {
  try {
    return await getCachedBannerKomiku();
  } catch (e) {
    console.error("getBannerKomiku error:", e);
    return [];
  }
}
