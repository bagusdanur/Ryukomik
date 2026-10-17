"use client";

/**
 * NobarRoom — ruang nonton bareng.
 *
 * Realtime = polling delta 2,5 detik, berhenti total saat tab disembunyikan.
 * Data dari PostgreSQL VPS; Supabase hanya untuk auth (verifikasi JWT lokal).
 * Sinkronisasi video hanya jalan bila server diputar lewat <video> kita
 * (Ryu-lokal); server iframe lain otomatis mode chat saja.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Send, Copy, Check, X, Users, MessageCircle, Radio } from "lucide-react";
import AnimePlayer, { type AnimePlayerSyncState } from "@/components/anime/AnimePlayer";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch, socialRead } from "@/lib/social/client";
import { relativeTime } from "@/lib/social/relativeTime";
import { NOBAR_EMOJIS, NOBAR_POLL_MS } from "@/lib/social/nobarShared";
import { playerDisplayName } from "@/lib/anime/playerName";
import { thumbUrl } from "@/lib/anime/thumb";

type Player = { name?: string; iframe?: string; streamUrl?: string };
type Member = { userId: string; name: string; avatarUrl: string | null; isHost: boolean };
type Message = { id: string; userId: string; name: string; body: string; createdAt: string; seq: number };
type Reaction = { emoji: string; count: number };
type Room = {
  id: string;
  episodeSlug: string;
  episodeTitle: string | null;
  animeTitle?: string | null;
  thumbnail?: string | null;
  hostId: string;
  hostName: string;
  playerLabel: string | null;
  playerUrl: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  playbackUpdatedAt: string;
  endedAt: string | null;
};

type Poll = {
  room: Room;
  members: Member[];
  reactions: Reaction[];
  messages: Message[];
  viewerId: string | null;
  serverNow: string;
};

const POLL_MS = NOBAR_POLL_MS;

export default function NobarRoom({
  roomId,
  episode,
  episodeSlug,
}: {
  roomId: string;
  episode: { title?: string; players?: Player[] };
  episodeSlug: string;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"chat" | "members">("chat");
  const [syncCapable, setSyncCapable] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  // Titik acuan sinkron: posisi video (detik) pada saat data diterima, plus jam
  // KLIEN saat itu. AnimePlayer menambah (Date.now() - atClientMs) sendiri.
  const [syncPoint, setSyncPoint] = useState<{ basePosition: number; atClientMs: number } | null>(null);
  // Menandai host baru memilih server: AnimePlayer akan langsung memutar.
  const [hostAutoPlay, setHostAutoPlay] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHost = Boolean(room && viewerId && room.hostId === viewerId);

  const players = useMemo(
    () => (episode.players || []).filter((p) => p.iframe || p.streamUrl),
    [episode.players],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  const applyPoll = useCallback((data: Poll) => {
    setRoom(data.room);
    setMembers(data.members);
    setReactions(data.reactions);
    setViewerId(data.viewerId);

    // Posisi host "saat respons server dibuat":
    //   base = positionSeconds + (serverNow - playbackUpdatedAt) bila diputar.
    // Keduanya jam SERVER, jadi selisihnya konsisten. Lalu dicatat pada jam
    // KLIEN (receivedAtRef) supaya AnimePlayer bisa menambah waktu berjalan
    // sendiri tanpa membandingkan dua jam yang berbeda.
    const serverNowMs = new Date(data.serverNow).getTime();
    const updatedMs = new Date(data.room.playbackUpdatedAt).getTime();
    if (Number.isFinite(serverNowMs) && Number.isFinite(updatedMs)) {
      const elapsed = data.room.isPlaying ? Math.max(0, (serverNowMs - updatedMs) / 1000) : 0;
      setSyncPoint({ basePosition: data.room.positionSeconds + elapsed, atClientMs: Date.now() });
    }

    if (data.messages.length) {
      setMessages((current) => {
        const seen = new Set(current.map((m) => m.id));
        const fresh = data.messages.filter((m) => !seen.has(m.id));
        const next = [...current, ...fresh];
        const last = next.at(-1);
        if (last) cursorRef.current = String(last.seq);
        return next;
      });
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const query = cursorRef.current ? `?since=${encodeURIComponent(cursorRef.current)}` : "";
      const data = await socialRead<Poll>(`/api/social/nobar/${roomId}${query}`);
      applyPoll(data);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Gagal memuat ruang.");
    }
  }, [roomId, applyPoll]);

  // Polling: 2,5s saat tab aktif; saat tab disembunyikan TETAP jalan tapi jauh
  // lebih lambat (20s). Kalau berhenti total, heartbeat hilang dan ruang akan
  // dianggap nganggur lalu ditutup otomatis padahal host masih ada (cuma pindah
  // tab). Saat tab kembali aktif, poll SEKARANG supaya tidak menunggu interval.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = (interval: number) => {
      if (timer) clearInterval(timer);
      void poll();
      timer = setInterval(() => void poll(), interval);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        start(POLL_MS);
      } else {
        start(20_000);
      }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, tab]);

  // Titik acuan sinkron untuk AnimePlayer (sudah dihitung di applyPoll).
  const syncState: AnimePlayerSyncState | null =
    room && syncPoint
      ? {
          isPlaying: room.isPlaying,
          basePosition: syncPoint.basePosition,
          atClientMs: syncPoint.atClientMs,
        }
      : null;

  const patchRoom = useCallback(
    async (body: Record<string, unknown>) => {
      await socialFetch(`/api/social/nobar/${roomId}`, { method: "PATCH", body: JSON.stringify(body) });
    },
    [roomId],
  );

  const onHostState = useCallback(
    (state: { isPlaying: boolean; positionSeconds: number }) => {
      void patchRoom({ isPlaying: state.isPlaying, positionSeconds: state.positionSeconds }).catch(() => {});
    },
    [patchRoom],
  );

  const sync = useMemo(
    () => ({
      role: (isHost ? "host" : "viewer") as "host" | "viewer",
      state: syncState,
      // Host auto-mulai setelah memilih server (ala "go live"), supaya tidak
      // perlu tekan play manual lagi.
      autoPlay: isHost && hostAutoPlay,
      onHostState,
      onCapable: setSyncCapable,
    }),
    [isHost, syncState, onHostState, hostAutoPlay],
  );

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await socialFetch(`/api/social/nobar/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDraft("");
      await poll();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Gagal mengirim pesan.");
    } finally {
      setBusy(false);
    }
  }

  async function react(emoji: string) {
    if (!signedIn) return;
    try {
      await socialFetch(`/api/social/nobar/${roomId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      await poll();
    } catch {
      /* diabaikan */
    }
  }

  async function pickPlayer(player: Player) {
    // Nama server diseragamkan dengan halaman episode ("Ryu-lokal 480p").
    const label = playerDisplayName(player);
    // Host memilih server -> langsung putar (tanpa tekan play manual).
    setHostAutoPlay(true);
    await patchRoom({ playerUrl: player.iframe || player.streamUrl || "", playerLabel: label }).catch(() => {});
    await poll();
  }

  async function closeRoom() {
    if (!confirm("Tutup ruang nobar ini untuk semua orang?")) return;
    await socialFetch(`/api/social/nobar/${roomId}`, { method: "DELETE" }).catch(() => {});
    await poll();
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  const ended = Boolean(room?.endedAt);

  return (
    <div className="mx-auto max-w-6xl px-3 pb-24 pt-5 text-white sm:px-4">
      {/* ── Header ── */}
      <div className="mb-4 flex min-w-0 items-center gap-3">
        {thumbUrl(room?.thumbnail) ? (
          <span className="relative h-12 w-[34px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl(room?.thumbnail)!}
              alt={room?.animeTitle || "Anime"}
              className="h-full w-full object-cover"
            />
          </span>
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-400/30 bg-rose-500/15">
            <Radio className="text-rose-200" size={17} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.2em] text-rose-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> Nobar
            </span>
            {room && !ended && (
              <span className="text-[9px] font-bold text-white/35">
                {members.length} di ruangan
              </span>
            )}
          </div>
          <h1 className="mt-0.5 truncate text-[15px] font-black leading-tight text-white sm:text-base">
            {episode.title?.replace(" Sub Indo", "") || room?.episodeTitle || "Ruang Nobar"}
          </h1>
        </div>
        <button
          onClick={copyLink}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-bold text-white/75 transition hover:bg-white/[0.1] hover:text-white"
        >
          {copied ? <Check className="text-emerald-300" /> : <Copy />}
          <span className="hidden sm:inline">{copied ? "Tersalin" : "Bagikan"}</span>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* ── Video ── */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
            {room?.playerUrl ? (
              <AnimePlayer key={room.playerUrl} src={room.playerUrl} sync={sync} />
            ) : (
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <div className="absolute inset-0 grid place-items-center px-6 text-center">
                  <p className="text-xs font-bold text-white/45">
                    {isHost ? "Pilih server di bawah untuk mulai menonton" : "Menunggu host memilih server..."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-white/30">Host</p>
              <p className="truncate text-[12px] font-bold text-white/85">{room?.hostName || "-"}</p>
            </div>
            {room?.playerLabel && (
              <div className="min-w-0 border-l border-white/10 pl-4">
                <p className="text-[9px] font-black uppercase tracking-[.15em] text-white/30">Server</p>
                <p className="truncate text-[12px] font-bold text-white/85">{room.playerLabel}</p>
              </div>
            )}
            <div className="min-w-0 border-l border-white/10 pl-4">
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-white/30">Sinkron</p>
              <p className={`flex items-center gap-1.5 text-[12px] font-bold ${syncCapable ? "text-emerald-300" : "text-amber-300"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${syncCapable ? "bg-emerald-400" : "bg-amber-400"}`} />
                {syncCapable ? (room?.isPlaying ? "Berjalan" : "Siap") : "Chat saja"}
              </p>
            </div>
            {ended && (
              <div className="min-w-0 border-l border-white/10 pl-4">
                <p className="text-[9px] font-black uppercase tracking-[.15em] text-white/30">Status</p>
                <p className="text-[12px] font-bold text-rose-300">Ruang ditutup</p>
              </div>
            )}
          </div>

          {!syncCapable && room?.playerUrl && !ended && (
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              Server ini tidak bisa disinkronkan otomatis, jadi tonton sendiri-sendiri sambil ngobrol. Pilih server
              &ldquo;Ryu-lokal&rdquo; untuk nonton bareng yang benar-benar sinkron.
            </p>
          )}

          {/* Host: pilih server */}
          {isHost && !ended && players.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[.15em] text-white/40">
                Server untuk semua orang
              </p>
              <div className="flex flex-wrap gap-1.5">
                {players.map((player, index) => {
                  const url = player.iframe || player.streamUrl || "";
                  const active = url === room?.playerUrl;
                  return (
                    <button
                      key={index}
                      onClick={() => void pickPlayer(player)}
                      className={`max-w-full truncate rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                        active
                          ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {playerDisplayName(player)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reaksi */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-black uppercase tracking-[.15em] text-white/35">Reaksi</span>
            {NOBAR_EMOJIS.map((emoji) => {
              const count = reactions.find((r) => r.emoji === emoji)?.count || 0;
              return (
                <button
                  key={emoji}
                  onClick={() => void react(emoji)}
                  disabled={!signedIn || ended}
                  title={signedIn ? "Kirim reaksi" : "Masuk dulu untuk bereaksi"}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-sm transition disabled:opacity-40 ${
                    count > 0
                      ? "border-cyan-300/30 bg-cyan-400/10"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.09]"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="text-[11px] font-black text-cyan-100">{count}</span>}
                </button>
              );
            })}
            {isHost && !ended && (
              <button
                onClick={() => void closeRoom()}
                className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/50 transition hover:border-rose-400/30 hover:text-rose-300"
              >
                <X size={13} /> Tutup ruang
              </button>
            )}
          </div>
        </div>

        {/* ── Panel ── */}
        <div className="flex min-h-[440px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f1a] lg:min-h-0">
          <div className="flex shrink-0 border-b border-white/[0.08]">
            {(
              [
                ["chat", "Obrolan", MessageCircle],
                ["members", `Peserta`, Users],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px] font-black uppercase tracking-wider transition ${
                  tab === key
                    ? "border-b-2 border-cyan-300 text-cyan-200"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <Icon size={13} /> {label}
                {key === "members" && members.length > 0 && (
                  <span className="rounded-md bg-white/10 px-1.5 text-[9px] text-white/60">{members.length}</span>
                )}
              </button>
            ))}
          </div>

          {tab === "chat" ? (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
                {!messages.length && (
                  <p className="py-10 text-center text-xs text-white/35">Belum ada obrolan. Sapa yang lain!</p>
                )}
                {messages.map((message) => (
                  <div key={message.id} className="min-w-0">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="max-w-[10rem] truncate text-[11px] font-black text-cyan-300">{message.name}</span>
                      <span className="shrink-0 text-[9px] font-medium text-white/25">{relativeTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">
                      {message.body}
                    </p>
                  </div>
                ))}
              </div>
              {signedIn === false ? (
                <p className="shrink-0 border-t border-white/[0.08] px-3.5 py-3.5 text-center text-[11px] text-white/50">
                  <Link href="/login" className="font-black text-cyan-300 hover:underline">
                    Masuk
                  </Link>{" "}
                  untuk ikut ngobrol.
                </p>
              ) : (
                <form onSubmit={send} className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] px-3 py-3">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 300))}
                    disabled={busy || ended}
                    placeholder={ended ? "Ruang sudah ditutup" : "Tulis pesan..."}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
                  />
                  <button
                    disabled={!draft.trim() || busy || ended}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300 text-black transition disabled:opacity-35"
                    aria-label="Kirim"
                  >
                    <Send size={15} />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 py-2.5">
              {members.map((member) => (
                <div key={member.userId} className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.04]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-black text-white/70">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (member.name || "U")[0]?.toUpperCase()
                    )}
                  </span>
                  <Link
                    href={`/u/${encodeURIComponent(member.name)}`}
                    className="min-w-0 flex-1 truncate text-[13px] font-bold text-white/85 hover:text-cyan-300"
                  >
                    {member.name}
                  </Link>
                  {member.isHost && (
                    <span className="shrink-0 rounded-md bg-cyan-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-200">
                      Host
                    </span>
                  )}
                </div>
              ))}
              {!members.length && <p className="py-10 text-center text-xs text-white/35">Belum ada peserta.</p>}
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-center text-xs text-rose-300">{error}</p>}
      <p className="mt-5 text-center text-[11px] text-white/35">
        <Link href={`/anime/episode/${episodeSlug}`} className="font-bold hover:text-cyan-300">
          ← Kembali ke episode
        </Link>
      </p>
    </div>
  );
}
