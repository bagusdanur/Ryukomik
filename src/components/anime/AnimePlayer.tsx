"use client";

/**
 * AnimePlayer — "ryu-lokal" versi anime.
 *
 * Pola ini meniru HentaiPlayer (nekopoi/streampoi): kalau server yang dipilih
 * didukung resolver kita, videonya diambil LANGSUNG dari player dan diputar
 * memakai <video> sendiri. Efeknya iklan hilang total, karena iklan player
 * tidak ikut terbawa (di filedon, iklan terpisah dari file video).
 *
 * Untuk server yang belum didukung (vidhide/mega/blogs/odstream), komponen ini
 * otomatis jatuh kembali ke <iframe> seperti sebelumnya.
 *
 * Catatan: filedon menyajikan MP4 (bukan HLS), jadi tidak butuh hls.js.
 * Kalau nanti resolver HLS ditambahkan, tinggal pakai pola HentaiPlayer.
 */

import { useEffect, useRef, useState } from "react";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaSpinner,
} from "react-icons/fa";

const API_BASE = "https://apiv2.ryukomik.web.id";

type ResolvedStream = {
  success?: boolean;
  provider?: string;
  url?: string;
  url_proxy?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
} & Partial<T>;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatSize(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes)) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sinkronisasi nobar (opsional). Hanya berlaku saat server diputar memakai
 * <video> milik kita (server "Ryu-lokal"); untuk iframe pihak ketiga tidak ada
 * yang bisa dikendalikan, jadi `onCapable(false)` dan nobar jalan mode chat.
 */
export type AnimePlayerSyncState = {
  isPlaying: boolean;
  /** Posisi (detik) pada saat state ini disusun di klien. */
  basePosition: number;
  /** Jam klien (Date.now()) saat basePosition disusun. */
  atClientMs: number;
};
export type AnimePlayerSync = {
  role: "host" | "viewer";
  state?: AnimePlayerSyncState | null;
  /** Mulai otomatis begitu stream siap (dipakai host setelah memilih server). */
  autoPlay?: boolean;
  onHostState?: (state: { isPlaying: boolean; positionSeconds: number }) => void;
  onCapable?: (capable: boolean) => void;
};

