import type { Metadata } from "next";
import DetailClient from "./DetailClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

type DonghuaDetail = {
  title?: string;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params; // ✅ wajib juga di sini

  try {
    const res = await fetch(
      `https://apiv2.ryukomik.web.id/anichin/detail/${slug}`,
      { next: { revalidate: 900 } }
    );
    const json = (await res.json()) as ApiResponse<DonghuaDetail>;
    const title = json.data?.title
      ?.replace("Nonton ", "")
      .replace(" Sub Indo", "");
    return { title: `${title} | RyuKomik` };
  } catch {
    return { title: "RyuKomik" };
  }
}

async function getData(slug: string): Promise<DonghuaDetail | null> {
  const res = await fetch(
    `https://apiv2.ryukomik.web.id/anichin/detail/${slug}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as ApiResponse<DonghuaDetail>;
  return json.success ? json.data : null;
}

export default async function AnimeDetailPage({ params }: RouteProps) {
  const { slug } = await params; // ✅ unwrap dulu

  const data = await getData(slug);
  return <DetailClient data={data} slug={slug} />;
}
