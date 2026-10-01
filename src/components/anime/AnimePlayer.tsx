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

export default function AnimePlayer({ src }: { src?: string }) {
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
