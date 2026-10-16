"use client";

/**
 * NobarButton — pintu masuk nobar di halaman episode.
 *
 * Berupa satu bar ringkas yang duduk tepat di bawah judul/navigasi (bukan
 * tersembunyi di dasar halaman). Kalau ada ruang aktif, tampil sebagai "live
 * bar" merah; kalau belum, jadi ajakan mengadakan.
 *
 * Ringan: poll tiap 12 detik dan berhenti total saat tab disembunyikan.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiRadio, FiUsers, FiArrowRight } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch, socialRead } from "@/lib/social/client";

type Room = { id: string; hostName: string; episodeTitle: string | null };

export default function NobarButton({
  slug,
  title,
  animeSlug,
  playerLabel,
  playerUrl,
}: {
  slug: string;
  title?: string;
  animeSlug?: string;
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
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = () =>
      socialRead<{ room: Room | null; memberCount: number }>(`/api/social/nobar?slug=${encodeURIComponent(slug)}`)
        .then((data) => {
          if (!alive) return;
          setRoom(data.room);
          setCount(data.memberCount);
        })
        .catch(() => {})
        .finally(() => alive && setReady(true));

    const start = () => {
      if (timer) return;
      void load();
      timer = setInterval(() => void load(), 12_000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
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
      const result = await socialFetch<{ room: { id: string } }>("/api/social/nobar", {
        method: "POST",
        body: JSON.stringify({ episodeSlug: slug, episodeTitle: title, playerLabel, playerUrl, animeSlug }),
      });
      router.push(`/anime/nobar/${result.room.id}`);
    } catch {
      setBusy(false);
    }
  }

  if (!ready) return null;

  // ── Ada ruang aktif: live bar ──
  if (room) {
    return (
      <button
        onClick={() => router.push(`/anime/nobar/${room.id}`)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-rose-400/25 bg-gradient-to-r from-rose-500/[0.16] to-rose-500/[0.03] px-3.5 py-3 text-left transition active:scale-[0.99] sm:px-4 sm:py-3.5"
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-400/30 bg-rose-500/15">
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          <FiRadio className="text-rose-200" size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-rose-200">Live nobar</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-black text-white">
            {count > 0 ? `${count} orang sedang menonton` : "Ruang sedang dibuka"}
          </span>
          <span className="block truncate text-[10px] font-semibold text-white/40">Host: {room.hostName}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white sm:px-3.5">
          Ikut <FiArrowRight size={13} />
        </span>
      </button>
    );
  }

  // ── Belum ada ruang: ajakan ──
  return (
    <button
      onClick={() => void start()}
      disabled={busy}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.05] active:scale-[0.99] disabled:opacity-60 sm:px-4 sm:py-3.5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
        <FiUsers className="text-white/55" size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-black text-white/90">Nonton bareng</span>
        <span className="block truncate text-[10px] font-semibold text-white/40">
          {busy ? "Membuat ruang..." : "Tonton episode ini bersamaan, plus chat"}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-cyan-100 transition group-hover:bg-cyan-400/20 sm:px-3.5">
        {busy ? "..." : "Mulai"} <FiArrowRight size={13} />
      </span>
    </button>
  );
}
