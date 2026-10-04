import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import ChapterClient from "./ChapterClient";
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
      
      return {
        title: data.title || `Chapter ${data.chapter_number}`,
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
    const res = await fetch(
      `https://api.ryukomik.web.id/${apiSource}/chapter/${apiSlug}`,
      {
        next: {
          revalidate: CHAPTER_JSON_TTL,
          tags: [`chapter:${source}:${apiSlug}`],
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;

    const mangaId = String(json.mangaId || json.series?.slug || "");
    const qualifyJoseiNavigation = (value: unknown) => {
      if (source !== "josei" || typeof value !== "string" || !value || value.includes("/")) {
        return value;
      }
      return mangaId ? `${mangaId}/${value}` : value;
    };

    return {
      ...json,
      mangaId,
      currentChapter: json.currentChapter || json.title || "",
      images: Array.isArray(json.images) ? json.images : [],
      prev: qualifyJoseiNavigation(json.prev),
      next: qualifyJoseiNavigation(json.next),
    };
  } catch {
    return null;
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
  const images = data?.images?.[0] ? [data.images[0]] : [];

  return {
    title: { absolute: `${title} | Ryukomik` },
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
