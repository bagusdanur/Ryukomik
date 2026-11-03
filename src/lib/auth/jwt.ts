import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * JWT milik sendiri (HS256) untuk auth lokal.
 *
 * Dipakai setelah login Google: server menerbitkan token access, lalu semua
 * endpoint /api memverifikasinya tanpa menyentuh layanan pihak ketiga.
 */
export type AuthClaims = {
  sub: string;
  iat: number;
  exp: number;
  typ: "access";
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signAccessToken(
  userId: string,
  secret: string,
  ttlSeconds = 60 * 60 * 24 * 7,
): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ sub: userId, iat: now, exp: now + ttlSeconds, typ: "access" }),
  );
  const signature = base64url(
    createHmac("sha256", secret).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token: string, secret: string): AuthClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const actual = fromBase64url(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const claims = JSON.parse(fromBase64url(payload).toString("utf8")) as AuthClaims;
    if (claims.typ !== "access") return null;
    if (!claims.sub || typeof claims.sub !== "string") return null;
    if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
