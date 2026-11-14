import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import DetailClient from "./DetailClient";
import type { Metadata } from "next";
import type { Dict } from "@/types/common";
import type { Chapter, Series } from "@/types/content";
import { projectApiFetch, ProjectApiError } from "@/lib/projectApiServer";
import { formatRelativeDate } from "@/lib/projectUpdates";
import { jsonLdScript } from "@/lib/jsonLd";
import {
  buildComicUrl,
  normalizeComicSlug,
  normalizeSource,
} from "@/lib/canonicalUrl";

export const revalidate = 300;
export const dynamic = "force-static";

interface DetailPageProps {
  params: Promise<{
    source: string;
    slug: string;
  }>;
}

interface ComicDetail extends Series {
  thumbnail: string;
  title: string;
  author?: string;
  scanlator_handle?: string;
  scanlator_team?: string;
  scanlator_donate?: Array<{ label: string; url: string }> | null;
  scanlator_user?: { username: string; user_id: string } | null;
  scanlator_avatar?: string | null;
  Pengarang?: string;
  Konsep?: string;
  chapters: Chapter[];
}

const normalizeDetail = (json: Dict): ComicDetail | null => {
  const detail = (json.data ?? (json.success ? json : null)) as Dict | null;
  if (!detail) return null;

  return {
    ...detail,
    title: String(detail.title || ""),
    thumbnail: String(detail.thumbnail || detail.image || ""),
    type: String(detail.type || detail.type_genre || detail.series || ""),
    author: String(detail.author || detail.Pengarang || ""),
    status: detail.status ? String(detail.status) : undefined,
    genres: Array.isArray(detail.genres) ? detail.genres.map(String) : [],
    chapters: Array.isArray(detail.chapters) ? (detail.chapters as Chapter[]) : [],
  } as ComicDetail;
};

