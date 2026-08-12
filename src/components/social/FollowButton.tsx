"use client";

import { useState } from "react";
import { socialFetch } from "@/lib/social/client";

export default function FollowButton({ targetUserId, initialFollowing = false }: { targetUserId: string; initialFollowing?: boolean }) {
  const [following, setFollowing] = useState(initialFollowing); const [loading, setLoading] = useState(false);
  async function toggle() {
    if (loading) return; setLoading(true);
    try {
      await socialFetch("/api/social/follow", { method: following ? "DELETE" : "POST", body: JSON.stringify({ targetUserId }) });
      setFollowing(!following);
    } catch (error) { alert(error instanceof Error ? error.message : "Gagal mengikuti user."); }
    finally { setLoading(false); }
  }
  return <button type="button" disabled={loading} onClick={toggle} className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-2 text-sm font-black text-cyan-100 disabled:opacity-50">{loading ? "Memproses..." : following ? "Mengikuti" : "Ikuti"}</button>;
}
