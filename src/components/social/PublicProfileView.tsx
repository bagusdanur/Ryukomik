"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import XPublicProfileHeader from "@/components/social/XPublicProfileHeader";
import PublicProfilePosts from "@/components/social/PublicProfilePosts";
import PublicProfileSections from "@/components/social/PublicProfileSections";
import ScanlatorGroupCard from "@/components/social/ScanlatorGroupCard";
import { getSession } from "@/lib/auth/getSession";

export type ProfileTab = "posts" | "collections" | "activity";

/**
 * Kontainer halaman profil publik: memegang state tab aktif.
 * Tab Postingan/Koleksi/Aktivitas di header benar-benar berganti
 * konten (bukan anchor ke section menumpuk).
 */
export default function PublicProfileView({ username }: { username: string }) {
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSession().then(({ data }) => {
      if (active) setViewerId(data.session?.user.id ?? null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <>
      <XPublicProfileHeader username={username} activeTab={tab} onTabChange={setTab} />
      <ScanlatorGroupCard username={username} />
      {tab === "posts" && <PublicProfilePosts username={username} />}
      {tab === "collections" && <PublicProfileSections username={username} section="collections" />}
      {tab === "activity" && <PublicProfileSections username={username} section="activity" viewerId={viewerId} />}
    </>
  );
}
