import type { Metadata } from "next";
import EpisodeClient from "./EpisodeClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

type HentaiEpisode = {
  title?: string;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params; // ✅ unwrap

  try {
    const res = await fetch(
      `https://apiv2.ryukomik.web.id/nekopoi/episode/${slug}`,
      { next: { revalidate: 900 } }
    );
    const json = (await res.json()) as ApiResponse<HentaiEpisode>;
    const title = json.data?.title?.replace(" Sub Indo", "");
    return { title: `${title} | RyuKomik` };
  } catch {
    return { title: "RyuKomik" };
  }
}
async function getData(slug: string): Promise<HentaiEpisode | null> {
  const res = await fetch(
    `https://apiv2.ryukomik.web.id/nekopoi/episode/${slug}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as ApiResponse<HentaiEpisode>;

export default async function EpisodePage({ params }: RouteProps) {
  const { slug } = await params; // ✅ unwrap

  const data = await getData(slug);
  return <EpisodeClient data={data} />;
}
