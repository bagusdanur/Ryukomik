import { notFound } from "next/navigation";
import ChapterClient from "./ChapterClient";
import type { Metadata } from "next";
import type { ReaderChapter } from "@/types/content";

const CHAPTER_JSON_TTL = 60 * 60 * 24 * 7;

export const revalidate = 604800;
export const dynamic = "force-static";

interface ChapterPageProps {
  params: Promise<{
    source: string;
    slug: string[];
  }>;
}

function parseSlug(slug: string | string[]) {
  return Array.isArray(slug) ? slug.join("/") : slug;
}

async function getChapter(source: string, slugStr: string): Promise<ReaderChapter | null> {
  try {
    const res = await fetch(
      `https://api.ryukomik.web.id/${source}/chapter/${slugStr}`,
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
}

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

  return {
    title: `${title} - Ryukomik`,
    description: `${title} gratis dengan kualitas HD. Baca chapter terbaru lengkap bahasa Indonesia hanya di Ryukomik.`,
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { source, slug } = await params;
  const slugStr = parseSlug(slug);
  const data = await getChapter(source, slugStr);

  if (!data) notFound();

  return <ChapterClient data={data} error={undefined} source={source} slugStr={slugStr} />;
}
