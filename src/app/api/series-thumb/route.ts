import { NextResponse } from "next/server";
import { getSourceConfig } from "@/config/sources";
import { getProjectCover, getSeriesMeta } from "@/lib/seriesMeta";

/**
 * Thumbnail + chapter terbaru + tanggal update untuk kartu riwayat/koleksi.
 * Semua fetch detail backend di-cache 1 jam di `lib/seriesMeta`, jadi endpoint
 * ini tetap murah walau dipanggil berkali-kali dari klien.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get("source") || "";
    const slug = (url.searchParams.get("slug") || "").slice(0, 300);
    const config = getSourceConfig(source);
    // Sumber wajib terdaftar (anti abuse/SSRF).
    if (!config || !slug) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const meta =
      config.group === "project"
        ? { thumbnail: await getProjectCover(slug), latestChapter: null, latestChapterAt: null }
        : await getSeriesMeta(source, slug);

    const response = NextResponse.json(meta);
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "gagal" },
      { status: 500 },
    );
  }
}
