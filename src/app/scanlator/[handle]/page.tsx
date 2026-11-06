import type { Metadata } from "next";

import { socialQuery } from "@/lib/social/db";
import ScanlatorPublicProfile from "./ScanlatorPublicProfile";

type GroupRow = {
  handle: string;
  team_name: string;
  bio: string | null;
  avatar_url: string | null;
  owner_avatar_url: string | null;
  status: string;
};

async function getGroup(handle: string): Promise<GroupRow | null> {
  try {
    const { rows } = await socialQuery<GroupRow>(
      `select s.handle, s.team_name, s.bio, s.avatar_url,
              p.avatar_url as owner_avatar_url, s.status
         from scanlator_profiles s
         left join social_profiles p on p.user_id = s.user_id
        where lower(s.handle) = lower($1) and s.status <> 'revoked'
        limit 1`,
      [handle],
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const group = await getGroup(handle);
  if (!group) return { title: "Tim Scanlator tidak ditemukan — Ryukomik" };

  const title = `${group.team_name} (@${group.handle}) — Scanlator`;
  const description = group.bio?.slice(0, 160) || `Karya terjemahan ${group.team_name} di Ryukomik.`;
  const image = group.avatar_url || group.owner_avatar_url || undefined;
  const url = `https://ryukomik.my.id/scanlator/${group.handle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      siteName: "Ryukomik",
      images: image ? [{ url: image, alt: group.team_name }] : undefined,
    },
    twitter: {
      card: image ? "summary" : "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const group = await getGroup(handle);

  const jsonLd = group
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: `https://ryukomik.my.id/scanlator/${group.handle}`,
        mainEntity: {
          "@type": "Organization",
          name: group.team_name,
          alternateName: `@${group.handle}`,
          description: group.bio || undefined,
          logo: group.avatar_url || group.owner_avatar_url || undefined,
          url: `https://ryukomik.my.id/scanlator/${group.handle}`,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON-LD statis dari data server, bukan input mentah pengguna.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ScanlatorPublicProfile handle={handle} />
    </>
  );
}
