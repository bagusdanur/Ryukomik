import { redirect } from "next/navigation";
import DetailClient from "./DetailClient";
import type { Metadata } from "next";
import type { Dict } from "@/types/common";
import type { Chapter, Series } from "@/types/content";

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

const normalizeSlug = (slug = "", source = "") => {
  const prefix = `${source}-`;

  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
};

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
  const endpoint = `https://api.ryukomik.web.id/${source}/detail/${encodeURIComponent(slug)}`;

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
      if (detail) return detail;
    } catch {
      continue;
    }
  }

  return null;
};

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug, source } = await params;
  const cleanSlug = normalizeSlug(slug, source);
  const data = await getDetail(source, cleanSlug);

  const title = data?.title ?? cleanSlug.replace(/-/g, " ");
  const type = data?.type ?? "Komik";
  const status = data?.status ?? "";
  const genres = data?.genres?.join(", ") ?? "";
  const description = `Baca ${title} bahasa Indonesia gratis. ${type} ${status} genre ${genres}. Update chapter terbaru hanya di Ryukomik.`;
  const url = `https://ryukomik.my.id/komik/${source}/${cleanSlug}`;
  const images = data?.thumbnail ? [data.thumbnail] : [];

  return {
    title: `Baca ${title} Bahasa Indonesia - Ryukomik`,
    description,
    keywords: `${title}, baca ${title}, ${title} sub indo, ${title} bahasa indonesia, baca komik online, ${genres}`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `Baca ${title} Bahasa Indonesia`,
      description,
      url,
      images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `Baca ${title} Bahasa Indonesia`,
      description,
      images,
    },
  };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug, source } = await params;
  const cleanSlug = normalizeSlug(slug, source);

  if (cleanSlug !== slug) {
    redirect(`/komik/${source}/${cleanSlug}`);
  }

  const data = await getDetail(source, cleanSlug);

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
    "url": `https://ryukomik.my.id/komik/${source}/${cleanSlug}`
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DetailClient data={data} slug={cleanSlug} source={source} />
    </>
  );
}
