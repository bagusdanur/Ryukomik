/**
 * Deteksi genre 18+ untuk seri Project (upload sendiri).
 *
 * Project tidak punya kolom khusus dewasa, jadi penandaannya lewat genre:
 * "18+", "Adult", "Mature", "Ecchi", "Smut", "Hentai", "Explicit".
 */
const ADULT_GENRES = new Set([
  "18+",
  "18 +",
  "adult",
  "mature",
  "ecchi",
  "smut",
  "hentai",
  "explicit",
  "nsfw",
]);

export function isAdultGenreText(value: string | null | undefined): boolean {
  if (!value) return false;
  return String(value)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => ADULT_GENRES.has(part));
}

export function isAdultProject(item: {
  type_genre?: string | null;
  genres?: string[] | null;
  type?: string | null;
  is_adult?: boolean | null;
}): boolean {
  // Toggle manual dari dashboard Project adalah sumber utama.
  if (item.is_adult === true) return true;
  if (isAdultGenreText(item.type_genre)) return true;
  const parts = [item.type, ...(item.genres || [])].filter(Boolean) as string[];
  return parts.some((part) => ADULT_GENRES.has(String(part).trim().toLowerCase()));
}
