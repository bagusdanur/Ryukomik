import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { socialQuery } from "@/lib/social/db";
import NobarRoom from "@/components/anime/NobarRoom";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

type AnimeEpisode = {
  title?: string;
  players?: { name?: string; iframe?: string; streamUrl?: string }[];
  [key: string]: unknown;
};

type ApiResponse<T> = { success?: boolean; data?: T };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getEpisode(slug: string): Promise<AnimeEpisode | null> {
  try {
    const res = await fetch(`https://apiv2.ryukomik.web.id/animeid/episode/${encodeURIComponent(slug)}`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<AnimeEpisode>;
    return json.success ? json.data ?? null : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Nobar - Ryukomik" };
  const result = await socialQuery<{ episode_title: string | null }>(
    "select episode_title from nobar_rooms where id=$1",
    [id],
  );
  const title = result.rows[0]?.episode_title?.replace(" Sub Indo", "");
  return {
    title: title ? `Nobar: ${title} - Ryukomik` : "Nobar - Ryukomik",
    robots: { index: false, follow: true },
  };
}

export default async function NobarPage({ params }: RouteProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Ambil ruang langsung dari PostgreSQL VPS (server-side).
  const result = await socialQuery<{ episode_slug: string; episode_title: string | null }>(
    "select episode_slug, episode_title from nobar_rooms where id=$1",
    [id],
  );
  const roomRow = result.rows[0];
  if (!roomRow) notFound();

  const episode = (await getEpisode(roomRow.episode_slug)) || {};

  return (
    <main className="rk-page min-h-screen">
      <NobarRoom
        roomId={id}
        episodeSlug={roomRow.episode_slug}
        episode={{ title: episode.title || roomRow.episode_title || undefined, players: episode.players }}
      />
      <div className="mx-auto max-w-6xl px-4 pb-8 text-center">
        <Link href="/anime" className="text-[11px] font-bold text-white/30 hover:text-cyan-200">
          Jelajahi anime lain →
        </Link>
      </div>
    </main>
  );
}
