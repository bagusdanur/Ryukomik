import type { Metadata } from "next";
import NovelReaderClient from "./NovelReaderClient";

export const revalidate = 900;
export const dynamic = "force-static";

type RouteProps = {
  params: Promise<{ slug: string[] }>;
};

type NovelChapterResponse = {
  success?: boolean;
  [key: string]: unknown;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const slugStr = Array.isArray(slug) ? slug.join("/") : slug;
  return { title: `${slugStr?.replace(/-/g, " ")} | Ryukomik` };
}

export default async function NovelReaderPage({ params }: RouteProps) {
  const { slug } = await params;
  const slugStr = Array.isArray(slug) ? slug.join("/") : slug;

  let data: NovelChapterResponse | null = null;
  try {
    const res = await fetch(
      `https://api.ryukomik.web.id/meionovels/chapter/${slugStr}`,
      { next: { revalidate: 900 } }
    );
    const json = (await res.json()) as NovelChapterResponse;
    if (json.success) data = json;
  } catch (e) {
    console.error("Novel chapter error:", e);
  }

  return <NovelReaderClient data={data} slugStr={slugStr} />;
}
