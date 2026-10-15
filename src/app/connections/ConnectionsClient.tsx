"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch } from "@/lib/social/client";

type Person = { id: string; username: string; avatar_url?: string | null; bio?: string | null; level?: number; created_at: string };

export default function ConnectionsClient() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("tab") === "following" ? "following" : "followers";
  const viewedUserId = searchParams.get("userId");
  const [mode, setMode] = useState<"followers" | "following">(initialMode);
  const [items, setItems] = useState<Person[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setViewerId(data.session?.user.id ?? null));
  }, []);

  async function load(reset = false, selected = mode) {
    setLoading(true);
    try {
      const result = await socialFetch<{ items: Person[]; nextCursor: string | null }>(`/api/social/connections?mode=${selected}${viewedUserId ? `&userId=${encodeURIComponent(viewedUserId)}` : ""}${!reset && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      const merged = reset ? result.items : [...items, ...result.items];
      setItems(merged);
      setCursor(result.nextCursor);
      void loadFollowStatus(merged);
    }
    finally { setLoading(false); }
  }

  async function loadFollowStatus(list: Person[]) {
    const ids = list.map((person) => person.id).filter(Boolean);
    if (!ids.length) return;
    try {
      const result = await socialFetch<{ following: Record<string, boolean> }>(`/api/social/follow/status?targetUserIds=${encodeURIComponent(ids.join(","))}`);
      setFollowingMap((current) => ({ ...current, ...result.following }));
    } catch { /* status bersifat pelengkap; kegagalan tidak menggagalkan daftar */ }
  }

  useEffect(() => { void load(true, mode); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleFollow(person: Person) {
    const next = !followingMap[person.id];
    setBusyId(person.id);
    setFollowingMap((current) => ({ ...current, [person.id]: next }));
    try {
      await socialFetch("/api/social/follow", { method: next ? "POST" : "DELETE", body: JSON.stringify({ targetUserId: person.id }) });
    } catch {
      setFollowingMap((current) => ({ ...current, [person.id]: !next }));
    } finally { setBusyId(null); }
  }

  async function relation(person: Person, kind: "block" | "mute") { if (!confirm(`${kind === "block" ? "Blokir" : "Bisukan"} @${person.username}?`)) return; await socialFetch("/api/social/relationship", { method: "POST", body: JSON.stringify({ targetUserId: person.id, kind }) }); if (kind === "block") setItems((current) => current.filter((item) => item.id !== person.id)); }

  return <div>
    <div className="mb-4 grid grid-cols-2 rounded-xl border border-white/10 p-1">{(["followers", "following"] as const).map((tab) => <button key={tab} onClick={() => setMode(tab)} className={`rounded-lg py-2 text-sm font-black ${mode === tab ? "bg-[var(--accent)] text-white" : "text-white/45"}`}>{tab === "followers" ? "Pengikut" : "Mengikuti"}</button>)}</div>
    <div className="space-y-2">{items.map((person) => {
      const isSelf = person.id === viewerId;
      const following = Boolean(followingMap[person.id]);
      return <article key={person.id} className="rk-card-soft flex gap-3 rounded-2xl p-3">
        <Link href={`/u/${encodeURIComponent(person.username)}`} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 font-black">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover"/> : person.username[0]?.toUpperCase()}</Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${encodeURIComponent(person.username)}`} className="block truncate font-black hover:text-cyan-200">{person.username}</Link>
          <p className="line-clamp-2 text-xs text-white/45">{person.bio || `Pembaca level ${person.level || 1}`}</p>
          {!isSelf && <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => void toggleFollow(person)}
              disabled={busyId === person.id}
              aria-label={following ? `Berhenti mengikuti @${person.username}` : `Ikuti @${person.username}`}
              className={`rounded-full border px-4 py-1.5 text-[11px] font-black transition disabled:opacity-50 ${following ? "border-white/15 text-white/55 hover:border-red-300/40 hover:text-red-200" : "border-[var(--accent-2)]/40 bg-[var(--accent-2)]/10 text-[var(--accent-2)] hover:bg-[var(--accent-2)]/20"}`}
            >{following ? "Mengikuti" : "Ikuti"}</button>
            <button onClick={() => relation(person, "mute")} className="text-[10px] font-bold text-white/40">Bisukan</button>
            <button onClick={() => relation(person, "block")} className="text-[10px] font-bold text-red-300/70">Blokir</button>
          </div>}
        </div>
      </article>;
    })}</div>
    {!loading && !items.length && <p className="py-12 text-center text-white/40">Belum ada koneksi sosial.</p>}
    {cursor && <button disabled={loading} onClick={() => load()} className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm font-black">{loading ? "Memuat..." : "Muat lagi"}</button>}
  </div>;
}
