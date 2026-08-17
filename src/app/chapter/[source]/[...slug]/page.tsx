import { notFound } from "next/navigation";
import { cache } from "react";
import ChapterClient from "./ChapterClient";
import type { Metadata } from "next";
import type { ReaderChapter } from "@/types/content";

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

// React cache() memastikan generateMetadata + ChapterPage SHARE SATU fetch
// per request — tidak double hit ke DB meskipun force-dynamic aktif
const getChapter = cache(async (source: string, slugStr: string): Promise<ReaderChapter | null> => {
  if (source === "project") {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const parts = slugStr.split("/");
      const mangaSlug = parts[0];
      const chapter = parts.length > 1 ? parts[1] : parts[0]; // fallback
      
      const res = await fetch(`${baseUrl}/api/project/chapter/${mangaSlug}/${chapter}`, {
        next: {
          revalidate: 300,
          tags: [`project-chapter:${mangaSlug}:${chapter}`],
        },
        headers: { Accept: "application/json" }
      });
      
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.success) return null;
      
      return {
        ...json,
        mangaId: json.mangaId || json.series?.slug || "",
        currentChapter: json.currentChapter || json.title || "",
        images: Array.isArray(json.images) ? json.images : [],
      };
    } catch {
      return null;
    }
  }

  const apiSource = source === "kiryuu" ? "komikid" : source;
  try {
    const res = await fetch(
      `https://api.ryukomik.web.id/${apiSource}/chapter/${slugStr}`,
      {
        next: {
          revalidate: CHAPTER_JSON_TTL,
          tags: [`chapter:${source}:${slugStr}`],
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;

    return {
      ...json,
      mangaId: json.mangaId || json.series?.slug || "",
      currentChapter: json.currentChapter || json.title || "",
      images: Array.isArray(json.images) ? json.images : [],
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
  const slugStr = parseSlug(slug);
  const data = await getChapter(source, slugStr);

  const title = buildTitle(data, slugStr);
  const description = `${title} gratis dengan kualitas HD. Baca chapter terbaru lengkap bahasa Indonesia hanya di Ryukomik.`;
  const url = `https://ryukomik.my.id/chapter/${source}/${slugStr}`;
  const images = data?.images?.[0] ? [data.images[0]] : [];

  return {
    title: `${title} - Ryukomik`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} - Ryukomik`,
      description,
      url,
      images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - Ryukomik`,
      description,
      images,
    },
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { source, slug } = await params;
  const slugStr = parseSlug(slug);
  const data = await getChapter(source, slugStr);

  if (!data) notFound();

  const title = buildTitle(data, slugStr);
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "image": data.images?.[0] || "",
    "description": `${title} gratis dengan kualitas HD.`,
    "url": `https://ryukomik.my.id/chapter/${source}/${slugStr}`
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ChapterClient data={data} error={undefined} source={source} slugStr={slugStr} />
    </>
  );
}
