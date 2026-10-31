import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EpisodeClient from "./EpisodeClient";
import AnimeComments from "@/components/anime/AnimeComments";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ s?: string; t?: string }>;
};

type AnimeEpisode = {
  title?: string;
  thumbnail?: string;
  allEpisode?: string;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

async function getEpisode(slug: string): Promise<AnimeEpisode | null> {
  try {
    const res = await fetch(
      `https://apiv2.ryukomik.web.id/animeid/episode/${encodeURIComponent(slug)}`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<AnimeEpisode>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

async function getAnimeThumbnail(animeSlug?: string): Promise<string | null> {
  if (!animeSlug) return null;
  try {
    const res = await fetch(
      `https://apiv2.ryukomik.web.id/animeid/detail/${encodeURIComponent(animeSlug)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<{ thumbnail?: string }>;
    return json.data?.thumbnail || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEpisode(slug);

  const title = data?.title?.replace(" Sub Indo", "");

  return {
    title: title ? `${title} Sub Indo - Ryukomik` : "Ryukomik",
    description: title
      ? `Nonton ${title} sub indo gratis. Streaming anime bahasa Indonesia lengkap dan update terbaru hanya di Ryukomik.`
      : "Nonton anime sub indo gratis di Ryukomik.",
  };
}

export default async function EpisodePage({ params, searchParams }: RouteProps) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const data = await getEpisode(slug);

  if (!data) notFound();

  const thumbnail = await getAnimeThumbnail(
    typeof data.allEpisode === "string" ? data.allEpisode : undefined
  );

  return (
    <EpisodeClient
      data={data}
      slug={slug}
      thumbnail={thumbnail}
      seriesSlug={
        typeof sp.s === "string" && sp.s.trim()
          ? sp.s.slice(0, 200)
          : typeof data.allEpisode === "string" && data.allEpisode.trim()
            ? data.allEpisode.slice(0, 200)
            : null
      }
      seriesTitle={typeof sp.t === "string" ? sp.t.slice(0, 200) : null}
    />
  );
}
