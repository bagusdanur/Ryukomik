import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { socialQuery } from "@/lib/social/db";

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function authBaseUrl(): string {
  return (process.env.AUTH_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://ryukomik.web.id").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return `${authBaseUrl()}/api/auth/google/callback`;
}

/** State + PKCE: disimpan di DB supaya callback bisa memverifikasi. */
export async function createOAuthState(nextUrl: string): Promise<{ state: string; challenge: string }> {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  // Bersihkan state lama supaya tabel tidak bisa ditumbuhi request berulang.
  await socialQuery("delete from auth_oauth_states where created_at < now() - interval '30 minutes'").catch(() => undefined);

  await socialQuery(
    "insert into auth_oauth_states (state, code_verifier, next_url) values ($1,$2,$3)",
    [state, verifier, nextUrl.slice(0, 500)],
  );

  return { state, challenge };
}

export async function consumeOAuthState(state: string): Promise<{ verifier: string; nextUrl: string } | null> {
  const { rows } = await socialQuery<{ code_verifier: string; next_url: string | null }>(
    "delete from auth_oauth_states where state = $1 and created_at > now() - interval '30 minutes' returning code_verifier, next_url",
    [state],
  );
  const row = rows[0];
  if (!row) return null;
  return { verifier: row.code_verifier, nextUrl: row.next_url || "/" };
}

export function buildGoogleAuthUrl(state: string, challenge: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/**
 * Menukar authorization code ke token Google.
 *
 * `id_token` diterima lewat HTTPS langsung dari endpoint token Google, lalu
 * klaimnya divalidasi (iss, aud, exp, email_verified). Tanda tangan tidak
 * diverifikasi ulang karena respons ini bukan berasal dari browser.
 */
export async function exchangeGoogleCode(code: string, verifier: string): Promise<GoogleIdentity | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) return null;
  const json = (await response.json()) as { id_token?: string };
  if (!json.id_token) return null;

  const parts = json.id_token.split(".");
  if (parts.length !== 3) return null;

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }

  const aud = String(claims.aud || "");
  const iss = String(claims.iss || "");
  const exp = Number(claims.exp || 0);
  const sub = String(claims.sub || "");
  const email = String(claims.email || "");
  if (!sub || !email) return null;
  if (aud !== process.env.GOOGLE_CLIENT_ID) return null;
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") return null;
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return null;

  return {
    sub,
    email,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: typeof claims.name === "string" ? claims.name : null,
    picture: typeof claims.picture === "string" ? claims.picture : null,
  };
}
