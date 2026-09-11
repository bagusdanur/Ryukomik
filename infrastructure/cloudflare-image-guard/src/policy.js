export const ALLOWED_HOSTS = new Set([
  "ryukomik.my.id",
  "www.ryukomik.my.id",
]);

export function isChapterPath(pathname) {
  return pathname.startsWith("/chapters/") && !pathname.includes("..") && pathname.length > 10;
}

export function isOfficialRequest(request) {
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return ALLOWED_HOSTS.has(new URL(referer).hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  // Some privacy modes omit Referer but still expose that the request came
  // from another host under the same registrable Ryukomik domain.
  return request.headers.get("sec-fetch-site")?.toLowerCase() === "same-site";
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function hasValidImageCookie(request, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("cookie") || "";
  const value = header.split(/;\s*/).find((part) => part.startsWith("ryu_image_access="))?.slice("ryu_image_access=".length);
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== "v2" || !/^\d+$/.test(parts[1]) || !/^[A-Za-z0-9_-]{12,}$/.test(parts[2]) || !/^[A-Za-z0-9_-]+$/.test(parts[3])) return false;
  const expires = Number(parts[1]);
  if (expires <= now || expires > now + 3 * 60 * 60) return false;
  let scope;
  try {
    const normalized = parts[3].replace(/-/g, "+").replace(/_/g, "/");
    scope = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  } catch { return false; }
  if (!scope.startsWith("/chapters/") || !scope.endsWith("/") || !new URL(request.url).pathname.startsWith(scope)) return false;
  const payload = parts.slice(0, 4).join(".");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return constantTimeEqual(base64url(new Uint8Array(signed)), parts[4]);
}
