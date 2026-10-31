import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import ChapterClient from "./ChapterClient";
import { markChapterSeen } from "@/lib/social/readGuard";
import ProjectChapterGate from "./ProjectChapterGate";
import type { Metadata } from "next";
import type { ReaderChapter } from "@/types/content";
import { projectApiFetch, ProjectApiError } from "@/lib/projectApiServer";
import { evaluateChapterAccess, type ChapterLock } from "@/lib/chapterAccessPolicy";
import {
  buildChapterUrl,
  buildComicUrl,
  normalizeChapterSlug,
  normalizeSource,
} from "@/lib/canonicalUrl";

const CHAPTER_JSON_TTL = 60 * 60 * 24 * 7;

export const revalidate = 604800;
export const dynamic = "force-dynamic";

interface ChapterPageProps {
  params: Promise<{
    source: string;
    slug: string[];
  }>;
}

function parseSlug(slug: string | string[]) {
  return Array.isArray(slug) ? slug.join("/") : slug;
}

async function resolveLegacyKiryuuSlug(slugStr: string): Promise<string> {
  if (slugStr.includes("/")) return slugStr;
  const match = slugStr.match(/^(.*)-chapter-([\d.]+)$/i);
  if (!match) return slugStr;

  const [, mangaSlug, chapterNumber] = match;
  try {
    const response = await fetch(
      `https://api.ryukomik.web.id/kiryuu/detail/${encodeURIComponent(mangaSlug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) return slugStr;
    const json = await response.json() as {
      data?: { chapters?: Array<{ title?: string; slug?: string }> };
    };
    const wanted = `chapter ${chapterNumber}`.toLowerCase();
    const chapter = json.data?.chapters?.find(
      (item) => item.title?.trim().toLowerCase() === wanted,
    );
    return chapter?.slug || slugStr;
  } catch {
    return slugStr;
  }
}

// React cache() memastikan generateMetadata + ChapterPage SHARE SATU fetch
// per request — tidak double hit ke DB meskipun force-dynamic aktif
// [NONAKTIF — fitur riwayat "Lanjut Baca" dimatikan sementara] Ambil cover dari
// endpoint detail backend (cached). Nyalakan lagi bersama HistoryStrip bila perlu.
async function getSeriesThumbnail(_source: string, _mangaId: string): Promise<string | undefined> {
  return undefined;
}

/** Judul seri project (bukan judul chapter). Dicache 1 jam; API internal. */
const getProjectTitle = cache(async (slug: string): Promise<string | null> => {
  try {
    const json = await projectApiFetch<{ data?: { title?: string } }>(
      `/projects/${encodeURIComponent(slug)}`,
      { next: { revalidate: 3600 } } as RequestInit,
    );
    return json.data?.title?.trim() || null;
  } catch {
    return null;
  }
});

const prettySlug = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const getChapter = cache(async (source: string, slugStr: string): Promise<ReaderChapter | null> => {
  if (source === "project") {
    try {
      const parts = slugStr.split("/");
      const mangaSlug = parts[0];
      const chapter = parts.length > 1 ? parts[1] : parts[0]; // fallback
      
      const number = chapter.match(/^(?:chapter-)?(\d+(?:\.\d+)?)$/i)?.[1];
      if (!number) return null;
      const json = await projectApiFetch<{ data?: ChapterLock & { chapter_number: number; title?: string; image_urls?: string[]; prev?: string; next?: string } }>(`/projects/${encodeURIComponent(mangaSlug)}/chapters/${encodeURIComponent(number)}`, {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      
      if (!json.data || !Object.hasOwn(json.data, 'premium_lock_until')) throw new Error('Metadata akses chapter tidak tersedia.');
      const data = json.data;
      // Server-render as an anonymous visitor; the client gate verifies the session.
      const access = evaluateChapterAccess(data, null);
      // Riwayat menyimpan `title`; untuk project itu harus JUDUL SERI, bukan
      // judul chapter ("Chapter 4"). Judul chapter tetap ada di currentChapter.
      const seriesTitle = (await getProjectTitle(mangaSlug)) || prettySlug(mangaSlug);
      
      return {
        title: seriesTitle,
        mangaId: mangaSlug,
        currentChapter: `Chapter ${data.chapter_number}`,
        prev: data.prev, next: data.next,
        locked: !access.allowed, lockUntil: access.lockUntil,
        accessRequirement: access.locked ? 'premium' : null,
        images: access.allowed && Array.isArray(data.image_urls) ? data.image_urls : [],
      };
    } catch (error) {
      if (error instanceof ProjectApiError && error.status === 404) return null;
      throw error;
    }
  }

  const apiSource = source;
  const apiSlug = source === "kiryuu"
    ? await resolveLegacyKiryuuSlug(slugStr)
    : slugStr;
  try {
    // Backend sesekali 5xx/timeout. Dulu itu langsung dianggap 404 → Google
    // melihat chapter "hilang" padahal cuma gangguan sesaat. Sekarang:
    // 404 → null (memang tidak ada), gangguan → dicoba sekali lagi lalu
    // dilempar sebagai error 500 supaya bisa dicoba ulang.
    let json: {
      success?: boolean;
      mangaId?: unknown;
      series?: { slug?: unknown };
      images?: unknown;
      thumbnail?: unknown;
      currentChapter?: unknown;
      title?: unknown;
      source_broken?: unknown;
      source_status?: unknown;
      prev?: unknown;
      next?: unknown;
    } | null = null;
    let lastError: unknown = new Error("Chapter fetch gagal");
    for (let attempt = 0; attempt < 2 && !json; attempt += 1) {
      try {
        // v=3: kunci cache baru. Entri lama berisi URL gambar 127.0.0.1 hasil
        // fallback pertama; versi ini memakai domain API publik. Naikkan versi
        // setiap kali BENTUK respons backend berubah.
        const res = await fetch(
          `https://api.ryukomik.web.id/${apiSource}/chapter/${apiSlug}?v=3`,
          {
            next: {
              revalidate: CHAPTER_JSON_TTL,
              tags: [`chapter:${source}:${apiSlug}`],
            },
          },
        );
        if (res.status === 404) return null;
        if (res.ok) {
          const body = (await res.json()) as NonNullable<typeof json> & { message?: string };
          if (!body.success) {
            // Sumber memblokir scraper (Cloudflare 403) bukan berarti chapter
            // dihapus. Jangan jadi 404 — tampilkan halaman gangguan sementara.
            lastError = new Error(`SUMBER_BLOKIR: ${body.message || "gagal"}`);
            continue;
          }
          json = body;
          break;
        }
        lastError = new Error(`Backend chapter ${res.status}`);
      } catch (error) {
        lastError = error;
      }
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 350));
    }
    if (!json) throw lastError;

    const mangaId = String(json.mangaId || json.series?.slug || "");
    const qualifyJoseiNavigation = (value: unknown) => {
      if (source !== "josei" || typeof value !== "string" || !value || value.includes("/")) {
        return value;
      }
      return mangaId ? `${mangaId}/${value}` : value;
    };

    const thumbnail = await getSeriesThumbnail(apiSource, mangaId || apiSlug);
    return {
      ...json,
      title: String(json.title || ""),
      mangaId,
      thumbnail,
      currentChapter: String(json.currentChapter || json.title || ""),
      images: Array.isArray(json.images) ? json.images : [],
      // Ditandai backend ketika gambar pertama chapter sudah 403 di CDN sumber.
      sourceBroken: json.source_broken === true,
      sourceStatus: typeof json.source_status === "number" ? json.source_status : 0,
      prev: qualifyJoseiNavigation(json.prev) as string | undefined,
      next: qualifyJoseiNavigation(json.next) as string | undefined,
    };
  } catch (error) {
    // Gangguan backend/sumber bukan "chapter tidak ada": biarkan error boundary
    // yang menangani agar crawler tidak menandai halaman ini 404.
    if (error instanceof Error && error.message.startsWith("SUMBER_BLOKIR")) {
      // Jangan 404/500: halaman chapter yang sudah ada tetap bisa dibuka dan
      // pengguna melihat pesan "sumber sedang diblokir" dengan tombol coba lagi.
      return {
        title: prettySlug(slugStr),
        mangaId: slugStr.replace(/-chapter-[\d.]+$/i, ""),
        currentChapter: "",
        images: [],
        blocked: true,
      };
    }
    throw error;
  }
});

