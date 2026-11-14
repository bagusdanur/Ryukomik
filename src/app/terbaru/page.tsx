// app/terbaru/page.jsx

import TerbaruClient from "./TerbaruClient";
import { DEFAULT_SOURCE } from "@/config/sources";
import { ADULT_ENABLED } from "@/config/siteMode";
import type { Metadata } from "next";
import type { Dict } from "@/types/common";
import type { FilterOption, TerbaruFilters, UpdateItem } from "@/types/content";

const SOURCE_API_BASE_URL = "https://api.ryukomik.com";

/** Genre yang tidak boleh muncul sebagai chip filter di situs bersih. */
const ADULT_GENRE_VALUES = new Set(["hentai", "lolicon", "shotacon"]);

function stripAdultGenres(filters: TerbaruFilters): TerbaruFilters {
  const keep = (options?: FilterOption[]) =>
    Array.isArray(options) ? options.filter((option) => !ADULT_GENRE_VALUES.has(String(option.value || "").toLowerCase())) : options;
  return { ...filters, genre: keep(filters.genre), genre2: keep(filters.genre2) };
}
// Sumber awal mengikuti slot 1 (default sumber aktif di src/config/sources.ts).
const INITIAL_SOURCE = DEFAULT_SOURCE;

export const revalidate = 600;

async function fetchJson(path: string, revalidate: number): Promise<Dict | null> {
  try {
    const res = await fetch(`${SOURCE_API_BASE_URL}/${path}`, {
      next: { revalidate },
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;

    return res.json();
  } catch (e) {
    console.error("Terbaru initial fetch error:", e);
    return null;
  }
}

export const metadata: Metadata = {
  title: { absolute: "Update Manga, Manhwa & Manhua Bahasa Indonesia | Ryukomik" },
  
  description:
    "Baca update manga, manhwa, dan manhua terbaru bahasa Indonesia gratis dan lengkap hanya di Ryukomik.",

  keywords: [
    "komik terbaru",
    "manga terbaru",
    "manhwa terbaru",
    "manhua terbaru",
    "baca manga indo",
    "ryukomik",
  ],

  alternates: {
    canonical: "https://ryukomik.com/terbaru",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    title: "Komik Terbaru Bahasa Indonesia - Ryukomik",

    description:
      "Update manga, manhwa, dan manhua terbaru bahasa Indonesia setiap hari di Ryukomik.",

    url: "https://ryukomik.com/terbaru",

    siteName: "Ryukomik",

    locale: "id_ID",

    type: "website",

    images: [
      {
        url: "https://ryukomik.com/og.jpg",
        width: 1200,
        height: 630,
        alt: "Ryukomik",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Komik Terbaru Bahasa Indonesia - Ryukomik",

    description:
      "Baca manga, manhwa, dan manhua terbaru bahasa Indonesia gratis di Ryukomik.",

    images: ["https://ryukomik.com/og.jpg"],
  },
};

export default async function Page() {
  const [initialListJson, initialFiltersJson] = await Promise.all([
    fetchJson(`${INITIAL_SOURCE}/pustaka?page=1`, 600),
    fetchJson("komiku/filters", 86400),
  ]);

  // Mode SFW: buang chip genre dewasa dari filter, walau isinya 0 seri —
  // memperlihatkan chip "Hentai" di situs bersih itu tidak konsisten.
  const rawFilters = (initialFiltersJson?.data as TerbaruFilters) || null;
  const initialFilters = rawFilters && !ADULT_ENABLED ? stripAdultGenres(rawFilters) : rawFilters;

  return (
    <TerbaruClient
      initialData={(initialListJson?.data as UpdateItem[]) || []}
      initialFilters={initialFilters || null}
      initialSource={INITIAL_SOURCE}
    />
  );
}
