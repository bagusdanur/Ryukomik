import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiHome } from "react-icons/fi";
import XPublicProfileHeader from "@/components/social/XPublicProfileHeader";
import PublicProfilePosts from "@/components/social/PublicProfilePosts";
import { getPublicProfileByUsernameCached } from "@/lib/profileServerCache";

type RouteProps = {
  params: Promise<{ username: string }>;
};

const SITE_URL = "https://www.ryukomik.my.id";

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername || "").trim();
  const profile = username ? await getPublicProfileByUsernameCached(username) : null;
  const displayName = profile?.username || username || "Profil";
  const description = `Lihat postingan, koleksi, dan aktivitas sosial ${displayName} di Ryukomik.`;

  return {
    title: `${displayName} - Ryukomik Community`,
    description,
    alternates: { canonical: `${SITE_URL}/u/${encodeURIComponent(displayName)}` },
    openGraph: {
      title: `${displayName} - Ryukomik Community`,
      description,
      type: "profile",
      images: profile?.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

export default async function PublicSocialProfilePage({ params }: RouteProps) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername || "").trim();
  if (!username) notFound();

  return (
    <main className="rk-page min-h-dvh px-0 pb-24 pt-14 text-white sm:px-4 sm:pt-20">
      <div className="mx-auto max-w-2xl">
        <div className="sticky top-14 z-30 flex h-14 items-center justify-between border-x border-b border-white/[0.08] bg-[color:color-mix(in_srgb,var(--surface-0)_88%,transparent)] px-3 backdrop-blur-xl sm:top-16 sm:rounded-t-2xl sm:border-t">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/feed"
              aria-label="Kembali ke timeline"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/75 transition hover:bg-white/[0.07] hover:text-white"
            >
              <FiArrowLeft />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black sm:text-base">{username}</h1>
              <p className="text-[10px] text-white/40">Profil komunitas</p>
            </div>
          </div>
          <Link
            href="/feed"
            aria-label="Buka timeline"
            className="grid h-9 w-9 place-items-center rounded-full text-white/55 transition hover:bg-white/[0.07] hover:text-white"
          >
            <FiHome />
          </Link>
        </div>

        <XPublicProfileHeader username={username} />
        <PublicProfilePosts username={username} />
      </div>
    </main>
  );
}
