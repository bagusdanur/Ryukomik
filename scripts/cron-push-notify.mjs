import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";
import dotenv from "dotenv";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@ryukomik.web.id";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("Environment variables belum lengkap!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CONTENT_API_URL = "https://api.ryukomik.web.id";
const LOCAL_APP_URL = process.env.PUSH_NOTIFY_LOCAL_URL || "http://127.0.0.1:3000";
const configuredProjectCacheTtl = Number.parseInt(process.env.PUSH_NOTIFY_PROJECT_CACHE_TTL_MS || "3600000", 10);
const PROJECT_CACHE_TTL_MS = Number.isFinite(configuredProjectCacheTtl) && configuredProjectCacheTtl > 0
  ? configuredProjectCacheTtl
  : 3_600_000;
const PROJECT_CACHE_PATH = process.env.PUSH_NOTIFY_PROJECT_CACHE_PATH
  || path.join(tmpdir(), "ryukomik-push-notify-project.json");

// Mencakup semua source aktif di src/config/sources.ts.
// Project memakai aplikasi lokal agar cron tidak menambah egress eksternal.
const SOURCES = [
  { id: "ikiru", apiUrl: `${CONTENT_API_URL}/ikiru/pustaka?page=1`, path: "comic" },
  { id: "komikid", apiUrl: `${CONTENT_API_URL}/komikid/pustaka?page=1`, path: "comic" },
  { id: "luvyaa", apiUrl: `${CONTENT_API_URL}/luvyaa/pustaka?page=1`, path: "comic" },
  { id: "komiku", apiUrl: `${CONTENT_API_URL}/komiku/pustaka?page=1`, path: "comic" },
  { id: "kiryuu", apiUrl: `${CONTENT_API_URL}/kiryuu/pustaka?page=1`, path: "comic" },
  { id: "sekte", apiUrl: `${CONTENT_API_URL}/sekte/pustaka?page=1`, path: "comic", isNSFW: true },
  { id: "doujindesu", apiUrl: `${CONTENT_API_URL}/doujindesu/pustaka?page=1`, path: "comic", isNSFW: true },
  { id: "meionovels", apiUrl: `${CONTENT_API_URL}/meionovels/pustaka?page=1`, path: "novel" },
  { id: "project", apiUrl: `${LOCAL_APP_URL}/api/project/pustaka?limit=50`, path: "project" },
];

function getList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  return Object.values(json || {}).find((value) => Array.isArray(value)) || [];
}

async function readProjectCache() {
  try {
    const cache = JSON.parse(await readFile(PROJECT_CACHE_PATH, "utf8"));
    if (!cache || !Number.isFinite(cache.cachedAt) || !cache.data) return null;
    return cache;
  } catch {
    return null;
  }
}

async function writeProjectCache(data) {
  try {
    await mkdir(path.dirname(PROJECT_CACHE_PATH), { recursive: true });
    const temporaryPath = `${PROJECT_CACHE_PATH}.tmp`;
    await writeFile(temporaryPath, JSON.stringify({ cachedAt: Date.now(), data }), "utf8");
    await rename(temporaryPath, PROJECT_CACHE_PATH);
  } catch (error) {
    // Cache bersifat optimasi saja; kegagalan menulis tidak boleh menghentikan push.
    console.warn("Gagal menyimpan cache Project:", error.message);
  }
}

