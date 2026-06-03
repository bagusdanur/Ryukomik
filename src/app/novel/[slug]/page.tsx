import type { Metadata } from "next";
import NovelDetailClient from "./NovelDetailClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

type NovelDetail = {
  title?: string;
  [key: string]: unknown;
};

type NovelApiResponse<T> = {
  success?: boolean;
  data?: T;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(
      `https://api.ryukomik.web.id/meionovels/detail/${slug}`,
      { next: { revalidate: 900 } }
    );
    const json = (await res.json()) as NovelApiResponse<NovelDetail>;
    return { title: `${json.data?.title || slug} | Ryukomik` };
  } catch {
    return { title: "Ryukomik" };
  }
}

export default async function NovelDetailPage({ params }: RouteProps) {
  const { slug } = await params;

  let data: NovelDetail | null = null;
  try {
    const res = await fetch(
      `https://api.ryukomik.web.id/meionovels/detail/${slug}`,
      { next: { revalidate: 900 } }
    );
    const json = (await res.json()) as NovelApiResponse<NovelDetail>;
    if (json.success) data = json.data;
  } catch (e) {
    console.error("Novel detail error:", e);
  }

  return <NovelDetailClient data={data} slug={slug} />;
}
