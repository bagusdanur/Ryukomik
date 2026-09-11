import promoImage from "../assets/hotlink-promo.png";
import { hasValidImageCookie, isChapterPath, isOfficialRequest } from "./policy.js";

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
    return Response.json({ enabled: await guardEnabled(env) }, { headers: { "cache-control": "private, no-store" } });
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
  headers.set("cache-control", "public, max-age=31536000, immutable");
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
    const official = enabled ? isOfficialRequest(request) : false;
    const signed = enabled && official && await hasValidImageCookie(request, env.IMAGE_ACCESS_SECRET);
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
