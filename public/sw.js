const PREFIX = "rk";
const CACHE_VERSION = "v26";
const STATIC_CACHE = `${PREFIX}-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `${PREFIX}-images-${CACHE_VERSION}`;
const CHAPTER_CACHE = `${PREFIX}-chapter-${CACHE_VERSION}`;
const KOMIK_CACHE = `${PREFIX}-komik-${CACHE_VERSION}`;
const API_CACHE = `${PREFIX}-api-${CACHE_VERSION}`;
const FALLBACK_CACHE = `${PREFIX}-fallback-${CACHE_VERSION}`;

const CACHE_LIMITS = {
  [STATIC_CACHE]: 80,
  [IMAGE_CACHE]: 180,
  [CHAPTER_CACHE]: 120,
  [KOMIK_CACHE]: 80,
  [API_CACHE]: 160,
  [FALLBACK_CACHE]: 30,
};

const STATIC_ASSETS = [
  "/icon.png?v=20260523",
  "/manifest.json",
];

const PRIVATE_PATH_PREFIXES = [
  "/dashboard",
  "/setting",
  "/files",
  "/bookmark",
  "/history",
  "/premium",
  "/auth",
  "/u",
];

const NO_NAV_CACHE_PATHS = [
  "/terbaru",
];

const PRIVATE_API_PREFIXES = [
  "/api/social",
  "/api/comments",
  "/api/comment-like",
  "/api/reactions",
  "/api/xp",
];

function matchesPrefix(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isFresh(response, ttlSeconds) {
  if (!response) return false;
  const cachedAt = Number(response.headers.get("sw-cached-at") || 0);
  return cachedAt > 0 && Date.now() - cachedAt < ttlSeconds * 1000;
}

function isCacheable(response) {
  return response && response.status === 200;
}

function isImageResponse(response) {
  if (!isCacheable(response)) return false;
  const contentType = response.headers.get("content-type") || "";
  return contentType.startsWith("image/");
}

function responseWithTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", String(Date.now()));

  return response.blob().then(
    (body) =>
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
  );
}

async function trimCache(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;

  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

async function putCache(cacheName, request, response) {
  if (!isCacheable(response)) return;
  if (cacheName === IMAGE_CACHE && !isImageResponse(response)) return;

  const responseForCache = response.clone();
  const cache = await caches.open(cacheName);
  const cachedResponse = await responseWithTimestamp(responseForCache);
  await cache.put(request, cachedResponse);
  await trimCache(cacheName);
}

function networkFirst(request, cacheName, ttlSeconds) {
  return caches.match(request).then((cached) => {
    if (isFresh(cached, ttlSeconds)) return cached;

    return fetch(request)
      .then((response) => {
        putCache(cacheName, request, response).catch((err) => {
          console.warn("[SW] Cache put failed:", err.message);
        });
        return response;
      })
      .catch(() => cached || Response.error());
  });
}

function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;

    return fetch(request).then((response) => {
      putCache(cacheName, request, response).catch((err) => {
        console.warn("[SW] Cache put failed:", err.message);
      });
      return response;
    });
  });
}

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return Promise.all(
          STATIC_ASSETS.map((url) => {
            return fetch(url)
              .then((response) => {
                if (!response || response.status !== 200) {
                  console.warn(`[SW] Skip: ${url}`);
                  return null;
                }
                return cache.put(url, response);
              })
              .catch((err) => {
                console.error(`[SW] Failed: ${url}`, err.message);
                return null;
              });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith(PREFIX) && !name.includes(CACHE_VERSION))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && matchesPrefix(url.pathname, PRIVATE_API_PREFIXES)) {
    return;
  }

  if (sameOrigin && matchesPrefix(url.pathname, PRIVATE_PATH_PREFIXES)) {
    return;
  }

  if (sameOrigin && matchesPrefix(url.pathname, NO_NAV_CACHE_PATHS)) {
    return;
  }

  if (
    sameOrigin &&
    (url.pathname === "/api/source" || url.pathname.startsWith("/api/source/"))
  ) {
    const ttl = url.pathname.includes("/chapter")
      ? 86400
      : url.pathname.includes("/filters") || url.pathname.includes("/list")
        ? 3600
      : url.pathname.includes("/detail")
        ? 3600
        : url.pathname.includes("/search")
          ? 300
          : 600;

    event.respondWith(networkFirst(request, API_CACHE, ttl));
    return;
  }

  if (sameOrigin && url.pathname.startsWith("/api/image")) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (sameOrigin && url.pathname.startsWith("/api")) return;

  // Chapter Project berisi URL navigasi yang dapat berubah saat admin mengatur
  // chapter. Jangan layani dari PWA cache agar Next/Prev tidak tertinggal.
  if (url.pathname.startsWith("/chapter/project/")) {
    return;
  }

  if (url.pathname.startsWith("/chapter")) {
    event.respondWith(
      networkFirst(request, CHAPTER_CACHE, 900)
    );
    return;
  }

  if (url.pathname.startsWith("/komik")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            putCache(KOMIK_CACHE, request, response).catch((err) => {
              console.warn("[SW] Cache put failed:", err.message);
            });
            return response;
          })
          .catch(() => {
            if (cached) return cached;
            return caches.match("/").then((home) => home || Response.error());
          });
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (/\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          if (sameOrigin && matchesPrefix(url.pathname, PRIVATE_PATH_PREFIXES)) return response;
          putCache(FALLBACK_CACHE, request, response).catch((err) => {
            console.warn("[SW] Cache put failed:", err.message);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match("/").then((home) => {
              if (home) return home;
              return new Response(
                "<html><body style='background:#000;color:#fff;text-align:center;padding:50px;'><h1>Offline</h1><p>Halaman tidak tersedia offline.</p></body></html>",
                { headers: { "Content-Type": "text/html" } }
              );
            });
          });
        })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// === PUSH NOTIFICATION ===
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Chapter Baru!";
  const options = {
    body: data.body || "Ada chapter baru dari komik bookmarkmu",
    icon: "/icon.png?v=20260523",
    image: data.image, // Gambar banner komik (opsional)
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
    tag: data.tag || "new-chapter",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Klik notifikasi → buka halaman
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
