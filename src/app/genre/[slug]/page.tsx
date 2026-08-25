import { GENRES } from "@/data/genres";
import GenreClient from "./GenreClient";
import type { Metadata } from "next";
import { buildCanonicalUrl } from "@/lib/canonicalUrl";
import { permanentRedirect } from "next/navigation";

export const revalidate = 1800;
export const dynamic = "force-static";

export async function generateStaticParams() {
  return GENRES.map((g) => ({
    slug: g.toLowerCase().replace(/\s+/g, "-"),
  }));
}

interface GenreResultItem {
  title: string;
  description: string;
  link: string;
  image: string;
  typeGenre: string;
  chapterStart: string;
  chapterLast: string;
}

interface GenreResponse {
  genre: string;
  page: number | string;
  total?: number;
  results: GenreResultItem[];
}

interface GenrePageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: { absolute: `Baca Komik Genre ${title} Bahasa Indonesia${page > 1 ? ` Halaman ${page}` : ""} | Ryukomik` },
    description: `Daftar komik dengan genre ${title} bahasa Indonesia terpopuler dan terlengkap gratis di Ryukomik.`,
    alternates: { canonical: buildCanonicalUrl(`/genre/${slug}`, { page: page > 1 ? page : undefined }) },
  };
}

export default async function Page({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const rawPage = (await searchParams).page;
  const page = Math.max(1, Number(rawPage) || 1);
  if (rawPage === "1") permanentRedirect(`/genre/${slug}`);

  const title = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  let initialData: GenreResponse | null = null;

  try {
    const res = await fetch(`https://api.ryukomik.web.id/genre/${slug}?page=${page}`, {
      next: { revalidate: 1800 },
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      initialData = await res.json();
    }
  } catch (e) {
    console.error("Fetch initial genre page error:", e);
  }

  return <GenreClient initialData={initialData} slug={slug} title={title} />;
}
