import { GENRES } from "@/data/genres";
import GenreClient from "./GenreClient";
import type { Metadata } from "next";

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
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `Komik Genre ${title} Bahasa Indonesia - Ryukomik`,
    description: `Daftar komik dengan genre ${title} bahasa Indonesia terpopuler dan terlengkap gratis di Ryukomik.`,
  };
}

export default async function Page({ params }: GenrePageProps) {
  const { slug } = await params;

  const title = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  let initialData: GenreResponse | null = null;

  try {
    const res = await fetch(`https://api.ryukomik.web.id/genre/${slug}?page=1`, {
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
