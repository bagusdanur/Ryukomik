/**
 * URL thumbnail nobar.
 *
 * Poster anime datang dari situs pihak ketiga (otakudesu dll) yang sering
 * diblokir di jaringan pengguna atau menolak hotlink — makanya dulu tampak
 * kosong. Semua gambar dialihkan lewat /api/anime/thumb supaya selalu tampil
 * dan di-cache panjang di Cloudflare (sekali ambil, hemat bandwidth).
 */
export function thumbUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return `/api/anime/thumb?u=${encodeURIComponent(url)}`;
}
