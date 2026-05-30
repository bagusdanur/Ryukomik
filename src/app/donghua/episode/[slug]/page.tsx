import type { Metadata } from "next";
import DonghuaEpisodeClient from "./EpisodeClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

type DonghuaEpisode = {
  episodeTitle?: string;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(
      `https://api.ryukomik.my.id/anichin/episode/${slug}`,
      { next: { revalidate: 900 } }
    );
    const json = (await res.json()) as ApiResponse<DonghuaEpisode>;
    const title = json.data?.episodeTitle?.replace(" Subtitle Indonesia", "");
    return { title: `${title} | RyuKomik` };
  } catch {
    return { title: "RyuKomik" };
  }
}

async function getData(slug: string): Promise<DonghuaEpisode | null> {
  const res = await fetch(
    `https://api.ryukomik.my.id/anichin/episode/${slug}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as ApiResponse<DonghuaEpisode>;
  return json.success ? json.data : null;
}

export default async function DonghuaEpisodePage({ params }: RouteProps) {
  const { slug } = await params;

  const data = await getData(slug);
  return <DonghuaEpisodeClient data={data} />;
}
