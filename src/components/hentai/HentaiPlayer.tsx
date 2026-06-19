"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { 
  FaPlay, 
  FaPause, 
  FaVolumeUp, 
  FaVolumeMute, 
  FaExpand, 
  FaCompress, 
  FaCog 
} from "react-icons/fa";

type StreamData = {
  m3u8_proxy?: string;
  image?: string;
  duration?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function HentaiPlayer({ src }: { src?: string }) {
  const [loading, setLoading] = useState(true);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [error, setError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // HLS States
  const [levels, setLevels] = useState<{ height: number; bitrate: number }[]>([]);
  const [autoMode, setAutoMode] = useState(true);
  const [activeLevel, setActiveLevel] = useState<number>(-1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Dragging States for Custom Slider
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Logic
  useEffect(() => {
    if (!src) return;
    if (!src.includes("streampoi.com")) {
      setLoading(false);
      setStreamData(null);
      setError(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setStreamData(null);
    setError(false);

    const fetchResolve = async () => {
      try {
        const res = await fetch(`https://apiv2.ryukomik.web.id/nekopoi/resolve-streampoi?url=${encodeURIComponent(src)}`);
        const json = (await res.json()) as ApiResponse<StreamData>;
        if (json.success && json.data) {
          if (isMounted) setStreamData(json.data);
        } else {
          if (isMounted) setError(true);
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResolve();
    return () => { isMounted = false; };
  }, [src]);

  // HLS Init
  useEffect(() => {
    if (!streamData?.m3u8_proxy || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true, // Batasi resolusi max ke ukuran layar (sangat hemat kuota & cepat di HP)
        startLevel: 0, // Selalu mulai dari resolusi terendah agar lgsg jalan
        maxBufferLength: 15, // Ukuran buffer diperkecil agar tembakan video lebih cepat
        maxMaxBufferLength: 30, // Batas max buffer
      });
      hlsRef.current = hls;
      
      hls.loadSource(streamData.m3u8_proxy);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setLevels(data.levels);
      });
      
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setActiveLevel(data.level);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamData.m3u8_proxy;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamData]);

  // Event Listeners for Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (!isDraggingSeek) {
        setCurrentTime(video.currentTime);
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, [streamData, isDraggingSeek]);

  // Fullscreen Listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Control Handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
  };

  const handleSeekMove = useCallback((clientX: number) => {
    if (!progressContainerRef.current || !duration) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    let pos = (clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    setCurrentTime(pos * duration);
  }, [duration]);

  const handleSeekEnd = useCallback((clientX: number) => {
    setIsDraggingSeek(false);
    if (!progressContainerRef.current || !duration || !videoRef.current) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    let pos = (clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  }, [duration]);

  // Global mouse events for dragging
  useEffect(() => {
    if (!isDraggingSeek) return;
    
    const onMouseMove = (e: MouseEvent) => handleSeekMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleSeekMove(e.touches[0].clientX);
    const onMouseUp = (e: MouseEvent) => handleSeekEnd(e.clientX);
    const onTouchEnd = (e: TouchEvent) => handleSeekEnd(e.changedTouches[0].clientX);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDraggingSeek, handleSeekMove, handleSeekEnd]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) container.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      if (levelIndex === -1) {
        hlsRef.current.currentLevel = -1; // Auto
        setAutoMode(true);
      } else {
        hlsRef.current.currentLevel = levelIndex; // Force level
        setAutoMode(false);
      }
      setIsSettingsOpen(false);
    }
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      setShowControls(false);
      setIsSettingsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      handleMouseMove();
    } else {
      setShowControls(true);
    }
  }, [isPlaying, handleMouseMove]);

  // Determine Quality text (Always fallback safely)
  let qualityText = "Auto";
  if (!autoMode && activeLevel !== -1 && levels[activeLevel]) {
    qualityText = `${levels[activeLevel].height}p`;
  } else if (autoMode && activeLevel !== -1 && levels[activeLevel]) {
    qualityText = `Auto (${levels[activeLevel].height}p)`;
  } else if (!autoMode && activeLevel !== -1) {
    qualityText = `${activeLevel}p`; // Fallback jika levels belum sync
  }

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  if (!src) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/5" style={{ paddingTop: "56.25%" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#ff5078]/10 border border-[#ff5078]/25 flex items-center justify-center">
            <FaPlay className="text-[#ff5078] ml-1" />
          </div>
          <p className="text-[9px] font-black text-white/20 tracking-[.18em] uppercase">Pilih server di bawah</p>
        </div>
      </div>
    );
  }

  // Fallback iframe
  if (!src.includes("streampoi.com") || error) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/5 shadow-lg" style={{ paddingTop: "56.25%" }}>
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

  return (
    <div 
      className={`relative w-full bg-black group select-none flex items-center justify-center ${isFullscreen ? "" : "rounded-xl overflow-hidden border border-white/10 shadow-2xl"}`}
      style={{ paddingTop: isFullscreen ? "0" : "56.25%", height: isFullscreen ? "100vh" : "auto" }}
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (showControls) {
          setShowControls(false);
          setIsSettingsOpen(false);
        } else {
          handleMouseMove();
        }
      }}
    >
      <div className="absolute inset-0 w-full h-full">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
            <div className="w-10 h-10 border-2 border-white/10 border-t-[#ff5078] rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-[#ff5078] animate-pulse">
              Memuat Stream Premium...
            </span>
          </div>
        ) : streamData ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              poster={streamData.image}
              playsInline
            />

            {/* Buffering Indicator */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px] transition-all">
                <div className="w-14 h-14 border-4 border-[#ff5078]/20 border-t-[#ff5078] rounded-full animate-spin shadow-[0_0_15px_rgba(255,80,120,0.5)]" />
              </div>
            )}

            {/* Settings Overlay Center Mobile */}
            {isSettingsOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm sm:hidden pointer-events-auto p-2" onClick={() => setIsSettingsOpen(false)}>
                <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-3 w-[180px] max-h-full overflow-y-auto no-scrollbar shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="text-[10px] font-black text-[#ff5078] mb-2 text-center uppercase tracking-widest">Pilih Kualitas</div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => changeQuality(-1)}
                      className={`w-full py-2 text-[11px] font-bold rounded-lg transition-colors ${
                        autoMode ? "bg-[#ff5078]/20 text-[#ff5078] border border-[#ff5078]/50" : "bg-white/5 text-white hover:bg-white/10 border border-transparent"
                      }`}
                    >
                      Auto Recomended
                    </button>
                    {[...levels].reverse().map((level, idx) => {
                      const levelIndex = levels.length - 1 - idx;
                      return (
                        <button
                          key={levelIndex}
                          onClick={() => changeQuality(levelIndex)}
                          className={`w-full py-2 text-[11px] font-bold rounded-lg transition-colors ${
                            !autoMode && activeLevel === levelIndex ? "bg-[#ff5078]/20 text-[#ff5078] border border-[#ff5078]/50" : "bg-white/5 text-white hover:bg-white/10 border border-transparent"
                          }`}
                        >
                          {level.height}p
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Controls Overlay (Glassmorphism Floating) */}
            <div 
              className={`absolute bottom-0 left-0 right-0 p-2 sm:p-4 transition-all duration-300 ease-out flex flex-col justify-end ${
                showControls ? "opacity-100 translate-y-0 z-20" : "opacity-0 translate-y-4 pointer-events-none"
              }`}
            >
              
              <div 
                className="bg-[#05060b]/90 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col gap-1 sm:gap-2 relative"
                onClick={(e) => { e.stopPropagation(); handleMouseMove(); }}
                onMouseMove={(e) => { e.stopPropagation(); handleMouseMove(); }}
                onTouchStart={(e) => { e.stopPropagation(); handleMouseMove(); }}
              >
                
                {/* Desktop Settings Popover */}
                {isSettingsOpen && (
                  <div className="hidden sm:block absolute right-4 bottom-[calc(100%+10px)] bg-[#1e1e1e]/95 border border-white/10 rounded-xl p-2 w-40 backdrop-blur-md z-50 shadow-2xl">
                    <div className="text-[10px] font-bold text-white/50 mb-2 px-2 uppercase tracking-wider">Kualitas</div>
                    <button
                      onClick={() => changeQuality(-1)}
                      className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${
                        autoMode ? "bg-[#ff5078]/20 text-[#ff5078]" : "text-white hover:bg-white/5"
                      }`}
                    >
                      Auto
                    </button>
                    {[...levels].reverse().map((level, idx) => {
                      const levelIndex = levels.length - 1 - idx;
                      return (
                        <button
                          key={levelIndex}
                          onClick={() => changeQuality(levelIndex)}
                          className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${
                            !autoMode && activeLevel === levelIndex ? "bg-[#ff5078]/20 text-[#ff5078]" : "text-white hover:bg-white/5"
                          }`}
                        >
                          {level.height}p
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Progress Bar (Custom Div) */}
                <div 
                  className="w-full h-4 flex items-center group/progress cursor-pointer px-1 sm:px-2"
                  ref={progressContainerRef}
                  onMouseDown={(e) => {
                    setIsDraggingSeek(true);
                    handleSeekMove(e.clientX);
                  }}
                  onTouchStart={(e) => {
                    setIsDraggingSeek(true);
                    handleSeekMove(e.touches[0].clientX);
                  }}
                >
                  <div className="w-full h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                    {/* Buffered Bar (Optional: could be added if needed, for now just played bar) */}
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff5078]/80 to-[#ff5078] rounded-full shadow-[0_0_10px_rgba(255,80,120,0.8)]"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  {/* Thumb Indicator */}
                  <div 
                    className={`absolute h-3.5 w-3.5 sm:h-4 sm:w-4 bg-white border-2 border-[#ff5078] rounded-full shadow-[0_0_10px_rgba(255,80,120,0.8)] transition-transform duration-100 ${isDraggingSeek ? 'scale-125' : 'scale-0 group-hover/progress:scale-100'}`}
                    style={{ left: `calc(${progressPercentage}% - 6px)` }}
                  />
                </div>

                {/* Bottom Controls */}
                <div className="flex items-center justify-between px-1 sm:px-2">
                  
                  {/* Left Controls */}
                  <div className="flex items-center gap-3 sm:gap-5">
                    <button onClick={togglePlay} className="text-white hover:text-[#ff5078] transition-all focus:outline-none p-1 sm:p-0 active:scale-90">
                      {isPlaying ? <FaPause size={16} className="sm:text-[20px]" /> : <FaPlay size={16} className="sm:text-[20px]" />}
                    </button>
                    
                    <div className="hidden sm:flex items-center gap-3 group/vol">
                      <button onClick={toggleMute} className="text-white hover:text-[#ff5078] transition-colors focus:outline-none active:scale-90">
                        {isMuted || volume === 0 ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
                      </button>
                      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 flex items-center">
                         <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if(videoRef.current) {
                              videoRef.current.volume = val;
                              setVolume(val);
                              setIsMuted(val === 0);
                            }
                          }}
                          className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#ff5078]"
                          style={{
                            backgroundSize: `${(isMuted ? 0 : volume) * 100}% 100%`,
                            backgroundImage: "linear-gradient(#ff5078, #ff5078)",
                            backgroundRepeat: "no-repeat"
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-white/80 text-[10px] sm:text-[12px] font-bold tracking-wide font-mono bg-white/5 px-2 py-0.5 rounded-md">
                      {formatTime(currentTime)} <span className="text-white/30 mx-1">/</span> {formatTime(duration)}
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-2 sm:gap-4">
                    {levels.length > 0 && (
                      <button 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                        className={`transition-all focus:outline-none flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg active:scale-95 ${isSettingsOpen ? 'bg-[#ff5078]/20 text-[#ff5078]' : 'bg-white/5 text-white hover:bg-white/10 hover:text-[#ff5078]'}`}
                      >
                        <FaCog size={14} className={`sm:text-[16px] ${isSettingsOpen ? "animate-spin-slow" : ""}`} />
                        <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase">
                          {qualityText}
                        </span>
                      </button>
                    )}
                    <button onClick={toggleFullscreen} className="text-white hover:text-[#ff5078] transition-colors focus:outline-none p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 rounded-lg active:scale-95">
                      {isFullscreen ? <FaCompress size={14} className="sm:text-[16px]" /> : <FaExpand size={14} className="sm:text-[16px]" />}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
