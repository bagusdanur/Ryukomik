import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DetailClient from "./DetailClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

type AnimeDetail = {
  title?: string;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

async function getDetail(slug: string): Promise<AnimeDetail | null> {
  try {
    const res = await fetch(
      `https://api.ryukomik.my.id/animeid/detail/${slug}`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<AnimeDetail>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getDetail(slug);

  const title = data?.title
    ?.replace("Nonton ", "")
    ?.replace(" Sub Indo", "");

  return {
    title: title ? `${title} Sub Indo - Ryukomik` : "Ryukomik",
    description: title
      ? `Nonton ${title} sub indo gratis. Streaming anime bahasa Indonesia lengkap dan update terbaru hanya di Ryukomik.`
      : "Nonton anime sub indo gratis di Ryukomik.",
  };
}

export default async function AnimeDetailPage({ params }: RouteProps) {
  const { slug } = await params;
  const data = await getDetail(slug);

  if (!data) notFound();

  return <DetailClient data={data} slug={slug} />;
}
