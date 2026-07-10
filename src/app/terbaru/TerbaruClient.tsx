"use client";
import ComicCard from "@/components/terbaru/ComicCard";
import SkeletonCard from "@/components/terbaru/SkeletonCard";
import FilterPanel from "@/components/terbaru/FilterPanel";
import HeaderBar from "@/components/terbaru/HeaderBar";
import NotificationDropdown from "@/components/terbaru/NotificationDropdown";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoginModal from "@/components/LoginModal";
import { useRouter } from "next/navigation";
import AgeModal from "@/components/AgeModal";
import {
  TITLE_RUSH_EVENT_TYPE,
} from "@/utils/titleRushNotification";
import { clearNotificationCache, fetchCachedNotifications } from "@/utils/notificationFetch";
import { useHistoryStore } from "@/store/historyStore";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import type { NotificationItem, SourceId, TerbaruFilters, UpdateItem } from "@/types/content";
import type { ReadHistoryItem } from "@/types/user";

type FetchOptions = RequestInit & {
  signal?: AbortSignal;
};

interface TerbaruClientProps {
  initialData?: UpdateItem[];
  initialFilters?: TerbaruFilters | null;
  initialSource?: SourceId;
}

interface SourceResponse {
  data?: unknown;
}



const SOURCE_API_BASE_URL = "https://api.ryukomik.web.id";
const LISTING_CACHE_PREFIX = "rk_terbaru_listing_v3";
const LISTING_CACHE_TTL = 5 * 60 * 1000;
const VALID_SOURCES = new Set<SourceId>(["kiryuu", "komiku", "luvyaa", "sekte", "doujindesu", "meionovels"]);

async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat fetch ${url}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`Response bukan JSON saat fetch ${url}`);
  }

  return res.json();
}

function buildSourceUrl(source: SourceId, endpoint: string, params?: URLSearchParams) {
  const path = `${source}/${endpoint}`;
  const query = params?.toString();
  return `${SOURCE_API_BASE_URL}/${path}${query ? `?${query}` : ""}`;
}

function normalizeStoredSource(value: string | null, fallback: SourceId): SourceId {
  return VALID_SOURCES.has(value as SourceId) ? (value as SourceId) : fallback;
}

function normalizeListingItems(items: unknown, source: SourceId): UpdateItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): UpdateItem | null => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Partial<UpdateItem>;
      const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      if (!slug || !title) return null;

      const itemSource = normalizeStoredSource(
        typeof entry.source === "string" ? entry.source : null,
        source,
      );

      return {
        slug,
        title,
        source: itemSource,
        image: typeof entry.image === "string" ? entry.image : "",
        info: typeof entry.info === "string" ? entry.info : "",
        type_genre: typeof entry.type_genre === "string" ? entry.type_genre : "",
        chapter_terbaru:
          typeof entry.chapter_terbaru === "string" ? entry.chapter_terbaru : "",
      };
    })
    .filter((item): item is UpdateItem => Boolean(item));
}

function getListingCacheKey(
  source: SourceId,
  page: number,
  orderby: string,
  tipe: string,
  genre: string,
  genre2: string,
  status: string,
) {
  return [
    LISTING_CACHE_PREFIX,
    source,
    page,
    orderby || "-",
    tipe || "-",
    genre || "-",
    genre2 || "-",
    status || "-",
  ].join(":");
}

function isValidListingCache(data: unknown, source: SourceId): data is UpdateItem[] {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((item) => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Partial<UpdateItem>;
      return (
        typeof entry.slug === "string" &&
        entry.slug.length > 0 &&
        typeof entry.title === "string" &&
        entry.title.length > 0 &&
        (!entry.source || entry.source === source)
      );
    })
  );
}

function readListingCache(key: string, source: SourceId): UpdateItem[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; data?: UpdateItem[] };
    if (!parsed.at || Date.now() - parsed.at > LISTING_CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    if (!isValidListingCache(parsed.data, source)) {
      sessionStorage.removeItem(key);
      return null;
    }
    return normalizeListingItems(parsed.data, source);
  } catch {
    return null;
  }
}

function writeListingCache(key: string, source: SourceId, data?: UpdateItem[]) {
  const normalized = normalizeListingItems(data, source);
  if (!isValidListingCache(normalized, source)) return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data: normalized }));
  } catch {
    // Storage penuh/private mode: abaikan, network tetap jalan normal.
  }
}