async function getSourcePayload(source) {
  const existingCache = source.id === "project" ? await readProjectCache() : null;
  if (existingCache && Date.now() - existingCache.cachedAt < PROJECT_CACHE_TTL_MS) {
    console.log("Memakai cache Project lokal.");
    return existingCache.data;
  }

  try {
    const res = await fetch(source.apiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    if (source.id === "project") await writeProjectCache(payload);
    return payload;
  } catch (error) {
    // Jika Supabase/endpoint Project sementara bermasalah, gunakan cache lama.
    if (existingCache) {
      console.warn("Endpoint Project gagal, memakai cache lama:", error.message);
      return existingCache.data;
    }
    throw error;
  }
}

function getSlug(item, source) {
  let slug = item.slug || item.link || item.detail_link;
  if (!slug || typeof slug !== "string") return null;

  const sourcePath = new RegExp(`/${source.id}/`, "i");
  if (sourcePath.test(slug)) slug = slug.split(sourcePath)[1];
  else if (slug.includes("/manga/")) slug = slug.split("/manga/")[1];
  else if (slug.includes("/series/")) slug = slug.split("/series/")[1];
  else if (slug.includes("/novel/")) slug = slug.split("/novel/")[1];

  return slug.replace(/^\/+|\/$/g, "");
}

function getPushUrl(source, slug, item) {
  if (source.path === "novel") {
    return item.chapter_slug ? `/novel/chapter/${item.chapter_slug}` : `/novel/${slug}`;
  }

  if (source.path === "project") {
    const chapterNumber = String(item.chapter_terbaru || "").match(/[\d.]+/i)?.[0];
    return chapterNumber
      ? `/chapter/project/${slug}/chapter-${chapterNumber}`
      : `/komik/project/${slug}`;
  }

  return `/komik/${source.id}/${slug}`;
}

// ── Batched Supabase lookups ────────────────────────────────────────────────
// The previous implementation issued 2-4 round-trips PER LIST ITEM
// (notified_chapters check → bookmark_sync → push_subscriptions → markNotified).
// With ~150 items across 9 sources re-checked every 15 minutes, that produced
// the ~14.5k/day notified_chapters traffic (each GET looked like
// `notified_chapters?select=id&comic_slug=in.(...)&chapter=eq.Chapter N&limit=1`).
// These helpers resolve the same lookups in a handful of batched queries so the
// cost stays roughly constant no matter how many items the lists return.
const BATCH_CHUNK = 200;
const SEP = "\u0000";

function chunked(values, size = BATCH_CHUNK) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) chunks.push(values.slice(i, i + size));
  return chunks;
}

// Returns a Set of `${comic_slug}${SEP}${chapter}` already recorded.
async function fetchNotifiedSet(pairs) {
  const slugs = [...new Set(pairs.map((p) => p.comic_slug))];
  const wanted = new Set(pairs.map((p) => `${p.comic_slug}${SEP}${p.chapter}`));
  const recorded = new Set();

  for (const slugsChunk of chunked(slugs)) {
    const { data, error } = await supabase
      .from("notified_chapters")
      .select("comic_slug, chapter")
      .in("comic_slug", slugsChunk);
    if (error) throw new Error(`notified_chapters: ${error.message}`);
    for (const row of data || []) {
      const key = `${row.comic_slug}${SEP}${row.chapter}`;
      if (wanted.has(key)) recorded.add(key);
    }
  }
  return recorded;
}

// Returns Map<`${comic_slug}${SEP}${source}`, userId[]>.
async function fetchBookmarksBySlugSource(slugs, sourceIds) {
  const map = new Map();
  for (const slugsChunk of chunked(slugs)) {
    const { data, error } = await supabase
      .from("bookmark_sync")
      .select("user_id, comic_slug, source")
      .in("comic_slug", slugsChunk);
    if (error) throw new Error(`bookmark_sync: ${error.message}`);
    for (const row of data || []) {
      if (!sourceIds.has(row.source)) continue;
      const key = `${row.comic_slug}${SEP}${row.source}`;
      const list = map.get(key);
      if (list) list.push(row.user_id);
      else map.set(key, [row.user_id]);
    }
  }
  return map;
}

// Returns Map<userId, subscription[]>.
async function fetchSubscriptionsByUser(userIds) {
  const map = new Map();
  for (const usersChunk of chunked(userIds)) {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .in("user_id", usersChunk);
    if (error) throw new Error(`push_subscriptions: ${error.message}`);
    for (const row of data || []) {
      const list = map.get(row.user_id);
      if (list) list.push(row);
      else map.set(row.user_id, [row]);
    }
  }
  return map;
}

