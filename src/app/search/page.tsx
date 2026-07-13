import { Suspense } from "react";
import SearchClient from "./SearchClient";
import type { Metadata } from "next";

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

  return (
    <Suspense fallback={<div className="text-white p-4">Loading...</div>}>
      <SearchClient
        initialQuery={q}
        initialData={[]}
        initialError={false}
      />
    </Suspense>
  );
}
