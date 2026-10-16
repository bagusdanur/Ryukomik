"use client";

/**
 * NobarButton — tombol/badge nobar di halaman episode.
 *
 * Kalau sudah ada ruang aktif untuk episode ini: tampilkan badge jumlah
 * penonton dan tombol "Ikut nobar". Kalau belum: tombol "Mulai nobar"
 * (butuh login untuk jadi host).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiRadio } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch, socialRead } from "@/lib/social/client";

type Room = { id: string };

export default function NobarButton({
  slug,
  title,
  playerLabel,
  playerUrl,
}: {
  slug: string;
  title?: string;
  playerLabel?: string;
  playerUrl?: string;
}) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    socialRead<{ room: Room | null; memberCount: number }>(`/api/social/nobar?slug=${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!alive) return;
        setRoom(data.room);
        setCount(data.memberCount);
      })
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  async function start() {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      const result = await socialFetch<{ room: Room }>("/api/social/nobar", {
        method: "POST",
        body: JSON.stringify({ episodeSlug: slug, episodeTitle: title, playerLabel, playerUrl }),
      });
      router.push(`/anime/nobar/${result.room.id}`);
    } catch {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (room) {
    return (
      <button
        onClick={() => router.push(`/anime/nobar/${room.id}`)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/15 py-3 text-[11px] font-black uppercase tracking-wider text-red-100 transition hover:bg-red-500/25 active:scale-95"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        <FiRadio size={13} />
        {count > 0 ? `${count} orang sedang nobar — ikut!` : "Ruang nobar aktif — ikut!"}
      </button>
    );
  }

  return (
    <button
      onClick={() => void start()}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 py-3 text-[11px] font-black uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-400/20 active:scale-95 disabled:opacity-50"
    >
      <FiRadio size={13} />
      {busy ? "Membuat ruang..." : "Mulai nobar"}
    </button>
  );
}
