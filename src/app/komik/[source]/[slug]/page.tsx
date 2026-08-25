import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import DetailClient from "./DetailClient";
import type { Metadata } from "next";
import type { Dict } from "@/types/common";
import type { Chapter, Series } from "@/types/content";
import {
  buildComicUrl,
  normalizeComicSlug,
  normalizeSource,
} from "@/lib/canonicalUrl";

export const revalidate = 3600;
export const dynamic = "force-static";

interface DetailPageProps {
  params: Promise<{
    source: string;
    slug: string;
  }>;
}

interface ComicDetail extends Series {
  thumbnail: string;
  title: string;
  author?: string;
  Pengarang?: string;
  Konsep?: string;
  chapters: Chapter[];
}

const normalizeDetail = (json: Dict): ComicDetail | null => {
  const detail = (json.data ?? (json.success ? json : null)) as Dict | null;
  if (!detail) return null;

  return {
    ...detail,
    title: String(detail.title || ""),
    thumbnail: String(detail.thumbnail || detail.image || ""),
    type: String(detail.type || detail.type_genre || detail.series || ""),
    author: String(detail.author || detail.Pengarang || ""),
    status: detail.status ? String(detail.status) : undefined,
    genres: Array.isArray(detail.genres) ? detail.genres.map(String) : [],
    chapters: Array.isArray(detail.chapters) ? (detail.chapters as Chapter[]) : [],
  } as ComicDetail;
};

const getDetail = async (source: string, slug: string): Promise<ComicDetail | null> => {
  if (source === "project") {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/project/${encodeURIComponent(slug)}`, {
        next: {
          revalidate: 3600,
          tags: [`project-detail:${slug}`],
        },
        headers: { Accept: "application/json" }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return normalizeDetail(json);
    } catch {
      return null;
    }
  }

  const apiSource = source;
  const endpoint = `https://api.ryukomik.web.id/${apiSource}/detail/${encodeURIComponent(slug)}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(endpoint, {
        next: { revalidate: 3600 },
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) continue;

      const json = (await res.json()) as Dict;
      const detail = normalizeDetail(json);
      if (detail) {
        if (source === "josei") {
          detail.chapters = detail.chapters.map((chapter) => ({
            ...chapter,
            slug:
              chapter.slug && !chapter.slug.includes("/")
                ? `${slug}/${chapter.slug}`
                : chapter.slug,
          }));
        }
        return detail;
      }
    } catch {
      continue;
    }
  }

  return null;
};

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug, source } = await params;
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) return { robots: { index: false, follow: false } };
  const cleanSlug = normalizeComicSlug(canonicalSource, slug);
  const data = await getDetail(canonicalSource, cleanSlug);

  const title = data?.title ?? cleanSlug.replace(/-/g, " ");
  const type = data?.type ?? "Komik";
  const status = data?.status ?? "";
  const genres = data?.genres?.join(", ") ?? "";
  const details = [type, status, genres ? `genre ${genres}` : ""].filter(Boolean).join(", ");
  const description = `Baca ${title} bahasa Indonesia. Temukan sinopsis, daftar chapter terbaru${details ? `, dan informasi ${details}` : ""} di Ryukomik.`;
  const url = buildComicUrl(canonicalSource, cleanSlug);
  const images = data?.thumbnail ? [data.thumbnail] : [];

  return {
    title: { absolute: `${title} Bahasa Indonesia – Chapter Terbaru | Ryukomik` },
    description,
    keywords: `${title}, baca ${title}, ${title} sub indo, ${title} bahasa indonesia, baca komik online, ${genres}`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} Bahasa Indonesia – Chapter Terbaru | Ryukomik`,
      description,
      url,
      images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} Bahasa Indonesia – Chapter Terbaru | Ryukomik`,
      description,
      images,
    },
  };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug, source } = await params;
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) notFound();
  const cleanSlug = normalizeComicSlug(canonicalSource, slug);

  if (canonicalSource !== source || cleanSlug !== slug) {
    permanentRedirect(`/komik/${canonicalSource}/${cleanSlug}`);
  }

  const data = await getDetail(canonicalSource, cleanSlug);
  if (!data) notFound();
  const canonicalUrl = buildComicUrl(canonicalSource, cleanSlug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    "name": data?.title || cleanSlug.replace(/-/g, " "),
    "image": data?.thumbnail || "",
    "description": data ? `Baca ${data.title} bahasa Indonesia gratis.` : "",
    "author": {
      "@type": "Person",
      "name": data?.author || "Unknown"
    },
    "genre": data?.genres || [],
    "url": canonicalUrl
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
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Beranda",
                "item": "https://ryukomik.my.id"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": data?.title || "Komik",
                "item": canonicalUrl
              }
            ]
          })
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true"> / </span>
        <span>{data.title}</span>
      </nav>
      <DetailClient data={data} slug={cleanSlug} source={canonicalSource} />
    </>
  );
}