const getDetail = async (source: string, slug: string): Promise<ComicDetail | null> => {
  if (source === "project") {
    try {
      const json = await projectApiFetch<{ data?: Dict }>(`/projects/${encodeURIComponent(slug)}`, {
        next: {
          revalidate: 15,
          tags: [`project-detail:${slug}`],
        },
        headers: { Accept: "application/json" }
      });
      if (!json.data) return null;
      const detail = json.data;
      let scanlatorDonate: Array<{ label: string; url: string }> | null = null;
      let scanlatorUser: { username: string; user_id: string } | null = null;
      let scanlatorAvatar: string | null = null;
      const scanHandle = typeof detail.scanlator_handle === "string" ? detail.scanlator_handle : "";
      if (scanHandle) {
        try {
          const { socialQuery } = await import("@/lib/social/db");
          const { rows } = await socialQuery<{
            support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
            avatar_url: string | null; user_id: string;
          }>("select support_dana, support_trakteer, support_tako, support_url_lain, avatar_url, user_id::text as user_id from scanlator_profiles where handle = $1 limit 1", [scanHandle]);
          const row = rows[0];
          if (row) {
            scanlatorDonate = [
              { label: "DANA / GoPay", url: row.support_dana || "" },
              { label: "Trakteer", url: row.support_trakteer || "" },
              { label: "Tako", url: row.support_tako || "" },
              { label: "Donate lain", url: row.support_url_lain || "" },
            ].filter((d) => d.url);
            // Nama user yang mengunggah (untuk atribusi & tautan profil publik).
            const prof = await socialQuery<{ username: string }>(
              "select username from social_profiles where user_id = $1 limit 1",
              [row.user_id],
            );
            if (prof.rows[0]?.username) {
              scanlatorUser = { username: prof.rows[0].username, user_id: row.user_id };
            }
            if (row.avatar_url) {
              scanlatorAvatar = row.avatar_url;
            } else {
              const ownerAvatar = await socialQuery<{ avatar_url: string | null }>(
                "select avatar_url from social_profiles where user_id = $1 limit 1",
                [row.user_id],
              );
              scanlatorAvatar = ownerAvatar.rows[0]?.avatar_url || null;
            }
          }
        } catch {
          scanlatorDonate = null;
        }
      }
      return normalizeDetail({ data: {
        ...detail,
        thumbnail: detail.thumbnail || detail.cover_url,
        scanlator_donate: scanlatorDonate,
        scanlator_user: scanlatorUser,
        scanlator_avatar: scanlatorAvatar,
        synopsis: detail.synopsis || detail.description,
        chapters: Array.isArray(detail.chapters) ? detail.chapters.map((chapter: Dict) => ({
          ...chapter,
          slug: `${slug}/chapter-${chapter.chapter_number}`,
          title: chapter.title || `Chapter ${chapter.chapter_number}`,
          date: formatRelativeDate(typeof chapter.uploaded_at === 'string' ? chapter.uploaded_at : undefined),
          premium_lock_until: chapter.premium_lock_until || null,
        })) : [],
      } });
    } catch (error) {
      if (error instanceof ProjectApiError && error.status === 404) return null;
      throw error;
    }
  }

  const apiSource = source;
  const endpoint = `https://api.ryukomik.com/${apiSource}/detail/${encodeURIComponent(slug)}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(endpoint, {
        next: { revalidate: 300 },
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) continue;

      const json = (await res.json()) as Dict;
      const detail = normalizeDetail(json);
      if (detail) {
        if (source === "josei") {
          detail.chapters = detail.chapters.map((chapter) => ({
            ...chapter,
            slug:
              chapter.slug && !chapter.slug.includes("/")
                ? `${slug}/${chapter.slug}`
                : chapter.slug,
          }));
        }
        return detail;
      }
    } catch {
      continue;
    }
  }

  return null;
};

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug, source } = await params;
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) return { robots: { index: false, follow: false } };
  const cleanSlug = normalizeComicSlug(canonicalSource, slug);
  const data = await getDetail(canonicalSource, cleanSlug);

  const title = data?.title ?? cleanSlug.replace(/-/g, " ");
  const type = data?.type ?? "Komik";
  const status = data?.status ?? "";
  const genres = data?.genres?.join(", ") ?? "";
  const details = [type, status, genres ? `genre ${genres}` : ""].filter(Boolean).join(", ");
  const description = `Baca ${title} bahasa Indonesia. Temukan sinopsis, daftar chapter terbaru${details ? `, dan informasi ${details}` : ""} di Ryukomik.`;
  const url = buildComicUrl(canonicalSource, cleanSlug);
  // og:image wajib selalu ada — tanpa gambar, share ke Telegram/WA/Discord
  // jadi card polos. Kalau thumbnail kosong (API sumber gagal), pakai icon site.
  const images = [data?.thumbnail || "/icon.png"];

  return {
    title: { absolute: `${title} Bahasa Indonesia – Chapter Terbaru | Ryukomik` },
    description,
    keywords: `${title}, baca ${title}, ${title} sub indo, ${title} bahasa indonesia, baca komik online, ${genres}`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} Bahasa Indonesia – Chapter Terbaru | Ryukomik`,
      description,
      url,
      images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} Bahasa Indonesia – Chapter Terbaru | Ryukomik`,
      description,
      images,
    },
  };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug, source } = await params;
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) notFound();
  const cleanSlug = normalizeComicSlug(canonicalSource, slug);

  if (canonicalSource !== source || cleanSlug !== slug) {
    permanentRedirect(`/komik/${canonicalSource}/${cleanSlug}`);
  }

  const data = await getDetail(canonicalSource, cleanSlug);
  if (!data) notFound();
  const canonicalUrl = buildComicUrl(canonicalSource, cleanSlug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    "name": data?.title || cleanSlug.replace(/-/g, " "),
    "image": data?.thumbnail || "",
    "description": data ? `Baca ${data.title} bahasa Indonesia gratis.` : "",
    "author": {
      "@type": "Person",
      "name": data?.author || "Unknown"
    },
    "genre": data?.genres || [],
    "url": canonicalUrl
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Beranda",
                "item": "https://ryukomik.com"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": data?.title || "Komik",
                "item": canonicalUrl
              }
            ]
          })
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link href="/">Beranda</Link>
        <span aria-hidden="true"> / </span>
        <span>{data.title}</span>
      </nav>
      <DetailClient data={data} slug={cleanSlug} source={canonicalSource} />
    </>
  );
}
