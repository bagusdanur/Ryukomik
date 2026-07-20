import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FiArrowDown, FiRefreshCw } from "react-icons/fi";
import { getChapterImageCandidates } from "@/lib/imageProxy";
import type { ImageScaling, PageSpacing, ReadingMode } from "@/store/readerStore";

const BOTTOM_ZONE = 0.35;
const EAGER_IMAGE_COUNT = 1;
const PRELOAD_IMAGE_COUNT = 1;

const SPACING_MAP: Record<PageSpacing, string> = {
  none: "gap-0",
  small: "gap-2",
  medium: "gap-4",
  webtoon: "gap-8",
};

function getImgStyle(imageScaling: ImageScaling): CSSProperties {
  const base: CSSProperties = {
    contentVisibility: "auto",
    containIntrinsicSize: "520px 760px",
    opacity: 0,
    transition: "opacity 0.12s",
  };

  if (imageScaling === "fitscreen") {
    return { ...base, maxHeight: "100vh", objectFit: "contain" };
  }
  if (imageScaling === "original") {
    return { ...base, width: "auto", maxWidth: "100%" };
  }
  return { ...base, width: "100%" };
}

function getContainerClass(readingMode: ReadingMode, pageSpacing: PageSpacing) {
  const spacing = SPACING_MAP[pageSpacing] ?? "gap-0";
  if (readingMode === "double") {
    return `grid grid-cols-2 items-start justify-center max-w-[900px] mx-auto ${spacing}`;
  }
  if (readingMode === "single") {
    return `flex flex-col items-center max-w-[500px] mx-auto ${spacing}`;
  }
  return `flex flex-col items-center w-full ${spacing}`;
}

function getImageOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

interface ReaderImageProps {
  src: string;
  source: string;
  slugStr: string;
  index: number;
  imgStyle: CSSProperties;
  imageScaling: ImageScaling;
  readingMode: ReadingMode;
}

