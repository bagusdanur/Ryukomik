import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EpisodeClient from "./EpisodeClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

type AnimeEpisode = {
  title?: string;
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

export default async function EpisodePage({ params }: RouteProps) {
  const { slug } = await params;
  const data = await getEpisode(slug);

  if (!data) notFound();

  return <EpisodeClient data={data} />;
}
