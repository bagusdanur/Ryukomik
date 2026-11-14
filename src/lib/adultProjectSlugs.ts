import "server-only";

import { unstable_cache } from "next/cache";

import { projectApiFetch } from "@/lib/projectApiServer";

type ProjectRow = { slug?: string; is_adult?: boolean };

/**
 * Daftar slug seri Project bertanda 18+.
 *
 * Dipakai untuk menyaring permukaan yang tidak lewat `/api/project/*` — misalnya
 * komentar terbaru di beranda, yang menyimpan slug sendiri di tabel `comments`.
 * Di-cache 5 menit supaya tidak menambah request ke Project API tiap render.
 */
export const getAdultProjectSlugs = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const result = await projectApiFetch<{ data?: ProjectRow[] }>("/projects?page=1&limit=200", { cache: "no-store" });
      return (result?.data ?? [])
        .filter((row) => row?.is_adult === true && typeof row.slug === "string")
        .map((row) => String(row.slug));
    } catch {
      // Gagal baca katalog jangan sampai memblokir beranda.
      return [];
    }
  },
  ["adult-project-slugs-v1"],
  { revalidate: 300, tags: ["adult-project-slugs"] },
);