export default function TerbaruPage({
  initialData = [],
  initialFilters = null,
  initialSource = "komiku",
}: TerbaruClientProps) {
  const initialListing = useMemo(
    () => normalizeListingItems(initialData, initialSource),
    [initialData, initialSource],
  );
  const [data, setData] = useState<UpdateItem[]>(initialListing);
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const history = useHistoryStore((state) => state.history);
  const loadingRef = useRef(false);
  const { user } = useSupabaseUser();
  const userId = user?.id || null;
  const [showLogin, setShowLogin] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const router = useRouter();

  // ✅ REFS untuk dedupe & cleanup
  const abortRef = useRef<AbortController | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const [source, setSource] = useState<SourceId>(initialSource);

  // ✅ AUTH: dedupe session fetch
  // ✅ NOTIFIKASI: cleanup channel saat unmount / user change
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const nextNotifications = await fetchCachedNotifications(userId);
      setNotifications(nextNotifications);
      setUnreadCount(nextNotifications.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [userId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(id);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (tab: "notif" | "info" = "notif") => {
    if (unreadCount === 0 || !user?.id) return;

    try {
      if (tab === "info") {
        setNotifications((prev) => {
          const next = prev.map((notification) =>
            notification.type === TITLE_RUSH_EVENT_TYPE
              ? { ...notification, is_read: true }
              : notification,
          );
          setUnreadCount(next.filter((notification) => !notification.is_read).length);
          return next;
        });
        return;
      }

      const unreadRegularIds = notifications
        .filter(
          (notification) =>
            !notification.is_read &&
            notification.type !== TITLE_RUSH_EVENT_TYPE &&
            !String(notification.id).startsWith("title-rush-event-"),
        )
        .map((notification) => notification.id);

      if (!unreadRegularIds.length) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .in("id", unreadRegularIds);

      if (error) throw error;

      clearNotificationCache(user.id);
      setNotifications((prev) => {
        const readIds = new Set(unreadRegularIds);
        const next = prev.map((notification) =>
          readIds.has(notification.id) ? { ...notification, is_read: true } : notification,
        );
        setUnreadCount(next.filter((notification) => !notification.is_read).length);
        return next;
      });
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }, [notifications, unreadCount, user]);

  const [targetSource, setTargetSource] = useState<SourceId | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<TerbaruFilters | null>(initialFilters);
  const [orderby, setOrderby] = useState("modified");
  const [tipe, setTipe] = useState("");
  const [genre, setGenre] = useState("");
  const [genre2, setGenre2] = useState("");
  const [status, setStatus] = useState("");
  const initialListingUsedRef = useRef(initialListing.length > 0);
  const dataLengthRef = useRef(initialListing.length);

  useEffect(() => {
    dataLengthRef.current = data.length;
  }, [data.length]);

  // ✅ FILTER: cache 24 jam + abort controller
  useEffect(() => {
    const controller = new AbortController();
    
    async function getFilters() {
      if (initialFilters) return;

      try {
        const json = await fetchJson<{ data?: TerbaruFilters }>(buildSourceUrl("komiku", "filters"), {
          signal: controller.signal,
        });
        setFilters(json.data ?? null);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          console.error("Gagal ambil filter:", e);
        }
      }
    }

    getFilters();
    return () => controller.abort();
  }, [initialFilters]);

  const extractChapter = useCallback((text?: string, slug?: string) => {
    let raw = "";

    // 1. Ambil dari text dulu jika mengandung kata "Chapter" atau "Ch"
    if (text) {
      const match = text.match(/(?:chapter|ch)\s*(\d+(\.\d+)?)/i);
      if (match) {
        raw = match[1];
      } else {
        // Jika text hanya mengandung angka di akhir (biasanya "Judul 01")
        const endMatch = text.match(/(\d+(\.\d+)?)$/);
        if (endMatch) {
          raw = endMatch[1];
        }
      }
    }

    // 2. Fallback dari slug
    if (!raw && slug) {
      // Cari pola "chapter-X" atau "ch-X"
      const match = slug.match(/(?:chapter|ch)[-/](\d+(\.\d+)?)/i);
      if (match) {
        raw = match[1];
      } else {
        // Fallback: ambil angka terakhir di slug jika ada
        const lastNumMatch = slug.match(/(\d+)(?!.*\d)/);
        if (lastNumMatch) {
          raw = lastNumMatch[1];
        }
      }
    }

    // 🔥 POTONG ANGKA SETELAH TITIK
    if (raw.includes(".")) {
      raw = raw.split(".")[0];
    }

    // Hapus leading zero (misal "01" -> "1")
    if (raw) {
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        return `Ch. ${num}`;
      }
    }

    return raw ? `Ch. ${raw}` : "Ch. 1";
  }, []);

  // ✅ MEMOIZE getLastRead
  const getLastRead = useCallback((comicSlug: string) => {
    const item = history.find((h) => h.comicSlug === comicSlug);
    if (!item) return null;
    return {
      ...item,
      lastChapter: extractChapter(item.lastChapter, item.lastChapterSlug),
    };
  }, [history, extractChapter]);

  const resetListing = useCallback(() => {
    setData([]);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
  }, []);

  useEffect(() => {
    if (initialListing.length === 0) return;
    const key = getListingCacheKey(
      initialSource,
      1,
      "modified",
      "",
      "",
      "",
      "",
    );
    writeListingCache(key, initialSource, initialListing);
  }, [initialListing, initialSource]);

  const isInitialized = useRef(false);

  // ✅ FETCH DATA: cache + abort + dedupe
  const fetchData = useCallback(async (p: number, currentSource: SourceId = source) => {
    if (p !== 1 && loadingRef.current) return;

    const cacheKey = getListingCacheKey(
      currentSource,
      p,
      orderby,
      tipe,
      genre,
      genre2,
      status,
    );
    const cached = readListingCache(cacheKey, currentSource);
    if (cached?.length) {
      setData((prev) => {
        if (p === 1) return cached;
        const existingSlugs = new Set(prev.map((item) => item.slug));
        const newData = cached.filter((item) => !existingSlugs.has(item.slug));
        return [...prev, ...newData];
      });
      setHasMore(true);
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    // Abort request sebelumnya
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortRef.current = controller;

    loadingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      let url = "";
      const params = new URLSearchParams();
      params.append("page", String(p));

      switch (currentSource) {
        case "komiku":
          if (orderby) params.append("orderby", orderby);
          if (tipe) params.append("tipe", tipe);
          if (genre) params.append("genre", genre);
          if (genre2) params.append("genre2", genre2);
          if (status) params.append("status", status);
          url = buildSourceUrl("komiku", "pustaka-filter", params);
          break;
        case "kiryuu":
          url = buildSourceUrl("kiryuu", "pustaka", params);
          break;
        case "luvyaa":
          url = buildSourceUrl("luvyaa", "pustaka", params);
          break;
        case "sekte":
          url = buildSourceUrl("sekte", "pustaka", params);
          break;
        case "doujindesu":
          url = buildSourceUrl("doujindesu", "pustaka", params);
          break;
        case "meionovels":
          url = buildSourceUrl("meionovels", "pustaka", params);
          break;
        default:
          console.error("Unknown source:", currentSource);
          loadingRef.current = false;
          setLoading(false);
          return;
      }

      const json = await fetchJson<SourceResponse>(url, {
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) return;

      const nextData = normalizeListingItems(json.data, currentSource);

      if (nextData.length > 0) {
        writeListingCache(cacheKey, currentSource, nextData);
        setData((prev) => {
          if (p === 1) return nextData;
          const existingSlugs = new Set(prev.map((item) => item.slug));
          const newData = nextData.filter((item) => !existingSlugs.has(item.slug));
          return [...prev, ...newData];
        });
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        console.error("Fetch error:", e);
        setError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        loadingRef.current = false;
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }
  }, [source, orderby, tipe, genre, genre2, status]);

  // ✅ SCROLL: debounce + cleanup
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeoutRef.current) return;
      
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        
        const bottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 200;

        if (bottom && !loadingRef.current && hasMore && !error) {
          const nextPage = pageRef.current + 1;
          pageRef.current = nextPage;
          setPage(nextPage);
          fetchData(nextPage);
        }
      }, 150); // Debounce 150ms
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [hasMore, fetchData, error]);

  // ✅ RESET & FETCH saat filter/source berubah
  useEffect(() => {
    let activeSource = source;

    if (!isInitialized.current) {
      isInitialized.current = true;
      const savedSource = normalizeStoredSource(localStorage.getItem("source"), initialSource);
      if (savedSource !== initialSource) {
        activeSource = savedSource;
        resetListing();
        setSource(savedSource);
        return;
      }
    }

    const canUseInitialListing =
      initialListingUsedRef.current &&
      dataLengthRef.current > 0 &&
      activeSource === initialSource &&
      orderby === "modified" &&
      !tipe &&
      !genre &&
      !genre2 &&
      !status;

    if (canUseInitialListing) {
      initialListingUsedRef.current = false;
      return;
    }

    initialListingUsedRef.current = false;

    fetchData(1, activeSource);

    // Cleanup abort saat unmount/dependency change
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [source, initialSource, orderby, tipe, genre, genre2, status, fetchData, resetListing]);

  // ✅ LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem("source", source);
  }, [source]);

  const [showAgeModal, setShowAgeModal] = useState(false);
  const [isAdult, setIsAdult] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAdult(localStorage.getItem("isAdult") === "true");
    }
  }, []);

  const handleAgeConfirm = () => {
    localStorage.setItem("isAdult", "true");
    setIsAdult(true);
    setShowAgeModal(false);

    if (!user) {
      setShowLogin(true);
      return;
    }

    if (targetSource) {
      if (targetSource === source) {
        if (data.length === 0 && !loadingRef.current) {
          fetchData(1, targetSource);
        }
      } else {
        resetListing();
        setSource(targetSource);
      }
      setTargetSource(null);
    }
  };

  // ✅ FIX: changeSource tidak didefinisikan sebelumnya, ganti dengan setSource
  useEffect(() => {
    if (user && targetSource) {
      const timer = setTimeout(() => {
        if (targetSource === source) {
          if (dataLengthRef.current === 0 && !loadingRef.current) {
            fetchData(1, targetSource);
          }
        } else {
          resetListing();
          setSource(targetSource);
        }
        setTargetSource(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, targetSource, source, fetchData, resetListing]);

  const handleSourceChange = useCallback((nextSource: SourceId) => {
    if (nextSource === source) {
      if (dataLengthRef.current === 0 && !loadingRef.current) {
        fetchData(1, nextSource);
      }
      return;
    }

    resetListing();
    setSource(nextSource);
  }, [fetchData, resetListing, source]);

  return (
    <div className="rk-page rk-app-surface">
      <HeaderBar
        user={user}
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        setShowLogin={setShowLogin}
        onSearch={(e) => {
          e.preventDefault();
          const searchInput = e.currentTarget.elements.namedItem("search");
          const q = searchInput instanceof HTMLInputElement ? searchInput.value.trim() : "";
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        }}
        source={source}
        setSource={handleSourceChange}
        setShowAgeModal={setShowAgeModal}
        isAdult={isAdult}
        setTargetSource={setTargetSource}
      >
        <NotificationDropdown
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          showNotif={showNotif}
          setShowNotif={setShowNotif}
          markAsRead={markAsRead}
          refreshNotifications={fetchNotifications}
        />
      </HeaderBar>

      {showAgeModal && (
        <AgeModal
          onConfirm={handleAgeConfirm}
          onClose={() => setShowAgeModal(false)}
        />
      )}

      <main className="rk-shell px-4 pt-20 pb-24">
      <FilterPanel
        showFilter={showFilter}
        filters={filters || {}}
        tipe={tipe}
        status={status}
        genre={genre}
        genre2={genre2}
        setTipe={(nextTipe) => {
          resetListing();
          setTipe(nextTipe);
        }}
        setStatus={(nextStatus) => {
          resetListing();
          setStatus(nextStatus);
        }}
        setGenre={(nextGenre) => {
          resetListing();
          setGenre(nextGenre);
        }}
        setGenre2={(nextGenre2) => {
          resetListing();
          setGenre2(nextGenre2);
        }}
        setOrderby={(nextOrderby) => {
          resetListing();
          setOrderby(nextOrderby);
        }}
        setPage={setPage}
        setData={setData}
        setHasMore={setHasMore}
        fetchData={fetchData}
      />

      <div
        key={`${source}:${orderby}:${tipe}:${genre}:${genre2}:${status}`}
        className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      >
        {data.map((item, i) => (
          <ComicCard
            key={`${item.source || source}:${item.slug || i}`}
            item={item}
            lastRead={getLastRead(item.slug)}
            source={source}
          />
        ))}

        {loading &&
          Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}

        {error && (
          <div className="col-span-full py-8 text-center flex flex-col items-center justify-center">
            <p className="text-red-400 mb-3">Gagal memuat data. Silakan coba lagi.</p>
            <button
              onClick={() => fetchData(page, source)}
              className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 font-medium transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {!loading && !error && data.length === 0 && (
         <div className="py-12 text-center text-white/50">
           Data tidak ditemukan
         </div>
      )}
      </main>

      {showNotif && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotif(false)}
        />
      )}

      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </div>
  );
}
