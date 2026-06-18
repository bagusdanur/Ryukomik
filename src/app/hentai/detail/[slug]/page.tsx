import type { Metadata } from "next";
import HentaiDetailClient from "./DetailClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

type HentaiDetail = {
  title?: string;
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
      `https://apiv2.ryukomik.web.id/nekopoi/detail/${slug}`,
      { next: { revalidate: 900 } }
    );
    const json = (await res.json()) as ApiResponse<HentaiDetail>;
    return { title: `${json.data?.title ?? "Hentai"} | RyuKomik` };
  } catch {
    return { title: "RyuKomik" };
  }
}

async function getData(slug: string): Promise<HentaiDetail | null> {
  const res = await fetch(
    `https://apiv2.ryukomik.web.id/nekopoi/detail/${slug}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as ApiResponse<HentaiDetail>;
  return json.success ? json.data : null;
}

export default async function HentaiDetailPage({ params }: RouteProps) {
  const { slug } = await params;
  const data = await getData(slug);
  return <HentaiDetailClient data={data} slug={slug} />;
}
