import promoImage from "../assets/hotlink-promo.png";
import { verifyImageCookie, cookieAllowsLock, isChapterPath, isOfficialRequest } from "./policy.js";

const PROMO_HEADERS = {
  "content-type": "image/png",
  // Never cache the denial by URL: the same URL must still work when the
  // visitor subsequently opens it through the official reader.
  "cache-control": "private, no-store, max-age=0",
  "x-ryukomik-image-guard": "promo",
  "x-content-type-options": "nosniff",
};

const CONTROL_PATH = "/__ryukomik/image-guard";
const CONFIG_KEY = "enabled";
const CONFIG_TTL_MS = 15_000;
let cachedEnabled = true;
let cachedUntil = 0;
const lockCache = new Map();

async function chapterLock(scope, env) {
  const cached = lockCache.get(scope);
  if (cached && Date.now() - cached.at < 15_000) return cached.lock;
  const response = await fetch(`https://ryukomik.my.id/api/internal/chapter-access?scope=${encodeURIComponent(scope)}`, {
    headers: { authorization: `Bearer ${env.IMAGE_ACCESS_SECRET}` }, cache: 'no-store',
  });
  if (!response.ok) throw new Error('Chapter access unavailable');
  const lock = await response.json();
  if (!Object.hasOwn(lock, 'premium_lock_until')) throw new Error('Chapter metadata invalid');
  if (lock.premium_lock_until && (!Number.isFinite(Date.parse(lock.premium_lock_until)) || !Number.isFinite(Date.parse(lock.premium_lock_started_at)))) throw new Error('Invalid lock dates');
  if (lockCache.size > 1000) lockCache.clear();
  lockCache.set(scope, { at: Date.now(), lock });
  return lock;
}

function authorizedControlRequest(request, env) {
  const expected = env.IMAGE_ACCESS_SECRET;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

async function guardEnabled(env) {
  if (Date.now() < cachedUntil) return cachedEnabled;
  try {
    cachedEnabled = (await env.HOTLINK_CONFIG.get(CONFIG_KEY)) !== "false";
    cachedUntil = Date.now() + CONFIG_TTL_MS;
  } catch {
    cachedEnabled = true;
    cachedUntil = Date.now() + 2_000;
  }
  return cachedEnabled;
}

async function controlResponse(request, env) {
  if (!authorizedControlRequest(request, env)) return new Response("Unauthorized", { status: 401 });
  if (request.method === "GET") {
    return Response.json({ enabled: await guardEnabled(env), premiumLockProtection: true }, { headers: { "cache-control": "private, no-store" } });
  }
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.scopes) || body.scopes.length > 100) return new Response('Invalid scopes', { status: 400 });
    body.scopes.forEach(scope => lockCache.delete(scope));
    return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  }
  if (request.method !== "PUT") return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, PUT" } });
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") return Response.json({ error: "Invalid enabled value" }, { status: 400 });
  await env.HOTLINK_CONFIG.put(CONFIG_KEY, String(body.enabled));
  cachedEnabled = body.enabled;
  cachedUntil = Date.now() + CONFIG_TTL_MS;
  return Response.json({ enabled: body.enabled }, { headers: { "cache-control": "private, no-store" } });
}

function promoResponse(request) {
  return new Response(request.method === "HEAD" ? null : promoImage, {
    status: 200,
    headers: PROMO_HEADERS,
  });
}

function objectHeaders(object) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store, max-age=0");
  headers.set("cdn-cache-control", "no-store");
  headers.set("accept-ranges", "bytes");
  headers.set("x-ryukomik-image-guard", "original");
  headers.set("x-content-type-options", "nosniff");
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === CONTROL_PATH) return controlResponse(request, env);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }

    if (!isChapterPath(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }
    const enabled = await guardEnabled(env);
    const official = isOfficialRequest(request);
    const cookie = await verifyImageCookie(request, env.IMAGE_ACCESS_SECRET);
    const signed = Boolean(cookie);
    const match = url.pathname.match(/^\/chapters\/([a-z0-9][a-z0-9-]*)\/(\d+(?:\.\d+)?)\//i);
    if (!match) return new Response('Not Found', { status: 404 });
    let lock;
    if (cookie?.grant !== 'preview') {
      try { lock = await chapterLock(`/chapters/${match[1].toLowerCase()}/${match[2]}/`, env); }
      catch { return new Response('Chapter access unavailable', { status: 503, headers: { 'cache-control': 'no-store' } }); }
      if (lock.premium_lock_until && Date.parse(lock.premium_lock_until) > Date.now() && (!official || !cookieAllowsLock(cookie, lock))) return new Response('Premium required', { status: 403, headers: { 'cache-control': 'no-store' } });
    }
    const transitionMode = env.REQUIRE_SIGNED_COOKIE !== "true";
    if (enabled && (!official || (!transitionMode && !signed))) return promoResponse(request);

    const key = decodeURIComponent(url.pathname.slice(1));
    const range = request.headers.get("range");
    const object = await env.COMICS.get(key, range ? { range: request.headers } : undefined);
    if (!object) {
      return new Response("Not Found", { status: 404, headers: { "cache-control": "no-store" } });
    }

    const headers = objectHeaders(object);
    headers.set("x-ryukomik-image-auth", enabled ? (signed ? "signed-cookie" : "transition") : "disabled");
    if (range && object.range) {
      const end = object.range.offset + object.range.length - 1;
      headers.set("content-range", `bytes ${object.range.offset}-${end}/${object.size}`);
      headers.set("content-length", String(object.range.length));
    } else {
      headers.set("content-length", String(object.size));
    }
    return new Response(request.method === "HEAD" ? null : object.body, {
      status: range && object.range ? 206 : 200,
      headers,
    });
  },
};
