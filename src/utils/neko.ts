export function nekoImg(url?: string | null): string {
  if (!url) return "";
  return `https://api.ryukomik.my.id/neko/image?url=${encodeURIComponent(url)}`;
}