export default function AnimePlayer({ src, sync }: { src?: string; sync?: AnimePlayerSync }) {
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<ResolvedStream | null>(null);
  const [failed, setFailed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Autoplay bersuara diblokir browser; kalau kita terpaksa mulai dalam keadaan
  // mute (supaya video tetap jalan otomatis saat join), tampilkan tombol untuk
  // menyalakan suara sekali ketuk.
  const [needsUnmute, setNeedsUnmute] = useState(false);
  // Sekali user memilih menyalakan suara, jangan pernah dibisukan lagi oleh
  // koreksi otomatis (dulu .catch() men-set muted=true kembali → tombol seperti
  // tidak berfungsi / berkedip).
  const userUnmutedRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  // ── Resolve stream: hanya untuk server yang didukung resolver ──
  useEffect(() => {
    if (!src) return;

    let mounted = true;
    setFailed(false);
    setStream(null);

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/stream/resolve?url=${encodeURIComponent(src)}`);
        const json = (await res.json()) as ApiResponse<ResolvedStream>;
        if (!mounted) return;

        // /stream/resolve membalas { success, url_proxy, ... } di root,
        // bukan dibungkus `data` seperti /animeid/*.
        const payload = (json.data ?? json) as ResolvedStream;
        if (json.success && payload?.url_proxy) {
          setStream(payload);
        } else {
          setFailed(true);
        }
      } catch {
        if (mounted) setFailed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [src]);

  // ── Event video ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (!isDragging) setCurrentTime(v.currentTime);
    };
    const onMeta = () => setDuration(v.duration || 0);
    const onVol = () => {
      setVolume(v.volume);
      setIsMuted(v.muted);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
    };
  }, [stream, isDragging]);

  // ── Fullscreen ──
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ── Sinkronisasi nobar (hanya untuk <video> milik kita) ──
  const syncCapable = Boolean(sync && stream?.url_proxy && !failed);
  const syncRole = sync?.role ?? null;
  // Callback & state disimpan di ref supaya effect tidak dipasang-ulang tiap
  // render (objek `sync` dibuat ulang oleh komponen induk).
  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    syncRef.current?.onCapable?.(syncCapable);
  }, [syncCapable]);

  // Host: begitu stream siap, langsung putar (tanpa perlu tekan play manual),
  // lalu laporkan state "playing" ke ruang supaya penonton ikut jalan.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (syncRole !== "host" || !syncCapable || !syncRef.current?.autoPlay) return;
    if (autoStartedRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    autoStartedRef.current = true;
    v.muted = true; // supaya autoplay diizinkan browser
    setNeedsUnmute(true);
    v.play()
      .then(() => {
        const current = syncRef.current;
        if (current?.onHostState) current.onHostState({ isPlaying: true, positionSeconds: v.currentTime });
      })
      .catch(() => {});
  }, [syncRole, syncCapable]);

  // Host: laporkan play/pause/seek SEKETIKA, lalu heartbeat posisi tiap 4 detik
  // selama diputar. Heartbeat inilah yang memberi penonton (termasuk yang baru
  // masuk) titik acuan segar — bukan cuma saat seek.
  useEffect(() => {
    if (syncRole !== "host" || !syncCapable) return;
    const v = videoRef.current;
    if (!v) return;
    const report = () => {
      const current = syncRef.current;
      if (current?.onHostState) current.onHostState({ isPlaying: !v.paused, positionSeconds: v.currentTime });
    };
    v.addEventListener("play", report);
    v.addEventListener("pause", report);
    v.addEventListener("seeked", report);
    const beat = setInterval(() => {
      if (!v.paused && Number.isFinite(v.currentTime)) report();
    }, 4000);
    return () => {
      v.removeEventListener("play", report);
      v.removeEventListener("pause", report);
      v.removeEventListener("seeked", report);
      clearInterval(beat);
    };
  }, [syncRole, syncCapable]);

  // Penonton: jaga posisi tanpa membuat stutter.
  //
  // Sebelumnya kecepatan (playbackRate) diubah terus-menerus tiap 0,5 detik
  // untuk mengejar host — itu justru membuat video tersendat dan suara goyang.
  // Sekarang: kecepatan DIBIARKAN 1.0 (mulus), dan kalau posisi melenceng jauh
  // cukup LONCAT sekali (seek). Karena video biasanya sudah ter-buffer, seek
  // instan dan tak terasa — jauh lebih halus daripada mengubah kecepatan.
  useEffect(() => {
    if (syncRole !== "viewer" || !syncCapable) return;
    const v = videoRef.current;
    if (!v) return;

    let lastSeek = 0;
    const correct = () => {
      const st = syncRef.current?.state;
      if (!st) return;
      const elapsed = st.isPlaying ? Math.max(0, Date.now() - st.atClientMs) / 1000 : 0;
      const target = st.basePosition + elapsed;
      const upper =
        Number.isFinite(v.duration) && v.duration > 0 ? Math.max(0, v.duration - 0.5) : Number.MAX_SAFE_INTEGER;
      const goal = Math.max(0, Math.min(target, upper));

      // Ikuti play/pause host.
      if (v.paused === st.isPlaying) {
        if (st.isPlaying) {
          v.play().catch(() => {
            // Kalau user sudah memilih menyalakan suara, JANGAN bisukan lagi —
            // cukup coba ulang. Tampilkan tombol hanya bila memang masih bisu.
            if (userUnmutedRef.current) {
              v.play().catch(() => {});
              if (v.muted) setNeedsUnmute(true);
              return;
            }
            v.muted = true;
            setNeedsUnmute(true);
            v.play().catch(() => {});
          });
        } else {
          v.pause();
        }
      }

      // Kecepatan selalu normal — tidak ada penyendatan akibat rate berubah.
      if (v.playbackRate !== 1) v.playbackRate = 1;

      // Kalau video belum bisa diputar (mis. autoplay ditolak sebelum user
      // menyalakan suara), JANGAN koreksi posisi: currentTime beku sementara
      // acuan terus maju, sehingga akan melompat berulang tanpa guna.
      if (v.paused) return;

      const drift = goal - v.currentTime;
      // Melenceng jauh -> lompat sekali. Ambang 1 detik + jeda 3 detik supaya
      // tidak melompat berulang-ulang.
      if (Math.abs(drift) > 1 && Date.now() - lastSeek > 3000) {
        lastSeek = Date.now();
        v.currentTime = goal;
      }
    };

    correct();
    const timer = setInterval(correct, 1000);
    return () => clearInterval(timer);
  }, [syncRole, syncCapable]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted) {
      userUnmutedRef.current = true;
      setNeedsUnmute(false);
    } else {
      userUnmutedRef.current = false;
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else await el.requestFullscreen?.().catch(() => {});
  };

  const seekTo = (clientX: number) => {
    const bar = barRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setCurrentTime(ratio * duration);
    v.currentTime = ratio * duration;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3000);
  };

  // ── Belum pilih server ──
  if (!src) {
    return (
      <div
        className="relative w-full bg-[#0a0a0a]"
        style={{ paddingTop: "56.25%" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-cyan-400/10 border border-cyan-300/25 flex items-center justify-center">
            <FaPlay className="text-cyan-200 ml-0.5 text-xs" />
          </div>
          <p className="text-[9px] font-black text-white/20 tracking-[.18em] uppercase">
            Pilih server di bawah
          </p>
        </div>
      </div>
    );
  }

  // ── Fallback iframe (server tak didukung / resolver gagal) ──
  if (failed || !stream?.url_proxy) {
    // Saat masih loading, tampilkan spinner daripada iframe yang berkedip
    if (loading) {
      return (
        <div className="relative w-full bg-[#0a0a0a]" style={{ paddingTop: "56.25%" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-2 border-white/10 border-t-cyan-300 rounded-full animate-spin" />
            <span className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-200/70">
              Menyiapkan stream bersih...
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="relative w-full bg-[#0a0a0a]" style={{ paddingTop: "56.25%" }}>
        <iframe
          key={src}
          src={src}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay; fullscreen"
          referrerPolicy="no-referrer"
          frameBorder="0"
        />
      </div>
    );
  }

  // ── Pemutar "ryu-lokal" (video bersih, tanpa iklan) ──
  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black select-none group ${
        isFullscreen ? "" : "overflow-hidden"
      }`}
      style={{ paddingTop: isFullscreen ? 0 : "56.25%", height: isFullscreen ? "100vh" : "auto" }}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => !videoRef.current?.paused && setShowControls(false)}
      onTouchStart={showControlsTemporarily}
    >
      <div className="absolute inset-0 w-full h-full">
        <video
          ref={videoRef}
          src={stream.url_proxy}
          className="w-full h-full object-contain bg-black"
          playsInline
          preload="metadata"
          onClick={togglePlay}
        />

        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
            <div className="w-12 h-12 border-4 border-cyan-300/20 border-t-cyan-300 rounded-full animate-spin" />
          </div>
        )}

        {/* Video mulai otomatis tapi dalam keadaan mute (autoplay bersuara
            diblokir browser). Ditaruh di TENGAH dengan z-30 supaya tidak
            tertutup overlay kontrol (yang muncul saat mouse bergerak). */}
        {needsUnmute && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (!v) return;
              userUnmutedRef.current = true;
              v.muted = false;
              if (v.volume === 0) v.volume = 1;
              // Panggil play() LANGSUNG di dalam gesture handler: kalau ditunda,
              // izin gesture browser kedaluwarsa dan play bersuara ditolak.
              v.play().catch(() => {});
              setNeedsUnmute(false);
            }}
            className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-cyan-400 px-4 py-2.5 text-black shadow-2xl ring-2 ring-black/20 transition hover:bg-cyan-300 active:scale-95"
          >
            <FaVolumeMute size={15} />
            <span className="text-[11px] font-black uppercase tracking-wider">Nyalakan suara</span>
          </button>
        )}

        {/* Badge: stream bersih */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-cyan-300/25 rounded-lg px-2 py-1 pointer-events-none">
          <span className="text-[8px] font-black uppercase tracking-wider text-cyan-200">
            ⚡ Ryu-Lokal
          </span>
          {stream.size ? (
            <span className="text-[8px] font-bold text-white/40">{formatSize(stream.size)}</span>
          ) : null}
        </div>

        {/* Overlay kontrol */}
        <div
          className={`absolute inset-x-0 bottom-0 pt-16 pb-2 px-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-200 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Progress bar */}
          <div
            ref={barRef}
            className="relative h-6 flex items-center cursor-pointer mb-1"
            onClick={(e) => seekTo(e.clientX)}
            onMouseDown={(e) => {
              setIsDragging(true);
              seekTo(e.clientX);
            }}
            onMouseMove={(e) => isDragging && seekTo(e.clientX)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <div className="absolute inset-x-0 h-1 rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white/90 hover:text-cyan-200 transition-colors">
              {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
            </button>

            <button onClick={toggleMute} className="text-white/90 hover:text-cyan-200 transition-colors">
              {isMuted || volume === 0 ? <FaVolumeMute size={15} /> : <FaVolumeUp size={15} />}
            </button>

            <span className="text-[10px] font-bold text-white/60 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {stream.provider && (
                <span className="text-[8px] font-black uppercase tracking-wider text-white/35 border border-white/10 rounded px-1.5 py-0.5">
                  {stream.provider}
                </span>
              )}
              <button onClick={toggleFullscreen} className="text-white/90 hover:text-cyan-200 transition-colors">
                {isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Tombol play besar saat pause */}
        {!isPlaying && !isBuffering && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="w-16 h-16 rounded-full bg-cyan-400/15 backdrop-blur-sm border border-cyan-300/40 flex items-center justify-center">
              <FaPlay className="text-cyan-100 ml-1" size={22} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
