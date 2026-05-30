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
import { ensureTitleRushWeeklyNotification } from "@/utils/titleRushNotification";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
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

function getHistory(): ReadHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem("read_history") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const SOURCE_API_BASE_URL = "https://mgkomik-backend-three.vercel.app";
const LISTING_CACHE_PREFIX = "rk_terbaru_listing_v3";
const LISTING_CACHE_TTL = 5 * 60 * 1000;
const VALID_SOURCES = new Set<SourceId>(["kiryuu", "komiku", "sekte", "meionovels"]);

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
  if (value === "doujindesu") return "sekte";
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
        ...entry,
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
  initialSource = "kiryuu",
}: TerbaruClientProps) {
  const initialListing = useMemo(
    () => normalizeListingItems(initialData, initialSource),
    [initialData, initialSource],
  );
  const [data, setData] = useState<UpdateItem[]>(initialListing);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [history] = useState(getHistory);
  const loadingRef = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const router = useRouter();

  // ✅ REFS untuk dedupe & cleanup
  const abortRef = useRef<AbortController | null>(null);
  const notifChannelRef = useRef<RealtimeChannel | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const [source, setSource] = useState<SourceId>(initialSource);

  // ✅ AUTH: dedupe session fetch
  const authInitRef = useRef(false);
  useEffect(() => {
    if (authInitRef.current) return;
    authInitRef.current = true;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user || null),
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ✅ NOTIFIKASI: cleanup channel saat unmount / user change
  useEffect(() => {
    if (!user) {
      // Cleanup channel lama kalau logout
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current);
        notifChannelRef.current = null;
      }
      return;
    }

    const fetchNotif = async () => {
      const eventNotif = await ensureTitleRushWeeklyNotification(user.id);

      const { data } = await supabase
        .from("notifications")
        .select("id, user_id, actor_id, actor_name, type, slug, chapter, target_id, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const nextNotifications = eventNotif
        ? [eventNotif, ...((data || []) as NotificationItem[])]
        : ((data || []) as NotificationItem[]);
      setNotifications(nextNotifications);
      setUnreadCount(nextNotifications.filter((n) => !n.is_read).length || 0);
    };

    fetchNotif();

    // Hapus channel lama sebelum subscribe baru
    if (notifChannelRef.current) {
      supabase.removeChannel(notifChannelRef.current);
    }

    notifChannelRef.current = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationItem, ...prev]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current);
        notifChannelRef.current = null;
      }
    };
  }, [user]);

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id);
    setUnreadCount(0);
  };

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

  const extractChapter = useCallback((text?: string) => {
    if (!text) return "";
    const match = text.match(/(?:ch\.?|chapter)\s*(\d+(\.\d+)?)/i);
    return match ? `Ch. ${match[1]}` : text;
  }, []);

  // ✅ MEMOIZE getLastRead
  const getLastRead = useCallback((comicSlug: string) => {
    const item = history.find((h) => h.comicSlug === comicSlug);
    if (!item) return null;
    return {
      ...item,
      lastChapter: extractChapter(item.lastChapter),
    };
  }, [history, extractChapter]);

  const resetListing = useCallback(() => {
    setData([]);
    setPage(1);
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

  useEffect(() => {
    const savedSource = normalizeStoredSource(localStorage.getItem("source"), initialSource);

    if (savedSource !== initialSource) {
      resetListing();
      setSource(savedSource);
    }
  }, [initialSource, resetListing]);

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
        case "sekte":
          url = buildSourceUrl("sekte", "pustaka", params);
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

        if (bottom && !loadingRef.current && hasMore) {
          setPage(prev => {
            const next = prev + 1;
            fetchData(next);
            return next;
          });
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
  }, [hasMore, fetchData]);

  // ✅ RESET & FETCH saat filter/source berubah
  useEffect(() => {
    const canUseInitialListing =
      initialListingUsedRef.current &&
      dataLengthRef.current > 0 &&
      source === initialSource &&
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

    const timer = setTimeout(() => {
      fetchData(1, source);
    }, 0);
    // Cleanup abort saat unmount/dependency change
    return () => {
      clearTimeout(timer);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [source, initialSource, orderby, tipe, genre, genre2, status, fetchData]);

  // ✅ LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem("source", source);
  }, [source]);

  const [showAgeModal, setShowAgeModal] = useState(false);
  const [isAdult, setIsAdult] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("isAdult") === "true";
  });

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
      </div>
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