function ReaderImage({ src, source, slugStr, index, imgStyle, imageScaling, readingMode }: ReaderImageProps) {
  const candidates = useMemo(
    () => getChapterImageCandidates(source, src),
    [source, src],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(candidates[0] || src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const reportedLoaded = useRef(false);

  const markLoaded = () => {
    setLoaded(true);
    setFailed(false);
    if (!reportedLoaded.current) {
      reportedLoaded.current = true;
    }
  };

  const tryNextSource = () => {
    const nextIndex = candidateIndex + 1;
    const nextSrc = candidates[nextIndex];

    if (nextSrc) {
      setCandidateIndex(nextIndex);
      setCurrentSrc(nextSrc);
      setLoaded(false);
      setRetryCount((count) => count + 1);
      return;
    }

    setFailed(true);
  };

  const reload = () => {
    reportedLoaded.current = false;
    setFailed(false);
    setLoaded(false);
    setCandidateIndex(0);
    setCurrentSrc(candidates[0] || src);
    setRetryCount((count) => count + 1);
  };

  return (
    <div
      className="relative flex w-full justify-center overflow-hidden bg-[var(--background)]"
      style={{
        minHeight: loaded ? undefined : index < EAGER_IMAGE_COUNT ? 320 : 120,
      }}
    >
      {!loaded && !failed && index < EAGER_IMAGE_COUNT && (
        <div className="absolute inset-0 z-0 bg-[#05060b]" />
      )}

      <img
        key={`${slugStr}-${index}-${retryCount}`}
        data-page={index}
        src={currentSrc}
        alt={`Page ${index + 1}`}
        referrerPolicy="no-referrer"
        loading={index < EAGER_IMAGE_COUNT ? "eager" : "lazy"}
        fetchPriority={index < EAGER_IMAGE_COUNT ? "high" : "auto"}
        decoding={index < EAGER_IMAGE_COUNT ? "sync" : "async"}
        sizes={
          readingMode === "single" || imageScaling === "original"
            ? "(max-width: 520px) 100vw, 520px"
            : "100vw"
        }
        style={imgStyle}
        className="relative z-[1] bg-[var(--background)]"
        ref={(el) => {
          if (el && el.complete && el.naturalWidth > 0) {
            el.style.opacity = "1";
            markLoaded();
          }
        }}
        onLoad={(e) => {
          e.currentTarget.style.opacity = "1";
          markLoaded();
        }}
        onError={(e) => {
          e.currentTarget.style.opacity = "0.3";
          e.currentTarget.style.minHeight = "80px";
          tryNextSource();
        }}
      />

      {failed && (
        <button
          type="button"
          data-no-tap
          onClick={reload}
          className="absolute left-1/2 top-1/2 z-[2] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-xs text-white/70 transition hover:text-white"
        >
          <FiRefreshCw size={13} />
          Muat ulang gambar
        </button>
      )}
    </div>
  );
}

interface ReaderImagesProps {
  images: string[];
  slugStr: string;
  source: string;
  tapHint: boolean;
  showUI: boolean;
  readingMode?: ReadingMode;
  imageScaling?: ImageScaling;
  pageSpacing?: PageSpacing;
  nextChapterSlug?: string;
}

export default function ReaderImages({
  images,
  slugStr,
  source,
  tapHint,
  showUI,
  readingMode = "full",
  imageScaling = "fitwidth",
  pageSpacing = "none",
  nextChapterSlug,
}: ReaderImagesProps) {
  const [activePage, setActivePage] = useState(0);
  const [prevSlug, setPrevSlug] = useState(slugStr);
  const fetchedNextChapterRef = useRef<string | null>(null);

  // Helper untuk parsing slug chapter berikutnya
  const parseNextChapterSlug = (nextSlug: string, defaultSource: string) => {
    if (nextSlug.startsWith("chapter/")) {
      const parts = nextSlug.split("/");
      const source = parts[1] || defaultSource;
      const slugStr = parts.slice(2).join("/");
      return { source, slugStr };
    }
    return { source: defaultSource, slugStr: nextSlug };
  };

  // Reset activePage saat chapter berganti (di tingkat render)
  if (slugStr !== prevSlug) {
    setPrevSlug(slugStr);
    setActivePage(0);
  }

  // Reset status prefetch saat chapter berganti
  useEffect(() => {
    fetchedNextChapterRef.current = null;
  }, [slugStr]);

  // Track active page menggunakan IntersectionObserver
  useEffect(() => {
    if (images.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0,
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = Number((entry.target as HTMLImageElement).dataset.page) || 0;
          setActivePage(idx);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const imgs = document.querySelectorAll<HTMLImageElement>("img[data-page]");
    imgs.forEach((img) => observer.observe(img));

    return () => observer.disconnect();
  }, [images, slugStr]);

  // Preload 2 halaman berikutnya di chapter saat ini
  useEffect(() => {
    const preloadIndices = [activePage + 1, activePage + 2];
    preloadIndices.forEach((idx) => {
      if (idx < images.length) {
        const nextSrc = images[idx];
        const candidates = getChapterImageCandidates(source, nextSrc);
        const primarySrc = candidates[0] || nextSrc;
        if (primarySrc) {
          const img = new Image();
          img.src = primarySrc;
        }
      }
    });
  }, [activePage, images, source]);

  // Preload metadata & gambar pertama chapter selanjutnya
  useEffect(() => {
    if (!nextChapterSlug || images.length === 0) return;

    const isNearEnd = activePage >= images.length - 3;
    if (!isNearEnd) return;

    if (fetchedNextChapterRef.current === nextChapterSlug) return;
    fetchedNextChapterRef.current = nextChapterSlug;

    const { source: nextSource, slugStr: nextCleanSlug } = parseNextChapterSlug(
      nextChapterSlug,
      source
    );

    let apiPath = `https://api.ryukomik.web.id/${nextSource}/chapter/${nextCleanSlug}`;
    if (nextSource === "project") {
      apiPath = `/api/project/chapter/${nextCleanSlug}`;
    }

    fetch(apiPath)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data chapter selanjutnya");
        return res.json();
      })
      .then((json) => {
        if (json && json.success && Array.isArray(json.images)) {
          // Preload 3 gambar pertama dari chapter selanjutnya
          const nextImages = json.images.slice(0, 3);
          nextImages.forEach((imgUrl: string) => {
            const candidates = getChapterImageCandidates(nextSource, imgUrl);
            const primarySrc = candidates[0] || imgUrl;
            if (primarySrc) {
              const img = new Image();
              img.src = primarySrc;
            }
          });
        }
      })
      .catch((err) => {
        console.warn("Preload chapter selanjutnya gagal:", err);
      });
  }, [activePage, images.length, nextChapterSlug, source]);

  const containerClass = getContainerClass(readingMode, pageSpacing);
  const imgStyle = getImgStyle(imageScaling);
  const preloadUrls = useMemo(
    () =>
      images
        .slice(0, PRELOAD_IMAGE_COUNT)
        .map((src) => getChapterImageCandidates(source, src)[0])
        .filter(Boolean),
    [images, source],
  );

  useEffect(() => {
    const origins = Array.from(new Set(preloadUrls.map(getImageOrigin).filter(Boolean)));
    const links = [
      ...origins.map((origin) => {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        link.crossOrigin = "anonymous";
        return link;
      }),
      ...preloadUrls.map((url) => {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = url;
        link.fetchPriority = "high";
        return link;
      }),
    ];

    links.forEach((link) => document.head.appendChild(link));
    return () => links.forEach((link) => link.remove());
  }, [preloadUrls]);

  return (
    <>
      <div className={containerClass}>
        {images.map((src, i) => (
          <ReaderImage
            key={`${source}-${slugStr}-${i}`}
            src={src}
            source={source}
            slugStr={slugStr}
            index={i}
            imgStyle={imgStyle}
            imageScaling={imageScaling}
            readingMode={readingMode}
          />
        ))}
      </div>

      <div
        data-no-tap
        className="fixed bottom-0 left-0 right-0 z-[5] pointer-events-none"
        style={{ height: `${BOTTOM_ZONE * 100}vh` }}
      >
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: "transparent",
            opacity: showUI ? 1 : 0.4,
          }}
        />
        {tapHint && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
            <FiArrowDown size={20} className="text-white/40 animate-bounce" />
          </div>
        )}
        {showUI && (
          <p className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/20 text-xs whitespace-nowrap select-none pointer-events-none">
            Tap bawah untuk scroll
          </p>
        )}
      </div>
    </>
  );
}
