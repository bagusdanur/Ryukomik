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
import { FiSend, FiCopy, FiCheck, FiX, FiUsers, FiMessageCircle } from "react-icons/fi";
import AnimePlayer, { type AnimePlayerSyncState } from "@/components/anime/AnimePlayer";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch, socialRead } from "@/lib/social/client";
import { relativeTime } from "@/lib/social/relativeTime";
import { NOBAR_EMOJIS, NOBAR_POLL_MS } from "@/lib/social/nobarShared";

type Player = { name?: string; iframe?: string; streamUrl?: string };
type Member = { userId: string; name: string; avatarUrl: string | null; isHost: boolean };
type Message = { id: string; userId: string; name: string; body: string; createdAt: string; seq: number };
type Reaction = { emoji: string; count: number };
type Room = {
  id: string;
  episodeSlug: string;
  episodeTitle: string | null;
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

  // Polling: 2,5s saat tab aktif, berhenti saat disembunyikan.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      void poll();
      timer = setInterval(() => void poll(), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
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

  // Host: laporkan posisi berkala saat video jalan (poll sudah 2,5s).
  const syncState: AnimePlayerSyncState | null = room
    ? {
        isPlaying: room.isPlaying,
        basePosition: room.positionSeconds,
        atClientMs: new Date(room.playbackUpdatedAt).getTime(),
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
    () => ({ role: (isHost ? "host" : "viewer") as "host" | "viewer", state: syncState, onHostState, onCapable: setSyncCapable }),
    [isHost, syncState, onHostState],
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
    const label = player.name || "Server";
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
    <div className="mx-auto max-w-6xl px-3 pb-24 pt-4 text-white sm:px-4">
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Nobar
        </span>
        <h1 className="min-w-0 flex-1 truncate text-sm font-black sm:text-base">
          {episode.title?.replace(" Sub Indo", "") || room?.episodeTitle || "Ruang Nobar"}
        </h1>
        <button
          onClick={copyLink}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold hover:bg-white/[0.08]"
        >
          {copied ? <FiCheck className="text-emerald-300" /> : <FiCopy />} {copied ? "Tersalin" : "Bagikan"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Video ── */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            {room?.playerUrl ? (
              <AnimePlayer key={room.playerUrl} src={room.playerUrl} sync={sync} />
            ) : (
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <div className="absolute inset-0 grid place-items-center gap-2 text-center">
                  <div>
                    <p className="text-xs font-black text-white/40">
                      {isHost ? "Pilih server di bawah untuk mulai" : "Menunggu host memilih server..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status sinkron */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold text-white/60">
              👤 Host: {room?.hostName || "-"}
            </span>
            {room?.playerLabel && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold text-white/60">
                🖥️ {room.playerLabel}
              </span>
            )}
            <span
              className={`rounded-full border px-2.5 py-1 font-bold ${
                syncCapable
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                  : "border-amber-300/25 bg-amber-400/10 text-amber-200"
              }`}
            >
              {syncCapable ? "🔗 Video tersinkron" : "💬 Mode chat saja (server ini tak bisa disinkronkan)"}
            </span>
            {room?.isPlaying && syncCapable && (
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 font-bold text-cyan-200">
                ▶ Host sedang memutar
              </span>
            )}
            {ended && (
              <span className="rounded-full border border-red-300/25 bg-red-400/10 px-2.5 py-1 font-bold text-red-200">
                Ruang sudah ditutup
              </span>
            )}
          </div>

          {/* Host: pilih server */}
          {isHost && !ended && players.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-white/35">Pilih server (semua ikut)</p>
              <div className="flex flex-wrap gap-1.5">
                {players.map((player, index) => {
                  const url = player.iframe || player.streamUrl || "";
                  const active = url === room?.playerUrl;
                  return (
                    <button
                      key={index}
                      onClick={() => void pickPlayer(player)}
                      className={`max-w-full truncate rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                        active
                          ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
                      }`}
                    >
                      {player.name || `Server ${index + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reaksi */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {NOBAR_EMOJIS.map((emoji) => {
              const count = reactions.find((r) => r.emoji === emoji)?.count || 0;
              return (
                <button
                  key={emoji}
                  onClick={() => void react(emoji)}
                  disabled={!signedIn || ended}
                  title={signedIn ? "Kirim reaksi" : "Masuk dulu untuk bereaksi"}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm transition hover:bg-white/[0.09] disabled:opacity-40"
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="text-[11px] font-black text-white/60">{count}</span>}
                </button>
              );
            })}
            {isHost && !ended && (
              <button
                onClick={() => void closeRoom()}
                className="ml-auto flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-200 hover:bg-red-500/20"
              >
                <FiX /> Tutup ruang
              </button>
            )}
          </div>
        </div>

        {/* ── Panel ── */}
        <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e19]/95">
          <div className="flex shrink-0 border-b border-white/10">
            {(
              [
                ["chat", "Chat", FiMessageCircle],
                ["members", `Peserta (${members.length})`, FiUsers],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px] font-black uppercase tracking-wider transition ${
                  tab === key ? "border-b-2 border-cyan-300 text-cyan-200" : "text-white/40 hover:text-white/70"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {tab === "chat" ? (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
                {!messages.length && <p className="py-8 text-center text-xs text-white/30">Belum ada obrolan. Sapa yang lain!</p>}
                {messages.map((message) => (
                  <div key={message.id} className="min-w-0">
                    <div className="flex min-w-0 items-baseline gap-1.5">
                      <span className="max-w-[10rem] truncate text-[11px] font-black text-cyan-200">{message.name}</span>
                      <span className="shrink-0 text-[9px] text-white/25">{relativeTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/80">{message.body}</p>
                  </div>
                ))}
              </div>
              {signedIn === false ? (
                <p className="shrink-0 border-t border-white/10 px-3 py-3 text-center text-[11px] text-white/45">
                  <Link href="/login" className="font-black text-cyan-200 hover:underline">
                    Masuk
                  </Link>{" "}
                  untuk ikut ngobrol.
                </p>
              ) : (
                <form onSubmit={send} className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2.5">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 300))}
                    disabled={busy || ended}
                    placeholder={ended ? "Ruang sudah ditutup" : "Tulis pesan..."}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] outline-none placeholder:text-white/30 focus:border-cyan-300/40"
                  />
                  <button
                    disabled={!draft.trim() || busy || ended}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-300 text-black disabled:opacity-35"
                    aria-label="Kirim"
                  >
                    <FiSend size={14} />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
              {members.map((member) => (
                <div key={member.userId} className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-[11px] font-black">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (member.name || "U")[0]?.toUpperCase()
                    )}
                  </span>
                  <Link
                    href={`/u/${encodeURIComponent(member.name)}`}
                    className="min-w-0 flex-1 truncate text-[13px] font-bold hover:text-cyan-200"
                  >
                    {member.name}
                  </Link>
                  {member.isHost && (
                    <span className="shrink-0 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-200">
                      Host
                    </span>
                  )}
                </div>
              ))}
              {!members.length && <p className="py-8 text-center text-xs text-white/30">Belum ada peserta.</p>}
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-center text-xs text-red-200">{error}</p>}
      <p className="mt-4 text-center text-[11px] text-white/30">
        <Link href={`/anime/episode/${episodeSlug}`} className="hover:text-cyan-200">
          ← Kembali ke episode
        </Link>
      </p>
    </div>
  );
}
