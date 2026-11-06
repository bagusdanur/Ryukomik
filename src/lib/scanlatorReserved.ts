/**
 * Nama tim yang tidak boleh dipakai user — mencegah impersonasi.
 * Tambah di sini kalau ada penerbit/agensi yang perlu dilindungi.
 */
export const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "ryukomik",
  "support",
  "official",
  "staff",
  "moderator",
  "mod",
  "owner",
  "ryu",
  "ryu-scanlation",
  "ryu-scan",
  "ryuscanlation",
  "kanimenia",
  "shueisha",
  "kodansha",
  "shogakukan",
  "viz",
  "viz-media",
  "yen-press",
  "seven-seas",
  "square-enix",
  "kadokawa",
  "scanlator",
  "komunitas",
  "premium",
]);

const RESERVED_PREFIXES = ["ryukomik", "admin", "official", "support-"];

export function isReservedHandle(handle: string): boolean {
  const h = handle.trim().toLowerCase();
  if (!h) return true;
  if (RESERVED_HANDLES.has(h)) return true;
  return RESERVED_PREFIXES.some((p) => h.startsWith(p));
}