async function runCron() {
  console.log(`[${new Date().toISOString()}] Memulai pengecekan chapter terbaru...`);
  let notifSentCount = 0;

  // Phase 1 — kumpulkan kandidat dari semua source (hanya fetch jaringan).
  const candidates = [];
  for (const source of SOURCES) {
    try {
      console.log(`Memeriksa source: ${source.id}`);
      const list = getList(await getSourcePayload(source));
      if (list.length === 0) {
        console.log(`Tidak ada data pustaka dari ${source.id}.`);
        continue;
      }

      for (const item of list) {
        if (!item.chapter_terbaru || (!item.slug && !item.link && !item.detail_link)) continue;

        const slug = getSlug(item, source);
        if (!slug) continue;

        const chapter = item.chapter_terbaru;
        candidates.push({
          source,
          item,
          slug,
          chapter,
          notificationKey: `${source.id}:${slug}`,
          title: item.title || "Chapter Baru",
        });
      }
    } catch (error) {
      console.error(`Terjadi kesalahan pada source ${source.id}:`, error);
    }
  }

  if (candidates.length === 0) {
    console.log(`[${new Date().toISOString()}] Tidak ada kandidat chapter. Selesai.`);
    return;
  }

  // Phase 2 — selesaikan notified/bookmark/subscription dengan query batch.
  // Key lama (slug polos) ikut dicek agar deploy ini tidak mengirim ulang
  // semua update yang sudah pernah tercatat oleh cron sebelumnya.
  const notifiedSet = await fetchNotifiedSet(
    candidates.flatMap((c) => [
      { comic_slug: c.notificationKey, chapter: c.chapter },
      { comic_slug: c.slug, chapter: c.chapter },
    ]),
  );

  const pending = candidates.filter(
    (c) => !notifiedSet.has(`${c.notificationKey}${SEP}${c.chapter}`),
  );
  if (pending.length === 0) {
    console.log(`[${new Date().toISOString()}] Semua chapter sudah pernah dinotifikasi. Selesai.`);
    return;
  }

  const sourceIds = new Set(pending.map((c) => c.source.id));
  const bookmarksBySlugSource = await fetchBookmarksBySlugSource(
    [...new Set(pending.map((c) => c.slug))],
    sourceIds,
  );

  // Bookmark wajib cocok pada slug DAN source. Sebelumnya slug yang sama
  // dari source lain dapat menerima notifikasi yang salah.
  const toNotify = [];
  for (const c of pending) {
    const userIds = [...new Set(bookmarksBySlugSource.get(`${c.slug}${SEP}${c.source.id}`) || [])];
    if (userIds.length === 0) {
      // Tidak ada yang bookmark → tetap tandai supaya tidak dicek ulang.
      toNotify.push({ ...c, markOnly: true });
      continue;
    }
    toNotify.push({ ...c, userIds });
  }

  const subscriptionsByUser = await fetchSubscriptionsByUser(
    [...new Set(toNotify.flatMap((c) => c.userIds || []))],
  );

  // Phase 3 — kirim push, kumpulkan semua baris untuk satu insert penanda.
  const toMark = [];
  for (const c of toNotify) {
    toMark.push({ comic_slug: c.notificationKey, chapter: c.chapter });

    if (c.markOnly) continue;

    const subscriptions = (c.userIds || []).flatMap(
      (userId) => subscriptionsByUser.get(userId) || [],
    );
    if (subscriptions.length === 0) continue;

    const pushUrl = getPushUrl(c.source, c.slug, c.item);
    const payload = JSON.stringify({
      title: c.title,
      body: c.source.isNSFW
        ? `${c.chapter} (18+) sudah rilis! Yuk baca sekarang.`
        : `${c.chapter} sudah rilis! Yuk baca sekarang.`,
      url: pushUrl,
      tag: c.notificationKey,
      image: c.source.isNSFW ? undefined : c.item.image,
    });

    console.log(`Mengirim ${c.source.id}/${c.slug} ${c.chapter} ke ${subscriptions.length} perangkat via ${pushUrl}`);
    await Promise.all(subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webPush.sendNotification(pushSubscription, payload);
        notifSentCount += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Gagal mengirim ke endpoint push:", error);
        }
      }
    }));
  }

  // Satu insert batch, bukan insert per item.
  for (const rows of chunked(toMark)) {
    const { error } = await supabase.from("notified_chapters").insert(rows);
    if (error) console.error("Gagal menandai chapter sebagai terkirim:", error.message);
  }

  console.log(`[${new Date().toISOString()}] Selesai. Total push terkirim: ${notifSentCount}`);
}

runCron();
