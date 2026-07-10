import { Suspense } from "react";
import SearchClient from "./SearchClient";
import type { Metadata } from "next";
import type { Dict } from "@/types/common";
import type { SearchResultItem, SourceId } from "@/types/content";

const SOURCE_API_BASE_URL = "https://api.ryukomik.web.id";
const PUBLIC_SOURCES: { id: SourceId; label: string }[] = [
  { id: "komiku", label: "Source 1" },
  { id: "kiryuu", label: "Source 2" },
];

type RawSearchItem = Dict & {
  slug?: string;
  detail_link?: string;
  link?: string;
  title?: string;
  image?: string;
};

const getSlugFromItem = (item: RawSearchItem) => {
  if (item.slug) return item.slug;

  const link = item.detail_link || item.link || "";
  const parts = link.split("/").filter(Boolean);
  return parts.at(-1) || parts.at(-2) || "";
};

const normalizeSlug = (slug: string, sourceId: SourceId) => {
  const prefix = `${sourceId}-`;
  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
};

const normalizeResults = (items: RawSearchItem[] | undefined, source: { id: SourceId; label: string }): SearchResultItem[] => {
  return (items || [])
    .map((item) => {
      const slug = normalizeSlug(getSlugFromItem(item), source.id);

      return {
        ...item,
        slug,
        source: source.id,
        sourceLabel: source.label,
      };
    })
    .filter((item) => item.slug);
};

async function fetchSearchResults(q: string): Promise<{ data: SearchResultItem[]; error: boolean }> {
  if (!q) return { data: [], error: false };

  const responses = await Promise.allSettled(
    PUBLIC_SOURCES.map(async (source) => {
      const res = await fetch(
        `${SOURCE_API_BASE_URL}/${source.id}/search?q=${encodeURIComponent(q)}`,
        {
          next: { revalidate: 300 },
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!res.ok) return [];

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return [];

      const json = (await res.json()) as Dict & { success?: boolean; data?: RawSearchItem[] };
      if (json.success === false) return [];

      const items = Array.isArray(json) ? json : json.data;
      return normalizeResults(items, source);
    }),
  );

  const merged = responses
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  const data = Array.from(
    new Map(merged.map((item) => [`${item.source}:${item.slug}`, item])).values(),
  );

  return {
    data,
    error: responses.every((result) => result.status === "rejected"),
  };
}

export const metadata: Metadata = {
  title: "Cari Manga, Manhwa & Manhua - Ryukomik",

  description:
    "Cari manga, manhwa, dan manhua bahasa Indonesia terbaru dan lengkap di Ryukomik.",

  keywords: [
    "search manga",
    "cari komik",
    "manga indo",
    "manhwa indo",
    "manhua indo",
    "ryukomik",
  ],

  alternates: {
    canonical: "https://ryukomik.my.id/search",
  },

  robots: {
    index: false,
    follow: true,
  },

  openGraph: {
    title: "Cari Manga, Manhwa & Manhua - Ryukomik",

    description:
      "Cari manga, manhwa, dan manhua bahasa Indonesia terbaru di Ryukomik.",

    url: "https://ryukomik.my.id/search",

    siteName: "Ryukomik",

    locale: "id_ID",

    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title: "Cari Manga, Manhwa & Manhua - Ryukomik",

    description:
      "Cari manga, manhwa, dan manhua bahasa Indonesia terbaru di Ryukomik.",
  },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function Page({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params?.q || "";
  const initialSearch = await fetchSearchResults(q);

  return (
    <Suspense fallback={<div className="text-white p-4">Loading...</div>}>
      <SearchClient
        initialQuery={q}
        initialData={initialSearch.data}
        initialError={initialSearch.error}
      />
    </Suspense>
  );
}
