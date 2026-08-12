"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FollowButton from "@/components/social/FollowButton";

type ProfileResult = { profile: { id: string; followers: number; following: number; collections: number } };

export default function PublicProfileSocialBar({ username }: { username: string }) {
  const [data, setData] = useState<ProfileResult | null>(null);
  useEffect(() => {
    fetch(`/api/social/profile/${encodeURIComponent(username)}`)
      .then((response) => response.ok ? response.json() : null)
      .then(setData).catch(() => undefined);
  }, [username]);
  if (!data) return null;
  return <aside className="rk-card mx-auto -mt-2 mb-5 flex max-w-2xl flex-wrap items-center justify-center gap-5 rounded-2xl px-4 py-3 text-white">
    <span className="text-xs text-white/55"><strong className="text-white">{data.profile.followers}</strong> pengikut</span>
    <span className="text-xs text-white/55"><strong className="text-white">{data.profile.following}</strong> mengikuti</span>
    <span className="text-xs text-white/55"><strong className="text-white">{data.profile.collections}</strong> koleksi</span>
    <FollowButton targetUserId={data.profile.id} />
    <Link href="/feed" className="text-xs font-black text-cyan-200">Buka feed</Link>
  </aside>;
}
