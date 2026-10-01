import { unstable_cache, revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const ADS_SETTING_KEY = "ads_config";
export const ADS_CACHE_TAG = "ads-config";

/** Mode validasi domain.
 *  - "bebas"     : domain apa saja boleh (asalkan lolos validasi bentuk)
 *  - "terkunci"  : hostname wajib ada di allowedHosts[]
 */
export type AdsValidationMode = "bebas" | "terkunci";

export type AdProvider = {
  id: string;
  name: string;
  enabled: boolean;
  scriptUrl: string;
  zoneId: string;
  imageUrl?: string;
  targetUrl?: string;
  createdAt?: string;
};

export type AdsConfig = {
  masterEnabled: boolean;
  validationMode: AdsValidationMode;
  allowedHosts: string[];
  providers: AdProvider[];
  updatedAt?: string | null;
  updatedBy?: string | null;
  previous?: {
    masterEnabled: boolean;
    validationMode: AdsValidationMode;
    allowedHosts: string[];
    providers: AdProvider[];
    updatedAt?: string | null;
    updatedBy?: string | null;
  } | null;
  configured?: boolean;
};

export type PublicAdProvider = {
  id: string;
  enabled: boolean;
  scriptUrl: string;
  zoneId: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
};

export type PublicAdsConfig = {
  masterEnabled: boolean;
  providers: PublicAdProvider[];
};

export const MAX_PROVIDERS = 10;

/** Default awal mengikuti konfigurasi produksi saat ini. */
export const fallbackAdsConfig: AdsConfig = {
  masterEnabled: true,
  validationMode: "bebas",
  allowedHosts: ["al5sm.com", "gaslah.my.id"],
  providers: [
    {
      id: "monetag",
      name: "Monetag",
      enabled: true,
      scriptUrl: "https://al5sm.com/tag.min.js",
      zoneId: "10944835",
      imageUrl: "",
      targetUrl: "",
    },
    {
      id: "rajaapk",
      name: "RajaAPK",
      enabled: true,
      scriptUrl: "https://gaslah.my.id/aan/siap/1788017146215-rajaapk.js",
      zoneId: "",
      imageUrl: "",
      targetUrl: "",
    },
  ],
  updatedAt: null,
  updatedBy: null,
  previous: null,
  configured: false,
};

// ── Helper ────────────────────────────────────────────────────────────────

function stripTags(input: unknown): string {
  return String(input ?? "")
    .replace(/[<>"]/g, "")
    .trim();
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0") return true;
  // hostname tanpa titik (mis. "internal") → blokir
  if (!host.includes(".")) return true;
  // IPv4 privat / loopback / link-local
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 0) return true;
  }
  // IPv6 loopback / link-local
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return true;
  }
  return false;
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

// ── Normalisasi ───────────────────────────────────────────────────────────

export function normalizeProviders(value?: unknown): AdProvider[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: AdProvider[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    let id = slugify(stripTags(item.id || item.name || ""));
    if (!id || id.length < 2) id = slugify(`ad-${out.length + 1}`);
    while (seen.has(id)) id = `${id}-${out.length + 1}`;
    seen.add(id);

    out.push({
      id,
      name: stripTags(item.name).slice(0, 48) || id,
      enabled: item.enabled !== false,
      scriptUrl: stripTags(item.scriptUrl),
      zoneId: stripTags(item.zoneId).replace(/[^\d]/g, ""),
      imageUrl: stripTags(item.imageUrl),
      targetUrl: stripTags(item.targetUrl),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
    });

    if (out.length >= MAX_PROVIDERS) break;
  }
  return out;
}

export function normalizeAdsConfig(value?: Partial<AdsConfig> | null): AdsConfig {
  const mode: AdsValidationMode = value?.validationMode === "terkunci" ? "terkunci" : "bebas";
  const allowedHosts = Array.isArray(value?.allowedHosts)
    ? value.allowedHosts
        .map((h) => String(h || "").toLowerCase().replace(/^www\./, "").trim())
        .filter(Boolean)
    : fallbackAdsConfig.allowedHosts;

  return {
    masterEnabled: value?.masterEnabled !== false,
    validationMode: mode,
    allowedHosts: allowedHosts.length ? allowedHosts : fallbackAdsConfig.allowedHosts,
    providers: normalizeProviders(value?.providers),
    updatedAt: value?.updatedAt ?? null,
    updatedBy: value?.updatedBy ?? null,
    previous: value?.previous ?? null,
    configured: value?.configured ?? false,
  };
}

// ── Validasi ──────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true; config: AdsConfig; newHosts: string[] }
  | { ok: false; error: string; config?: never; newHosts?: never };

/** Validasi input dari admin. Mengembalikan config yang sudah dinormalisasi. */
export function validateAdsConfig(input: {
  masterEnabled?: unknown;
  validationMode?: unknown;
  allowedHosts?: unknown;
  providers?: unknown;
}): ValidationResult {
  const mode: AdsValidationMode = input.validationMode === "terkunci" ? "terkunci" : "bebas";
  const allowedHosts = Array.isArray(input.allowedHosts)
    ? input.allowedHosts
        .map((h) => String(h || "").toLowerCase().replace(/^www\./, "").trim())
        .filter(Boolean)
    : fallbackAdsConfig.allowedHosts;

  const rawProviders = Array.isArray(input.providers) ? input.providers : [];
  if (rawProviders.length > MAX_PROVIDERS) {
    return { ok: false, error: `Maksimal ${MAX_PROVIDERS} iklan.` };
  }

  const providers: AdProvider[] = [];
  const seenIds = new Set<string>();
  const newHosts: string[] = [];

  for (let i = 0; i < rawProviders.length; i++) {
    const raw = rawProviders[i] as Record<string, unknown>;
    if (!raw || typeof raw !== "object") continue;

    const name = stripTags(raw.name).slice(0, 48);
    let id = slugify(stripTags(raw.id || name || ""));
    if (!id || id.length < 2) id = slugify(`ad-${i + 1}`);
    while (seenIds.has(id)) id = `${id}-${i + 1}`;
    seenIds.add(id);

    const scriptUrl = stripTags(raw.scriptUrl);
    const zoneId = stripTags(raw.zoneId).replace(/[^\d]/g, "");
    const imageUrl = stripTags(raw.imageUrl);
    const targetUrl = stripTags(raw.targetUrl);
    const enabled = raw.enabled !== false;

    // Provider nonaktif tanpa URL boleh (dianggap kosong), tapi kalau aktif wajib URL valid.
    if (!scriptUrl && enabled) {
      return { ok: false, error: `Iklan "${name || id}": Script URL wajib diisi.` };
    }

    if (scriptUrl) {
      const u = parseUrl(scriptUrl);
      if (!u) return { ok: false, error: `Iklan "${name || id}": format Script URL tidak valid.` };
      if (u.protocol !== "https:") {
        return { ok: false, error: `Iklan "${name || id}": Script URL harus HTTPS.` };
      }
      if (isBlockedHost(u.hostname)) {
        return { ok: false, error: `Iklan "${name || id}": host "${u.hostname}" tidak diizinkan.` };
      }
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (mode === "terkunci" && !allowedHosts.includes(host)) {
        return {
          ok: false,
          error: `Iklan "${name || id}": host "${host}" tidak ada di daftar terkunci.`,
        };
      }
      if (!allowedHosts.includes(host)) newHosts.push(host);
    }

    // Zone ID hanya angka (sudah di-strip). Kalau ada isi asli non-angka harus ditolak.
    const rawZone = stripTags(raw.zoneId);
    if (rawZone && !/^\d+$/.test(rawZone)) {
      return { ok: false, error: `Iklan "${name || id}": Zone ID hanya boleh angka.` };
    }

    // imageUrl & targetUrl opsional; validasi bentuk kalau diisi.
    for (const [label, url] of [
      ["Image URL", imageUrl],
      ["Target URL", targetUrl],
    ] as const) {
      if (!url) continue;
      const u = parseUrl(url);
      if (!u || u.protocol !== "https:") {
        return { ok: false, error: `Iklan "${name || id}": ${label} harus HTTPS yang valid.` };
      }
      if (isBlockedHost(u.hostname)) {
        return { ok: false, error: `Iklan "${name || id}": ${label} host tidak diizinkan.` };
      }
    }

    providers.push({ id, name: name || id, enabled, scriptUrl, zoneId, imageUrl, targetUrl });
  }

  return {
    ok: true,
    newHosts: Array.from(new Set(newHosts)),
    config: {
      masterEnabled: input.masterEnabled !== false,
      validationMode: mode,
      allowedHosts: allowedHosts.length ? allowedHosts : fallbackAdsConfig.allowedHosts,
      providers,
      updatedAt: null,
      updatedBy: null,
      previous: null,
      configured: true,
    },
  };
}

// ── Pembacaan (cached) ────────────────────────────────────────────────────

async function readAdsConfig(): Promise<AdsConfig> {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("key, value, updated_at")
    .eq("key", ADS_SETTING_KEY)
    .maybeSingle();

  if (error || !data) {
    return { ...fallbackAdsConfig, configured: Boolean(data) };
  }

  const row = data as { value?: Partial<AdsConfig> | null; updated_at?: string | null };
  return normalizeAdsConfig({
    ...row.value,
    updatedAt: row.updated_at || null,
    configured: true,
  });
}

/** Baca config penuh (di-cache, tag `ads-config`). */
export const getAdsConfig = unstable_cache(readAdsConfig, [ADS_CACHE_TAG], {
  revalidate: 60,
  tags: [ADS_CACHE_TAG],
});

/** Proyeksi minimal untuk loader publik. */
export async function getPublicAdsConfig(): Promise<PublicAdsConfig> {
  const cfg = await getAdsConfig();
  return {
    masterEnabled: cfg.masterEnabled,
    providers: cfg.providers
      .filter((p) => p.enabled && p.scriptUrl)
      .map((p) => ({
        id: p.id,
        enabled: true,
        scriptUrl: p.scriptUrl,
        zoneId: p.zoneId || null,
        imageUrl: p.imageUrl || null,
        targetUrl: p.targetUrl || null,
      })),
  };
}

// ── Penulisan ─────────────────────────────────────────────────────────────

export async function setAdsConfig(next: AdsConfig, adminUserId: string): Promise<AdsConfig> {
  const current = await readAdsConfig();
  const updatedAt = new Date().toISOString();

  const previous = {
    masterEnabled: current.masterEnabled,
    validationMode: current.validationMode,
    allowedHosts: current.allowedHosts,
    providers: current.providers,
    updatedAt: current.updatedAt ?? null,
    updatedBy: current.updatedBy ?? null,
  };

  const value = {
    masterEnabled: next.masterEnabled,
    validationMode: next.validationMode,
    allowedHosts: next.allowedHosts,
    providers: next.providers,
    updatedBy: adminUserId,
    previous,
  };

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .upsert(
      { key: ADS_SETTING_KEY, value, updated_at: updatedAt },
      { onConflict: "key" },
    )
    .select("key, value, updated_at")
    .single();

  if (error) throw error;

  invalidateAdsCache();

  const row = data as { value?: Partial<AdsConfig> | null; updated_at?: string | null };
  return normalizeAdsConfig({
    ...row.value,
    updatedAt: row.updated_at || updatedAt,
    configured: true,
  });
}

export async function rollbackAdsConfig(adminUserId: string): Promise<AdsConfig> {
  const current = await readAdsConfig();
  if (!current.previous) {
    throw new Error("Tidak ada konfigurasi sebelumnya untuk dipulihkan.");
  }

  const prev = current.previous;
  const updatedAt = new Date().toISOString();

  const value = {
    masterEnabled: prev.masterEnabled,
    validationMode: prev.validationMode,
    allowedHosts: prev.allowedHosts,
    providers: prev.providers,
    updatedBy: adminUserId,
    previous: {
      masterEnabled: current.masterEnabled,
      validationMode: current.validationMode,
      allowedHosts: current.allowedHosts,
      providers: current.providers,
      updatedAt: current.updatedAt ?? null,
      updatedBy: current.updatedBy ?? null,
    },
  };

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .upsert({ key: ADS_SETTING_KEY, value, updated_at: updatedAt }, { onConflict: "key" })
    .select("key, value, updated_at")
    .single();

  if (error) throw error;

  invalidateAdsCache();

  const row = data as { value?: Partial<AdsConfig> | null; updated_at?: string | null };
  return normalizeAdsConfig({
    ...row.value,
    updatedAt: row.updated_at || updatedAt,
    configured: true,
  });
}

/** Invalidate cache agar perubahan dipakai pada kunjungan berikutnya. */
export function invalidateAdsCache() {
  try {
    // Next.js 16: revalidateTag butuh profile arg
    (revalidateTag as unknown as (tag: string, profile?: string) => void)(ADS_CACHE_TAG, "default");
  } catch {
    // no-op
  }
}
