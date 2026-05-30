// app/terbaru/page.jsx

import TerbaruClient from "./TerbaruClient";
import type { Metadata } from "next";
import type { Dict } from "@/types/common";
import type { TerbaruFilters, UpdateItem } from "@/types/content";

const SOURCE_API_BASE_URL = "https://mgkomik-backend-three.vercel.app";
const INITIAL_SOURCE = "kiryuu";

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
  title: "Komik Terbaru Bahasa Indonesia - Ryukomik",
  
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
    canonical: "https://ryukomik.my.id/terbaru",
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

    url: "https://ryukomik.my.id/terbaru",

    siteName: "Ryukomik",

    locale: "id_ID",

    type: "website",

    images: [
      {
        url: "https://ryukomik.my.id/og.jpg",
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

    images: ["https://ryukomik.my.id/og.jpg"],
  },
};

export default async function Page() {
  const [initialListJson, initialFiltersJson] = await Promise.all([
    fetchJson(`${INITIAL_SOURCE}/pustaka?page=1`, 600),
    fetchJson("komiku/filters", 86400),
  ]);

  return (
    <TerbaruClient
      initialData={(initialListJson?.data as UpdateItem[]) || []}
      initialFilters={(initialFiltersJson?.data as TerbaruFilters) || null}
      initialSource={INITIAL_SOURCE}
    />
  );
}
