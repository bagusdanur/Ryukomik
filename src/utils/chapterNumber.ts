/**
 * Nomor chapter untuk DITAMPILKAN, bukan untuk fetch.
 *
 * Beberapa sumber (mis. Kiryuu) menempelkan id internal pada slug chapter:
 *   "…/chapter-160.844861"  → chapter 160, id pos 844861
 * Bagian desimal panjang itu bukan nomor chapter pecahan (seperti 12.5),
 * melainkan id. Untuk tampilan kita buang desimal yang panjangnya >= 3 digit
 * supaya pembaca melihat "CH 160", bukan "CH 160.844861".
 *
 * Slug asli TETAP dipakai untuk URL/fetch — fungsi ini hanya untuk label.
 */
export function displayChapterNumber(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const match = slug.match(/(?:chapter[-_])?(\d+(?:\.\d+)?)(?:$|[-_])/i);
  const raw = match?.[1];
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot === -1) return raw;
  const frac = raw.slice(dot + 1);
  // Desimal >= 3 digit = id internal sumber, bukan chapter pecahan.
  if (frac.length >= 3) return raw.slice(0, dot);
  return raw;
}