function buildTitle(data: ReaderChapter | null, slugStr: string) {
  const mangaTitle = data?.mangaId
    ?.replace(/-/g, " ")
    ?.replace(/\b\w/g, (c) => c.toUpperCase());

  const chapter = data?.currentChapter ?? "";

  // Kiryuu: currentChapter sudah lengkap → "Baca Record of Lodoss War Chapter 2 Bahasa Indonesia"
  // Komiku: currentChapter cuma "Chapter 22" → gabung dengan mangaId
  const isShortChapter = /^chapter\s+[\d.]+$/i.test(chapter.trim());

  if (mangaTitle && chapter) {
    return isShortChapter
      ? `Baca ${mangaTitle} ${chapter} Bahasa Indonesia` // komiku
      : `${chapter}`;              // kiryuu
  }

  // Fallback jika fetch gagal
  return slugStr.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { source, slug } = await params;
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) return { robots: { index: false, follow: false } };
  const normalizedSlug = normalizeChapterSlug(canonicalSource, parseSlug(slug));
  const slugStr = canonicalSource === "kiryuu"
    ? await resolveLegacyKiryuuSlug(normalizedSlug)
    : normalizedSlug;
  const data = await getChapter(canonicalSource, slugStr);

  const title = buildTitle(data, slugStr);
  const description = `Baca ${title} bahasa Indonesia dengan navigasi chapter lengkap dan kualitas gambar yang nyaman dibaca di Ryukomik.`;
  const url = buildChapterUrl(canonicalSource, slugStr);
  // og:image selalu ada; chapter yang gambar-nya belum termuat/kosong tetap
  // dapat card dengan icon site.
  const images = [data?.images?.[0] || "/icon.png"];

  return {
    title: { absolute: `${title} | Ryukomik` },
    // Chapter yang sumbernya diblokir jangan diindeks sebagai halaman kosong.
    ...(data?.blocked ? { robots: { index: false, follow: true } } : {}),
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | Ryukomik`,
      description,
      url,
      images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Ryukomik`,
      description,
      images,
    },
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { source, slug } = await params;
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) notFound();
  const incomingSlug = parseSlug(slug);
  const normalizedSlug = normalizeChapterSlug(canonicalSource, incomingSlug);
  const slugStr = canonicalSource === "kiryuu"
    ? await resolveLegacyKiryuuSlug(normalizedSlug)
    : normalizedSlug;

  if (canonicalSource !== source || slugStr !== incomingSlug) {
    permanentRedirect(`/chapter/${canonicalSource}/${slugStr}`);
  }

  const data = await getChapter(canonicalSource, slugStr);

  if (!data) notFound();

  if (data.blocked) {
    return (
      <div className="rk-page flex min-h-[60vh] items-center justify-center px-4 text-white">
        <div className="rk-card w-full max-w-md rounded-2xl p-6 text-center">
          <h1 className="text-lg font-black">Sumber komik sedang diblokir</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Server sumber menolak permintaan sementara, jadi chapter ini belum bisa dimuat.
            Chapter-nya belum tentu hilang — coba lagi beberapa saat.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <a
              href={`/chapter/${canonicalSource}/${slugStr}`}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-black transition hover:bg-cyan-400"
            >
              Coba lagi
            </a>
            <Link
              href={buildComicUrl(canonicalSource, String(data.mangaId || ""))}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:text-white"
            >
              Halaman komik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Catat chapter yang benar-benar dirender: /api/xp/read hanya menerima slug
  // yang ada di sini, jadi slug karangan tidak bisa menambah XP/maraton.
  void markChapterSeen(slugStr, canonicalSource);

  const title = buildTitle(data, slugStr);
  const canonicalUrl = buildChapterUrl(canonicalSource, slugStr);
  const mangaSlug = String(data.mangaId || slugStr.split("/")[0]);
  const comicUrl = buildComicUrl(canonicalSource, mangaSlug);
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ComicStory",
    "name": title,
    "image": data.images?.[0] || "",
    "description": `${title} gratis dengan kualitas HD.`,
    "url": canonicalUrl,
    "isPartOf": {
      "@type": "ComicSeries",
      "name": mangaSlug.replace(/-/g, " "),
      "url": comicUrl
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Beranda", "item": "https://ryukomik.my.id" },
              { "@type": "ListItem", "position": 2, "name": mangaSlug.replace(/-/g, " "), "item": comicUrl },
              { "@type": "ListItem", "position": 3, "name": title, "item": canonicalUrl }
            ]
          }),
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true"> / </span>
        <Link href={comicUrl.replace("https://ryukomik.my.id", "")}>{mangaSlug.replace(/-/g, " ")}</Link>
        <span aria-hidden="true"> / </span>
        <span>{title}</span>
      </nav>
      {canonicalSource === "project" ? (
        <ProjectChapterGate initialData={data} source={canonicalSource} slugStr={slugStr} />
      ) : (
        <ChapterClient data={data} error={undefined} source={canonicalSource} slugStr={slugStr} />
      )}
    </>
  );
}
