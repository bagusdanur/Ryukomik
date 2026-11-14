/**
 * Banner promosi Scanlator yang ditempel otomatis di halaman terakhir chapter.
 *
 * Banner di-append ke array `image_urls` saat chapter dipublikasikan (bukan
 * overlay web), jadi ikut saat chapter di-mirror ke web lain.
 */
export const CHAPTER_BANNER_URL = "https://ryukomik.com/banner-scanlator.webp";

export function withChapterBanner(imageUrls: unknown): string[] {
  const urls = Array.isArray(imageUrls)
    ? imageUrls.filter((url): url is string => typeof url === "string" && url.startsWith("http"))
    : [];
  if (!urls.includes(CHAPTER_BANNER_URL)) urls.push(CHAPTER_BANNER_URL);
  return urls;
}
