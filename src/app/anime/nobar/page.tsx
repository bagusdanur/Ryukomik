import type { Metadata } from "next";
import Link from "next/link";
import { socialQuery } from "@/lib/social/db";
import NobarRoomList, { type NobarListRoom } from "@/components/anime/NobarRoomList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nobar Anime - Ryukomik",
  description:
    "Nonton bareng anime sub indo bersama penonton lain. Lihat semua ruang nobar yang sedang aktif di Ryukomik.",
};

const ACTIVE_ROOM = `
  select r.id, r.episode_slug, r.episode_title, r.anime_slug, r.anime_title, r.thumbnail,
         r.host_name, r.player_label, r.is_playing, r.position_seconds, r.created_at,
         (select count(*) from nobar_members m where m.room_id=r.id)::int as member_count
    from nobar_rooms r
   where r.ended_at is null
     and exists (
       select 1 from nobar_members m
        where m.room_id=r.id and m.last_seen > now() - interval '90 seconds'
     )
   order by r.created_at desc
   limit 60`;

export default async function NobarIndexPage() {
  const { rows } = await socialQuery<NobarListRoom>(ACTIVE_ROOM);

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <header className="mb-5 flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
        </span>
        <div>
          <h1 className="text-lg font-black leading-none text-white">Nobar Anime</h1>
          <p className="mt-1 text-[11px] font-semibold text-white/40">
            Nonton bareng yang sedang aktif sekarang
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center">
          <p className="text-sm font-bold text-white/70">Belum ada nobar aktif</p>
          <p className="mt-1.5 text-[11px] font-semibold text-white/35">
            Buka episode anime mana pun lalu tekan tombol <span className="text-rose-200">Nobar</span> untuk
            mulai nonton bareng.
          </p>
          <Link
            href="/anime/terbaru"
            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-rose-500 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white active:scale-95"
          >
            Cari anime
          </Link>
        </div>
      ) : (
        <NobarRoomList rooms={rows} />
      )}
    </div>
  );
}
